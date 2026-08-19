// src/utils/paymentLedger.js
// ─────────────────────────────────────────────────────────────────────────────
// All Firestore operations for the payment system.
// The schema comment at the top is documentation only.
// Actual reads/writes are the exported functions below.
//
// GATEWAY UPGRADE PATH:
// When adding Razorpay/Stripe, find the three comments marked
// "GATEWAY HOOK" and add your gateway call there.
// Nothing else in the app needs to change.
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection, doc, addDoc, updateDoc, getDoc,
  getDocs, query, where, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  calculatePaymentBreakdown,
  calculateRefundAmount,
  calculateLateReturnPenalty,
  calculateNoShowPenalty,
  PAYMENT_CONFIG,
} from "../config/paymentConfig";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA REFERENCE (documentation — not executable code)
// ─────────────────────────────────────────────────────────────────────────────
//
// /payments/{paymentId}
// {
//   bookingId, userId, dealerId,
//   grossAmount, platformFee, dealerEarning,
//   taxAmount, taxBreakdown, netPlatformRevenue,
//   commissionRate,
//   status: "pending" | "received" | "partial" | "refunded" | "waived",
//   paidAmount, remainingAmount,
//   paymentMethod: "cash" | "upi" | "bank_transfer" | "card" | "gateway" | null,
//   transactionReference,
//   gatewayProvider: "razorpay" | "stripe" | null,
//   gatewayPaymentId, gatewayOrderId, gatewaySignature,
//   dueDate, paidAt, createdAt, updatedAt,
//   receiptGenerated, receiptUrl,
//   invoiceNumber,
//   type: "booking" | "penalty" | "extension" | "refund",
// }
//
// /commissions/{commissionId}
// {
//   paymentId, bookingId, dealerId,
//   grossAmount, commissionRate, commissionAmount,
//   status: "pending" | "settled" | "disputed",
//   settledAt, createdAt,
// }
//
// /penalties/{penaltyId}
// {
//   bookingId, userId, dealerId,
//   type: "late_return" | "no_show" | "damage",
//   penaltyAmount, extraDays (for late_return),
//   status: "pending" | "paid" | "waived",
//   waiveReason, waivedBy,
//   paymentId (linked when paid),
//   createdAt, updatedAt,
// }
//
// /payouts/{payoutId}
// {
//   dealerId, dealerEmail, dealerName,
//   amount, commissionIds (array),
//   method: "bank_transfer" | "upi" | "cash" | "gateway",
//   referenceNumber, notes,
//   status: "pending" | "processing" | "paid" | "failed",
//   periodStart, periodEnd,
//   paidAt, createdAt, processedBy (admin email),
// }

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE NUMBER GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateInvoiceNumber() {
  const year  = new Date().getFullYear();
  const rand  = Math.floor(10000 + Math.random() * 90000);
  return `${PAYMENT_CONFIG.INVOICE_PREFIX}-${year}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PAYMENT RECORD
// Called when a booking is confirmed. Creates the ledger entry.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a payment record for a confirmed booking.
 * @param {object} booking  - Full booking document from Firestore
 * @param {number} commissionRate - Override dealer commission (optional)
 */
export async function createPaymentRecord(booking, commissionRate) {

  // Guard against duplicate ledger entries: a booking can be confirmed from
  // several independent places (dealer manual confirm, admin approve, the
  // client auto-confirm effect, the statusScheduler rule engine). Not all of
  // those writes are transactional against each other, so it's possible for
  // two of them to both decide "this booking just became confirmed" and both
  // call this function. Without this check that would double-count revenue.
  const existing = await getPaymentByBookingId(booking.id);
  if (existing) return existing;

  // Fetch dealer's specific commission rate if not passed in
  if (commissionRate === undefined) {
    try {
      const dealerSnap = await getDoc(doc(db, "dealers", booking.dealerId));
      commissionRate = dealerSnap.exists()
        ? (dealerSnap.data().commissionRate ?? PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE)
        : PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE;
    } catch {
      commissionRate = PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE;
    }
  }

  const breakdown = calculatePaymentBreakdown(booking.total, commissionRate);

  const paymentData = {
    // References
    bookingId:    booking.bookingId || booking.id,
    bookingDocId: booking.id,
    userId:       booking.userId,
    userEmail:    booking.userEmail,
    dealerId:     booking.dealerId,
    type:         "booking",

    // Amounts
    ...breakdown,
    currency:         booking.currency     || PAYMENT_CONFIG.CURRENCY_DEFAULT,
    currencySymbol:   booking.currencySymbol || PAYMENT_CONFIG.CURRENCY_SYMBOL,
    // What the customer actually saw/agreed to at booking time, in their
    // currency — locked in on the booking itself so it never drifts even
    // if exchange rates move before someone views this later. Bookings
    // created before this field existed won't have it; fall back to
    // re-converting at today's rate for those (best effort, may not
    // exactly match what that customer originally saw).
    displayAmount:    booking.totalDisplayed ?? null,
    exchangeRateUsed: booking.exchangeRateAtBooking ?? null,

    // Status
    status:           "pending",
    paidAmount:       0,
    remainingAmount:  breakdown.grossAmount,

    // Payment method (filled when admin marks as received)
    paymentMethod:        null,
    transactionReference: "",

    // Gateway (empty until Stripe/Razorpay integrated)
    // ── GATEWAY HOOK 1: createGatewayOrder() result goes here ──
    gatewayProvider:  null,
    gatewayPaymentId: null,
    gatewayOrderId:   null,
    gatewaySignature: null,

    // Invoice
    invoiceNumber:    generateInvoiceNumber(),
    receiptGenerated: false,
    receiptUrl:       null,

    // Timestamps
    dueDate:    Timestamp.fromDate(new Date(booking.pickupDate || Date.now())),
    paidAt:     null,
    createdAt:  Timestamp.now(),
    updatedAt:  Timestamp.now(),
  };

  const paymentRef = await addDoc(collection(db, "payments"), paymentData);

  // Also create commission record
  await addDoc(collection(db, "commissions"), {
    paymentId:        paymentRef.id,
    bookingId:        booking.bookingId || booking.id,
    bookingDocId:     booking.id,
    dealerId:         booking.dealerId,
    grossAmount:      breakdown.grossAmount,
    commissionRate,
    commissionAmount: breakdown.platformFee,
    dealerEarning:    breakdown.dealerEarning,
    status:           "pending",
    settledAt:        null,
    createdAt:        Timestamp.now(),
  });

  return { paymentId: paymentRef.id, ...paymentData };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK PAYMENT AS RECEIVED
// Admin manually marks a payment as received (cash/UPI/bank transfer).
// When gateway added: this is called automatically by the webhook.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} paymentId
 * @param {object} opts
 * @param {number}  opts.paidAmount
 * @param {string}  opts.paymentMethod   "cash"|"upi"|"bank_transfer"|"card"|"gateway"
 * @param {string}  opts.transactionReference
 * @param {string}  opts.adminEmail
 */
export async function markPaymentReceived(paymentId, {
  paidAmount,
  paymentMethod,
  transactionReference = "",
  adminEmail = "",
}) {
  const ref  = doc(db, "payments", paymentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Payment record not found");

  const current        = snap.data();
  const newPaidAmount  = (current.paidAmount || 0) + paidAmount;
  const remaining      = Math.max(0, current.grossAmount - newPaidAmount);
  const isFullyPaid    = remaining === 0;

  // ── GATEWAY HOOK 2: verifyGatewaySignature() call goes here ──

  await updateDoc(ref, {
    paidAmount:           newPaidAmount,
    remainingAmount:      remaining,
    status:               isFullyPaid ? "received" : "partial",
    paymentMethod,
    transactionReference,
    paidAt:               isFullyPaid ? Timestamp.now() : null,
    receiptGenerated:     isFullyPaid,
    markedReceivedBy:     adminEmail,
    updatedAt:            Timestamp.now(),
  });

  // Mark commission as settled if fully paid
  if (isFullyPaid) {
    const commQ = query(
      collection(db, "commissions"),
      where("paymentId", "==", paymentId)
    );
    const commSnap = await getDocs(commQ);
    await Promise.all(
      commSnap.docs.map(d =>
        updateDoc(doc(db, "commissions", d.id), {
          status:     "settled",
          settledAt:  Timestamp.now(),
        })
      )
    );
  }

  return { paymentId, status: isFullyPaid ? "received" : "partial", remaining };
}

// ─────────────────────────────────────────────────────────────────────────────
// REFUND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a refund (manual for now; gateway refund call goes in GATEWAY HOOK 3).
 * @param {string} paymentId
 * @param {Date}   pickupDate
 * @param {string} adminEmail
 * @param {string} reason
 */
export async function processRefund(paymentId, pickupDate, adminEmail, reason = "") {
  const ref  = doc(db, "payments", paymentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Payment record not found");

  const current = snap.data();
  const { refundAmount, refundRate, penaltyAmount } =
    calculateRefundAmount(current.grossAmount, pickupDate);

  // ── GATEWAY HOOK 3: initiateGatewayRefund() call goes here ──

  await updateDoc(ref, {
    status:          "refunded",
    refundAmount,
    refundRate,
    penaltyAmount,
    refundReason:    reason,
    refundedBy:      adminEmail,
    refundedAt:      Timestamp.now(),
    updatedAt:       Timestamp.now(),
  });

  return { paymentId, refundAmount, penaltyAmount };
}

// ─────────────────────────────────────────────────────────────────────────────
// WAIVE PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function waivePayment(paymentId, adminEmail, reason) {
  await updateDoc(doc(db, "payments", paymentId), {
    status:      "waived",
    waiveReason: reason,
    waivedBy:    adminEmail,
    waivedAt:    Timestamp.now(),
    updatedAt:   Timestamp.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PENALTIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a late return penalty record.
 * @param {object} booking
 * @param {Date}   actualReturnTime
 */
export async function createLateReturnPenalty(booking, actualReturnTime = new Date()) {
  const dailyRate = (booking.total || 0) / (booking.days || 1);
  const result    = calculateLateReturnPenalty(
    dailyRate,
    booking.dropoffDate,
    actualReturnTime
  );

  if (!result.isLate) return null;

  const penaltyRef = await addDoc(collection(db, "penalties"), {
    bookingId:     booking.bookingId || booking.id,
    bookingDocId:  booking.id,
    userId:        booking.userId,
    userEmail:     booking.userEmail,
    dealerId:      booking.dealerId,
    type:          "late_return",
    penaltyAmount: result.penaltyAmount,
    extraDays:     result.extraDays,
    dailyPenalty:  result.dailyPenalty,
    status:        "pending",
    waiveReason:   null,
    waivedBy:      null,
    paymentId:     null,
    createdAt:     Timestamp.now(),
    updatedAt:     Timestamp.now(),
  });

  return { penaltyId: penaltyRef.id, ...result };
}

/**
 * Create a no-show penalty record.
 * @param {object} booking
 */
export async function createNoShowPenalty(booking) {
  const { penaltyAmount } = calculateNoShowPenalty(booking.total || 0);

  const penaltyRef = await addDoc(collection(db, "penalties"), {
    bookingId:     booking.bookingId || booking.id,
    bookingDocId:  booking.id,
    userId:        booking.userId,
    userEmail:     booking.userEmail,
    dealerId:      booking.dealerId,
    type:          "no_show",
    penaltyAmount,
    status:        "pending",
    waiveReason:   null,
    waivedBy:      null,
    paymentId:     null,
    createdAt:     Timestamp.now(),
    updatedAt:     Timestamp.now(),
  });

  return { penaltyId: penaltyRef.id, penaltyAmount };
}

/**
 * Waive a penalty (admin override).
 */
export async function waivePenalty(penaltyId, adminEmail, reason) {
  await updateDoc(doc(db, "penalties", penaltyId), {
    status:      "waived",
    waiveReason: reason,
    waivedBy:    adminEmail,
    waivedAt:    Timestamp.now(),
    updatedAt:   Timestamp.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DEALER PAYOUTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a payout record for a dealer.
 * @param {object} opts
 * @param {string}   opts.dealerId
 * @param {string}   opts.dealerEmail
 * @param {string}   opts.dealerName
 * @param {number}   opts.amount
 * @param {string[]} opts.commissionIds   - commission records being settled
 * @param {string}   opts.method
 * @param {string}   opts.referenceNumber
 * @param {string}   opts.notes
 * @param {Date}     opts.periodStart
 * @param {Date}     opts.periodEnd
 * @param {string}   opts.processedBy     - admin email
 */
export async function createPayoutRecord({
  dealerId, dealerEmail, dealerName,
  amount, commissionIds = [],
  method, referenceNumber = "", notes = "",
  periodStart, periodEnd,
  processedBy,
}) {
  const payoutRef = await addDoc(collection(db, "payouts"), {
    dealerId, dealerEmail, dealerName,
    amount,
    commissionIds,
    method,
    referenceNumber,
    notes,
    status:      "paid",
    periodStart: Timestamp.fromDate(new Date(periodStart)),
    periodEnd:   Timestamp.fromDate(new Date(periodEnd)),
    paidAt:      Timestamp.now(),
    createdAt:   Timestamp.now(),
    processedBy,
  });

  // Mark all included commissions as settled
  await Promise.all(
    commissionIds.map(id =>
      updateDoc(doc(db, "commissions", id), {
        status:    "settled",
        payoutId:  payoutRef.id,
        settledAt: Timestamp.now(),
      })
    )
  );

  return { payoutId: payoutRef.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// READ HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Get a single payment record by Firestore doc ID */
export async function getPaymentById(paymentId) {
  const snap = await getDoc(doc(db, "payments", paymentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get payment record linked to a booking */
export async function getPaymentByBookingId(bookingDocId) {
  const q    = query(collection(db, "payments"), where("bookingDocId", "==", bookingDocId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/** Get all payments for a dealer (for payout calculation) */
export async function getDealerPayments(dealerId, status = null) {
  let q = query(
    collection(db, "payments"),
    where("dealerId", "==", dealerId),
    orderBy("createdAt", "desc")
  );
  if (status) {
    q = query(
      collection(db, "payments"),
      where("dealerId", "==", dealerId),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get unsettled commissions for a dealer (what they're owed) */
export async function getDealerUnsettledCommissions(dealerId) {
  const q    = query(
    collection(db, "commissions"),
    where("dealerId", "==", dealerId),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get all payouts for a dealer */
export async function getDealerPayouts(dealerId) {
  const q    = query(
    collection(db, "payouts"),
    where("dealerId", "==", dealerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get all pending penalties (for admin dashboard) */
export async function getPendingPenalties() {
  const q    = query(
    collection(db, "penalties"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get platform revenue summary for a date range */
export async function getPlatformRevenueSummary(startDate, endDate) {
  const q = query(
    collection(db, "payments"),
    where("createdAt", ">=", Timestamp.fromDate(startDate)),
    where("createdAt", "<=", Timestamp.fromDate(endDate)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  const payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    totalGross:        sum(payments, "grossAmount"),
    totalPlatformFee:  sum(payments, "platformFee"),
    totalDealerEarned: sum(payments, "dealerEarning"),
    totalTax:          sum(payments, "taxAmount"),
    totalNetRevenue:   sum(payments, "netPlatformRevenue"),
    totalPaid:         sum(payments.filter(p => p.status === "received"), "paidAmount"),
    totalPending:      sum(payments.filter(p => p.status === "pending"),  "remainingAmount"),
    count:             payments.length,
    payments,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE RULES NEEDED (add these to your rules file)
// ─────────────────────────────────────────────────────────────────────────────
//
// match /payments/{paymentId} {
//   allow read:   if request.auth != null && (isAdmin() || resource.data.userId == request.auth.uid || (isDealerApproved() && resource.data.dealerId == getDealerId()));
//   allow create: if request.auth != null;
//   allow update: if request.auth != null && isAdmin();
//   allow delete: if isAdmin();
// }
// match /commissions/{commissionId} {
//   allow read:   if request.auth != null && (isAdmin() || (isDealerApproved() && resource.data.dealerId == getDealerId()));
//   allow write:  if request.auth != null && isAdmin();
// }
// match /penalties/{penaltyId} {
//   allow read:   if request.auth != null && (isAdmin() || resource.data.userId == request.auth.uid);
//   allow write:  if request.auth != null && isAdmin();
// }
// match /payouts/{payoutId} {
//   allow read:   if request.auth != null && (isAdmin() || (isDealerApproved() && resource.data.dealerId == getDealerId()));
//   allow write:  if request.auth != null && isAdmin();
// }

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function sum(arr, key) {
  return Math.round(arr.reduce((s, item) => s + (item[key] || 0), 0) * 100) / 100;
}