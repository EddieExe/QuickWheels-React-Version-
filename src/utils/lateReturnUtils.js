// src/utils/lateReturnUtils.js
import { doc, updateDoc, getDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import emailjs from "@emailjs/browser";
import { 
  deriveDailyRate, 
  calculateExtensionCost, 
  calculateNewDropoffDate,
  isExtensionValid,
  formatCurrency 
} from "./extensionCalculator";

// Re-export for convenience
export { deriveDailyRate, calculateExtensionCost, calculateNewDropoffDate, isExtensionValid, formatCurrency };

/**
 * Calculate late penalty based on delay hours
 * This is a simplified version - you can also import from extensionCalculator
 */
export const calculateLatePenalty = (delayHours, dailyRate) => {
  let percentage = 0;
  let tier = "";
  let recommendation = "";
  
  if (delayHours <= 2) {
    percentage = 25;
    tier = "warning";
    recommendation = "Send warning notification";
  } else if (delayHours <= 6) {
    percentage = 50;
    tier = "moderate";
    recommendation = "Send SMS alert, contact customer";
  } else if (delayHours <= 12) {
    percentage = 100;
    tier = "serious";
    recommendation = "Offer automatic extension, notify admin";
  } else if (delayHours <= 24) {
    percentage = 150;
    tier = "severe";
    recommendation = "Auto-extension with premium rate, hold deposit";
  } else {
    percentage = 200;
    tier = "critical";
    recommendation = "Maximum penalty, prepare for towing, hold full deposit";
  }
  
  const penalty = (dailyRate * percentage) / 100;
  
  return {
    penalty: Math.round(penalty * 100) / 100,
    percentage,
    tier,
    recommendation,
    delayHours: Math.round(delayHours * 10) / 10,
  };
};

/**
 * Calculate extension charge (wrapper for calculateExtensionCost)
 */
export const calculateExtensionCharge = (dailyRate, extraDays, isLateReturn = false) => {
  return calculateExtensionCost(dailyRate, extraDays, isLateReturn);
};

/**
 * Check if a booking is late
 * @param {object} booking - Booking object
 * @returns {object} { isLate, delayHours, penalty, status }
 */
export const checkLateStatus = (booking) => {
  if (!booking || !booking.dropoffDate) {
    return { isLate: false, delayHours: 0, penalty: 0, status: booking?.status || "unknown" };
  }
  
  const dropoffTime = new Date(booking.dropoffDate);
  const currentTime = new Date();
  
  // Set dropoff to end of day for comparison
  dropoffTime.setHours(23, 59, 59, 999);
  
  if (currentTime <= dropoffTime) {
    return { isLate: false, delayHours: 0, penalty: 0, status: booking.status };
  }
  
  // Calculate delay in hours
  const delayMs = currentTime - dropoffTime;
  const delayHours = delayMs / (1000 * 60 * 60);
  
  // Calculate penalty
  const dailyRate = booking.dailyRate || (booking.total / booking.days) || 50;
  const penaltyResult = calculateLatePenalty(delayHours, dailyRate);
  
  // Determine status based on delay
  let status = booking.status;
  if (delayHours > 0) {
    if (delayHours <= 6) {
      status = "late_return";
    } else if (delayHours <= 24) {
      status = "critically_late";
    } else {
      status = "overdue";
    }
  }
  
  return {
    isLate: true,
    delayHours: Math.round(delayHours * 10) / 10,
    penalty: penaltyResult.penalty,
    penaltyPercentage: penaltyResult.percentage,
    tier: penaltyResult.tier,
    recommendation: penaltyResult.recommendation,
    status,
    dropoffTime: dropoffTime.toISOString(),
    currentTime: currentTime.toISOString(),
  };
};

/**
 * Send late return notification to customer
 */
export const sendLateReturnNotification = async (booking, lateInfo) => {
  const SERVICE_ID = "service_crw994k";
  const TEMPLATE_ID = "template_late_return";
  const PUBLIC_KEY = "TJIFq6s5ghB-Qg91W";
  
  // Format delay message
  let delayMessage = "";
  if (lateInfo.delayHours < 1) {
    delayMessage = `${Math.round(lateInfo.delayHours * 60)} minutes`;
  } else {
    delayMessage = `${lateInfo.delayHours} hours`;
  }
  
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: booking.userEmail,
        to_name: booking.userName || "Customer",
        booking_id: booking.bookingId,
        car_model: booking.carModel,
        delay_hours: delayMessage,
        penalty_amount: lateInfo.penalty,
        penalty_percentage: lateInfo.penaltyPercentage,
        recommendation: lateInfo.recommendation,
        dropoff_time: new Date(booking.dropoffDate).toLocaleString(),
      },
      PUBLIC_KEY
    );
    return true;
  } catch (error) {
    console.error("Failed to send late return notification:", error);
    return false;
  }
};

/**
 * Process automatic extension for critically late bookings
 */
export const processAutoExtension = async (booking, daysToExtend = 1) => {
  try {
    const bookingRef = doc(db, "bookings", booking.id);
    const bookingSnap = await getDoc(bookingRef);
    const currentBooking = bookingSnap.data();
    
    if (!currentBooking) {
      return { success: false, error: "Booking not found" };
    }
    
    const currentDropoff = new Date(booking.dropoffDate);
    const newDropoff = new Date(currentDropoff);
    newDropoff.setDate(newDropoff.getDate() + daysToExtend);
    
    // Calculate extension charges (late = true for auto extensions)
    const dailyRate = currentBooking.dailyRate || (currentBooking.total / currentBooking.days) || 50;
    const extensionCharge = calculateExtensionCost(dailyRate, daysToExtend, true);
    
    const updateData = {
      dropoffDate: newDropoff.toISOString().split('T')[0],
      days: (currentBooking.days || 0) + daysToExtend,
      total: (currentBooking.total || 0) + extensionCharge.totalCost,
      extensionHistory: [
        ...(currentBooking.extensionHistory || []),
        {
          date: new Date().toISOString(),
          daysExtended: daysToExtend,
          charge: extensionCharge.totalCost,
          type: "auto_extension",
          isLate: true,
        },
      ],
      status: "active",
      lastAutoExtension: new Date().toISOString(),
    };
    
    await updateDoc(bookingRef, updateData);
    
    return {
      success: true,
      newDropoffDate: updateData.dropoffDate,
      extensionCharge: extensionCharge.totalCost,
      newTotal: updateData.total,
    };
  } catch (error) {
    console.error("Error processing auto extension:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create extension request in Firestore
 */
export const createExtensionRequest = async (booking, requestedDays, reason) => {
  try {
    const dailyRate = booking.dailyRate || (booking.total / booking.days) || 50;
    const isLate = checkLateStatus(booking).isLate;
    const extensionCharge = calculateExtensionCost(dailyRate, requestedDays, isLate);
    
    const requestData = {
      bookingId: booking.id,
      bookingRef: `/bookings/${booking.id}`,
      customerId: booking.userId,
      customerEmail: booking.userEmail,
      customerName: booking.userName,
      carModel: booking.carModel,
      requestedDays,
      reason,
      currentDropoffDate: booking.dropoffDate,
      requestedNewDropoffDate: new Date(new Date(booking.dropoffDate).setDate(new Date(booking.dropoffDate).getDate() + requestedDays)).toISOString().split('T')[0],
      proposedCharge: extensionCharge.totalCost,
      dailyRate: extensionCharge.dailyCharge || dailyRate,
      isLate: isLate,
      isPremiumRate: extensionCharge.isPremium || isLate,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      processedAt: null,
      processedBy: null,
      notes: "",
    };
    
    const docRef = await addDoc(collection(db, "extensionRequests"), requestData);
    return { id: docRef.id, ...requestData };
  } catch (error) {
    console.error("Error creating extension request:", error);
    return null;
  }
};

/**
 * Process extension request (approve or reject)
 */
export const processExtensionRequest = async (requestId, action, dealerId, notes = "") => {
  try {
    const requestRef = doc(db, "extensionRequests", requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: "Request not found" };
    }
    
    const request = requestSnap.data();
    
    if (request.status !== "pending") {
      return { success: false, error: `Request already ${request.status}` };
    }
    
    if (action === "approve") {
      const bookingRef = doc(db, "bookings", request.bookingId);
      const bookingSnap = await getDoc(bookingRef);
      const booking = bookingSnap.data();
      
      if (!booking) {
        return { success: false, error: "Booking not found" };
      }
      
      const currentDropoff = new Date(request.currentDropoffDate);
      const newDropoff = new Date(currentDropoff);
      newDropoff.setDate(newDropoff.getDate() + request.requestedDays);
      
      await updateDoc(bookingRef, {
        dropoffDate: newDropoff.toISOString().split('T')[0],
        days: (booking.days || 0) + request.requestedDays,
        total: (booking.total || 0) + request.proposedCharge,
        extensionHistory: [
          ...(booking.extensionHistory || []),
          {
            date: new Date().toISOString(),
            daysExtended: request.requestedDays,
            charge: request.proposedCharge,
            type: "dealer_approved",
            requestId,
          },
        ],
      });
    }
    
    await updateDoc(requestRef, {
      status: action === "approve" ? "approved" : "rejected",
      processedAt: new Date().toISOString(),
      processedBy: dealerId,
      notes,
    });
    
    return {
      success: true,
      action,
      requestId,
      bookingId: request.bookingId,
    };
  } catch (error) {
    console.error("Error processing extension request:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all pending extension requests for a dealer
 */
export const getPendingExtensionRequests = async (dealerId) => {
  try {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("dealerId", "==", dealerId)
    );
    const bookingsSnap = await getDocs(bookingsQuery);
    const bookingIds = bookingsSnap.docs.map(doc => doc.id);
    
    if (bookingIds.length === 0) return [];
    
    // Firestore 'in' query has limit of 10, so we need to handle batches
    let allRequests = [];
    for (let i = 0; i < bookingIds.length; i += 10) {
      const batch = bookingIds.slice(i, i + 10);
      const requestsQuery = query(
        collection(db, "extensionRequests"),
        where("bookingId", "in", batch),
        where("status", "==", "pending")
      );
      const requestsSnap = await getDocs(requestsQuery);
      allRequests.push(...requestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    
    return allRequests;
  } catch (error) {
    console.error("Error fetching pending extension requests:", error);
    return [];
  }
};

/**
 * Get all late bookings for a dealer
 */
export const getLateBookings = async (dealerId) => {
  try {
    const q = query(
      collection(db, "bookings"),
      where("dealerId", "==", dealerId),
      where("status", "in", ["active", "late_return", "critically_late", "overdue"])
    );
    const snapshot = await getDocs(q);
    
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return bookings
      .map(booking => {
        const lateInfo = checkLateStatus(booking);
        return {
          ...booking,
          lateInfo: lateInfo.isLate ? lateInfo : null,
          delayHours: lateInfo.delayHours || 0,
        };
      })
      .filter(booking => booking.lateInfo !== null);
  } catch (error) {
    console.error("Error fetching late bookings:", error);
    return [];
  }
};