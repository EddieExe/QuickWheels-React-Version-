// src/utils/vehicleStatusUtils.js
import { doc, updateDoc, collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";

// Vehicle status definitions - consistent keys
export const VEHICLE_STATUS = {
  available: { 
    id: "available", 
    label: "Available", 
    icon: "🟢", 
    color: "#22c55e",
    bgColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.3)",
    description: "Ready for booking",
    order: 1
  },
  reserved: { 
    id: "reserved", 
    label: "Reserved", 
    icon: "🟡", 
    color: "#fbbf24",
    bgColor: "rgba(251,191,36,0.1)",
    borderColor: "rgba(251,191,36,0.3)",
    description: "Booked for future date",
    order: 2
  },
  pickup_awaited: { 
    id: "pickup_awaited", 
    label: "Pickup Awaited", 
    icon: "🔵", 
    color: "#3b82f6",
    bgColor: "rgba(59,130,246,0.1)",
    borderColor: "rgba(59,130,246,0.3)",
    description: "Customer should pick up",
    order: 3
  },
  on_trip: { 
    id: "on_trip", 
    label: "On Trip", 
    icon: "🚀", 
    color: "#a855f7",
    bgColor: "rgba(168,85,247,0.1)",
    borderColor: "rgba(168,85,247,0.3)",
    description: "Customer has vehicle",
    order: 4
  },
  return_pending: { 
    id: "return_pending", 
    label: "Return Pending", 
    icon: "🔄", 
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.3)",
    description: "Awaiting return inspection",
    order: 5
  },
  cleaning: { 
    id: "cleaning", 
    label: "Cleaning", 
    icon: "🧹", 
    color: "#06b6d4",
    bgColor: "rgba(6,182,212,0.1)",
    borderColor: "rgba(6,182,212,0.3)",
    description: "Being cleaned",
    order: 6
  },
  under_maintenance: { 
    id: "under_maintenance", 
    label: "Maintenance", 
    icon: "🔧", 
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.3)",
    description: "Being serviced",
    order: 7
  },
  unavailable: { 
    id: "unavailable", 
    label: "Unavailable", 
    icon: "⛔", 
    color: "#6b7280",
    bgColor: "rgba(107,114,128,0.1)",
    borderColor: "rgba(107,114,128,0.3)",
    description: "Temporarily blocked",
    order: 8
  },
};

export const STATUS_ORDER = [
  "available",
  "reserved",
  "pickup_awaited",
  "on_trip",
  "return_pending",
  "cleaning",
  "under_maintenance",
  "unavailable"
];

// Helper function to get car status (handles both old and new data)
export const getCarStatus = (car) => {
  // If car has status field and it's valid, use it
  if (car.status && VEHICLE_STATUS[car.status]) {
    return car.status;
  }
  
  // Map old isAvailable to status
  if (car.isAvailable === true) {
    return "available";
  } else if (car.isAvailable === false) {
    return "unavailable";
  }
  
  // Default to available
  return "available";
};

/**
 * Get vehicle statistics by status
 * @param {Array} cars - Array of car objects
 */
export const getVehicleStats = (cars) => {
  const stats = {
    available: 0,
    reserved: 0,
    pickup_awaited: 0,
    on_trip: 0,
    return_pending: 0,
    cleaning: 0,
    under_maintenance: 0,
    unavailable: 0,
    total: cars.length
  };
  
  cars.forEach(car => {
    const status = getCarStatus(car);
    if (stats[status] !== undefined) {
      stats[status]++;
    } else {
      // Fallback for unknown status
      stats.available++;
    }
  });
  
  return stats;
};

/**
 * Update vehicle status
 * @param {string} carId - Car ID
 * @param {string} dealerId - Dealer ID
 * @param {string} newStatus - New status ID
 * @param {object} metadata - Additional metadata (reason, scheduledDate, etc.)
 */
export const updateVehicleStatus = async (carId, dealerId, newStatus, metadata = {}) => {
  try {
    const carRef = doc(db, "dealers", dealerId, "cars", carId);
    
    // Get current car data to preserve existing fields
    const carSnap = await getDoc(carRef);
    const currentCar = carSnap.data();
    
    const updates = {
      status: newStatus,
      isAvailable: newStatus === "available", // Sync isAvailable with status
      statusHistory: [
        ...(currentCar.statusHistory || []),
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          changedBy: "dealer",
          ...metadata,
        },
      ],
      lastStatusUpdate: new Date().toISOString(),
      ...(metadata.reason && { statusReason: metadata.reason }),
      ...(metadata.scheduledDate && { maintenanceScheduledDate: metadata.scheduledDate }),
      ...(metadata.expectedCompletion && { maintenanceExpectedCompletion: metadata.expectedCompletion }),
    };
    
    await updateDoc(carRef, updates);
    return { success: true };
  } catch (error) {
    console.error("Error updating vehicle status:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk update vehicle status
 * @param {string[]} carIds - Array of car IDs
 * @param {string} dealerId - Dealer ID
 * @param {string} newStatus - New status ID
 * @param {object} metadata - Additional metadata
 */
export const bulkUpdateVehicleStatus = async (carIds, dealerId, newStatus, metadata = {}) => {
  try {
    const updates = carIds.map(async (carId) => {
      const carRef = doc(db, "dealers", dealerId, "cars", carId);
      const carSnap = await getDoc(carRef);
      const currentCar = carSnap.data();
      
      await updateDoc(carRef, {
        status: newStatus,
        isAvailable: newStatus === "available",
        statusHistory: [
          ...(currentCar.statusHistory || []),
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            changedBy: "dealer",
            bulk: true,
            ...metadata,
          },
        ],
        lastStatusUpdate: new Date().toISOString(),
      });
    });
    
    await Promise.all(updates);
    return { success: true, count: carIds.length };
  } catch (error) {
    console.error("Error bulk updating vehicle status:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule maintenance for a vehicle
 * @param {string} carId - Car ID
 * @param {string} dealerId - Dealer ID
 * @param {object} maintenanceData - { startDate, endDate, type, notes }
 */
export const scheduleMaintenance = async (carId, dealerId, maintenanceData) => {
  try {
    // First, add to maintenance schedule collection
    const scheduleRef = await addDoc(collection(db, "dealers", dealerId, "maintenanceSchedule"), {
      carId,
      carModel: maintenanceData.carModel,
      startDate: maintenanceData.startDate,
      endDate: maintenanceData.endDate,
      type: maintenanceData.type,
      notes: maintenanceData.notes,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    });
    
    // Then update car status
    await updateVehicleStatus(carId, dealerId, "under_maintenance", {
      reason: maintenanceData.type,
      scheduledDate: maintenanceData.startDate,
      expectedCompletion: maintenanceData.endDate,
      scheduleId: scheduleRef.id,
    });
    
    return { success: true, scheduleId: scheduleRef.id };
  } catch (error) {
    console.error("Error scheduling maintenance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Add cleaning task
 * @param {string} carId - Car ID
 * @param {string} dealerId - Dealer ID
 * @param {object} cleaningData - { checklist, assignedTo, notes }
 */
export const addCleaningTask = async (carId, dealerId, cleaningData) => {
  try {
    const cleaningRef = await addDoc(collection(db, "dealers", dealerId, "cleaningTasks"), {
      carId,
      carModel: cleaningData.carModel,
      checklist: cleaningData.checklist,
      assignedTo: cleaningData.assignedTo,
      notes: cleaningData.notes,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    
    await updateVehicleStatus(carId, dealerId, "cleaning", {
      reason: "Scheduled cleaning",
      taskId: cleaningRef.id,
    });
    
    return { success: true, taskId: cleaningRef.id };
  } catch (error) {
    console.error("Error adding cleaning task:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete cleaning task
 * @param {string} taskId - Cleaning task ID
 * @param {string} dealerId - Dealer ID
 * @param {string} carId - Car ID
 */
export const completeCleaningTask = async (taskId, dealerId, carId) => {
  try {
    const taskRef = doc(db, "dealers", dealerId, "cleaningTasks", taskId);
    await updateDoc(taskRef, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    
    // Auto-change status to available after cleaning
    await updateVehicleStatus(carId, dealerId, "available", {
      reason: "Cleaning completed",
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error completing cleaning task:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get status transition suggestions based on current status
 * @param {string} currentStatus - Current status ID
 */
export const getSuggestedTransitions = (currentStatus) => {
  const transitions = {
    available: ["reserved", "cleaning", "under_maintenance", "unavailable"],
    reserved: ["pickup_awaited", "available"],
    pickup_awaited: ["on_trip", "available"],
    on_trip: ["return_pending"],
    return_pending: ["cleaning", "under_maintenance"],
    cleaning: ["available", "under_maintenance"],
    under_maintenance: ["available", "cleaning"],
    unavailable: ["available"],
  };
  
  return transitions[currentStatus] || ["available"];
};

/**
 * Check if a vehicle status should auto-transition
 * @param {object} car - Car object
 * @param {object} booking - Associated booking (if any)
 */
export const checkAutoTransition = async (car, booking) => {
  if (!car || !booking) return null;
  
  const currentTime = new Date();
  const pickupTime = booking.pickupDate ? new Date(booking.pickupDate) : null;
  const dropoffTime = booking.dropoffDate ? new Date(booking.dropoffDate) : null;
  
  // No-show after 2 hours past pickup
  if (car.status === "pickup_awaited" && pickupTime && currentTime > new Date(pickupTime.getTime() + 2 * 60 * 60 * 1000)) {
    return { newStatus: "available", reason: "Customer no-show" };
  }
  
  // Trip started - should be on_trip
  if (car.status === "pickup_awaited" && booking.status === "active") {
    return { newStatus: "on_trip", reason: "Trip started" };
  }
  
  // Trip ended - should be return_pending
  if (car.status === "on_trip" && booking.status === "completed") {
    return { newStatus: "return_pending", reason: "Trip completed" };
  }
  
  return null;
};