import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_crw994k";
const RECEIPT_ID = "template_npbllll";
const WELCOME_ID = "template_eapydsj";
const PUBLIC_KEY = "TJIFq6s5ghB-Qg91W";

export function sendWelcomeEmail(username, email) {
  return emailjs.send(SERVICE_ID, WELCOME_ID, { username, email }, PUBLIC_KEY);
}

// emailService.js — sendBookingReceipt (the one called on booking creation)
export function sendBookingReceipt({
  name,
  email,
  carModel,
  pickup,
  dropoff,
  days,
  tripType,
  addons,
  carTotal,
  addonsTotal,
  total,
  bookingId,
  currency = "USD",
  currencySymbol = "$",
}) {
  return emailjs.send(
    SERVICE_ID,
    RECEIPT_ID,
    {
      email,
      email_subject: "Your QuickWheels Booking Request Received 🕐",
      header_color: "linear-gradient(135deg, #4a1d96 0%, #a855f7 100%)",
      header_subtitle: "Booking Request Received",
      email_icon: "⏳", // ← was ✅
      greeting: `Thanks for your request, ${name}!`, // ← was "Thank you... confirmed"
      email_subtitle:
        "Your booking request is pending dealer approval. You'll hear back within 60 minutes.",
      admin_message: "",
      admin_message_bg: "transparent",
      admin_message_border: "none",
      admin_message_padding: "0",
      admin_message_margin: "0",
      details_title: "Booking Request Details",
      car_model: carModel,
      pickup,
      dropoff,
      date_label: "Duration",
      date_value: `${days} days`,
      extra_label: "🔄 Trip Type",
      extra_value: tripType,
      amount_label: "Total (Pay at Pickup)",
      total: `${currencySymbol}${total.toFixed(2)} ${currency}`,
      addons_display: "block",
      addons: addons.length > 0 ? addons.map((a) => a.name).join(", ") : "None",
      days,
      car_total: `${currencySymbol}${carTotal.toFixed(2)} ${currency}`,
      addons_total: `${currencySymbol}${addonsTotal.toFixed(2)} ${currency}`,
      footer_message:
        "⏳ Pending approval — we'll email you once the dealer confirms.",
      booking_id: bookingId,
      currency,
      currency_symbol: currencySymbol,
    },
    PUBLIC_KEY,
  );
}

export function sendApprovalEmail({
  name,
  email,
  carModel,
  pickup,
  dropoff,
  days,
  tripType,
  carTotal,
  addonsTotal,
  total,
  bookingId,
  addons,
  currency = "USD",
  currencySymbol = "$", // ← ADD CURRENCY PARAMETERS
}) {
  return emailjs.send(
    SERVICE_ID,
    RECEIPT_ID,
    {
      email,
      email_subject: "Your QuickWheels Booking is Approved! ✅",
      header_color: "linear-gradient(135deg, #064e3b 0%, #22c55e 100%)",
      header_subtitle: "Booking Approved",
      email_icon: "✅",
      greeting: `Great news, ${name}! 🎉`,
      email_subtitle: "Your booking has been approved and confirmed!",
      admin_message: "",
      admin_message_bg: "transparent",
      admin_message_border: "none",
      admin_message_padding: "0",
      admin_message_margin: "0",
      details_title: "Trip Details",
      car_model: carModel,
      pickup,
      dropoff,
      date_label: "Duration",
      date_value: `${days} days`,
      extra_label: "🔄 Trip Type",
      extra_value: tripType || "One Way",
      amount_label: "Total Amount",
      total: `${currencySymbol}${total.toFixed(2)} ${currency}`, // ← FORMAT WITH CURRENCY
      addons_display: "block",
      addons:
        addons && addons.length > 0
          ? addons.map((a) => a.name).join(", ")
          : "None",
      days,
      car_total: `${currencySymbol}${carTotal.toFixed(2)} ${currency}`, // ← FORMAT WITH CURRENCY
      addons_total: `${currencySymbol}${addonsTotal.toFixed(2)} ${currency}`, // ← FORMAT WITH CURRENCY
      footer_message:
        "✨ Your car is reserved. Get ready for an amazing journey! ✨",
      booking_id: bookingId,
      currency: currency,
      currency_symbol: currencySymbol,
    },
    PUBLIC_KEY,
  );
}

export function sendRejectionEmail({
  name,
  email,
  carModel,
  pickup,
  dropoff,
  days,
  total,
  bookingId,
  reason,
  currency = "USD",
  currencySymbol = "$", // ← ADD CURRENCY PARAMETERS
}) {
  return emailjs.send(
    SERVICE_ID,
    RECEIPT_ID,
    {
      email,
      email_subject: "Your QuickWheels Booking Request — Update",
      header_color: "linear-gradient(135deg, #7f0000 0%, #ff4d4d 100%)",
      header_subtitle: "Booking Request Declined",
      email_icon: "❌",
      greeting: `Hi, ${name}`,
      email_subtitle:
        "Unfortunately your booking request could not be approved.",
      admin_message:
        reason || "We were unable to fulfill this booking request.",
      admin_message_bg: "#fff5f5",
      admin_message_border: "4px solid #ff4d4d",
      admin_message_padding: "20px 24px",
      admin_message_margin: "0 0 24px",
      details_title: "Booking Details",
      car_model: carModel,
      pickup,
      dropoff,
      date_label: "Duration",
      date_value: `${days} days`,
      extra_label: "💰 Amount",
      extra_value: `${currencySymbol}${total.toFixed(2)} ${currency} (not charged)`,
      amount_label: "Total",
      total: `${currencySymbol}${total.toFixed(2)} ${currency}`,
      addons_display: "none",
      addons: "",
      days: "",
      car_total: "",
      addons_total: "",
      footer_message:
        "No charges have been made. You can book again with different dates.",
      booking_id: bookingId,
      currency: currency,
      currency_symbol: currencySymbol,
    },
    PUBLIC_KEY,
  );
}

export function sendAutoConfirmEmail({
  name,
  email,
  carModel,
  pickup,
  dropoff,
  days,
  tripType,
  carTotal,
  addonsTotal,
  total,
  bookingId,
  addons,
  currency = "USD",
  currencySymbol = "$", // ← ADD CURRENCY PARAMETERS
}) {
  return emailjs.send(
    SERVICE_ID,
    RECEIPT_ID,
    {
      email,
      email_subject: "Your QuickWheels Booking is Confirmed! 🎉",
      header_color: "linear-gradient(135deg, #0400ff 0%, #4ce3f7 100%)",
      header_subtitle: "Booking Auto-Confirmed",
      email_icon: "✅",
      greeting: `You're all set, ${name}! 🎉`,
      email_subtitle: "Your booking has been automatically confirmed.",
      admin_message: "",
      admin_message_bg: "transparent",
      admin_message_border: "none",
      admin_message_padding: "0",
      admin_message_margin: "0",
      details_title: "Trip Details",
      car_model: carModel,
      pickup,
      dropoff,
      date_label: "Duration",
      date_value: `${days} days`,
      extra_label: "🔄 Trip Type",
      extra_value: tripType || "One Way",
      amount_label: "Total Amount",
      total: `${currencySymbol}${total.toFixed(2)} ${currency}`, // ← FORMAT WITH CURRENCY
      addons_display: "block",
      addons:
        addons && addons.length > 0
          ? addons.map((a) => a.name).join(", ")
          : "None",
      days,
      car_total: `${currencySymbol}${carTotal.toFixed(2)} ${currency}`, // ← FORMAT WITH CURRENCY
      addons_total: `${currencySymbol}${addonsTotal.toFixed(2)} ${currency}`, // ← FORMAT WITH CURRENCY
      footer_message: "✨ Thank you for choosing QuickWheels! Drive safe! ✨",
      booking_id: bookingId,
      currency: currency,
      currency_symbol: currencySymbol,
    },
    PUBLIC_KEY,
  );
}

export function sendCancellationEmail({
  name,
  email,
  carModel,
  pickup,
  dropoff,
  days,
  total,
  bookingId,
  reason = "Your booking has been cancelled.",
  currency = "USD",
  currencySymbol = "$",
}) {
  return emailjs.send(
    SERVICE_ID,
    RECEIPT_ID,
    {
      email,
      email_subject: "Your QuickWheels Booking Has Been Cancelled",
      header_color: "linear-gradient(135deg, #7f0000 0%, #ff4d4d 100%)",
      header_subtitle: "Booking Cancelled",
      email_icon: "❌",
      greeting: `Hi, ${name}`,
      email_subtitle: "Your booking has been cancelled.",
      admin_message: reason,
      admin_message_bg: "#fff5f5",
      admin_message_border: "4px solid #ff4d4d",
      admin_message_padding: "20px 24px",
      admin_message_margin: "0 0 24px",
      details_title: "Booking Details",
      car_model: carModel,
      pickup,
      dropoff,
      date_label: "Duration",
      date_value: `${days} days`,
      extra_label: "💰 Amount",
      extra_value: `${currencySymbol}${total.toFixed(2)} ${currency} (not charged)`,
      amount_label: "Total",
      total: `${currencySymbol}${total.toFixed(2)} ${currency}`,
      addons_display: "none",
      addons: "",
      days: "",
      car_total: "",
      addons_total: "",
      footer_message:
        "No charges have been made. You can book again with different dates.",
      booking_id: bookingId,
      currency,
      currency_symbol: currencySymbol,
    },
    PUBLIC_KEY,
  );
}
