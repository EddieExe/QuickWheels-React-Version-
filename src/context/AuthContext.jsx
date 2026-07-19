// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { updateAdminLastLogin } from "../utils/adminUtils.jsx";
import { get2FAStatus } from "../utils/twoFactorService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]                       = useState(null);
  const [isAdmin, setIsAdmin]                 = useState(false);
  const [adminRole, setAdminRole]             = useState(null);
  const [adminData, setAdminData]             = useState(null);
  const [isDealer, setIsDealer]               = useState(false);
  const [dealerData, setDealerData]           = useState(null);
  const [dealerStatus, setDealerStatus]       = useState(null);
  const [loading, setLoading]                 = useState(true);
  // ── 2FA state ──
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret]   = useState(null);

  const dealerUnsubRef = useRef(null);

  // ── Load 2FA status for a given email ──
  async function load2FAStatus(email) {
    try {
      const status = await get2FAStatus(email);
      setTwoFactorEnabled(status.enabled);
      setTwoFactorSecret(status.secret);
    } catch {
      setTwoFactorEnabled(false);
      setTwoFactorSecret(null);
    }
  }

  // ── Call this after enabling/disabling 2FA in TwoFactorSetup ──
  async function refresh2FAStatus() {
    if (!user?.email) return;
    await load2FAStatus(user.email);
  }

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (dealerUnsubRef.current) {
        dealerUnsubRef.current();
        dealerUnsubRef.current = null;
      }

      if (!currentUser) {
        setUser(null);
        setIsAdmin(false);
        setAdminRole(null);
        setAdminData(null);
        setIsDealer(false);
        setDealerData(null);
        setDealerStatus(null);
        setTwoFactorEnabled(false);
        setTwoFactorSecret(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Load 2FA status alongside everything else
      load2FAStatus(currentUser.email);

      try {
        const userRef  = doc(db, "users", currentUser.email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setIsAdmin(false);
          setAdminRole(null);
          setAdminData(null);
          setIsDealer(false);
          setDealerData(null);
          setDealerStatus(null);
          setLoading(false);
          return;
        }

        const data = userSnap.data();
        const userIsAdmin = data.isAdmin === true;
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          try {
            const adminSnap = await getDoc(doc(db, "admins", currentUser.email));
            if (adminSnap.exists()) {
              const aData = { id: adminSnap.id, ...adminSnap.data() };
              setAdminRole(aData.role || "support");
              setAdminData(aData);
              updateAdminLastLogin(currentUser.email).catch(() => {});
            } else {
              setAdminRole("super_admin");
              setAdminData(null);
            }
          } catch (adminErr) {
            console.error("Failed to fetch admin role:", adminErr);
            setAdminRole("super_admin");
            setAdminData(null);
          }
        } else {
          setAdminRole(null);
          setAdminData(null);
        }

        if (data.isDealer === true && data.dealerId) {
          setIsDealer(true);
          setDealerStatus(data.dealerStatus || "pending");

          const dealerRef = doc(db, "dealers", data.dealerId);
          dealerUnsubRef.current = onSnapshot(
            dealerRef,
            (snap) => {
              if (snap.exists()) {
                const d = { id: snap.id, ...snap.data() };
                setDealerData(d);
                setDealerStatus(d.status || "pending");
              } else {
                setIsDealer(false);
                setDealerData(null);
                setDealerStatus(null);
              }
              setLoading(false);
            },
            (err) => {
              console.error("Dealer snapshot error:", err);
              setLoading(false);
            }
          );
        } else {
          setIsDealer(false);
          setDealerData(null);
          setDealerStatus(null);
          setLoading(false);
        }

      } catch (err) {
        console.error("AuthContext error:", err);
        setIsAdmin(false);
        setAdminRole(null);
        setAdminData(null);
        setIsDealer(false);
        setDealerData(null);
        setDealerStatus(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (dealerUnsubRef.current) dealerUnsubRef.current();
    };
  }, []);

  async function logout() {
    if (dealerUnsubRef.current) {
      dealerUnsubRef.current();
      dealerUnsubRef.current = null;
    }
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setAdminRole(null);
    setAdminData(null);
    setIsDealer(false);
    setDealerData(null);
    setDealerStatus(null);
    setTwoFactorEnabled(false);
    setTwoFactorSecret(null);
  }

  async function refreshDealerData() {
    if (!user) return;
    try {
      const userSnap = await getDoc(doc(db, "users", user.email));
      if (!userSnap.exists()) return;
      const data = userSnap.data();
      if (data.isDealer && data.dealerId) {
        const dealerSnap = await getDoc(doc(db, "dealers", data.dealerId));
        if (dealerSnap.exists()) {
          const d = { id: dealerSnap.id, ...dealerSnap.data() };
          setDealerData(d);
          setDealerStatus(d.status || "pending");
        }
      }
    } catch (err) {
      console.error("refreshDealerData error:", err);
    }
  }

  async function refreshAdminRole() {
    if (!user) return;
    try {
      const adminSnap = await getDoc(doc(db, "admins", user.email));
      if (adminSnap.exists()) {
        const aData = { id: adminSnap.id, ...adminSnap.data() };
        setAdminRole(aData.role || "support");
        setAdminData(aData);
      }
    } catch (err) {
      console.error("refreshAdminRole error:", err);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        adminRole,
        adminData,
        isDealer,
        dealerData,
        dealerStatus,
        logout,
        loading,
        refreshDealerData,
        refreshAdminRole,
        // ── 2FA ──
        twoFactorEnabled,
        twoFactorSecret,
        refresh2FAStatus,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}