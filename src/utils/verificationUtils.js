// src/utils/verificationUtils.js
import { db } from "../firebase";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import emailjs from "@emailjs/browser";
import { uploadToCloudinary } from "./uploadImage";

/**
 * Generate a unique verification code
 * @returns {string} 6-digit code
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification code to customer
 * @param {string} email - Customer email
 * @param {string} code - Verification code
 * @param {string} name - Customer name
 */
export const sendVerificationCode = async (email, code, name) => {
  const SERVICE_ID = "service_crw994k";
  const TEMPLATE_ID = "template_npbllll"; // ✅ Using your existing working template
  const PUBLIC_KEY = "TJIFq6s5ghB-Qg91W";
  
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        email: email,
        email_subject: "🔐 Your QuickWheels Verification Code",
        greeting: `Hi ${name || "Customer"}!`,
        email_subtitle: "Identity Verification Required",
        admin_message: `Your verification code is: <strong style="font-size: 24px; letter-spacing: 4px;">${code}</strong>\n\nThis code expires in 10 minutes.\n\n⚠️ Do not share this code with anyone. Our staff will never ask for this code.`,
        admin_message_bg: "#f0f9ff",
        admin_message_border: "4px solid #4ce3f7",
        admin_message_padding: "20px 24px",
        admin_message_margin: "0 0 24px",
        header_color: "linear-gradient(135deg,#064e3b,#22c55e)",
        header_subtitle: "Verification",
        email_icon: "🔐",
        car_model: "",
        pickup: "",
        dropoff: "",
        date_label: "",
        date_value: "",
        extra_label: "",
        extra_value: "",
        amount_label: "",
        total: "",
        days: "",
        car_total: "",
        addons_total: "",
        addons: "",
        addons_display: "none",
        footer_message: "This code expires in 10 minutes. Do not share it with anyone.",
        booking_id: "",
        details_title: "",
      },
      PUBLIC_KEY
    );
    return true;
  } catch (error) {
    console.error("Failed to send verification code:", error);
    return false;
  }
};

/**
 * Upload customer ID document
 * @param {File} file - ID document file
 * @param {string} bookingId - Booking ID
 * @param {string} docType - Type of document (aadhar, passport, license)
 * @returns {Promise<string>} Download URL
 */
export const uploadCustomerID = async (file, bookingId, docType) => {
  try {
    // ✅ Use Cloudinary instead of Firebase Storage
    const result = await uploadToCloudinary(file);
    return result.url;
  } catch (error) {
    console.error("Failed to upload customer ID:", error);
    throw error;
  }
};

/**
 * Generate digital signature canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Promise<string>} Image URL
 */
export const saveDigitalSignature = async (canvas, bookingId, signerType) => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Failed to create signature blob"));
        return;
      }
      
      const file = new File([blob], `signature_${signerType}.png`, { type: "image/png" });
      
      try {
        // ✅ Use Cloudinary instead of Firebase Storage
        const result = await uploadToCloudinary(file);
        resolve(result.url);
      } catch (error) {
        reject(error);
      }
    }, "image/png");
  });
};

/**
 * Calculate security deposit release amount
 * @param {number} deposit - Original deposit amount
 * @param {number} extraCharges - Extra charges from return inspection
 * @returns {object} Release amount and breakdown
 */
export const calculateDepositRelease = (deposit, extraCharges) => {
  const releaseAmount = Math.max(0, deposit - extraCharges);
  const deductedAmount = deposit - releaseAmount;
  
  return {
    releaseAmount,
    deductedAmount,
    deposit,
    extraCharges,
  };
};

/**
 * Generate final invoice HTML
 * @param {object} booking - Booking data
 * @param {object} inspection - Return inspection data
 * @param {object} extraCharges - Calculated extra charges
 * @returns {string} HTML invoice
 */
export const generateInvoiceHTML = (booking, inspection, extraCharges) => {
  const subtotal = booking.total || 0;
  const total = subtotal + (extraCharges?.total || 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .invoice-header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 30px; text-align: center; }
        .invoice-header h1 { margin: 0 0 10px; font-size: 28px; }
        .invoice-header p { margin: 0; opacity: 0.8; }
        .invoice-body { padding: 30px; }
        .invoice-section { margin-bottom: 30px; }
        .invoice-section h3 { color: #4ce3f7; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .invoice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .invoice-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #ddd; margin-top: 10px; padding-top: 15px; }
        .invoice-footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
        .signature-box { text-align: center; flex: 1; }
        .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 10px; width: 80%; margin: 30px auto 0; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <h1>🚗 FINAL INVOICE</h1>
          <p>Booking #${booking.bookingId?.slice(-8) || booking.id?.slice(-8)}</p>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="invoice-body">
          <div class="invoice-section">
            <h3>📋 Booking Details</h3>
            <div class="invoice-row">
              <span>Vehicle:</span>
              <strong>${booking.carModel}</strong>
            </div>
            <div class="invoice-row">
              <span>Pickup Location:</span>
              <span>${booking.pickup}</span>
            </div>
            <div class="invoice-row">
              <span>Dropoff Location:</span>
              <span>${booking.dropoff}</span>
            </div>
            <div class="invoice-row">
              <span>Rental Period:</span>
              <span>${booking.pickupDate} to ${booking.dropoffDate} (${booking.days} days)</span>
            </div>
          </div>
          
          <div class="invoice-section">
            <h3>💰 Charges Breakdown</h3>
            <div class="invoice-row">
              <span>Base Rental Amount (${booking.days} days × ${booking.dailyRate || Math.round(booking.total / booking.days)}/day)</span>
              <span>$${subtotal.toLocaleString()}</span>
            </div>
            
            ${extraCharges?.breakdown?.extraKms > 0 ? `
            <div class="invoice-row">
              <span>Extra Mileage (${extraCharges.breakdown.extraKms} km @ $0.50/km)</span>
              <span>$${extraCharges.mileage?.toFixed(2) || 0}</span>
            </div>
            ` : ''}
            
            ${extraCharges?.breakdown?.fuelDifference > 0 ? `
            <div class="invoice-row">
              <span>Fuel Refill (${extraCharges.breakdown.fuelDifference}% missing)</span>
              <span>$${extraCharges.fuel?.toFixed(2) || 0}</span>
            </div>
            ` : ''}
            
            ${extraCharges?.damages > 0 ? `
            <div class="invoice-row">
              <span>Damage Penalty</span>
              <span>$${extraCharges.damages?.toFixed(2) || 0}</span>
            </div>
            ` : ''}
            
            ${extraCharges?.cleaning > 0 ? `
            <div class="invoice-row">
              <span>Cleaning Fee</span>
              <span>$${extraCharges.cleaning?.toFixed(2) || 0}</span>
            </div>
            ` : ''}
            
            ${extraCharges?.lateReturn > 0 ? `
            <div class="invoice-row">
              <span>Late Return Fee</span>
              <span>$${extraCharges.lateReturn?.toFixed(2) || 0}</span>
            </div>
            ` : ''}
            
            <div class="invoice-row total">
              <span>TOTAL AMOUNT</span>
              <span>$${total.toLocaleString()}</span>
            </div>
          </div>
          
          <div class="invoice-section">
            <h3>🔒 Security Deposit</h3>
            <div class="invoice-row">
              <span>Deposit Collected:</span>
              <span>$${(booking.securityDeposit || 200).toLocaleString()}</span>
            </div>
            <div class="invoice-row">
              <span>Extra Charges Deducted:</span>
              <span>-$${(extraCharges?.total || 0).toLocaleString()}</span>
            </div>
            <div class="invoice-row total">
              <span>Deposit Released:</span>
              <span>$${((booking.securityDeposit || 200) - (extraCharges?.total || 0)).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="signature-area">
            <div class="signature-box">
              <div class="signature-line"></div>
              <p>Customer Signature</p>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <p>Dealer Signature</p>
            </div>
          </div>
        </div>
        
        <div class="invoice-footer">
          <p>Thank you for choosing Quick Wheels! Safe travels! 🚀</p>
          <p>For any queries, contact support@quickwheels.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send invoice email to customer
 * @param {object} booking - Booking data
 * @param {object} extraCharges - Extra charges
 * @param {string} invoiceHTML - HTML invoice content
 */
export const sendInvoiceEmail = async (booking, extraCharges, invoiceHTML) => {
  const SERVICE_ID = "service_crw994k";
  const TEMPLATE_ID = "template_invoice";
  const PUBLIC_KEY = "TJIFq6s5ghB-Qg91W";
  
  try {
    // Note: EmailJS may not support sending raw HTML easily
    // Consider using a proper email service or convert to PDF first
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: booking.userEmail,
        to_name: booking.userName || "Customer",
        booking_id: booking.bookingId,
        car_model: booking.carModel,
        pickup_date: booking.pickupDate,
        dropoff_date: booking.dropoffDate,
        base_amount: booking.total || 0,
        extra_charges: extraCharges?.total || 0,
        total_amount: (booking.total || 0) + (extraCharges?.total || 0),
        // You might need to upload the HTML to Cloudinary first
        invoice_link: invoiceHTML, // This might not work as expected
      },
      PUBLIC_KEY
    );
    return true;
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    return false;
  }
};

/**
 * Update booking status with timeline
 * @param {string} bookingId - Booking ID
 * @param {string} status - New status
 * @param {object} metadata - Additional data
 */
export const updateBookingStatus = async (bookingId, status, metadata = {}) => {
  const bookingRef = doc(db, "bookings", bookingId);
  const updates = {
    status,
    [`timeline.${status}`]: new Date().toISOString(),
    ...metadata,
  };
  
  await updateDoc(bookingRef, updates);
  
  // Add to status history
  const historyRef = doc(db, "bookings", bookingId, "statusHistory", Date.now().toString());
  await setDoc(historyRef, {
    status,
    timestamp: new Date().toISOString(),
    metadata,
  });
};

// Add this function to vehicleStatusUtils.js
export const getCarStatus = (car) => {
  // If car has new status field, use it
  if (car.status && VEHICLE_STATUS[car.status.toUpperCase()]) {
    return car.status;
  }
  
  // Map old isAvailable to new status
  if (car.isAvailable === true) {
    return "available";
  } else if (car.isAvailable === false) {
    return "unavailable";
  }
  
  return "available";
};