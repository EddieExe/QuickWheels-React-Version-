// src/utils/systemLogger.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Writes a structured entry to the `system_logs` collection, surfaced
 * in the admin System Monitoring page.
 * @param {"info"|"warn"|"error"} level
 * @param {string} message
 * @param {object} [details]
 */
export async function logSystemEvent(level, message, details = {}) {
  try {
    await addDoc(collection(db, "system_logs"), {
      level,
      message,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Never let logging failures break the automation itself
    console.warn("[systemLogger] Failed to write log:", err.message);
  }
}