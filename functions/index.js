// location: src/functions/index.js

const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const https = require("https");

initializeApp();
const db = getFirestore();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");

// ── System Logging ─────────────────────────────────────────
async function logSystemEvent(level, message, details = {}) {
  try {
    await db.collection("system_logs").add({
      level, // 'info', 'warn', 'error'
      message,
      details,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to write system log:", err.message);
  }
}

// ── Email with Retry ───────────────────────────────────────
// removed the repeated const https = require("https"), and keeps it at the top only

async function sendEmailWithRetry(
  to,
  subject,
  html,
  type,
  booking,
  retryCount = 0,
) {
  const maxRetries = 3;
  const retryDelays = [60000, 300000, 900000];

  try {
    // Call EmailJS REST API from backend
    const payload = JSON.stringify({
      service_id: "service_crw994k",
      template_id: "template_npbllll",
      user_id: "TJIFq6s5ghB-Qg91W",
      accessToken: "NvSGsx-OQXTuPtEjDp8tV",
      template_params: {
        email: to,
        email_subject: subject,
        car_model: booking.carModel,
        admin_message: html,
        // Add more template variables as needed
        user_name: booking.userName || "Customer",
        pickup_date: booking.pickupDate || "",
        dropoff_date: booking.dropoffDate || "",
        pickup_location: booking.pickup || "",
        dropoff_location: booking.dropoff || "",
        total_amount: booking.total || "",
      },
    });

    await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.emailjs.com",
          path: "/api/v1.0/email/send",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let responseData = "";
          res.on("data", (chunk) => {
            responseData += chunk;
          });
          res.on("end", () => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`EmailJS ${res.statusCode}: ${responseData}`));
            }
          });
        },
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });

    await db.collection("email_logs").add({
      to,
      type,
      subject,
      success: true,
      sentAt: FieldValue.serverTimestamp(),
      retryCount,
    });
    return true;
  } catch (error) {
    await db.collection("email_logs").add({
      to,
      type,
      subject,
      success: false,
      error: error.message,
      retryCount,
      sentAt: FieldValue.serverTimestamp(),
    });

    if (retryCount < maxRetries) {
      await new Promise((r) => setTimeout(r, retryDelays[retryCount]));
      return sendEmailWithRetry(
        to,
        subject,
        html,
        type,
        booking,
        retryCount + 1,
      );
    }

    // Inside sendEmailWithRetry, replace the dead_letter_queue.add call:
    await db.collection("dead_letter_queue").add({
      to,
      type,
      subject,
      html,
      bookingId: booking.id,
      carModel: booking.carModel,
      userName: booking.userName,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      pickupDate: booking.pickupDate,
      dropoffDate: booking.dropoffDate,
      total: booking.total,
      error: error.message,
      failedAt: FieldValue.serverTimestamp(),
    });
    return false;
  }
}

// ── Helper functions FIRST (before they're used) ──────────
function getEmailSubject(type, booking) {
  const subjects = {
    pickup_reminder: `🚗 Pickup Reminder: ${booking.carModel}`,
    return_reminder: `🔄 Return Reminder: ${booking.carModel}`,
    late_return: `⚠️ Late Return Alert: ${booking.carModel}`,
    no_show_penalty: `❌ No-Show Penalty Applied`,
    booking_confirmed: `✅ Booking Confirmed: ${booking.carModel}`,
    pickup_2h_reminder: `⏰ Pickup in 2 Hours: ${booking.carModel}`,
    emergency_sos: `🚨 EMERGENCY — QuickWheels SOS Alert`,
  };
  return subjects[type] || "QuickWheels Update";
}

async function getEmailHTML(type, booking) {
  try {
    const templateDoc = await db.collection("email_templates").doc(type).get();
    if (templateDoc.exists) {
      let html = templateDoc.data().html || "";
      // Replace template variables
      html = html
        .replace(/\{\{userName\}\}/g, booking.userName || "Customer")
        .replace(/\{\{carModel\}\}/g, booking.carModel || "")
        .replace(/\{\{pickupDate\}\}/g, booking.pickupDate || "")
        .replace(/\{\{dropoffDate\}\}/g, booking.dropoffDate || "")
        .replace(/\{\{pickup\}\}/g, booking.pickup || "")
        .replace(/\{\{dropoff\}\}/g, booking.dropoff || "")
        .replace(/\{\{total\}\}/g, booking.total || "");
      return html;
    }
  } catch (e) {
    console.error("Template fetch failed, using fallback:", e.message);
  }

  // Fallback to hardcoded templates
  const templates = {
    pickup_reminder: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🚗 Pickup Reminder</h2>
        <p>Your ${booking.carModel} is ready for pickup.</p>
        <p><strong>Pickup Date:</strong> ${booking.pickupDate}</p>
        <p><strong>Location:</strong> ${booking.pickup}</p>
        <p>Please arrive on time to collect your vehicle.</p>
      </div>
    `,
    return_reminder: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🔄 Return Reminder</h2>
        <p>Please return your ${booking.carModel} today.</p>
        <p><strong>Return Date:</strong> ${booking.dropoffDate}</p>
        <p><strong>Location:</strong> ${booking.dropoff}</p>
      </div>
    `,
    late_return: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>⚠️ Late Return Alert</h2>
        <p>Your ${booking.carModel} is overdue for return.</p>
        <p>Please return the vehicle immediately to avoid additional charges.</p>
      </div>
    `,
    no_show_penalty: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>❌ No-Show Penalty Applied</h2>
        <p>You missed your pickup for ${booking.carModel}.</p>
        <p>A penalty of 50% of the booking amount has been applied.</p>
      </div>
    `,
    booking_confirmed: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>✅ Booking Confirmed!</h2>
        <p>Your booking for ${booking.carModel} has been confirmed.</p>
        <p><strong>Pickup:</strong> ${booking.pickupDate} at ${booking.pickup}</p>
        <p><strong>Dropoff:</strong> ${booking.dropoffDate} at ${booking.dropoff}</p>
      </div>
    `,
    pickup_2h_reminder: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>⏰ Pickup in 2 Hours!</h2>
        <p>Your ${booking.carModel} pickup is in about 2 hours.</p>
        <p>Please head to the pickup location.</p>
      </div>
    `,
    emergency_sos: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 3px solid #ef4444;">
        <h2 style="color: #ef4444;">🚨 EMERGENCY ALERT</h2>
        <p><strong>User:</strong> ${booking.userName || "Unknown"} (${booking.userEmail || "no email"})</p>
        ${booking.locationUrl ? `<p><strong>📍 Location:</strong> <a href="${booking.locationUrl}">${booking.locationUrl}</a></p>` : "<p>📍 Location: Not available</p>"}
        ${booking.coordinates ? `<p><strong>Coordinates:</strong> ${booking.coordinates}</p>` : ""}
        ${booking.carModel ? `<p><strong>🚗 Vehicle:</strong> ${booking.carModel} (${booking.numberPlate || "N/A"})</p>` : ""}
        ${booking.id ? `<p><strong>🆔 Booking:</strong> ${booking.id}</p>` : ""}
        <p style="color: #ef4444; font-weight: bold;">Please respond immediately.</p>
      </div>
    `,
  };
  return (
    templates[type] ||
    `<div>Your ${booking.carModel} update from QuickWheels</div>`
  );
}

// ── Status constants ─────────────────────────────────────
const WATCHABLE = [
  "pending_approval",
  "confirmed",
  "upcoming_trip",
  "pickup_awaited",
  "ongoing_trip",
  "return_pending",
];

const VALID_TRANSITIONS = {
  pending_approval: ["confirmed", "rejected", "on_hold", "cancelled"],
  confirmed: ["upcoming_trip", "pickup_awaited", "on_hold", "cancelled"],
  upcoming_trip: ["pickup_awaited", "on_hold", "cancelled"],
  pickup_awaited: ["ongoing_trip", "no_show", "cancelled"],
  ongoing_trip: ["return_pending", "completed", "cancelled"],
  return_pending: ["completed", "cancelled"],
  on_hold: ["confirmed", "cancelled", "rejected"],
};

function parseDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.seconds === "number")
    return new Date(value.seconds * 1000);
  if (typeof value === "string") {
    const s = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function transition(
  bookingId,
  currentStatus,
  newStatus,
  reason,
  extra = {},
) {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus))
    return { success: false, error: "Invalid transition" };

  const ref = db.collection("bookings").doc(bookingId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Not found");
      if (snap.data().status !== currentStatus)
        throw new Error("Status changed concurrently");

      tx.update(ref, {
        status: newStatus,
        previousStatus: currentStatus,
        statusUpdatedAt: FieldValue.serverTimestamp(),
        statusUpdatedBy: "system",
        statusTransitionReason: reason,
        ...extra,
      });
    });

    // Log the successful transition
    await logSystemEvent(
      "info",
      `Transitioned booking ${bookingId} from ${currentStatus} to ${newStatus}`,
      { reason },
    );

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function sendNotification(userId, type, data) {
  if (!userId) return;
  try {
    await db.collection("notifications").add({
      userId,
      type,
      ...data,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn("Notification failed:", e.message);
  }
}

async function sendReminderEmail(booking, type) {
  await db.collection("email_queue").add({
    to: booking.userEmail,
    type,
    bookingId: booking.id,
    carModel: booking.carModel,
    userName: booking.userName || booking.userEmail,
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    pickupDate: booking.pickupDate,
    dropoffDate: booking.dropoffDate,
    total: booking.total,
    createdAt: FieldValue.serverTimestamp(),
    sent: false,
  });
}

async function processBooking(booking) {
  // Add logging at the beginning
  await logSystemEvent("info", `Processing booking ${booking.id}`, {
    status: booking.status,
  });

  const now = Date.now();
  const pickup = parseDate(booking.pickupDate);
  const dropoff = parseDate(booking.dropoffDate);
  const status = booking.status;

  if (status === "pending_approval") {
    const createdAt = parseDate(booking.createdAt);
    if (createdAt && now >= createdAt.getTime() + 60 * 60 * 1000) {
      const res = await transition(
        booking.id,
        status,
        "confirmed",
        "Auto-confirmed after 60 minutes",
      );
      if (res.success) {
        await sendNotification(booking.userId, "booking_confirmed", {
          title: "Booking Auto-Confirmed",
          body: `Your booking for ${booking.carModel} has been confirmed.`,
          bookingId: booking.id,
        });
        await sendReminderEmail(booking, "booking_confirmed");
        console.log(`[A9.1] Auto-confirmed ${booking.id}`);
      }
    }
    return;
  }

  if (status === "confirmed" && pickup) {
    const windowStart = pickup.getTime() - 24 * 60 * 60 * 1000;
    if (now >= windowStart && now < pickup.getTime()) {
      const res = await transition(
        booking.id,
        status,
        "upcoming_trip",
        "Trip starts within 24 hours",
      );
      if (res.success) {
        await sendNotification(booking.userId, "trip_upcoming", {
          title: "Trip Tomorrow!",
          body: `Your ${booking.carModel} pickup is tomorrow.`,
          bookingId: booking.id,
        });
        await sendReminderEmail(booking, "pickup_reminder");
      }
      return;
    }
  }

  if (["confirmed", "upcoming_trip"].includes(status) && pickup) {
    const dayEnd = pickup.getTime() + 24 * 60 * 60 * 1000;
    if (now >= pickup.getTime() && now < dayEnd) {
      const res = await transition(
        booking.id,
        status,
        "pickup_awaited",
        "Pickup day has arrived",
      );
      if (res.success) {
        await sendNotification(booking.userId, "pickup_day", {
          title: "Pickup Day!",
          body: `Today is your pickup day for ${booking.carModel}.`,
          bookingId: booking.id,
        });
      }
      return;
    }
  }

  if (status === "pickup_awaited" && pickup && !booking.pickupConfirmed) {
    const noShowTime = pickup.getTime() + 2 * 60 * 60 * 1000;
    if (now >= noShowTime) {
      const penalty = Math.round((booking.total || 0) * 0.5);
      const res = await transition(
        booking.id,
        status,
        "no_show",
        "Customer did not show up within 2 hours",
        {
          noShowAt: FieldValue.serverTimestamp(),
          penaltyApplied: true,
          penaltyAmount: penalty,
        },
      );
      if (res.success) {
        await sendNotification(booking.userId, "no_show", {
          title: "No-Show Recorded",
          body: `You missed your pickup for ${booking.carModel}. A penalty of $${penalty} applies.`,
          bookingId: booking.id,
        });
        await sendReminderEmail(booking, "no_show_penalty");
        console.log(`[A9.2] No-show ${booking.id}, penalty $${penalty}`);
      }
      return;
    }
  }

  if (status === "ongoing_trip" && dropoff) {
    const dayEnd = dropoff.getTime() + 24 * 60 * 60 * 1000;
    if (now >= dropoff.getTime() && now < dayEnd) {
      const res = await transition(
        booking.id,
        status,
        "return_pending",
        "Return day — car return expected today",
      );
      if (res.success) {
        await sendNotification(booking.userId, "return_today", {
          title: "Return Due Today",
          body: `Please return ${booking.carModel} today.`,
          bookingId: booking.id,
        });
        await sendReminderEmail(booking, "return_reminder");
      }
      return;
    }
  }

  if (
    status === "return_pending" &&
    dropoff &&
    !booking.dropoffConfirmed &&
    !booking.lateReturnNotified
  ) {
    const lateTime = dropoff.getTime() + 2 * 60 * 60 * 1000;
    if (now >= lateTime) {
      const hoursLate = Math.max(
        1,
        Math.round((now - dropoff.getTime()) / 3600000),
      );
      const fee = hoursLate * 200;

      await db.runTransaction(async (tx) => {
        const ref = db.collection("bookings").doc(booking.id);
        const snap = await tx.get(ref);
        if (snap.data().lateReturnNotified) return;
        tx.update(ref, {
          lateReturnNotified: true,
          lateReturnAt: FieldValue.serverTimestamp(),
          lateReturnHours: hoursLate,
          lateReturnFee: fee,
        });
      });

      await sendNotification(booking.userId, "late_return", {
        title: "Late Return Fee Applied",
        body: `Your ${booking.carModel} is ${hoursLate}h overdue. Fee: $${fee}.`,
        bookingId: booking.id,
      });
      await sendReminderEmail(booking, "late_return");
      console.log(`[A9.3] Late fee ${booking.id}: $${fee} (${hoursLate}h)`);
    }
  }
}

// Replace the entire sendUpcomingReminders function with:
async function sendUpcomingReminders() {
  const now = Date.now();
  const twoHrStart = now + 2 * 60 * 60 * 1000 - 5 * 60 * 1000;
  const twoHrEnd = now + 2 * 60 * 60 * 1000 + 5 * 60 * 1000;

  // Removed the `!=` filter — Firestore excludes docs missing the field
  // entirely from inequality queries, so it never matched anything.
  // Filter in-memory instead.
  const snap = await db
    .collection("bookings")
    .where("status", "in", ["upcoming_trip", "confirmed"])
    .get();

  for (const doc of snap.docs) {
    const b = { id: doc.id, ...doc.data() };
    if (b.pickupReminderSent2h === true) continue;

    const pickup = parseDate(b.pickupDate);
    if (!pickup) continue;

    const ms = pickup.getTime();
    if (ms >= twoHrStart && ms <= twoHrEnd) {
      await sendReminderEmail(b, "pickup_2h_reminder");
      await sendNotification(b.userId, "pickup_soon", {
        title: "Pickup in 2 Hours!",
        body: `Your ${b.carModel} pickup is in about 2 hours.`,
        bookingId: b.id,
      });
      await doc.ref.update({ pickupReminderSent2h: true });
      await logSystemEvent(
        "info",
        `2h pickup reminder sent for booking ${b.id}`,
        { bookingId: b.id },
      );
    }
  }
}

// ── EXPORTS ──────────────────────────────────────────────

// Inside module.exports.retryEmailQueue, replace the condition check:
module.exports.retryEmailQueue = onDocumentUpdated(
  "email_queue/{docId}",
  async (event) => {
    const after = event.data.after.data();
    const before = event.data.before.data();

    // Compare timestamps instead of presence — handles repeat retries.
    // Each manual retry sets a fresh `retriedAt`, so the millis differ
    // even though both before/after have the field set.
    const beforeMs = before.retriedAt?.toMillis
      ? before.retriedAt.toMillis()
      : null;
    const afterMs = after.retriedAt?.toMillis
      ? after.retriedAt.toMillis()
      : null;
    const retriedAtChanged = afterMs !== null && afterMs !== beforeMs;

    if (after.sent === false && retriedAtChanged) {
      console.log(`[Retry Queue] Processing retry for ${event.params.docId}`);

      await logSystemEvent(
        "info",
        `Retrying email: ${after.type} for ${after.to}`,
        {
          bookingId: after.bookingId,
          retryCount: after.retryCount || 0,
        },
      );

      const booking = {
        id: after.bookingId,
        carModel: after.carModel,
        userName: after.userName,
        pickup: after.pickup,
        dropoff: after.dropoff,
        pickupDate: after.pickupDate,
        dropoffDate: after.dropoffDate,
        total: after.total,
      };

      const subject = getEmailSubject(after.type, booking);
      const html = await getEmailHTML(after.type, booking);
      const sent = await sendEmailWithRetry(
        after.to,
        subject,
        html,
        after.type,
        booking,
        after.retryCount || 0,
      );

      if (sent) {
        await event.data.after.ref.update({
          sent: true,
          sentAt: FieldValue.serverTimestamp(),
          retriedSuccessfully: true,
        });
        await logSystemEvent(
          "info",
          `Retry successful: ${after.type} to ${after.to}`,
          { bookingId: after.bookingId },
        );
      } else {
        await logSystemEvent(
          "error",
          `Retry failed: ${after.type} to ${after.to}`,
          { bookingId: after.bookingId },
        );
        await event.data.after.ref.update({
          retryCount: FieldValue.increment(1),
          lastRetryFailedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  },
);

module.exports.statusScheduler = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Asia/Kolkata" },
  async () => {
    console.log("[Scheduler] Running at", new Date().toISOString());
    const snap = await db
      .collection("bookings")
      .where("status", "in", WATCHABLE)
      .get();
    console.log(`[Scheduler] Processing ${snap.size} bookings`);
    await Promise.allSettled(
      snap.docs.map((d) => processBooking({ id: d.id, ...d.data() })),
    );
    await sendUpcomingReminders();
    console.log("[Scheduler] Done");
  },
);

module.exports.processEmailQueue = onDocumentCreated(
  "email_queue/{docId}",
  async (event) => {
    const data = event.data.data();
    if (data.sent) return;

    await logSystemEvent(
      "info",
      `Processing email: ${data.type} for ${data.to}`,
      { bookingId: data.bookingId },
    );

    // Build full booking object with all available data
    const booking = {
      id: data.bookingId,
      carModel: data.carModel,
      userName: data.userName,
      pickup: data.pickup,
      dropoff: data.dropoff,
      pickupDate: data.pickupDate,
      dropoffDate: data.dropoffDate,
      total: data.total,
      // Emergency-alert-specific fields — undefined/dropped for every other
      // email type, which is fine, getEmailHTML only reads them for
      // type === "emergency_sos".
      userEmail: data.userEmail,
      locationUrl: data.locationUrl,
      coordinates: data.coordinates,
      numberPlate: data.numberPlate,
    };

    const subject = getEmailSubject(data.type, booking);
    const html = await getEmailHTML(data.type, booking);

    const sent = await sendEmailWithRetry(
      data.to,
      subject,
      html,
      data.type,
      booking,
      0,
    );

    if (sent) {
      await event.data.ref.update({
        sent: true,
        sentAt: FieldValue.serverTimestamp(),
      });
      await logSystemEvent(
        "info",
        `Email sent successfully: ${data.type} to ${data.to}`,
        { bookingId: data.bookingId },
      );
    } else {
      await logSystemEvent(
        "error",
        `Email failed after retries: ${data.type} to ${data.to}`,
        { bookingId: data.bookingId },
      );
    }
  },
);

// ── AI Attraction Context (server-side Gemini call) ──────────
// AttractionsNearby.jsx used to call api.anthropic.com directly from the
// browser with no API key at all — either it silently 401'd every time, or
// (worse) a key was meant to go in there, which would have exposed it to
// every visitor. Now uses Google's Gemini API (free tier, no billing
// required) instead of Anthropic — same reasoning still applies though:
// this MUST run server-side, key lives only in this function's secret
// binding, never sent to or readable by the client.
function callGemini(apiKey, model, prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    });
    const req = https.request(
      {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Gemini API returned ${res.statusCode}: ${data.slice(0, 300)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Invalid JSON from Gemini: " + data.slice(0, 200)));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

module.exports.generateAttractionContext = onCall(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to use this feature.");
    }

    const { cityName, attractionNames } = request.data || {};
    if (!cityName || typeof cityName !== "string") {
      throw new HttpsError("invalid-argument", "cityName is required.");
    }
    if (!Array.isArray(attractionNames) || attractionNames.length === 0) {
      throw new HttpsError("invalid-argument", "attractionNames must be a non-empty array.");
    }

    const prompt = `You are a travel expert for India. For the city "${cityName}", provide rich travel context for these attractions: ${attractionNames.join(", ")}.

Return ONLY a valid JSON object (no markdown, no backticks) in this exact shape:
{
  "cityHighlight": "One compelling sentence about why ${cityName} is worth visiting",
  "bestTime": "Best months to visit ${cityName}",
  "mustTryFood": ["dish1", "dish2", "dish3"],
  "attractions": {
    "ATTRACTION_NAME": {
      "speciality": "What makes it unique in one sentence",
      "tip": "One practical visitor tip",
      "category": "nature|culture|food|adventure"
    }
  }
}

Use the exact attraction names as keys. Keep every string under 100 characters.`;

    let geminiRes;
      const maxRetries = 2;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          geminiRes = await callGemini(
            GEMINI_API_KEY.value(),
            "gemini-3.6-flash",
            prompt,
          );

          break;
        } catch (err) {
          console.error(
            `[generateAttractionContext] Gemini attempt ${attempt + 1} failed:`,
            err.message,
          );

          const isTemporaryError =
            err.message.includes("Gemini API returned 503") ||
            err.message.includes("Gemini API returned 429");

          if (!isTemporaryError || attempt === maxRetries) {
            throw new HttpsError(
              "internal",
              "Failed to generate attraction context.",
            );
          }

          const delay = (attempt + 1) * 2000;

          console.log(
            `[generateAttractionContext] Retrying Gemini in ${delay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

    const text = geminiRes?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(clean);
    } catch (err) {
      console.error("[generateAttractionContext] Failed to parse AI response:", clean.slice(0, 300));
      throw new HttpsError("internal", "Failed to parse AI response.");
    }
  },
);

// ── Emergency SMS (server-side Twilio call) ──────────────────
// /api/send-sms was never a real endpoint — every SOS activation's SMS
// step was silently 404ing. Twilio's Auth Token is a real credential (can
// send messages and spend money on the account) so it has to live in a
// secret, exactly like the Anthropic key — never in client code.
function sendTwilioSMS({ accountSid, authToken, from, to, body }) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams({ To: to, From: from, Body: body }).toString();
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const req = https.request(
      {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload),
          "Authorization": `Basic ${auth}`,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            reject(new Error("Invalid JSON from Twilio: " + data.slice(0, 200)));
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            // Twilio's error responses include a human-readable `message`
            // field — e.g. "The number +91... is unverified" on a trial
            // account. Surface that instead of just the status code.
            reject(new Error(parsed?.message || `Twilio API returned ${res.statusCode}`));
            return;
          }
          resolve(parsed);
        });
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

module.exports.sendEmergencySMS = onCall(
  { secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to use this feature.");
    }

    const { to, message } = request.data || {};
    if (!to || typeof to !== "string") {
      throw new HttpsError("invalid-argument", "to (phone number) is required.");
    }
    if (!message || typeof message !== "string") {
      throw new HttpsError("invalid-argument", "message is required.");
    }

    // Twilio requires E.164 format (+<country code><number>) — emergency
    // contacts are saved as bare 10-digit Indian numbers (e.g.
    // "7447288791"), which Twilio rejects outright ("Invalid 'To' Phone
    // Number"). Normalize here rather than requiring every existing saved
    // contact to be re-entered.
    const normalizedTo = normalizePhoneNumber(to);
    if (!normalizedTo) {
      throw new HttpsError(
        "invalid-argument",
        `"${to}" doesn't look like a valid phone number.`,
      );
    }

    try {
      const result = await sendTwilioSMS({
        accountSid: TWILIO_ACCOUNT_SID.value(),
        authToken: TWILIO_AUTH_TOKEN.value(),
        from: TWILIO_PHONE_NUMBER.value(),
        to: normalizedTo,
        body: message,
      });
      return { success: true, sid: result.sid };
    } catch (err) {
      console.error("[sendEmergencySMS] Twilio send failed:", err.message);
      // On a trial account this is very likely "recipient not verified" —
      // surface the real reason to the client rather than a generic error,
      // since the SOS flow already has a native-SMS-app fallback that
      // should kick in when this fails.
      throw new HttpsError("internal", err.message || "Failed to send SMS.");
    }
  },
);

// Normalizes a phone number to E.164 format. Assumes India (+91) for any
// number that doesn't already have a country code, since that's this app's
// primary market — adjust if you expand elsewhere.
function normalizePhoneNumber(raw) {
  const digitsOnly = raw.replace(/[^\d+]/g, "");
  if (digitsOnly.startsWith("+")) {
    return /^\+\d{8,15}$/.test(digitsOnly) ? digitsOnly : null;
  }
  // Strip a leading trunk-prefix "0" some people include (e.g. "07447288791")
  const withoutLeadingZero = digitsOnly.replace(/^0+/, "");
  if (/^\d{10}$/.test(withoutLeadingZero)) {
    return `+91${withoutLeadingZero}`;
  }
  return null;
}

// updated again