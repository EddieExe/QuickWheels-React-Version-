// src/config/paymentConfig.js
// ─────────────────────────────────────────────────────────────────────────────
// Central config for all financial calculations.
// When you integrate a real gateway, only this file + paymentLedger.js change.
// ─────────────────────────────────────────────────────────────────────────────

export const PAYMENT_CONFIG = {

  // ── Platform Commission ───────────────────────────────────────────────────
  // Default % QuickWheels keeps from each booking.
  // Can be overridden per dealer in their Firestore doc (dealer.commissionRate).
  DEFAULT_COMMISSION_RATE: 0.10,       // 10%
  MIN_COMMISSION_RATE:     0.05,       // 5%  — floor for negotiations
  MAX_COMMISSION_RATE:     0.25,       // 25% — ceiling

  // ── Tax (GST) ─────────────────────────────────────────────────────────────
  // GST applies on the platform fee (your revenue), not the full booking amount.
  // Standard GST for rental/service platforms in India = 18%.
  GST_RATE:           0.18,
  GST_COMPONENTS: {
    CGST: 0.09,   // Central GST
    SGST: 0.09,   // State GST (same state transactions)
    IGST: 0.18,   // Integrated GST (cross-state transactions — use instead of CGST+SGST)
  },
  DEFAULT_GST_TYPE: "CGST_SGST",       // "CGST_SGST" | "IGST"

  // ── Late Return Penalties ─────────────────────────────────────────────────
  LATE_RETURN_MULTIPLIER:    1.5,      // 1.5x daily rate per extra day
  LATE_RETURN_GRACE_HOURS:   2,        // hours after dropoff before penalty triggers
  MAX_PENALTY_DAYS:          7,        // cap penalty at 7 extra days regardless

  // ── No-Show Penalties ────────────────────────────────────────────────────
  NO_SHOW_PENALTY_RATE:      0.20,     // 20% of total booking as no-show fee
  NO_SHOW_PENALTY_MIN:       200,      // minimum ₹200 (in base currency)

  // ── Extension Pricing ────────────────────────────────────────────────────
  EXTENSION_MULTIPLIER:      1.0,      // same daily rate (1.0x) for extensions
  // Set to 1.2 if you want to charge more for last-minute extensions

  // ── Refund Policy ────────────────────────────────────────────────────────
  REFUND_RULES: {
    MORE_THAN_48H:  1.00,   // 100% refund if cancelled 48h+ before pickup
    BETWEEN_24_48H: 0.75,   // 75% refund
    BETWEEN_12_24H: 0.50,   // 50% refund
    LESS_THAN_12H:  0.00,   // no refund
  },

  // ── Invoice ───────────────────────────────────────────────────────────────
  INVOICE_PREFIX:   "QW-INV",
  CURRENCY_DEFAULT: "INR",
  CURRENCY_SYMBOL:  "₹",

  // ── Gateway (empty now — fill when integrating) ───────────────────────────
  GATEWAY: {
    PROVIDER:    null,           // "razorpay" | "stripe" | null
    LIVE_MODE:   false,
    // Razorpay keys go here when ready:
    // RAZORPAY_KEY_ID:     "",
    // RAZORPAY_KEY_SECRET: "",  // server-side only — never expose in client
    // Stripe keys go here when ready:
    // STRIPE_PUBLISHABLE_KEY: "",
  },
};

// ── Derived helpers ───────────────────────────────────────────────────────────

/**
 * Calculate the full payment breakdown for a booking.
 * Returns every figure the ledger, invoice, and UI will need.
 *
 * @param {number} grossAmount   - Total booking amount charged to customer
 * @param {number} commissionRate - Dealer-specific rate (falls back to default)
 * @param {string} gstType        - "CGST_SGST" | "IGST"
 */
export function calculatePaymentBreakdown(
  grossAmount,
  commissionRate = PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE,
  gstType        = PAYMENT_CONFIG.DEFAULT_GST_TYPE
) {
  const platformFee      = grossAmount * commissionRate;
  const dealerEarning    = grossAmount - platformFee;

  let taxBreakdown = {};
  let taxAmount    = 0;

  if (gstType === "IGST") {
    taxAmount = platformFee * PAYMENT_CONFIG.GST_COMPONENTS.IGST;
    taxBreakdown = { IGST: taxAmount };
  } else {
    const cgst = platformFee * PAYMENT_CONFIG.GST_COMPONENTS.CGST;
    const sgst = platformFee * PAYMENT_CONFIG.GST_COMPONENTS.SGST;
    taxAmount   = cgst + sgst;
    taxBreakdown = { CGST: cgst, SGST: sgst };
  }

  const netPlatformRevenue = platformFee - taxAmount;

  return {
    grossAmount:          round2(grossAmount),
    commissionRate,
    platformFee:          round2(platformFee),
    dealerEarning:        round2(dealerEarning),
    taxAmount:            round2(taxAmount),
    taxBreakdown:         Object.fromEntries(
                            Object.entries(taxBreakdown).map(([k,v]) => [k, round2(v)])
                          ),
    gstType,
    netPlatformRevenue:   round2(netPlatformRevenue),
  };
}

/**
 * Calculate refund amount based on how far before pickup the cancellation is.
 * @param {number} grossAmount
 * @param {Date}   pickupDate
 * @param {Date}   cancelledAt  (defaults to now)
 */
export function calculateRefundAmount(grossAmount, pickupDate, cancelledAt = new Date()) {
  const hoursUntilPickup = (new Date(pickupDate) - cancelledAt) / (1000 * 60 * 60);
  const rules = PAYMENT_CONFIG.REFUND_RULES;

  let refundRate;
  if      (hoursUntilPickup >= 48) refundRate = rules.MORE_THAN_48H;
  else if (hoursUntilPickup >= 24) refundRate = rules.BETWEEN_24_48H;
  else if (hoursUntilPickup >= 12) refundRate = rules.BETWEEN_12_24H;
  else                              refundRate = rules.LESS_THAN_12H;

  return {
    refundRate,
    refundAmount:    round2(grossAmount * refundRate),
    penaltyAmount:   round2(grossAmount * (1 - refundRate)),
    hoursUntilPickup: Math.round(hoursUntilPickup),
  };
}

/**
 * Calculate late return penalty.
 * @param {number} dailyRate
 * @param {Date}   expectedReturn
 * @param {Date}   actualReturn    (defaults to now)
 */
export function calculateLateReturnPenalty(dailyRate, expectedReturn, actualReturn = new Date()) {
  const graceMs    = PAYMENT_CONFIG.LATE_RETURN_GRACE_HOURS * 60 * 60 * 1000;
  const overdue    = actualReturn - new Date(expectedReturn) - graceMs;

  if (overdue <= 0) return { isLate: false, extraDays: 0, penaltyAmount: 0 };

  const extraDays     = Math.min(
    Math.ceil(overdue / (1000 * 60 * 60 * 24)),
    PAYMENT_CONFIG.MAX_PENALTY_DAYS
  );
  const penaltyAmount = dailyRate * extraDays * PAYMENT_CONFIG.LATE_RETURN_MULTIPLIER;

  return {
    isLate:        true,
    extraDays,
    penaltyAmount: round2(penaltyAmount),
    dailyPenalty:  round2(dailyRate * PAYMENT_CONFIG.LATE_RETURN_MULTIPLIER),
  };
}

/**
 * Calculate no-show penalty.
 * @param {number} grossAmount
 */
export function calculateNoShowPenalty(grossAmount) {
  const penalty = Math.max(
    grossAmount * PAYMENT_CONFIG.NO_SHOW_PENALTY_RATE,
    PAYMENT_CONFIG.NO_SHOW_PENALTY_MIN
  );
  return { penaltyAmount: round2(penalty) };
}

// ── Internal ──────────────────────────────────────────────────────────────────
function round2(n) {
  return Math.round(n * 100) / 100;
}