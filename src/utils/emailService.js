import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_crw994k';
const PUBLIC_KEY = 'TJIFq6s5ghB-Qg91W';

export function sendWelcomeEmail(username, email) {
  return emailjs.send(
    SERVICE_ID,
    'template_eapydsj',
    { username, email },
    PUBLIC_KEY
  );
}

export function sendBookingReceipt({
  name, email, carModel, pickup,
  dropoff, days, tripType, addons,
  carTotal, addonsTotal, total, bookingId
}) {
  return emailjs.send(
    SERVICE_ID,
    'template_npbllll',
    {
      name,
      email,
      booking_id: bookingId,
      car_model: carModel,
      pickup,
      dropoff,
      days,
      trip_type: tripType,
      addons: addons.length > 0
        ? addons.map(a => a.name).join(', ')
        : 'None',
      car_total: carTotal,
      addons_total: addonsTotal,
      total,
    },
    PUBLIC_KEY
  );
}