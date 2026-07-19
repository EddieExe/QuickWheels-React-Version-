// src/utils/adminUtils.js
import React from "react";
import { db } from "../firebase";
import {
  collection, addDoc, serverTimestamp, doc, getDoc,
  updateDoc, query, where, getDocs, orderBy, limit, setDoc
} from "firebase/firestore";

// ── Premium Identity & Role Schema ────────────────────────
export const ADMIN_ROLES = {
  SUPER_ADMIN: "super_admin",
  MANAGER:     "manager",
  ANALYST:     "analyst",
  SUPPORT:     "support",
};

export const ROLE_NAMES = {
  super_admin: "Super Admin",
  manager:     "Manager",
  analyst:     "Analyst",
  support:     "Support",
};

/**
 * Premium Apple Pro Dark Palettes
 * Optimized contrast depth, micro-glow states, and neutral dark opacity rings
 */
export const ROLE_COLORS = {
  super_admin: { 
    color: "#ffb547", 
    bg: "rgba(255, 181, 71, 0.05)", 
    border: "rgba(255, 181, 71, 0.16)"
  },
  manager: { 
    color: "#4ade80", 
    bg: "rgba(74, 222, 128, 0.05)",  
    border: "rgba(74, 222, 128, 0.16)"  
  },
  analyst: { 
    color: "#bf7af0", 
    bg: "rgba(191, 122, 240, 0.05)",  
    border: "rgba(191, 122, 240, 0.16)"  
  },
  support: { 
    color: "#3b82f6", 
    bg: "rgba(59, 130, 246, 0.05)",   
    border: "rgba(59, 130, 246, 0.16)"   
  },
};

// ── Functional Permission Matrix ──────────────────────────
export const PERMISSIONS = {
  VIEW_ALL_BOOKINGS:   "view_all_bookings",
  APPROVE_BOOKING:     "approve_booking",
  CANCEL_BOOKING:      "cancel_booking",
  SUSPEND_BOOKING:     "suspend_booking",
  VIEW_BOOKING_DETAILS:"view_booking_details",

  VIEW_ALL_USERS:      "view_all_users",
  EDIT_USER:           "edit_user",
  SUSPEND_USER:        "suspend_user",
  DELETE_USER:         "delete_user",
  VIEW_USER_BOOKINGS:  "view_user_bookings",

  VIEW_ALL_DEALERS:    "view_all_dealers",
  APPROVE_DEALER:      "approve_dealer",
  SUSPEND_DEALER:      "suspend_dealer",
  DELETE_DEALER:       "delete_dealer",
  VIEW_DEALER_DETAILS: "view_dealer_details",

  VIEW_ANALYTICS:      "view_analytics",
  VIEW_REVENUE:        "view_revenue",
  VIEW_TRENDS:         "view_trends",
  EXPORT_REPORTS:      "export_reports",

  MANAGE_ADMINS:       "manage_admins",
  VIEW_AUDIT_LOGS:     "view_audit_logs",
  SYSTEM_SETTINGS:     "system_settings",
  VIEW_EMERGENCY:      "view_emergency",
  VIEW_SYSTEM:         "view_system",
  MANAGE_TEMPLATES:    "manage_templates",
};

export const ROLE_PERMISSIONS = {
  super_admin: Object.values(PERMISSIONS),

  manager: [
    PERMISSIONS.VIEW_ALL_BOOKINGS,
    PERMISSIONS.APPROVE_BOOKING,
    PERMISSIONS.CANCEL_BOOKING,
    PERMISSIONS.SUSPEND_BOOKING,
    PERMISSIONS.VIEW_BOOKING_DETAILS,
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.EDIT_USER,
    PERMISSIONS.SUSPEND_USER,
    PERMISSIONS.VIEW_USER_BOOKINGS,
    PERMISSIONS.VIEW_ALL_DEALERS,
    PERMISSIONS.APPROVE_DEALER,
    PERMISSIONS.SUSPEND_DEALER,
    PERMISSIONS.VIEW_DEALER_DETAILS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_REVENUE,
    PERMISSIONS.VIEW_TRENDS,
    PERMISSIONS.VIEW_EMERGENCY,
    PERMISSIONS.SYSTEM_SETTINGS,
  ],

  analyst: [
    PERMISSIONS.VIEW_ALL_BOOKINGS,
    PERMISSIONS.VIEW_BOOKING_DETAILS,
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.VIEW_ALL_DEALERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_REVENUE,
    PERMISSIONS.VIEW_TRENDS,
    PERMISSIONS.EXPORT_REPORTS,
  ],

  support: [
    PERMISSIONS.VIEW_ALL_BOOKINGS,
    PERMISSIONS.VIEW_BOOKING_DETAILS,
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.VIEW_USER_BOOKINGS,
    PERMISSIONS.VIEW_ALL_DEALERS,
    PERMISSIONS.VIEW_DEALER_DETAILS,
  ],
};

// ── Ultra-Premium Vector Navigation Matrix ─────────────────
// Streamlined with unified vector geometry lines, clean stroke balance, and modern alignment values.
export const ADMIN_NAV_ITEMS = {
  main: [
    { 
      id: "bookings", 
      label: "All Bookings", 
      permission: PERMISSIONS.VIEW_ALL_BOOKINGS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
    },
    { 
      id: "users", 
      label: "Users", 
      permission: PERMISSIONS.VIEW_ALL_USERS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    { 
      id: "dealers", 
      label: "Dealers", 
      permission: PERMISSIONS.VIEW_ALL_DEALERS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="16"></line><line x1="15" y1="22" x2="15" y2="16"></line><line x1="9" y1="16" x2="15" y2="16"></line><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M8 10h.01"></path><path d="M16 10h.01"></path></svg>
    },
    { 
      id: "reviews", 
      label: "Reviews", 
      permission: PERMISSIONS.VIEW_ALL_BOOKINGS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
    },
    { 
      id: "notifications", 
      label: "Notifications", 
      permission: PERMISSIONS.VIEW_ALL_BOOKINGS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
    },
    { 
      id: "emergency", 
      label: "Emergency", 
      permission: PERMISSIONS.VIEW_EMERGENCY,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    },
    { 
      id: "system", 
      label: "System Monitor", 
      permission: PERMISSIONS.VIEW_SYSTEM,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
    },
    { 
      id: "templates", 
      label: "Email Templates", 
      permission: PERMISSIONS.MANAGE_TEMPLATES,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
    },
  ],
  analytics: [
    { 
      id: "overview", 
      label: "Overview", 
      permission: PERMISSIONS.VIEW_ANALYTICS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
    },
    { 
      id: "cars", 
      label: "Car Analytics", 
      permission: PERMISSIONS.VIEW_ANALYTICS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
    },
    { 
      id: "locations", 
      label: "Locations", 
      permission: PERMISSIONS.VIEW_ANALYTICS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
    },
    { 
      id: "trends", 
      label: "Trends", 
      permission: PERMISSIONS.VIEW_TRENDS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 0 1 0 12.73m-2.82-9.9a5 5 0 0 1 0 7.07m-2.83-4.24a1 1 0 0 1 0 1.41"></path><circle cx="12" cy="12" r="1"></circle></svg>
    },
  ],
  admin: [
    { 
      id: "audit_logs", 
      label: "Audit Logs", 
      permission: PERMISSIONS.VIEW_AUDIT_LOGS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
    },
    { 
      id: "admin_settings", 
      label: "Admin Settings", 
      permission: PERMISSIONS.MANAGE_ADMINS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
    { 
      id: "export_reports", 
      label: "Export Reports", 
      permission: PERMISSIONS.EXPORT_REPORTS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
    },
    { 
      id: "data_backup", 
      label: "Data Backup", 
      permission: PERMISSIONS.SYSTEM_SETTINGS,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
    },
  ],
};

// ── Strict Context Security Helpers ────────────────────────
export const hasPermission = (adminRole, permission) => {
  if (!adminRole) return false;
  if (adminRole === ADMIN_ROLES.SUPER_ADMIN) return true;
  return (ROLE_PERMISSIONS[adminRole] || []).includes(permission);
};

export const getFilteredNavItems = (adminRole) => {
  const check = (item) => hasPermission(adminRole, item.permission);
  return {
    main:      ADMIN_NAV_ITEMS.main.filter(check),
    analytics: ADMIN_NAV_ITEMS.analytics.filter(check),
    admin:     ADMIN_NAV_ITEMS.admin.filter(check),
  };
};

// ── Network Device Tracking Optimization ───────────────────
let cachedIP = null;

export const getClientIP = async () => {
  if (cachedIP) return cachedIP;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) throw new Error("Network status invalid");
    const data = await res.json();
    cachedIP = data.ip;
    return cachedIP;
  } catch (err) {
    console.warn("IP isolation sequence bypassed:", err.message);
    return "isolated-context";
  }
};

// ── Cryptographic System Audit Engines ─────────────────────
export const logAdminAction = async (adminId, adminEmail, action, details = {}, targetId = null, targetType = null) => {
  try {
    const ip = await getClientIP();
    await addDoc(collection(db, "admin_audit_logs"), {
      adminId,
      adminEmail,
      action,
      details,
      targetId,
      targetType,
      ipAddress: ip,
      userAgent: navigator.userAgent || "unidentified-agent",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Critical Security Failure: Action logging dropped ->", err);
  }
};

export const logLoginAttempt = async (email, success, ip, userAgent) => {
  try {
    await addDoc(collection(db, "admin_login_attempts"), {
      email,
      success,
      ipAddress: ip || "unknown-vector",
      userAgent: userAgent || "unidentified-agent",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Critical Security Failure: Login attempt dropped ->", err);
  }
};

// ── Optimized High-Performance Admin Data Services ─────────
export const getAdminUser = async (email) => {
  if (!email) return null;
  try {
    const snap = await getDoc(doc(db, "admins", email));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error(`Data Sync Interrupted [getAdminUser:${email}] ->`, err);
    return null;
  }
};

export const getAllAdminUsers = async () => {
  try {
    const snap = await getDocs(query(collection(db, "admins"), orderBy("createdAt", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Data Sync Interrupted [getAllAdminUsers] ->", err);
    return [];
  }
};

export const setAdminUser = async (adminData) => {
  if (!adminData?.email) return { success: false, error: "Missing identity key" };
  try {
    await setDoc(doc(db, "admins", adminData.email), {
      ...adminData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (err) {
    console.error(`Data Mutation Exception [setAdminUser:${adminData.email}] ->`, err);
    return { success: false, error: err.message };
  }
};

export const updateAdminLastLogin = async (email) => {
  if (!email) return;
  try {
    const ip = await getClientIP();
    await updateDoc(doc(db, "admins", email), {
      lastLoginAt: serverTimestamp(),
      lastLoginIP: ip,
    });
  } catch (err) {
    console.error(`Data Mutation Exception [updateAdminLastLogin:${email}] ->`, err);
  }
};

// ── Advanced Audit Log Parser ─────────────────────────────
export const getAuditLogs = async (limitCount = 100, filters = {}) => {
  try {
    const constraints = [orderBy("timestamp", "desc"), limit(limitCount)];
    
    if (filters.adminEmail) constraints.push(where("adminEmail", "==", filters.adminEmail));
    if (filters.action)     constraints.push(where("action", "==", filters.action));
    if (filters.targetType) constraints.push(where("targetType", "==", filters.targetType));
    
    const snap = await getDocs(query(collection(db, "admin_audit_logs"), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Data Parse Aborted [getAuditLogs] ->", err);
    return [];
  }
};