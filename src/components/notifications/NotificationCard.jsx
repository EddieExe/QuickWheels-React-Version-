/**
 * NotificationCard.jsx
 * Individual notification item.
 *
 * Fixes vs original:
 * - Delete button (✕) per card
 * - Action button support (data.actionLabel + data.actionFn)
 * - Hover highlight doesn't clobber unread background on mouse-leave
 * - timeAgo handles ISO strings, Firestore Timestamps, and JS Dates
 * - "Critical" badge also shows for "high" priority (not just critical)
 * - Accessible: role="article", keyboard-clickable
 */

import { timeAgo } from '../../utils/notificationService';

const PRIORITY_BADGE = {
  critical: { label: '🚨 Critical', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', color: '#ef4444' },
  high:     { label: '❗ High',     bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.22)', color: '#f97316' },
};

export default function NotificationCard({ notification, onMarkRead, onDelete }) {
  const {
    id,
    title,
    message,
    icon,
    color = '#94a3b8',
    priority,
    read,
    createdAt,
    actionLabel,
    actionFn,
  } = notification;

  const badge = PRIORITY_BADGE[priority];

  function handleClick() {
    if (!read) onMarkRead?.(id);
  }

  function handleDelete(e) {
    e.stopPropagation();
    onDelete?.(id);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  // Unread-state background
  const unreadBg = `linear-gradient(135deg, rgba(${hexToRgb(color)},0.04), rgba(${hexToRgb(color)},0.02))`;

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`${read ? '' : 'Unread: '}${title}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        padding: '12px 14px',
        background: read ? 'transparent' : unreadBg,
        border: `1px solid ${read ? 'rgba(255,255,255,0.05)' : `rgba(${hexToRgb(color)},0.18)`}`,
        borderLeft: `3px solid ${read ? 'rgba(255,255,255,0.06)' : color}`,
        borderRadius: '10px',
        marginBottom: '6px',
        cursor: read ? 'default' : 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        position: 'relative',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = read
          ? 'rgba(255,255,255,0.03)'
          : `linear-gradient(135deg, rgba(${hexToRgb(color)},0.07), rgba(${hexToRgb(color)},0.04))`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = read ? 'transparent' : unreadBg;
      }}
    >
      {/* Unread glow dot */}
      {!read && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '15px',
            left: '-7px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}99`,
          }}
        />
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        {/* Icon bubble */}
        <div
          aria-hidden="true"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: `rgba(${hexToRgb(color)},0.1)`,
            border: `1px solid rgba(${hexToRgb(color)},0.2)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '6px',
            }}
          >
            <span
              style={{
                color: read ? 'rgba(255,255,255,0.55)' : '#fff',
                fontSize: '12.5px',
                fontWeight: read ? '500' : '700',
                lineHeight: 1.3,
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              {title}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <span
                style={{
                  color: 'rgba(255,255,255,0.28)',
                  fontSize: '10px',
                  marginTop: '1px',
                  fontFamily: 'Quicksand, sans-serif',
                }}
              >
                {timeAgo(createdAt)}
              </span>

              {/* Delete button */}
              <button
                onClick={handleDelete}
                aria-label="Delete notification"
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'color 0.15s, background 0.15s',
                  fontFamily: 'Quicksand, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <p
              style={{
                color: 'rgba(255,255,255,0.38)',
                fontSize: '11px',
                marginTop: '3px',
                marginBottom: 0,
                lineHeight: '1.45',
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              {message}
            </p>
          )}

          {/* Footer row: badge + action */}
          {(badge || actionLabel) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '7px',
              }}
            >
              {badge && (
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                    fontSize: '9px',
                    fontWeight: '700',
                    letterSpacing: '0.3px',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  {badge.label}
                </span>
              )}

              {actionLabel && actionFn && (
                <button
                  onClick={(e) => { e.stopPropagation(); actionFn(); }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '5px',
                    border: `1px solid rgba(${hexToRgb(color)},0.3)`,
                    background: `rgba(${hexToRgb(color)},0.08)`,
                    color: color,
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'Quicksand, sans-serif',
                  }}
                >
                  {actionLabel} →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hex → RGB helper (for rgba() usage) ──
function hexToRgb(hex = '#94a3b8') {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;
}