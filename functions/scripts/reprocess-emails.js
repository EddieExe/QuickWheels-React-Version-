// functions/scripts/reprocess-emails.js
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const https = require("https");

initializeApp();
const db = getFirestore();

async function sendEmail(to, type, booking) {
  const subjects = {
    booking_confirmed: `✅ Booking Confirmed: ${booking.carModel}`,
    pickup_reminder: `🚗 Pickup Reminder: ${booking.carModel}`,
    no_show_penalty: `❌ No-Show Penalty Applied`,
    return_reminder: `🔄 Return Reminder: ${booking.carModel}`,
    late_return: `⚠️ Late Return Alert: ${booking.carModel}`,
    pickup_2h_reminder: `⏰ Pickup in 2 Hours: ${booking.carModel}`,
  };

  const subject = subjects[type] || "QuickWheels Update";
  const html = `<div style="font-family:Arial,sans-serif;padding:20px"><h2>${subject}</h2><p>Booking for ${booking.carModel || "your car"}.</p></div>`;

  const payload = JSON.stringify({
    service_id: "service_crw994k",
    template_id: "template_npbllll",
    user_id: "TJIFq6s5ghB-Qg91W",
    accessToken: "NvSGsx-OQXTuPtEjDp8tV",
    template_params: {
      email: to,
      email_subject: subject,
      car_model: booking.carModel || "",
      admin_message: html,
      user_name: booking.userName || "Customer",
      pickup_date: booking.pickupDate || "",
      dropoff_date: booking.dropoffDate || "",
      pickup_location: booking.pickup || "",
      dropoff_location: booking.dropoff || "",
      total_amount: booking.total || "",
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.emailjs.com",
      path: "/api/v1.0/email/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`EmailJS ${res.statusCode}: ${data}`));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  const snap = await db.collection("email_queue").where("sent", "==", false).get();
  console.log(`Found ${snap.size} unsent emails`);

  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`Sending: ${d.type} → ${d.to}`);
    try {
      await sendEmail(d.to, d.type, d);
      await doc.ref.update({ sent: true, sentAt: FieldValue.serverTimestamp() });
      console.log(`✅ Sent: ${d.type} → ${d.to}`);
    } catch (err) {
      console.error(`❌ Failed: ${d.type} → ${d.to}:`, err.message);
    }
  }
  console.log("Done!");
}

run().catch(console.error);