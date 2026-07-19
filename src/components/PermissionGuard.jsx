// src/components/PermissionGuard.jsx
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/adminUtils.jsx";

/**
 * Hides children if the current admin lacks the required permission.
 *
 * Usage:
 *   <PermissionGuard permission={PERMISSIONS.APPROVE_BOOKING}>
 *     <button>Approve</button>
 *   </PermissionGuard>
 *
 *   // Show a fallback instead of hiding:
 *   <PermissionGuard permission={PERMISSIONS.DELETE_USER} fallback={<span>No access</span>}>
 *     <button>Delete</button>
 *   </PermissionGuard>
 */
export default function PermissionGuard({ permission, fallback = null, children }) {
  const { adminRole } = useAuth();
  if (!hasPermission(adminRole, permission)) return fallback;
  return children;
}