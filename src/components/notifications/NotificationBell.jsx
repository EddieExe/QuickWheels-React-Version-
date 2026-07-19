/**
 * NotificationBell.jsx
 * Bell icon button with animated unread badge.
 * Pulse keyframe is defined inline via <style> so it works
 * regardless of whether tripDashboard.css is loaded.
 */

export default function NotificationBell({ unreadCount = 0, onClick, isOpen }) {
  return (
    <>
      {/* Scoped keyframe — safe to render multiple times, browser dedupes */}
      <style>{`
        @keyframes nb-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
        @keyframes nb-ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(12deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(8deg); }
          40% { transform: rotate(-6deg); }
          50% { transform: rotate(0deg); }
        }
        .nb-btn:hover .nb-icon { animation: nb-ring 0.6s ease; }
      `}</style>

      <button
        className="nb-btn"
        onClick={onClick}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          border: `1px solid ${isOpen ? 'rgba(76,227,247,0.35)' : 'rgba(255,255,255,0.1)'}`,
          background: isOpen
            ? 'rgba(76,227,247,0.12)'
            : 'rgba(255,255,255,0.04)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s, border-color 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          className="nb-icon"
          style={{ fontSize: '18px', display: 'block', lineHeight: 1 }}
        >
          🔔
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #0a0a14',
              fontFamily: 'Quicksand, sans-serif',
              animation: 'nb-pulse 2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>
    </>
  );
}