// src/components/dealer/notifications/DealerNotificationCenter.jsx
import { useState, useEffect } from "react";
import {
  subscribeToDealerNotifications,
  markDealerNotificationRead,
  markAllDealerNotificationsRead,
  deleteDealerNotification,
  DEALER_NOTIFICATION_TYPES,
  PRIORITY_ORDER,
} from "../../../utils/dealerNotificationService";
import { getNotificationIcon } from "../../../utils/dealerNotificationIcons";

const T = {
  cyan: "#4ce3f7",
  textSec: "rgba(255,255,255,0.4)",
};

function getTimeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DealerNotificationCenter({
  dealerId,
  filterPriority,
  filterType,
  searchTerm,
  onNotificationAction,
  onNotificationsLoaded,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId) return;
    const unsubscribe = subscribeToDealerNotifications(
      dealerId,
      (notifs) => {
        setNotifications(notifs);
        setLoading(false);
        if (onNotificationsLoaded) onNotificationsLoaded(notifs);
      },
      100
    );
    return () => unsubscribe();
  }, [dealerId]);

  const handleMarkRead = async (id) => {
    await markDealerNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllDealerNotificationsRead(dealerId);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this notification?")) {
      await deleteDealerNotification(id);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) handleMarkRead(notification.id);
    if (onNotificationAction) onNotificationAction(notification);
  };

  const filtered = notifications
    .filter((n) => {
      if (filterPriority === "unread") return !n.read;
      if (filterPriority && n.priority !== filterPriority) return false;
      if (filterType && n.type !== filterType) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          n.title?.toLowerCase().includes(s) ||
          n.message?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pd !== 0) return pd;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: T.textSec }}>
        <div
        style={{
          width: "30px",
          height: "30px",
          margin: "0 auto",
          border: "2px solid rgba(99,102,241,.2)",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
        <p style={{ marginTop: "10px" }}>Loading notifications…</p>
      </div>
    );
  }

  return (
    <div className="dealer-notification-center">
      <style>{`
        @media (max-width: 768px) {
          .dealer-notification-center .dnc-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .dealer-notification-center .dnc-header h2 {
            font-size: 17px !important;
          }
          .dealer-notification-center .dnc-header p {
            font-size: 11px !important;
          }
          .dealer-notification-center .dnc-header button {
            width: 100% !important;
            justify-content: center !important;
          }
          .dealer-notification-center .dnc-empty-state {
            padding: 40px 20px !important;
          }
          .dealer-notification-center .dnc-empty-state h3 {
            font-size: 16px !important;
          }
          .dealer-notification-center .dnc-empty-state p {
            font-size: 12px !important;
          }
          .dealer-notification-center .dnc-notification {
            padding: 14px !important;
          }
          .dealer-notification-center .dnc-notification-inner {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .dealer-notification-center .dnc-notification-content {
            width: 100% !important;
          }
          .dealer-notification-center .dnc-notification-top {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          .dealer-notification-center .dnc-notification-top h4 {
            font-size: 13px !important;
          }
          .dealer-notification-center .dnc-notification-top-right {
            width: 100% !important;
            justify-content: flex-start !important;
            flex-wrap: wrap !important;
          }
          .dealer-notification-center .dnc-notification-message {
            font-size: 11px !important;
          }
          .dealer-notification-center .dnc-notification-delete {
            position: absolute !important;
            top: 12px !important;
            right: 12px !important;
          }
          .dealer-notification-center .dnc-unread-dot {
            top: 12px !important;
            right: 44px !important;
          }
          .dealer-notification-center .dnc-notification-icon {
            margin-top: 0 !important;
          }
        }

        @media (max-width: 480px) {
          .dealer-notification-center .dnc-header h2 {
            font-size: 15px !important;
          }
          .dealer-notification-center .dnc-notification {
            padding: 12px !important;
          }
          .dealer-notification-center .dnc-notification-top h4 {
            font-size: 12px !important;
          }
          .dealer-notification-center .dnc-notification-message {
            font-size: 10px !important;
          }
        }
      `}</style>

      {/* Header row */}
      <div className="dnc-header" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "10px",
      }}>
        <div>
          <h2 style={{
            margin: "0 0 4px",
            fontSize: "20px",
            fontWeight: "800",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#6366f1" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ transform: "translateY(-1px)" }}
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notification Center
          </h2>
          <p style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(99,102,241,0.3)",
              background: "rgba(99,102,241,0.1)",
              color: "#6366f1",
              cursor: "pointer",
              fontFamily: "Quicksand,sans-serif",
              fontSize: "12px",
              fontWeight: "700",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.1)";
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="dnc-empty-state" style={{
          background: "rgba(255,255,255,.02)",
          borderRadius: "16px",
          padding: "60px",
          textAlign: "center",
          border: "1px solid rgba(255,255,255,.06)",
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            marginBottom: "14px" 
          }}>
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>

          <h3 style={{ color: "#fff", marginBottom: "5px" }}>No Notifications</h3>
          <p style={{ color: T.textSec, fontSize: "13px" }}>
            {filterPriority || filterType || searchTerm
              ? "No notifications match your filters"
              : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((notification) => {
            const typeConfig =
              DEALER_NOTIFICATION_TYPES[
                Object.keys(DEALER_NOTIFICATION_TYPES).find(
                  (k) =>
                    DEALER_NOTIFICATION_TYPES[k].id === notification.type
                )
              ] || DEALER_NOTIFICATION_TYPES.BOOKING_CONFIRMED;

            const currentIconColor = notification.read ? "rgba(255,255,255,0.4)" : typeConfig.color;

            return (
              <div
                key={notification.id}
                className="dnc-notification"
                onClick={() => handleNotificationClick(notification)}
                style={{
                  background: notification.read
                    ? "rgba(255,255,255,.02)"
                    : `${typeConfig.color}08`,
                  border: `1px solid ${
                    notification.read
                      ? "rgba(255,255,255,.06)"
                      : `${typeConfig.color}30`
                  }`,
                  borderLeft: `3px solid ${typeConfig.color}`,
                  borderRadius: "14px",
                  padding: "16px",
                  cursor: "pointer",
                  transition: "all .2s",
                  position: "relative",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateX(4px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateX(0)")
                }
              >
                <div className="dnc-notification-inner" style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                }}>
                  {/* Unread dot */}
                  {!notification.read && (
                    <div className="dnc-unread-dot"
                      style={{
                        position: "absolute",
                        top: "18px",
                        right: "50px",
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: typeConfig.color,
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <span className="dnc-notification-icon" style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    flexShrink: 0, 
                    marginTop: "2px" 
                  }}>
                    {getNotificationIcon(notification.type, currentIconColor)}
                  </span>

                  <div className="dnc-notification-content" style={{ flex: 1, minWidth: 0 }}>
                    <div className="dnc-notification-top" style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "5px",
                    }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#fff",
                      }}>
                        {notification.title}
                      </h4>
                      <div className="dnc-notification-top-right" style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexShrink: 0,
                      }}>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: `${typeConfig.color}20`,
                          color: typeConfig.color,
                          fontSize: "9px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                        }}>
                          {notification.priority}
                        </span>
                        <span style={{ fontSize: "10px", color: T.textSec }}>
                          {getTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>

                    <p className="dnc-notification-message" style={{
                      margin: 0,
                      fontSize: "12px",
                      color: T.textSec,
                      lineHeight: "1.5",
                    }}>
                      {notification.message}
                    </p>

                    {notification.actionLabel && (
                      <span style={{
                        display: "inline-block",
                        marginTop: "10px",
                        fontSize: "11px",
                        color: typeConfig.color,
                        fontWeight: "600",
                      }}>
                        {notification.actionLabel} →
                      </span>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    className="dnc-notification-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.textSec,
                      cursor: "pointer",
                      fontSize: "18px",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      flexShrink: 0,
                      lineHeight: 1,
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#ef4444")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = T.textSec)
                    }
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}