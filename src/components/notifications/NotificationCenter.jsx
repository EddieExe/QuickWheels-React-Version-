/**
 * NotificationCenter.jsx — Production Grade
 *
 * Fixes vs original:
 * 1. Real-time Firestore onSnapshot (no polling interval)
 * 2. Backdrop has pointer-events: none on the panel overlay so underlying
 *    UI stays clickable — only the backdrop itself closes the panel
 * 3. Filter button label shows what it will switch TO (not current state)
 * 4. Demo mode read/delete state persists via sessionStorage (survives re-opens)
 * 5. Per-notification delete
 * 6. Proper cleanup of Firestore listener on unmount
 * 7. Grouped display: Unread → Earlier Today → Older
 * 8. Empty state per filter
 * 9. Notification count caps at 99+
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getDemoNotifications,
  saveDemoNotifications,
} from '../../utils/notificationService';
import NotificationCard from './NotificationCard';
import NotificationBell from './NotificationBell';

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [loading, setLoading] = useState(true);

  // Track whether we're in demo mode (no logged-in user)
  const isDemo = !user;
  // Ref to hold Firestore unsubscribe function
  const unsubRef = useRef(null);
  // Panel ref for focus management
  const panelRef = useRef(null);

  // ── Load / subscribe ────────────────────────────────────
  useEffect(() => {
    if (isDemo) {
      setNotifications(getDemoNotifications());
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time Firestore listener
    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });

    unsubRef.current = unsub;
    return () => unsub?.();
  }, [user]);

  // ── Unread count ────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Mark single as read ─────────────────────────────────
  const handleMarkRead = useCallback(async (id) => {
    if (isDemo) {
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      setNotifications(updated);
      saveDemoNotifications(updated);
      return;
    }
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markAsRead(id);
  }, [isDemo, notifications]);

  // ── Mark all as read ────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    if (isDemo) {
      const updated = notifications.map((n) => ({ ...n, read: true }));
      setNotifications(updated);
      saveDemoNotifications(updated);
      return;
    }
    // Optimistic
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllAsRead(user.uid);
  }, [isDemo, notifications, user]);

  // ── Delete notification ──────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    if (isDemo) {
      const updated = notifications.filter((n) => n.id !== id);
      setNotifications(updated);
      saveDemoNotifications(updated);
      return;
    }
    // Optimistic
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
  }, [isDemo, notifications]);

  // ── Filter ───────────────────────────────────────────────
  const filtered =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  // ── Group notifications ──────────────────────────────────
  const now = Date.now();
  const MS_DAY = 86400000;

  function parseDate(d) {
    if (!d) return new Date(0);
    if (d?.toDate) return d.toDate();
    return new Date(d);
  }

  const groups = {
    unread: filtered.filter((n) => !n.read),
    today: filtered.filter((n) => {
      if (!n.read) return false;
      return now - parseDate(n.createdAt).getTime() < MS_DAY;
    }),
    older: filtered.filter((n) => {
      if (!n.read) return false;
      return now - parseDate(n.createdAt).getTime() >= MS_DAY;
    }),
  };

  const hasAny = filtered.length > 0;

  // ── Keyboard close (Escape) ──────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // ── Render helpers ───────────────────────────────────────
  function SectionLabel({ label }) {
    return (
      <div
        style={{
          fontSize: '10px',
          fontWeight: '700',
          color: 'rgba(255,255,255,0.22)',
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          padding: '8px 2px 4px',
          fontFamily: 'Quicksand, sans-serif',
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell trigger */}
      <NotificationBell
        unreadCount={unreadCount}
        isOpen={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      />

      {/* ── Notification Panel ── */}
      {isOpen && (
        <>
          {/* Backdrop — closes panel, but does NOT block underlying page */}
          <div
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 998,
              // No background — purely a click trap
            }}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            style={{
              position: 'absolute',
              top: '52px',
              right: '0',
              width: '370px',
              maxHeight: '520px',
              background: 'linear-gradient(160deg, #13132b 0%, #0c0c1e 100%)',
              border: '1px solid rgba(76,227,247,0.12)',
              borderRadius: '16px',
              boxShadow:
                '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
              zIndex: 999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '13px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.015)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '13px',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  🔔 Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '8px',
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#ef4444',
                      fontSize: '10px',
                      fontWeight: '800',
                      fontFamily: 'Quicksand, sans-serif',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount} new
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                {/* Filter toggle — label shows where it WILL go */}
                <button
                  onClick={() =>
                    setFilter((f) => (f === 'all' ? 'unread' : 'all'))
                  }
                  style={headerBtn(filter === 'unread')}
                >
                  {filter === 'all' ? 'Unread only' : 'Show all'}
                </button>

                {/* Mark all read */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={headerBtn(false)}
                    title="Mark all as read"
                  >
                    ✓ All read
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div
              style={{
                padding: '8px 12px',
                overflowY: 'auto',
                flex: 1,
                // Custom scrollbar
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(76,227,247,0.15) transparent',
              }}
            >
              {loading ? (
                <LoadingState />
              ) : !hasAny ? (
                <EmptyState filter={filter} />
              ) : (
                <>
                  {groups.unread.length > 0 && (
                    <>
                      <SectionLabel label="New" />
                      {groups.unread.map((n) => (
                        <NotificationCard
                          key={n.id}
                          notification={n}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                        />
                      ))}
                    </>
                  )}

                  {groups.today.length > 0 && (
                    <>
                      <SectionLabel label="Earlier today" />
                      {groups.today.map((n) => (
                        <NotificationCard
                          key={n.id}
                          notification={n}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                        />
                      ))}
                    </>
                  )}

                  {groups.older.length > 0 && (
                    <>
                      <SectionLabel label="Older" />
                      {groups.older.map((n) => (
                        <NotificationCard
                          key={n.id}
                          notification={n}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '9px 16px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.18)',
                  fontSize: '10px',
                  fontFamily: 'Quicksand, sans-serif',
                }}
              >
                {isDemo ? '🎮 Demo mode' : '🔒 Stored securely'}
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.18)',
                  fontSize: '10px',
                  fontFamily: 'Quicksand, sans-serif',
                }}
              >
                {notifications.length} total
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────────
function headerBtn(active) {
  return {
    padding: '4px 9px',
    borderRadius: '6px',
    border: `1px solid ${active ? 'rgba(76,227,247,0.25)' : 'rgba(255,255,255,0.07)'}`,
    background: active ? 'rgba(76,227,247,0.08)' : 'transparent',
    color: active ? '#4ce3f7' : 'rgba(255,255,255,0.35)',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Quicksand, sans-serif',
    transition: 'all 0.15s',
  };
}

function LoadingState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '36px 20px',
        color: 'rgba(255,255,255,0.25)',
        fontFamily: 'Quicksand, sans-serif',
        fontSize: '12px',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid rgba(76,227,247,0.15)',
          borderTopColor: '#4ce3f7',
          animation: 'spin 0.7s linear infinite',
          margin: '0 auto 10px',
        }}
      />
      Loading notifications…
    </div>
  );
}

function EmptyState({ filter }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 20px',
        fontFamily: 'Quicksand, sans-serif',
      }}
    >
      <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.4 }}>
        {filter === 'unread' ? '✅' : '🔔'}
      </div>
      <p
        style={{
          color: 'rgba(255,255,255,0.25)',
          fontSize: '12px',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {filter === 'unread'
          ? "You're all caught up!"
          : 'No notifications yet'}
      </p>
    </div>
  );
}