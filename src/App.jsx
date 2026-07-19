import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Fleet from "./pages/Fleet";
import Booking from "./pages/Booking";
import Addons from "./pages/Addons";
import Payment from "./pages/Payment";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import About from "./pages/AboutPage";
import AdminRoute from "./components/AdminRoute";
import Admin from "./pages/Admin";
import { CurrencyProvider } from "./context/CurrencyContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import DealerDashboard from "./pages/DealerDashboard";
import DealerPending from "./pages/DealerPending";
import DealerRoute from "./components/DealerRoute";
import DealerSuspended from "./pages/DealerSuspended";
import TripDashboard from "./pages/TripDashboard";
import { LanguageProvider } from "./context/LanguageContext";
import MapTest from "./pages/MapTest";
import { startStatusScheduler } from "./services/statusScheduler"; // Import the scheduler

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  // Start status scheduler when user is logged in
  useEffect(() => {
    if (!user) return;
    const cleanup = startStatusScheduler(user.uid);
    return () => cleanup();
  }, [user]);

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/addons" element={<Addons />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/trip-dashboard/:bookingId?" element={<TripDashboard />} />
        <Route path="/map-test" element={<MapTest />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route
          path="/dealer"
          element={
            <DealerRoute>
              <DealerDashboard />
            </DealerRoute>
          }
        />
        <Route path="/dealer-pending" element={<DealerPending />} />
        <Route path="/dealer-suspended" element={<DealerSuspended />} />
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
      {!location.pathname.startsWith("/trip-dashboard") &&
        !location.pathname.startsWith("/admin") &&
        !location.pathname.startsWith("/dealer") && <Footer />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CurrencyProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </CurrencyProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
