// src/utils/dealerNotificationService.js
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import emailjs from "@emailjs/browser";

// Notification Types for Dealers
export const DEALER_NOTIFICATION_TYPES = {
  UPCOMING_PICKUP: {
    id: "upcoming_pickup",
    title: "Upcoming Pickup",
    color: "#4ce3f7",
    priority: "high",
  },
  RETURN_DUE: {
    id: "return_due",
    title: "Return Due",
    color: "#f59e0b",
    priority: "high",
  },
  SOS_ALERT: {
    id: "sos_alert",
    title: "SOS Alert",
    color: "#ef4444",
    priority: "critical",
  },
  BREAKDOWN_REQUEST: {
    id: "breakdown_request",
    title: "Breakdown Request",
    color: "#f97316",
    priority: "high",
  },
  EXTENSION_REQUEST: {
    id: "extension_request",
    title: "Extension Request",
    color: "#a855f7",
    priority: "medium",
  },
  LATE_RETURN: {
    id: "late_return",
    title: "Late Return Alert",
    color: "#ef4444",
    priority: "critical",
  },
  DAMAGE_REPORT: {
    id: "damage_report",
    title: "Damage Report",
    color: "#f59e0b",
    priority: "high",
  },
  BOOKING_CONFIRMED: {
    id: "booking_confirmed",
    title: "New Booking",
    color: "#22c55e",
    priority: "medium",
  },
  PAYMENT_RECEIVED: {
    id: "payment_received",
    title: "Payment Received",
    color: "#22c55e",
    priority: "low",
  },
  REVIEW_RECEIVED: {
    id: "review_received",
    title: "New Review",
    color: "#fbbf24",
    priority: "low",
  },
};

// Priority order for sorting
export const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Create a notification for a dealer
 * @param {string} dealerId - Dealer ID
 * @param {string} notificationType - Type from DEALER_NOTIFICATION_TYPES
 * @param {object} data - Notification data
 * @returns {Promise<object>}
 */
export const createDealerNotification = async (dealerId, notificationType, data = {}) => {
  try {
    const typeConfig = DEALER_NOTIFICATION_TYPES[notificationType] || DEALER_NOTIFICATION_TYPES.BOOKING_CONFIRMED;
    
    const notification = {
      dealerId,
      type: typeConfig.id,
      title: data.title || typeConfig.title,
      message: data.message || "",
      // REMOVED `icon: typeConfig.icon` from here because database writes will fail 
      // when passing function components to Firestore. 
      color: typeConfig.color,
      priority: typeConfig.priority,
      read: false,
      actionUrl: data.actionUrl || null,
      actionLabel: data.actionLabel || "View Details",
      actionData: data.actionData || {},
      bookingId: data.bookingId || null,
      customerName: data.customerName || null,
      customerEmail: data.customerEmail || null,
      createdAt: serverTimestamp(),
      expiresAt: data.expiresAt || null,
    };
    
    const docRef = await addDoc(collection(db, "dealer_notifications"), notification);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Failed to create dealer notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification to dealer
 * @param {string} dealerEmail - Dealer email
 * @param {object} notification - Notification data
 */
export const sendDealerEmailNotification = async (dealerEmail, notification) => {
  const SERVICE_ID = "service_crw994k";
  const TEMPLATE_ID = "template_dealer_notification";
  const PUBLIC_KEY = "TJIFq6s5ghB-Qg91W";
  
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: dealerEmail,
        to_name: dealerEmail.split("@")[0],
        notification_title: notification.title,
        notification_message: notification.message,
        notification_type: notification.type,
        action_url: notification.actionUrl,
        current_year: new Date().getFullYear(),
      },
      PUBLIC_KEY
    );
    return true;
  } catch (error) {
    console.error("Failed to send dealer email notification:", error);
    return false;
  }
};

/**
 * Subscribe to real-time dealer notifications
 * @param {string} dealerId - Dealer ID
 * @param {Function} onUpdate - Callback function
 * @param {number} limitCount - Max notifications to fetch
 * @returns {Function} Unsubscribe function
 */
export const subscribeToDealerNotifications = (dealerId, onUpdate, limitCount = 50) => {
  if (!dealerId) return () => {};
  
  const q = query(
    collection(db, "dealer_notifications"),
    where("dealerId", "==", dealerId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      onUpdate(notifications);
    },
    (error) => {
      console.error("Notification subscription error:", error);
      onUpdate([]);
    }
  );
  
  return unsubscribe;
};

/**
 * Mark a single notification as read
 * @param {string} notificationId - Notification ID
 */
export const markDealerNotificationRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, "dealer_notifications", notificationId), {
      read: true,
      readAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false };
  }
};

/**
 * Mark all notifications as read for a dealer
 * @param {string} dealerId - Dealer ID
 */
export const markAllDealerNotificationsRead = async (dealerId) => {
  try {
    const q = query(
      collection(db, "dealer_notifications"),
      where("dealerId", "==", dealerId),
      where("read", "==", false)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return { success: true, count: 0 };
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true, readAt: serverTimestamp() });
    });
    await batch.commit();
    
    return { success: true, count: snapshot.size };
  } catch (error) {
    console.error("Failed to mark all as read:", error);
    return { success: false };
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 */
export const deleteDealerNotification = async (notificationId) => {
  try {
    await deleteDoc(doc(db, "dealer_notifications", notificationId));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return { success: false };
  }
};

/**
 * Get unread count for dealer
 * @param {string} dealerId - Dealer ID
 * @returns {Promise<number>}
 */
export const getUnreadDealerNotificationCount = async (dealerId) => {
  try {
    const q = query(
      collection(db, "dealer_notifications"),
      where("dealerId", "==", dealerId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }
};

/**
 * Trigger various dealer notifications based on events
 */
export const triggerDealerNotification = {
  // When a customer books a vehicle
  newBooking: async (dealerId, dealerEmail, booking) => {
    const result = await createDealerNotification(dealerId, "BOOKING_CONFIRMED", {
      title: "New Booking Received",
      message: `${booking.carModel} booked by ${booking.userName || booking.userEmail} for ${booking.pickupDate}`,
      actionUrl: `/dealer/bookings/${booking.id}`,
      actionLabel: "View Booking",
      actionData: { bookingId: booking.id },
      bookingId: booking.id,
      customerName: booking.userName,
      customerEmail: booking.userEmail,
    });
    
    if (result.success) {
      await sendDealerEmailNotification(dealerEmail, {
        title: "New Booking Received",
        message: `${booking.carModel} has been booked.`,
        type: "booking_confirmed",
        actionUrl: `/dealer/bookings/${booking.id}`,
      });
    }
    
    return result;
  },
  
  // When pickup is approaching (2 hours before)
  upcomingPickup: async (dealerId, dealerEmail, booking) => {
    return createDealerNotification(dealerId, "UPCOMING_PICKUP", {
      title: "Upcoming Pickup",
      message: `${booking.carModel} pickup in 2 hours. Customer: ${booking.userName || booking.userEmail}`,
      actionUrl: `/dealer/bookings/${booking.id}`,
      actionLabel: "Prepare Vehicle",
      actionData: { bookingId: booking.id, type: "pickup" },
      bookingId: booking.id,
    });
  },
  
  // When return is due (2 hours before)
  returnDue: async (dealerId, dealerEmail, booking) => {
    return createDealerNotification(dealerId, "RETURN_DUE", {
      title: "Vehicle Return Due",
      message: `${booking.carModel} return in 2 hours from ${booking.userName || booking.userEmail}`,
      actionUrl: `/dealer/bookings/${booking.id}`,
      actionLabel: "Prepare for Return",
      actionData: { bookingId: booking.id, type: "return" },
      bookingId: booking.id,
    });
  },
  
  // When customer triggers SOS
  sosAlert: async (dealerId, dealerEmail, booking, location) => {
    return createDealerNotification(dealerId, "SOS_ALERT", {
      title: "SOS ALERT",
      message: `Customer in ${booking.carModel} has triggered SOS. Location: ${location.address || `${location.lat}, ${location.lng}`}`,
      actionUrl: `/dealer/emergency/${booking.id}`,
      actionLabel: "View Location",
      actionData: { bookingId: booking.id, location },
      bookingId: booking.id,
      customerName: booking.userName,
    });
  },
  
  // When customer requests breakdown assistance
  breakdownRequest: async (dealerId, dealerEmail, booking, serviceType, location) => {
    return createDealerNotification(dealerId, "BREAKDOWN_REQUEST", {
      title: "Breakdown Assistance Request",
      message: `${booking.userName} needs ${serviceType} assistance at ${location.address || "their location"}`,
      actionUrl: `/dealer/assistance/${booking.id}`,
      actionLabel: "Assign Assistance",
      actionData: { bookingId: booking.id, serviceType, location },
      bookingId: booking.id,
    });
  },
  
  // When customer requests extension
  extensionRequest: async (dealerId, dealerEmail, booking, requestedDays, reason) => {
    return createDealerNotification(dealerId, "EXTENSION_REQUEST", {
      title: "Trip Extension Request",
      message: `${booking.userName} requests +${requestedDays} day(s) extension for ${booking.carModel}. Reason: ${reason || "Not specified"}`,
      actionUrl: `/dealer/extension-requests`,
      actionLabel: "Review Request",
      actionData: { bookingId: booking.id, requestedDays, reason },
      bookingId: booking.id,
    });
  },
  
  // When vehicle is late returning
  lateReturn: async (dealerId, dealerEmail, booking, delayHours) => {
    return createDealerNotification(dealerId, "LATE_RETURN", {
      title: "Late Return Alert",
      message: `${booking.carModel} is ${delayHours} hour(s) late returning. Customer: ${booking.userName || booking.userEmail}`,
      actionUrl: `/dealer/late-returns`,
      actionLabel: "Take Action",
      actionData: { bookingId: booking.id, delayHours },
      bookingId: booking.id,
    });
  },
  
  // When damage is detected during return inspection
  damageReport: async (dealerId, dealerEmail, booking, damageDetails) => {
    return createDealerNotification(dealerId, "DAMAGE_REPORT", {
      title: "Damage Detected",
      message: `${damageDetails.severity} damage found on ${booking.carModel}. Estimated penalty: $${damageDetails.penalty}`,
      actionUrl: `/dealer/bookings/${booking.id}/inspection`,
      actionLabel: "Review Damage",
      actionData: { bookingId: booking.id, damage: damageDetails },
      bookingId: booking.id,
    });
  },
};