// src/utils/inspectionUtils.js
import { uploadToCloudinary } from "./uploadImage";

/**
 * Calculate extra mileage charges
 */
export const calculateMileageCharge = (
  pickupOdometer,
  returnOdometer,
  days,
  includedKmsPerDay = 100,
  extraKmRate = 0.50
) => {
  const totalKms = Math.max(0, returnOdometer - pickupOdometer);
  const includedKms = days * includedKmsPerDay;
  const extraKms = Math.max(0, totalKms - includedKms);
  const charge = extraKms * extraKmRate;
  return { totalKms, includedKms, extraKms, charge };
};

/**
 * Calculate fuel charge based on difference
 */
export const calculateFuelCharge = (
  pickupFuel,
  returnFuel,
  fuelPricePerLiter = 1.50,
  unit = "percent"
) => {
  let difference = pickupFuel - returnFuel;
  let charge = 0;

  if (difference > 0) {
    if (unit === "percent") {
      const litersNeeded = (difference / 100) * 50;
      charge = litersNeeded * fuelPricePerLiter;
    } else {
      charge = difference * fuelPricePerLiter;
    }
  }

  return { difference: Math.max(0, difference), charge };
};

/**
 * Upload inspection photos to Cloudinary
 */
export const uploadInspectionPhotos = async (
  files,
  bookingId,
  section,
  onProgress = null
) => {
  const uploadPromises = files.map(async (file, index) => {
    const result = await uploadToCloudinary(file, (pct) => {
      if (onProgress) {
        onProgress(((index + pct / 100) / files.length) * 100);
      }
    });
    return result.url;
  });

  return Promise.all(uploadPromises);
};

/**
 * Calculate late return fee
 */
export const calculateLateFee = (
  expectedReturnDate,
  actualReturnDate,
  dailyRate,
  lateFeePerHour = 10
) => {
  const expected = new Date(expectedReturnDate);
  const actual = new Date(actualReturnDate);

  const diffTime = Math.max(0, actual - expected);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let charge = 0;
  if (diffDays > 0) {
    charge = diffDays * dailyRate;
  } else if (diffHours > 0) {
    charge = diffHours * lateFeePerHour;
  }

  return { daysLate: diffDays, hoursLate: diffHours, charge };
};

/**
 * Calculate damage penalty based on severity
 */
export const getDamagePenalty = (severity) => {
  const penalties = {
    minor: { min: 10, max: 50, default: 30 },
    moderate: { min: 50, max: 200, default: 100 },
    major: { min: 200, max: 500, default: 350 },
    severe: { min: 500, max: 5000, default: 1000 },
  };

  const config = penalties[severity] || penalties.minor;
  return config.default;
};

/**
 * Get geolocation from browser
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

/**
 * Format inspection data for storage
 */
export const formatInspectionData = (inspectionData) => {
  return {
    ...inspectionData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "completed",
  };
};

/**
 * Calculate total extra charges from inspection
 */
export const calculateTotalCharges = (returnInspection, pickupInspection) => {
  const mileageCharge = calculateMileageCharge(
    pickupInspection.odometer,
    returnInspection.odometer,
    pickupInspection.days || 1
  );

  const fuelCharge = calculateFuelCharge(
    pickupInspection.fuelLevel,
    returnInspection.fuelLevel
  );

  const damageCharges = (returnInspection.damages || []).reduce(
    (sum, d) => sum + (d.penalty || 0),
    0
  );

  const cleaningFee = returnInspection.cleaningFee || 0;
  const lateFee = returnInspection.lateFee || 0;

  return {
    mileage: mileageCharge.charge,
    fuel: fuelCharge.charge,
    damages: damageCharges,
    cleaning: cleaningFee,
    lateReturn: lateFee,
    total: mileageCharge.charge + fuelCharge.charge + damageCharges + cleaningFee + lateFee,
    breakdown: {
      totalKms: mileageCharge.totalKms,
      extraKms: mileageCharge.extraKms,
      fuelDifference: fuelCharge.difference,
      damageCount: (returnInspection.damages || []).length,
    },
  };
};