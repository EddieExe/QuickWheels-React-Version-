# QuickWheels — Car Rental Web App

A full-stack car rental platform built with React and Firebase. Users can browse vehicles, make bookings with add-ons, manage their profile, receive email confirmations, and download PDF receipts. Admins get a dedicated dashboard with booking analytics, user management, and revenue tracking.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel)

---

## 📊 Project at a Glance

| Metric | Value |
|--------|-------|
| **Pages / Routes** | 11 (Home, Fleet, Booking, Addons, Payment, SignIn, SignUp, Profile, About, Admin, 404) |
| **Cars in Fleet** | 30 (Sedan, SUV, Convertible, Luxury, Pickup, Van) |
| **Service Locations** | 30 cities across 6 continents |
| **Auth Providers** | 3 (Email/Password, Google, Microsoft) |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | React 18 + Vite | UI rendering, HMR, fast build tooling |
| **Routing** | React Router DOM v6 | Client-side routing, protected routes |
| **Auth** | Firebase Authentication | Email/password, Google OAuth, Microsoft OAuth |
| **Database** | Cloud Firestore | Bookings, users, admin roles — real-time NoSQL |
| **Email** | EmailJS | Booking receipts, welcome emails |
| **Forms** | Formspree | Guest contact form submissions |
| **PDF** | jsPDF | Downloadable booking receipts |
| **Social Auth** | @react-oauth/google | Google OAuth flow |
| **Social Auth** | @azure/msal-browser + msal-react | Microsoft OAuth flow |
| **Deployment** | Vercel | CI/CD from GitHub |
| **Styling** | Plain CSS (per-component) | Custom design system |

---

## 📦 Installed Packages

```
react
react-dom
react-router-dom
firebase
@emailjs/browser
jspdf
@react-oauth/google
@azure/msal-browser
@azure/msal-react
vite
@vitejs/plugin-react
```

---

## ✅ Capabilities

### What It Can Do

**Authentication & Security**
- Sign up / sign in with email, Google, or Microsoft
- Email verification — blocks unverified users from signing in
- Forgot password — Firebase reset email flow

**Booking Flow**
- Browse 30 cars filtered by category and sorted by price or seats
- Book a car — select pickup/dropoff city, dates, trip type
- Choose optional add-ons — child seat, Wi-Fi, insurance, roadside assistance
- Confirm order — saves booking to Firestore instantly
- Receive booking confirmation email via EmailJS
- Download PDF receipt for every booking

**User Profile**
- View full booking history
- Update display name and phone number
- Change password with strength indicator and re-auth
- Contact support via in-profile form (Formspree)
- Delete account — removes Firebase user and local data

**Admin Dashboard**
- Admin role — special Firestore flag, auto-redirects on login
- View all bookings and all users
- Filter bookings by car, date, user, search term
- Drill-down — view bookings per individual user
- Analytics — revenue, avg booking value, popular cars, top locations

**UI/UX Features**
- Scroll animations on home page (IntersectionObserver)
- Auto-scrolling reviews carousel
- Location modal with address, email, phone for 30 cities
- Back to top button, scroll to top on route change
- Email validation — blocks spam patterns like `sssss@gmail.com`
- Booking form validation — expired dates, invalid locations blocked
- Fleet guard — can't select a car before filling booking form

**Deployment**
- Fully deployed on Vercel with GitHub CI/CD

---

## ❌ What It Cannot Do

**Payment & Financial**
- No real payment processing — no Stripe, Razorpay, or gateway integration
- No refund system — no payment means no refund logic
- No multi-currency — prices in USD only

**Booking Management**
- No car availability system — same car can be booked by multiple users for same dates
- No booking approval workflow — bookings confirm instantly, no admin approval step
- No booking cancellation — users cannot cancel after confirming
- No real-time notifications — admin must refresh to see new bookings

**User Features**
- No OTP phone verification — Firebase phone auth requires paid Blaze plan
- No image upload — user profile photos not supported
- No live chat or real-time support — contact form only
- Social auth users cannot change password — no password set on OAuth accounts

**Admin Features**
- Admin cannot add/remove cars from fleet — data is hardcoded in `cars.js`
- Admin cannot promote or demote other users — Firestore must be edited manually

**General**
- No dark/light theme toggle — dark mode only
- No mobile app — web only (not a PWA)
- No GPS / map integration — locations are static data
- No email PDF attachment — receipt must be downloaded manually
- Formspree free plan limited to 50 submissions/month

---

## 🚀 Future Enhancements

Planned improvements for future versions:

### High Priority
- **Razorpay Integration** — Complete payment gateway integration for real transactions
- **Tailwind CSS** — Migrate from plain CSS to Tailwind for faster styling and better maintainability
- **Car Availability System** — Real-time availability calendar to prevent double bookings
- **Booking Cancellation** — Allow users to cancel bookings within a time window

### Medium Priority
- **Multi-Currency Support** — Display prices in multiple currencies based on user location
- **Booking Approval Workflow** — Admin approval before booking confirmation
- **Real-Time Notifications** — WebSocket/push notifications for new bookings
- **Image Upload** — User profile photos using Firebase Storage

### Low Priority
- **PWA Support** — Make the app installable as a Progressive Web App
- **Dark/Light Theme Toggle** — User preference for theme
- **Mobile App** — React Native version
- **Google Maps Integration** — Show route and distance between pickup/dropoff locations

---

## 📝 Important Notes

| Topic | Detail |
|-------|--------|
| **Firebase Plan** | Spark (free) — Firestore, Auth, and Hosting within free tier limits. Phone OTP requires Blaze (paid). |
| **Admin Access** | Set manually in Firestore — create a document in the `users` collection with the admin email as document ID and set `isAdmin: true`. |
| **Email Service** | EmailJS free tier — 200 emails/month. Booking receipts and welcome emails use separate templates. |
| **Contact Form** | Formspree free tier — 50 submissions/month. Logged-in users use the profile contact tab; guests use the home page form. |
| **Google OAuth** | Requires `VITE_GOOGLE_CLIENT_ID` in `.env` — obtained from Google Cloud Console. |
| **Microsoft OAuth** | Requires Azure App Registration — redirect URI must include the Firebase handler URL ending in `/__/auth/handler`. |
| **Booking Data** | Stored in Firestore `bookings` collection. Each document includes `userId`, `userEmail`, `userName`, car, dates, addons, total, and `createdAt`. |
| **Local Storage** | Used for `bookingData`, `selectedCar`, `selectedAddons`, phone number, and `signupSuccess` flag — cleared after booking is confirmed. |
| **Security** | Firestore rules restrict booking reads to the owner or admin. No server-side code — all logic runs client-side. |
| **Deployment** | Hosted on Vercel. Auto-deploys on every push to the main branch. Environment variables set in Vercel dashboard. |
| **Date Restrictions** | Bookings limited to current month + 30 days. Past dates and same-day dropoff are blocked. |
| **Portfolio Purpose** | Built as a frontend/full-stack portfolio project to demonstrate React, Firebase, auth flows, Firestore, email integration, and admin systems. |

---

## 🚀 Deployment

The project is deployed on **Vercel** with automatic deployments from the `main` branch.

### Environment Variables Required

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

---

## 📄 License

This project is built for portfolio purposes. All rights reserved.

---

## 👨‍💻 Author

Built as a full-stack portfolio project to demonstrate React, Firebase, authentication flows, Firestore, email integration, and admin dashboard systems.

---

*Happy Riding with QuickWheels! 🚗✨*