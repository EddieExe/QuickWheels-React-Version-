import { useState } from "react";

const T = {
  cyan: "#4ce3f7",
  purple: "#9333ea",
  textSec: "rgba(255,255,255,0.4)",
};

export default function QuickActionBar({ onVerifyPickup, onVerifyReturn, onAddVehicle, onViewBookings, setActiveTab }) {
  const [hoveredAction, setHoveredAction] = useState(null);

  const actions = [
    { 
      id: "verifyPickup", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ), 
      label: "Verify Pickup", 
      description: "Mark vehicle as picked up",
      color: T.cyan,
      bgColor: `${T.cyan}10`,
      onClick: onVerifyPickup
    },
    { 
      id: "verifyReturn", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      ), 
      label: "Verify Return", 
      description: "Mark vehicle as returned",
      color: "#22c55e",
      bgColor: "#22c55e10",
      onClick: onVerifyReturn
    },
    { 
      id: "addVehicle", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      ), 
      label: "Add Vehicle", 
      description: "Quick add car to fleet",
      color: "#a855f7",
      bgColor: "#a855f710",
      onClick: onAddVehicle
    },
    { 
      id: "viewBookings", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <line x1="9" y1="10" x2="15" y2="10" />
          <line x1="9" y1="14" x2="15" y2="14" />
          <line x1="9" y1="18" x2="15" y2="18" />
        </svg>
      ), 
      label: "View Bookings", 
      description: "Go to bookings tab",
      color: "#f59e0b",
      bgColor: "#f59e0b10",
      onClick: onViewBookings || (() => setActiveTab("bookings"))
    },
  ];

  return (
    <div className="qa-card-outer" style={{
      background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: "20px",
      padding: "20px",
    }}>
      <style>{`
        .qa-card-outer {
          transition: all 0.3s ease;
        }
        .qa-card-outer:hover {
          border-color: rgba(147,51,234,0.3) !important;
          box-shadow: 0 12px 32px -12px rgba(147,51,234,0.3);
        }
        @media (max-width: 768px) {
          .qa-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .qa-card-outer {
            padding: 14px !important;
          }
        }
        @media (max-width: 480px) {
          .qa-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .qa-card-outer {
            padding: 12px !important;
          }
        }
        @media (max-width: 360px) {
          .qa-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }
        }
      `}</style>
      <h3 style={{ 
        margin: "0 0 16px", 
        fontSize: "14px", 
        color: T.textSec, 
        fontWeight: "600", 
        letterSpacing: "0.5px",
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Quick Actions
      </h3>
      <div className="qa-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
      }}>
        {actions.map(action => {
          const isHovered = hoveredAction === action.id;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              onMouseEnter={() => setHoveredAction(action.id)}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px",
                background: isHovered ? action.bgColor : "rgba(255,255,255,.02)",
                border: `1px solid ${isHovered ? action.color + '66' : action.color + '33'}`,
                borderRadius: "14px",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                textAlign: "left",
                fontFamily: "Quicksand, sans-serif",
                transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                overflow: "hidden"
              }}
            >
              <div style={{ 
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: action.color,
                filter: isHovered ? `drop-shadow(0 0 8px ${action.color}80)` : "none",
                transition: "filter 0.25s ease"
              }}>
                {action.icon}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: "700", fontSize: "14px", color: "#fff", marginBottom: "2px" }}>
                  {action.label}
                </div>
                <div style={{ fontSize: "11px", color: T.textSec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {action.description}
                </div>
              </div>

              <span style={{ 
                position: "absolute",
                right: "18px",
                top: "50%",
                transform: `translateY(-50%) translateX(${isHovered ? '0' : '-8px'})`,
                opacity: isHovered ? 1 : 0,
                fontSize: "16px", 
                color: action.color,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                pointerEvents: "none"
              }}>
                →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}