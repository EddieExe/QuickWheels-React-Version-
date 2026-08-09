// adminResponsivePatch.js
// src/hooks/adminResponsivePatch.js

export const RESPONSIVE_CSS = `
/* ── RESPONSIVE SYSTEM v2.0 ── */

/* ══════════════════════════════════════════════════════════
   SECTION 0: ROOT TOKENS
══════════════════════════════════════════════════════════ */

:root {
  --admin-sidebar-w: 250px;
  --admin-sidebar-collapsed: 90px;
  --admin-header-h: 76px;
}

/* ══════════════════════════════════════════════════════════
   SECTION 1: ROOT LAYOUT & BOX SIZING
══════════════════════════════════════════════════════════ */

.admin-root,
.admin-root *,
.admin-root *::before,
.admin-root *::after {
  box-sizing: border-box !important;
}

.admin-main-content,
.admin-main-content > * {
  min-height: 0 !important;
}

.admin-split-layout {
  min-height: 0 !important;
  overflow: hidden !important;
  max-width: 100% !important;
}

.admin-split-layout > * {
  min-height: 0 !important;
}

.booking-sidebar,
.admin-filter-sidebar,
.admin-content-area {
  min-height: 0 !important;
  height: 100% !important;
}

.premium-scroll,
.ca-scroll, .loc-scroll, .tr-scroll,
.al-scroll, .er-scroll, .db-scroll, .as-scroll {
  min-height: 0 !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 2: COLLAPSIBLE FILTERS (GLOBAL)
══════════════════════════════════════════════════════════ */

.filter-collapsible-wrapper {
  overflow: hidden !important;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
  max-height: 800px !important;
}

.filter-collapsible-wrapper.collapsed {
  max-height: 0 !important;
}

.filter-toggle-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
  padding: 10px 14px !important;
  background: rgba(255,255,255,0.03) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 12px !important;
  color: rgba(255,255,255,0.6) !important;
  cursor: pointer !important;
  font-family: inherit !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 1px !important;
  transition: all 0.3s ease !important;
  flex-shrink: 0 !important;
}

.filter-toggle-btn:hover {
  background: rgba(255,255,255,0.06) !important;
  border-color: rgba(255,255,255,0.15) !important;
  color: #fff !important;
}

.filter-toggle-btn .toggle-icon {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.filter-toggle-btn .toggle-icon.open {
  transform: rotate(180deg) !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 3: BOOKING CARDS — BASE with GLASS MORPHISM
══════════════════════════════════════════════════════════ */

.admin-booking-card {
  position: relative !important;
  z-index: 1 !important;
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
  padding: 16px 20px !important;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
}

.admin-booking-card:hover {
  background: rgba(255, 255, 255, 0.06) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(147,51,234,0.05) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  z-index: 2 !important;
}

.admin-booking-card.selected {
  background: rgba(147, 51, 234, 0.1) !important;
  border-color: #9333ea !important;
  box-shadow: 0 4px 24px rgba(147,51,234,0.15) !important;
}

.admin-booking-card[style*="background:rgba(76,227,247,0.05)"] {
  background: rgba(76,227,247,0.12) !important;
}

.admin-booking-card .ios-checkbox {
  z-index: 2 !important;
}

.booking-card-meta-grid {
  display: grid !important;
  gap: 8px !important;
}

.booking-card-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
  margin-top: 8px !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 4: BOOKING SIDEBAR (STICKY with BLUR)
══════════════════════════════════════════════════════════ */

.booking-sidebar {
  z-index: 100 !important;
  position: sticky !important;
  top: 0 !important;
  background: rgba(10, 10, 20, 0.3) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}

.booking-sidebar-header {
  z-index: 9999 !important;
  position: sticky !important;
  top: 0 !important;
  background: rgba(10,10,20,0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-bottom: 12px !important;
  flex-shrink: 0 !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
}

.booking-sidebar-header .kpi-widget-sticky,
.booking-sidebar-header > div:first-child {
  z-index: 10000 !important;
  position: relative !important;
  margin-bottom: 12px !important;
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%) !important;
}

.booking-sidebar-header .filter-toggle-btn {
  z-index: 10000 !important;
  position: relative !important;
}

.booking-sidebar .premium-scroll {
  z-index: 1 !important;
  position: relative !important;
  background: transparent !important;
}

.booking-sidebar .premium-scroll .filter-collapsible-wrapper {
  background: transparent !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 5: USERS SIDEBAR (STICKY with BLUR)
══════════════════════════════════════════════════════════ */

.users-sidebar {
  display: grid !important;
  grid-template-rows: auto 1fr !important;
  height: calc(100vh - 80px) !important;
  position: sticky !important;
  top: 0 !important;
  overflow: hidden !important;
  background: rgba(10, 10, 20, 0.3) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-right: 4px !important;
  flex: 0 0 22% !important;
  z-index: 100 !important;
}

.users-sidebar-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 9999 !important;
  background: rgba(10,10,20,0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
  flex-shrink: 0 !important;
}

.users-sidebar-header .kpi-widget-sticky {
  z-index: 10000 !important;
  position: relative !important;
  margin-bottom: 12px !important;
}

.users-sidebar-header .filter-toggle-btn {
  z-index: 10000 !important;
  position: relative !important;
}

.users-sidebar .premium-scroll {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  min-height: 0 !important;
  background: transparent !important;
  padding-right: 2px !important;
  padding-top: 4px !important;
  flex: 1 !important;
  z-index: 1 !important;
  position: relative !important;
}

.users-sidebar .premium-scroll .filter-collapsible-wrapper {
  background: transparent !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 6: USER CARDS — GLASS MORPHISM
══════════════════════════════════════════════════════════ */

.user-card-inner {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 24px !important;
  padding: 14px 18px !important;
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
  cursor: pointer !important;
  transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
  width: 100% !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
}

.user-card-inner:hover {
  background: rgba(255, 255, 255, 0.06) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99,102,241,0.05) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.user-card-row-top {
  display: flex !important;
  align-items: flex-start !important;
  gap: 14px !important;
}

.user-card-avatar {
  width: 44px !important;
  height: 44px !important;
  border-radius: 12px !important;
  flex-shrink: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  color: #fff !important;
}

.user-card-name-email { flex: 1 !important; min-width: 0 !important; }
.user-card-name { font-weight: 700 !important; color: #fff !important; font-size: 14px !important; }

.user-card-email {
  margin: 2px 0 0 !important;
  font-size: 12px !important;
  color: rgba(255,255,255,0.35) !important;
  font-family: monospace !important;
  word-break: break-all !important;
}

.user-card-role-badge {
  padding: 2px 8px !important;
  border-radius: 4px !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  flex-shrink: 0 !important;
}

.user-card-row-stats {
  display: flex !important;
  align-items: center !important;
  gap: 32px !important;
  border-left: 1px solid rgba(255,255,255,0.06) !important;
  padding-left: 24px !important;
}

.user-card-stat-label {
  margin: 0 0 2px 0 !important;
  font-size: 9px !important;
  color: rgba(255,255,255,0.3) !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
}

.user-card-stat-value { margin: 0 !important; font-size: 14px !important; color: #fff !important; font-weight: 700 !important; }
.user-card-stat-revenue { margin: 0 !important; font-size: 15px !important; color: #10b981 !important; font-weight: 800 !important; }

.user-card-row-actions {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  flex-wrap: wrap !important;
  border-left: 1px solid rgba(255,255,255,0.06) !important;
  padding-left: 24px !important;
}

.user-card-btn-bookings {
  padding: 7px 16px !important; border-radius: 8px !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  background: rgba(255,255,255,0.03) !important; color: #fff !important;
  cursor: pointer !important; font-weight: 700 !important; font-size: 11px !important;
  font-family: inherit !important; transition: all 0.2s ease !important; white-space: nowrap !important;
}
.user-card-btn-bookings:hover { background: #fff !important; color: #000 !important; }

.user-card-btn-suspend {
  padding: 7px 14px !important; background: rgba(239,68,68,0.06) !important;
  border: 1px solid rgba(239,68,68,0.2) !important; border-radius: 8px !important;
  color: #f87171 !important; cursor: pointer !important; font-size: 11px !important;
  font-weight: 700 !important; font-family: inherit !important; white-space: nowrap !important;
  transition: all 0.2s ease !important;
}
.user-card-btn-suspend:hover { background: rgba(239,68,68,0.12) !important; border-color: rgba(239,68,68,0.4) !important; }

.user-card-btn-make-dealer {
  padding: 7px 14px !important; background: rgba(34,197,94,0.06) !important;
  border: 1px solid rgba(34,197,94,0.2) !important; border-radius: 8px !important;
  color: #34d399 !important; cursor: pointer !important; font-size: 11px !important;
  font-weight: 700 !important; font-family: inherit !important; white-space: nowrap !important;
  transition: all 0.2s ease !important;
}
.user-card-btn-make-dealer:hover { background: rgba(34,197,94,0.12) !important; border-color: rgba(34,197,94,0.4) !important; }

.user-card-btn-revoke-dealer {
  padding: 7px 14px !important; background: rgba(245,158,11,0.06) !important;
  border: 1px solid rgba(245,158,11,0.2) !important; border-radius: 8px !important;
  color: #fbbf24 !important; cursor: pointer !important; font-size: 11px !important;
  font-weight: 700 !important; font-family: inherit !important; white-space: nowrap !important;
  transition: all 0.2s ease !important;
}
.user-card-btn-revoke-dealer:hover { background: rgba(245,158,11,0.12) !important; border-color: rgba(245,158,11,0.4) !important; }

/* ══════════════════════════════════════════════════════════
   SECTION 7: USER BOOKINGS VIEW
══════════════════════════════════════════════════════════ */

.user-bookings-sidebar {
  display: grid !important;
  grid-template-rows: auto 1fr !important;
  height: calc(100vh - 80px) !important;
  position: sticky !important;
  top: 0 !important;
  overflow: hidden !important;
  background: rgba(10, 10, 20, 0.3) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-right: 4px !important;
  flex: 0 0 22% !important;
  z-index: 100 !important;
}

.user-bookings-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 9999 !important;
  background: rgba(10,10,20,0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
  flex-shrink: 0 !important;
}

.user-profile-card {
  background: linear-gradient(135deg, rgba(76,227,247,0.02) 0%, rgba(99,102,241,0.02) 100%) !important;
  border: 1px solid rgba(76,227,247,0.12) !important;
  padding: 16px !important;
  border-radius: 16px !important;
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  margin-bottom: 12px !important;
  z-index: 10000 !important;
  position: relative !important;
}

.user-profile-avatar {
  width: 48px !important;
  height: 48px !important;
  border-radius: 12px !important;
  flex-shrink: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 20px !important;
  font-weight: 800 !important;
  color: #fff !important;
  background: linear-gradient(135deg, #6366f1 0%, #4ce3f7 100%) !important;
}

.user-profile-info {
  flex: 1 !important;
  min-width: 0 !important;
}

.user-profile-name {
  margin: 0 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #fff !important;
}

.user-profile-email {
  margin: 2px 0 0 !important;
  font-size: 12px !important;
  color: rgba(255,255,255,0.4) !important;
  word-break: break-all !important;
}

.user-bookings-back-btn {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  background: rgba(255,255,255,0.02) !important;
  color: rgba(255,255,255,0.6) !important;
  cursor: pointer !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  font-family: inherit !important;
  transition: all 0.2s ease !important;
  margin-bottom: 12px !important;
  flex-shrink: 0 !important;
  z-index: 10000 !important;
  position: relative !important;
}

.user-bookings-back-btn:hover {
  background: rgba(255,255,255,0.08) !important;
  color: #fff !important;
  transform: translateX(-2px) !important;
}

.user-bookings-count {
  background: rgba(255,255,255,0.01) !important;
  border: 1px solid rgba(255,255,255,0.05) !important;
  padding: 12px 16px !important;
  border-radius: 12px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 12px !important;
  flex-shrink: 0 !important;
  z-index: 10000 !important;
  position: relative !important;
}

.user-bookings-count-label {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: rgba(255,255,255,0.4) !important;
  letter-spacing: 1px !important;
}

.user-bookings-count-value {
  font-size: 14px !important;
  font-weight: 800 !important;
  color: #4ce3f7 !important;
}

.user-bookings-header .filter-toggle-btn {
  z-index: 10000 !important;
  position: relative !important;
}

.user-bookings-sidebar .premium-scroll {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  min-height: 0 !important;
  background: transparent !important;
  padding-right: 2px !important;
  padding-top: 4px !important;
  flex: 1 !important;
  z-index: 1 !important;
  position: relative !important;
}

.user-bookings-sidebar + .admin-content-area .admin-booking-card {
  position: relative !important;
  z-index: 1 !important;
}

.user-bookings-sidebar + .admin-content-area .admin-booking-card:hover {
  z-index: 2 !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 8: DEALERS SIDEBAR (STICKY with BLUR)
══════════════════════════════════════════════════════════ */

.dealers-sidebar {
  display: grid !important;
  grid-template-rows: auto 1fr !important;
  height: calc(100vh - 80px) !important;
  position: sticky !important;
  top: 0 !important;
  overflow: hidden !important;
  background: rgba(10, 10, 20, 0.3) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-right: 4px !important;
  flex: 0 0 22% !important;
  z-index: 100 !important;
}

.dealers-sidebar-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 9999 !important;
  background: rgba(10,10,20,0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
  flex-shrink: 0 !important;
}

.dealers-sidebar-header .kpi-widget-sticky,
.dealers-sidebar-header .filter-toggle-btn {
  z-index: 10000 !important;
  position: relative !important;
}

.dealers-sidebar-header .kpi-widget-sticky {
  margin-bottom: 12px !important;
}

.dealers-sidebar .premium-scroll {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  min-height: 0 !important;
  background: transparent !important;
  padding-right: 2px !important;
  padding-top: 4px !important;
  flex: 1 !important;
  z-index: 1 !important;
  position: relative !important;
}

.dealers-sidebar .premium-scroll .filter-collapsible-wrapper {
  background: transparent !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION: DEALER SECTION - MOBILE RESPONSIVE (FIXED)
══════════════════════════════════════════════════════════ */

@media (max-width: 767px) {
  /* ─── DEALER SIDEBAR ─── */
  .dealers-sidebar {
    flex: 0 0 100% !important;
    height: auto !important;
    position: relative !important;
    padding-right: 0 !important;
    display: block !important;
    overflow: visible !important;
  }

  .dealers-sidebar-header {
    position: relative !important;
    padding-bottom: 12px !important;
  }

  .admin-split-layout {
    flex-direction: column !important;
    gap: 16px !important;
    padding: 12px !important;
  }

  .admin-content-area {
    flex: 0 0 100% !important;
    height: auto !important;
    overflow: visible !important;
    padding: 0 !important;
  }

  .premium-scroll {
    overflow-y: visible !important;
    max-height: none !important;
  }

  /* ─── STATS COLLAPSIBLE ─── */
  .dealer-stats-collapsible {
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    border-radius: 14px !important;
    padding: 6px !important;
    margin-bottom: 10px !important;
  }

  .dealer-stats-toggle {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    padding: 10px 12px !important;
    background: transparent !important;
    border: none !important;
    color: rgba(255,255,255,0.8) !important;
    font-weight: 700 !important;
    font-size: 12px !important;
    cursor: pointer !important;
    font-family: 'Quicksand', sans-serif !important;
    letter-spacing: 1px !important;
  }

  .dealer-stats-toggle svg {
    color: rgba(255,255,255,0.4) !important;
    transition: transform 0.3s ease !important;
  }

  .dealer-stats-toggle svg.open {
    transform: rotate(180deg) !important;
  }

  .dealer-stats-content {
    max-height: 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease !important;
  }

  .dealer-stats-content.open {
    max-height: 500px !important;
    opacity: 1 !important;
  }

  .dealer-stats-grid {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 6px !important;
    padding: 6px 2px !important;
  }

  .dealer-stat-item {
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-radius: 10px !important;
    padding: 10px 6px !important;
    text-align: center !important;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
    cursor: default !important;
  }

  .dealer-stat-item:active {
    transform: scale(0.96) !important;
    background: rgba(255, 255, 255, 0.06) !important;
  }

  .dealer-stat-item .stat-value {
    font-size: 18px !important;
    font-weight: 800 !important;
    color: #fff !important;
    display: block !important;
  }

  .dealer-stat-item .stat-label {
    font-size: 9px !important;
    color: rgba(255, 255, 255, 0.4) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    font-weight: 700 !important;
    display: block !important;
    margin-top: 2px !important;
  }

  /* Add Dealer button inside stats */
  .dealer-add-btn-mobile {
    width: 100% !important;
    padding: 12px !important;
    margin-top: 6px !important;
    background: linear-gradient(135deg, #9f1239, #f43f5e) !important;
    border: none !important;
    border-radius: 12px !important;
    color: #fff !important;
    font-weight: 700 !important;
    font-size: 13px !important;
    cursor: pointer !important;
    font-family: 'Quicksand', sans-serif !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 4px 16px rgba(244,63,94,0.25) !important;
  }

  .dealer-add-btn-mobile:active {
    transform: scale(0.97) !important;
  }

  /* ─── PERFORMANCE & COMMISSION BUTTONS ─── */
  .dealer-action-buttons-row {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
    margin-bottom: 10px !important;
  }

  .dealer-action-buttons-row button {
    padding: 12px 10px !important;
    border-radius: 12px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    font-family: 'Quicksand', sans-serif !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    border: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    background: rgba(255, 255, 255, 0.03) !important;
  }

  .dealer-action-buttons-row button:active {
    transform: scale(0.96) !important;
  }

  .dealer-action-btn-performance {
    border: 1px solid rgba(168, 85, 247, 0.25) !important;
    color: #c084fc !important;
  }

  .dealer-action-btn-performance svg {
    color: #c084fc !important;
  }

  .dealer-action-btn-commission {
    border: 1px solid rgba(34, 197, 94, 0.25) !important;
    color: #4ade80 !important;
  }

  .dealer-action-btn-commission svg {
    color: #4ade80 !important;
  }

  /* ─── DEALER CARDS ─── */
  .dealer-card {
    flex-direction: column !important;
    gap: 10px !important;
    padding: 12px 14px !important;
  }

  .dealer-card .dealer-card-left {
    flex: 1 1 100% !important;
    min-width: 0 !important;
  }

  .dealer-card .dealer-card-right {
    flex: 1 1 100% !important;
    min-width: 0 !important;
  }

  .dealer-card .dealer-avatar {
    width: 36px !important;
    height: 36px !important;
    font-size: 14px !important;
  }

  .dealer-card .dealer-name {
    font-size: 13px !important;
  }

  .dealer-card .dealer-detail-text {
    font-size: 10px !important;
  }

  .dealer-card .dealer-stats-row {
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 4px !important;
    padding: 6px 0 !important;
  }

  .dealer-card .dealer-stats-row .stat-item {
    padding: 4px !important;
  }

  .dealer-card .dealer-stats-row .stat-label {
    font-size: 7px !important;
    letter-spacing: 0.3px !important;
  }

  .dealer-card .dealer-stats-row .stat-value {
    font-size: 13px !important;
  }

  /* ─── DEALER CARD ACTIONS - SINGLE ROW ─── */
  .dealer-card .dealer-card-actions {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 4px !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    padding: 2px 0 !important;
    scrollbar-width: none !important;
    justify-content: flex-start !important;
  }

  .dealer-card .dealer-card-actions::-webkit-scrollbar {
    display: none !important;
  }

  .dealer-card .dealer-card-actions button {
    flex: 0 0 auto !important;
    padding: 5px 8px !important;
    font-size: 8px !important;
    white-space: nowrap !important;
    min-width: 0 !important;
    flex-shrink: 0 !important;
    letter-spacing: 0.3px !important;
  }

  .dealer-card .dealer-card-actions .dealer-card-btn-delete {
    flex: 0 0 auto !important;
    padding: 5px 7px !important;
    font-size: 10px !important;
  }

  .dealer-card .dealer-card-actions button svg {
    width: 9px !important;
    height: 9px !important;
  }

  /* ─── HIDE DESKTOP STATS ─── */
  .dealers-quick-stats-desktop {
    display: none !important;
  }

  /* ─── SHOW MOBILE STATS ─── */
  .dealers-quick-stats-mobile {
    display: block !important;
  }
}

@media (max-width: 479px) {
  .dealer-stats-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 4px !important;
  }

  .dealer-stat-item {
    padding: 8px 4px !important;
  }

  .dealer-stat-item .stat-value {
    font-size: 15px !important;
  }

  .dealer-action-buttons-row {
    grid-template-columns: 1fr 1fr !important;
    gap: 6px !important;
  }

  .dealer-action-buttons-row button {
    font-size: 10px !important;
    padding: 10px 8px !important;
  }

  .dealer-card .dealer-card-actions button {
    padding: 4px 6px !important;
    font-size: 7px !important;
  }

  .dealer-card .dealer-stats-row .stat-value {
    font-size: 11px !important;
  }

  .dealer-card .dealer-name {
    font-size: 12px !important;
  }

  .dealer-card .dealer-detail-text {
    font-size: 9px !important;
  }

  .dealer-card .dealer-avatar {
    width: 30px !important;
    height: 30px !important;
    font-size: 12px !important;
  }

  .dealer-add-btn-mobile {
    font-size: 12px !important;
    padding: 10px !important;
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION: PERFORMANCE MODAL - MOBILE RESPONSIVE
══════════════════════════════════════════════════════════ */

@media (max-width: 767px) {
  .performance-modal-wrapper {
    padding: 0 !important;
  }

  .performance-modal-wrapper > div {
    width: 100% !important;
    height: 100vh !important;
    max-height: 100vh !important;
    border-radius: 0 !important;
    padding: 16px !important;
    overflow-y: auto !important;
  }

  .performance-modal-wrapper .perf-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 4px !important;
    padding-bottom: 12px !important;
    margin-bottom: 12px !important;
    border-bottom: 1px solid rgba(255,255,255,0.06) !important;
  }

  .performance-modal-wrapper .perf-header h2 {
    font-size: 18px !important;
  }

  .performance-modal-wrapper .perf-header p {
    font-size: 12px !important;
  }

  /* Performance Metrics - Full width at top */
  .performance-modal-wrapper .perf-metrics {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
    margin-bottom: 12px !important;
    width: 100% !important;
  }

  .performance-modal-wrapper .perf-metrics > div {
    padding: 12px !important;
    border-radius: 12px !important;
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    text-align: center !important;
  }

  .performance-modal-wrapper .perf-metrics .metric-value {
    font-size: 20px !important;
    font-weight: 800 !important;
    color: #fff !important;
    display: block !important;
  }

  .performance-modal-wrapper .perf-metrics .metric-label {
    font-size: 9px !important;
    color: rgba(255,255,255,0.4) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    font-weight: 700 !important;
    display: block !important;
    margin-top: 2px !important;
  }

  /* Collapsible wrapper for Search + System Status */
  .performance-modal-wrapper .perf-collapsible {
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    border-radius: 12px !important;
    margin-bottom: 12px !important;
    overflow: hidden !important;
  }

  .performance-modal-wrapper .perf-collapsible-toggle {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    padding: 10px 14px !important;
    background: transparent !important;
    border: none !important;
    color: rgba(255,255,255,0.7) !important;
    font-weight: 700 !important;
    font-size: 11px !important;
    cursor: pointer !important;
    font-family: 'Quicksand', sans-serif !important;
    letter-spacing: 0.5px !important;
  }

  .performance-modal-wrapper .perf-collapsible-content {
    max-height: 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease !important;
    padding: 0 14px !important;
  }

  .performance-modal-wrapper .perf-collapsible-content.open {
    max-height: 400px !important;
    opacity: 1 !important;
    padding: 0 14px 14px !important;
  }

  .performance-modal-wrapper .perf-collapsible-content input {
    width: 100% !important;
    padding: 10px 14px !important;
    border-radius: 10px !important;
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: #fff !important;
    font-size: 13px !important;
    font-family: 'Quicksand', sans-serif !important;
    outline: none !important;
    margin-bottom: 8px !important;
  }

  .performance-modal-wrapper .perf-system-status {
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    border-radius: 10px !important;
    padding: 10px 14px !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
  }

  .performance-modal-wrapper .perf-system-status .status-label {
    font-size: 10px !important;
    color: rgba(255,255,255,0.4) !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
  }

  .performance-modal-wrapper .perf-system-status .status-value {
    font-size: 13px !important;
    color: #fff !important;
    font-weight: 700 !important;
  }

  /* Dealer Scorecard - Full width */
  .performance-modal-wrapper .perf-scorecard {
    width: 100% !important;
    margin-top: 4px !important;
  }

  .performance-modal-wrapper .perf-scorecard-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 8px 0 !important;
    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
    margin-bottom: 8px !important;
  }

  .performance-modal-wrapper .perf-scorecard-header h3 {
    font-size: 13px !important;
    color: #fff !important;
    font-weight: 700 !important;
    margin: 0 !important;
  }

  .performance-modal-wrapper .perf-scorecard-header span {
    font-size: 11px !important;
    color: rgba(255,255,255,0.4) !important;
  }

  .performance-modal-wrapper .perf-scorecard-item {
    padding: 10px 12px !important;
    border-radius: 10px !important;
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    margin-bottom: 6px !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .item-row {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .dealer-name {
    font-size: 13px !important;
    font-weight: 700 !important;
    color: #fff !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .dealer-location {
    font-size: 10px !important;
    color: rgba(255,255,255,0.4) !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .badge {
    font-size: 8px !important;
    padding: 2px 8px !important;
    border-radius: 4px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .stats-grid {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 4px !important;
    margin-top: 6px !important;
    padding-top: 6px !important;
    border-top: 1px solid rgba(255,255,255,0.04) !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .stats-grid .stat {
    text-align: center !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .stats-grid .stat .value {
    font-size: 14px !important;
    font-weight: 700 !important;
    color: #fff !important;
    display: block !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .stats-grid .stat .label {
    font-size: 7px !important;
    color: rgba(255,255,255,0.3) !important;
    text-transform: uppercase !important;
    font-weight: 700 !important;
    letter-spacing: 0.3px !important;
    display: block !important;
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION: COMMISSION MODAL - MOBILE RESPONSIVE
══════════════════════════════════════════════════════════ */

@media (max-width: 767px) {
  .commission-modal-wrapper {
    padding: 0 !important;
  }

  .commission-modal-wrapper > div {
    width: 100% !important;
    height: 100vh !important;
    max-height: 100vh !important;
    border-radius: 0 !important;
    padding: 16px !important;
    overflow-y: auto !important;
  }

  .commission-modal-wrapper .comm-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 4px !important;
    padding-bottom: 12px !important;
    margin-bottom: 12px !important;
    border-bottom: 1px solid rgba(255,255,255,0.06) !important;
  }

  .commission-modal-wrapper .comm-header h2 {
    font-size: 18px !important;
  }

  .commission-modal-wrapper .comm-header p {
    font-size: 12px !important;
  }

  /* Commission Metrics - Full width at top */
  .commission-modal-wrapper .comm-metrics {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
    margin-bottom: 12px !important;
    width: 100% !important;
  }

  .commission-modal-wrapper .comm-metrics > div {
    padding: 12px !important;
    border-radius: 12px !important;
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    text-align: center !important;
  }

  .commission-modal-wrapper .comm-metrics .metric-value {
    font-size: 20px !important;
    font-weight: 800 !important;
    color: #fff !important;
    display: block !important;
  }

  .commission-modal-wrapper .comm-metrics .metric-label {
    font-size: 9px !important;
    color: rgba(255,255,255,0.4) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    font-weight: 700 !important;
    display: block !important;
    margin-top: 2px !important;
  }

  /* Collapsible wrapper for Search + System Status */
  .commission-modal-wrapper .comm-collapsible {
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    border-radius: 12px !important;
    margin-bottom: 12px !important;
    overflow: hidden !important;
  }

  .commission-modal-wrapper .comm-collapsible-toggle {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    padding: 10px 14px !important;
    background: transparent !important;
    border: none !important;
    color: rgba(255,255,255,0.7) !important;
    font-weight: 700 !important;
    font-size: 11px !important;
    cursor: pointer !important;
    font-family: 'Quicksand', sans-serif !important;
    letter-spacing: 0.5px !important;
  }

  .commission-modal-wrapper .comm-collapsible-content {
    max-height: 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease !important;
    padding: 0 14px !important;
  }

  .commission-modal-wrapper .comm-collapsible-content.open {
    max-height: 400px !important;
    opacity: 1 !important;
    padding: 0 14px 14px !important;
  }

  .commission-modal-wrapper .comm-collapsible-content .filter-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 6px !important;
  }

  .commission-modal-wrapper .comm-collapsible-content .filter-grid select {
    width: 100% !important;
    padding: 10px 12px !important;
    border-radius: 10px !important;
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: #fff !important;
    font-size: 12px !important;
    font-family: 'Quicksand', sans-serif !important;
    outline: none !important;
    appearance: none !important;
  }

  /* Commission Ledger - Full width */
  .commission-modal-wrapper .comm-ledger {
    width: 100% !important;
    margin-top: 4px !important;
  }

  .commission-modal-wrapper .comm-ledger-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 8px 0 !important;
    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
    margin-bottom: 8px !important;
  }

  .commission-modal-wrapper .comm-ledger-header h3 {
    font-size: 13px !important;
    color: #fff !important;
    font-weight: 700 !important;
    margin: 0 !important;
  }

  .commission-modal-wrapper .comm-ledger-header span {
    font-size: 11px !important;
    color: rgba(255,255,255,0.4) !important;
  }

  .commission-modal-wrapper .comm-ledger-item {
    padding: 12px !important;
    border-radius: 10px !important;
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    margin-bottom: 6px !important;
  }

  .commission-modal-wrapper .comm-ledger-item .item-row {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
  }

  .commission-modal-wrapper .comm-ledger-item .dealer-name {
    font-size: 13px !important;
    font-weight: 700 !important;
    color: #fff !important;
  }

  .commission-modal-wrapper .comm-ledger-item .dealer-location {
    font-size: 10px !important;
    color: rgba(255,255,255,0.4) !important;
  }

  .commission-modal-wrapper .comm-ledger-item .commission-rate {
    font-size: 14px !important;
    font-weight: 800 !important;
    color: #4ade80 !important;
  }

  .commission-modal-wrapper .comm-ledger-item .stats-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 4px !important;
    margin-top: 6px !important;
    padding-top: 6px !important;
    border-top: 1px solid rgba(255,255,255,0.04) !important;
  }

  .commission-modal-wrapper .comm-ledger-item .stats-grid .stat {
    text-align: center !important;
  }

  .commission-modal-wrapper .comm-ledger-item .stats-grid .stat .value {
    font-size: 14px !important;
    font-weight: 700 !important;
    color: #fff !important;
    display: block !important;
  }

  .commission-modal-wrapper .comm-ledger-item .stats-grid .stat .label {
    font-size: 7px !important;
    color: rgba(255,255,255,0.3) !important;
    text-transform: uppercase !important;
    font-weight: 700 !important;
    letter-spacing: 0.3px !important;
    display: block !important;
  }

  .commission-modal-wrapper .comm-footer-note {
    font-size: 10px !important;
    color: rgba(255,255,255,0.3) !important;
    padding: 8px 0 !important;
    margin-top: 8px !important;
    border-top: 1px solid rgba(255,255,255,0.04) !important;
    text-align: center !important;
  }
}

@media (max-width: 479px) {
  .performance-modal-wrapper .perf-metrics {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 6px !important;
  }

  .performance-modal-wrapper .perf-metrics > div {
    padding: 10px !important;
  }

  .performance-modal-wrapper .perf-metrics .metric-value {
    font-size: 17px !important;
  }

  .performance-modal-wrapper .perf-scorecard-item .stats-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .commission-modal-wrapper .comm-metrics {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 6px !important;
  }

  .commission-modal-wrapper .comm-metrics > div {
    padding: 10px !important;
  }

  .commission-modal-wrapper .comm-metrics .metric-value {
    font-size: 17px !important;
  }

  .commission-modal-wrapper .comm-ledger-item .stats-grid {
    grid-template-columns: repeat(3, 1fr) !important;
  }

  .commission-modal-wrapper .comm-collapsible-content .filter-grid {
    grid-template-columns: 1fr !important;
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 9: REVIEWS SIDEBAR (STICKY with BLUR)
══════════════════════════════════════════════════════════ */

.reviews-sidebar {
  display: grid !important;
  grid-template-rows: auto 1fr !important;
  height: calc(100vh - 80px) !important;
  position: sticky !important;
  top: 0 !important;
  overflow: hidden !important;
  background: rgba(10, 10, 20, 0.3) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-right: 4px !important;
  flex: 0 0 22% !important;
  z-index: 100 !important;
}

.reviews-sidebar-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 9999 !important;
  background: rgba(10,10,20,0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
  flex-shrink: 0 !important;
}

.reviews-sidebar-header .kpi-widget-sticky,
.reviews-sidebar-header .filter-toggle-btn {
  z-index: 10000 !important;
  position: relative !important;
}

.reviews-sidebar-header .kpi-widget-sticky {
  margin-bottom: 12px !important;
}

.reviews-sidebar .premium-scroll {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  min-height: 0 !important;
  background: transparent !important;
  padding-right: 2px !important;
  padding-top: 4px !important;
  flex: 1 !important;
  z-index: 1 !important;
  position: relative !important;
}

.reviews-sidebar .premium-scroll .filter-collapsible-wrapper {
  background: transparent !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 10: NOTIFICATIONS SIDEBAR (STICKY with BLUR)
══════════════════════════════════════════════════════════ */

.notifications-sidebar {
  display: grid !important;
  grid-template-rows: auto 1fr !important;
  height: calc(100vh - 80px) !important;
  position: sticky !important;
  top: 0 !important;
  overflow: hidden !important;
  background: rgba(10, 10, 20, 0.3) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-right: 4px !important;
  flex: 0 0 22% !important;
  z-index: 100 !important;
}

.notifications-sidebar-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 9999 !important;
  background: rgba(10,10,20,0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
  flex-shrink: 0 !important;
}

.notifications-sidebar-header .kpi-widget-sticky,
.notifications-sidebar-header .filter-toggle-btn {
  z-index: 10000 !important;
  position: relative !important;
}

.notifications-sidebar-header .kpi-widget-sticky {
  margin-bottom: 12px !important;
}

.notifications-sidebar .premium-scroll {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  min-height: 0 !important;
  background: transparent !important;
  padding-right: 2px !important;
  padding-top: 4px !important;
  flex: 1 !important;
  z-index: 1 !important;
  position: relative !important;
}

.notifications-sidebar .premium-scroll .filter-collapsible-wrapper {
  background: transparent !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 11: DEALER CARDS — BASE & DESKTOP
══════════════════════════════════════════════════════════ */

.dealer-card-inner {
  display: flex !important; flex-direction: column !important; gap: 10px !important;
  padding: 14px 18px !important; background: rgba(255,255,255,0.01) !important;
  border: 1px solid rgba(255,255,255,0.05) !important; border-radius: 14px !important;
  cursor: pointer !important; transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important; width: 100% !important;
}
.dealer-card-inner:hover { background: rgba(255,255,255,0.03) !important; border-color: rgba(168,85,247,0.3) !important; transform: translateX(3px) !important; }

.dealer-card-row-top { display: flex !important; align-items: flex-start !important; gap: 14px !important; }

.dealer-card-avatar {
  width: 44px !important; height: 44px !important; border-radius: 12px !important; flex-shrink: 0 !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  font-size: 18px !important; font-weight: 800 !important; color: #fff !important;
  background: linear-gradient(135deg, #7c3aed 0%, #c084fc 100%) !important;
}

.dealer-card-name-email { flex: 1 !important; min-width: 0 !important; }
.dealer-card-name { font-weight: 700 !important; color: #fff !important; font-size: 14px !important; }
.dealer-card-email { margin: 2px 0 0 !important; font-size: 12px !important; color: rgba(255,255,255,0.35) !important; font-family: monospace !important; word-break: break-all !important; }
.dealer-card-location { margin: 2px 0 0 !important; font-size: 11px !important; color: rgba(255,255,255,0.3) !important; }
.dealer-card-status-badge { padding: 2px 8px !important; border-radius: 4px !important; font-size: 9px !important; font-weight: 800 !important; text-transform: uppercase !important; flex-shrink: 0 !important; }

.dealer-card-row-stats {
  display: flex !important; align-items: center !important; justify-content: center !important;
  gap: 60px !important; padding-top: 8px !important;
  border-top: 1px solid rgba(255,255,255,0.04) !important; width: 100% !important;
}

.dealer-card-stat-label { margin: 0 0 2px 0 !important; font-size: 9px !important; color: rgba(255,255,255,0.3) !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; }
.dealer-card-stat-value { margin: 0 !important; font-size: 14px !important; color: #fff !important; font-weight: 700 !important; }
.dealer-card-stat-revenue { margin: 0 !important; font-size: 15px !important; color: #10b981 !important; font-weight: 800 !important; }
.dealer-card-stat-rating { margin: 0 !important; font-size: 14px !important; color: #fbbf24 !important; font-weight: 700 !important; }

.dealer-card-row-actions {
  display: flex !important; align-items: center !important; justify-content: center !important;
  gap: 10px !important; padding-top: 8px !important;
  border-top: 1px solid rgba(255,255,255,0.04) !important; flex-wrap: wrap !important; width: 100% !important;
}

.dealer-card-btn-details  { padding: 7px 16px !important; border-radius: 8px !important; border: 1px solid rgba(168,85,247,0.3) !important; background: rgba(168,85,247,0.06) !important; color: #c084fc !important; cursor: pointer !important; font-weight: 700 !important; font-size: 11px !important; font-family: inherit !important; transition: all 0.2s ease !important; white-space: nowrap !important; }
.dealer-card-btn-details:hover  { background: rgba(168,85,247,0.12) !important; border-color: rgba(168,85,247,0.5) !important; }
.dealer-card-btn-locations { padding: 7px 14px !important; border-radius: 8px !important; border: 1px solid rgba(76,227,247,0.2) !important; background: rgba(76,227,247,0.06) !important; color: #4ce3f7 !important; cursor: pointer !important; font-weight: 700 !important; font-size: 11px !important; font-family: inherit !important; white-space: nowrap !important; transition: all 0.2s ease !important; }
.dealer-card-btn-locations:hover { background: rgba(76,227,247,0.12) !important; border-color: rgba(76,227,247,0.4) !important; }
.dealer-card-btn-approve   { padding: 7px 14px !important; border-radius: 8px !important; border: 1px solid rgba(34,197,94,0.2) !important; background: rgba(34,197,94,0.06) !important; color: #34d399 !important; cursor: pointer !important; font-weight: 700 !important; font-size: 11px !important; font-family: inherit !important; white-space: nowrap !important; transition: all 0.2s ease !important; }
.dealer-card-btn-approve:hover   { background: rgba(34,197,94,0.12) !important; border-color: rgba(34,197,94,0.4) !important; }
.dealer-card-btn-reject    { padding: 7px 14px !important; border-radius: 8px !important; border: 1px solid rgba(239,68,68,0.2) !important; background: rgba(239,68,68,0.06) !important; color: #f87171 !important; cursor: pointer !important; font-weight: 700 !important; font-size: 11px !important; font-family: inherit !important; white-space: nowrap !important; transition: all 0.2s ease !important; }
.dealer-card-btn-reject:hover    { background: rgba(239,68,68,0.12) !important; border-color: rgba(239,68,68,0.4) !important; }
.dealer-card-btn-suspend   { padding: 7px 14px !important; border-radius: 8px !important; border: 1px solid rgba(239,68,68,0.2) !important; background: rgba(239,68,68,0.06) !important; color: #f87171 !important; cursor: pointer !important; font-weight: 700 !important; font-size: 11px !important; font-family: inherit !important; white-space: nowrap !important; transition: all 0.2s ease !important; }
.dealer-card-btn-suspend:hover   { background: rgba(239,68,68,0.12) !important; border-color: rgba(239,68,68,0.4) !important; }
.dealer-card-btn-reinstate { padding: 7px 14px !important; border-radius: 8px !important; border: 1px solid rgba(34,197,94,0.2) !important; background: rgba(34,197,94,0.06) !important; color: #34d399 !important; cursor: pointer !important; font-weight: 700 !important; font-size: 11px !important; font-family: inherit !important; white-space: nowrap !important; transition: all 0.2s ease !important; }
.dealer-card-btn-reinstate:hover { background: rgba(34,197,94,0.12) !important; border-color: rgba(34,197,94,0.4) !important; }
.dealer-card-btn-delete    { padding: 7px 10px !important; border-radius: 8px !important; border: 1px solid rgba(239,68,68,0.15) !important; background: rgba(239,68,68,0.04) !important; color: #f87171 !important; cursor: pointer !important; font-weight: 600 !important; font-size: 13px !important; font-family: inherit !important; white-space: nowrap !important; transition: all 0.2s ease !important; }
.dealer-card-btn-delete:hover    { background: rgba(239,68,68,0.1) !important; border-color: rgba(239,68,68,0.3) !important; }


/* ══════════════════════════════════════════════════════════
   SECTION 12: DESKTOP COMPACT (1024–1279px)
══════════════════════════════════════════════════════════ */

@media (max-width: 1279px) {
  .admin-header  { padding: 0 20px !important; gap: 16px !important; }
  .header-stats  { gap: 20px !important; padding-right: 20px !important; }
}

/* ══════════════════════════════════════════════════════════
   SECTION 13: TABLET (768–1023px)
══════════════════════════════════════════════════════════ */

@media (max-width: 1023px) {
  /* Nav sidebar: slide-in drawer */
  .admin-sidebar {
    position: fixed !important; left: 0 !important; top: 0 !important;
    height: 100vh !important; width: 260px !important; min-width: 260px !important;
    z-index: 200 !important; transform: translateX(-100%) !important;
  }
  .admin-sidebar.open { transform: translateX(0) !important; }
  .mobile-menu-btn    { display: flex !important; }

  /* Header */
  .admin-header { padding: 0 16px !important; gap: 12px !important; height: 64px !important; }
  .header-stats { display: none !important; }
  .brand_logo   { height: 42px !important; }

  /* Split layout: column stack */
  .admin-split-layout {
    flex-direction: column !important;
    gap: 0 !important; padding: 0 !important;
    height: auto !important; overflow: visible !important;
  }

  /* Filter sidebar: horizontal scrolling strip */
  .admin-filter-sidebar {
    flex: none !important; width: 100% !important;
    flex-direction: row !important; flex-wrap: nowrap !important;
    overflow-x: auto !important; overflow-y: visible !important;
    padding: 10px 14px !important; gap: 10px !important;
    align-items: center !important;
    border-bottom: 1px solid rgba(255,255,255,0.06) !important;
    background: rgba(10,10,20,0.85) !important;
    backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important;
    position: sticky !important; top: 64px !important; z-index: 30 !important;
    scrollbar-width: none !important; -ms-overflow-style: none !important;
    max-width: 100% !important; height: auto !important;
  }
  .admin-filter-sidebar::-webkit-scrollbar { display: none !important; }
  .admin-filter-sidebar > div:first-child   { flex: 0 0 auto !important; min-width: 130px !important; padding: 8px 12px !important; border-radius: 12px !important; }
  .admin-filter-sidebar > div:first-child p:nth-child(3) { display: none !important; }
  .admin-filter-sidebar > div:first-child p:nth-child(1) { font-size: 8px !important; }
  .admin-filter-sidebar > div:first-child p:nth-child(2) { font-size: 14px !important; margin: 0 !important; }
  .admin-filter-sidebar > div[style*="letterSpacing"][style*="rgba(255,255,255,0.4)"] { display: none !important; }
  .admin-filter-sidebar input,
  .admin-filter-sidebar select { flex: 0 0 auto !important; width: 150px !important; min-width: 130px !important; padding: 9px 12px 9px 36px !important; font-size: 12px !important; border-radius: 10px !important; height: auto !important; }
  .admin-filter-sidebar button[style*="background: rgba(255"] { flex: 0 0 auto !important; white-space: nowrap !important; padding: 9px 14px !important; font-size: 11px !important; border-radius: 10px !important; }
  .admin-filter-sidebar > div[style*="flex-direction: \\"column\\""] { flex-direction: row !important; padding: 4px !important; border-radius: 10px !important; flex: 0 0 auto !important; }
  .admin-filter-sidebar button, .admin-filter-sidebar input, .admin-filter-sidebar select { min-height: 40px; }

  /* Content area */
  .admin-content-area { flex: none !important; width: 100% !important; height: auto !important; overflow: visible !important; padding: 8px 10px !important; }

  /* Scrollables: let them flow */
  .premium-scroll, .ca-scroll, .loc-scroll, .tr-scroll, .al-scroll, .er-scroll, .db-scroll, .as-scroll {
    overflow-y: visible !important; max-height: none !important;
  }

  /* Overview grid adjustments */
  .admin-stats-grid            { grid-template-columns: repeat(3,1fr) !important; padding: 14px !important; }
  .admin-overview-metric-grid  { grid-template-columns: repeat(2,1fr) !important; }
  .admin-system-metrics        { grid-template-columns: repeat(2,1fr) !important; }
  .admin-dealer-stats          { grid-template-columns: repeat(2,1fr) !important; }

  /* Main content padding */
  .admin-main-content { padding: 0 8px !important; }
  .admin-split-layout { gap: 12px !important; padding: 8px 4px !important; }
}

/* ══════════════════════════════════════════════════════════
   SECTION 14: LARGE MOBILE (480–767px)
══════════════════════════════════════════════════════════ */

@media (max-width: 767px) {
  /* Header */
  .admin-header { padding: 0 12px !important; height: 60px !important; gap: 8px !important; }
  .brand_logo   { height: 36px !important; }
  .admin-filter-sidebar { top: 60px !important; padding: 8px 12px !important; gap: 8px !important; }
  .admin-filter-sidebar input, .admin-filter-sidebar select { width: 130px !important; min-width: 110px !important; font-size: 11px !important; }
  .admin-avatar-btn  { width: 42px !important; min-width: 42px !important; }
  .admin-avatar-name { display: none !important; }

  /* Content */
  .admin-content-area { padding: 6px 8px !important; }
  .admin-main-content { padding: 0 10px !important; }
  .admin-split-layout { gap: 8px !important; padding: 4px 0 !important; overflow: visible !important; }

  /* Section header */
  .admin-section-header { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
  .admin-section-header h2 { font-size: 18px !important; }
  .admin-section-header-badge { display: none !important; }

  /* Booking cards */
  .booking-cards-grid { display: flex !important; flex-direction: column !important; gap: 10px !important; }
  .admin-booking-card { padding: 12px !important; border-radius: 12px !important; }
  .booking-card-meta-grid { grid-template-columns: 1fr !important; gap: 6px !important; }
  .booking-card-actions { flex-wrap: wrap !important; gap: 6px !important; }
  .booking-card-actions button { flex: 1 1 auto !important; min-width: 80px !important; font-size: 10px !important; padding: 7px 10px !important; }
  .booking-card-status-badge span { font-size: 9px !important; padding: 3px 8px !important; }
  .booking-receipt-btn { font-size: 9px !important; padding: 4px 8px !important; }

  /* Bulk action bar */
  .admin-bulk-bar { position: fixed !important; bottom: 12px !important; left: 8px !important; right: 8px !important; width: auto !important; border-radius: 12px !important; padding: 10px 14px !important; }

  /* User cards */
  .user-card-inner { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
  .user-card-avatar { width: 36px !important; height: 36px !important; font-size: 14px !important; }
  .user-card-name   { font-size: 13px !important; }
  .user-card-email  { font-size: 11px !important; }
  .user-card-row-top { flex: none !important; width: 100% !important; }
  .user-card-row-stats, .user-card-row-actions { border-left: none !important; padding-left: 0 !important; border-top: 1px solid rgba(255,255,255,0.04) !important; padding-top: 8px !important; justify-content: center !important; }
  .user-card-row-stats   { gap: 30px !important; }
  .user-card-row-actions { gap: 8px !important; }
  .user-card-stat-value   { font-size: 13px !important; }
  .user-card-stat-revenue { font-size: 14px !important; }
  .user-card-btn-bookings { font-size: 10px !important; padding: 6px 12px !important; }
  .user-card-btn-suspend, .user-card-btn-make-dealer, .user-card-btn-revoke-dealer { font-size: 10px !important; padding: 6px 10px !important; }

  /* Dealer cards */
  .dealer-card-inner { flex-wrap: wrap !important; padding: 12px 14px !important; gap: 8px !important; }
  .dealer-card-avatar { width: 36px !important; height: 36px !important; font-size: 14px !important; }
  .dealer-card-name     { font-size: 13px !important; }
  .dealer-card-email    { font-size: 11px !important; }
  .dealer-card-location { font-size: 10px !important; }
  .dealer-card-row-stats { gap: 30px !important; }
  .dealer-card-stat-value   { font-size: 13px !important; }
  .dealer-card-stat-revenue { font-size: 14px !important; }
  .dealer-card-btn-details, .dealer-card-btn-locations, .dealer-card-btn-approve,
  .dealer-card-btn-reject, .dealer-card-btn-suspend, .dealer-card-btn-reinstate { font-size: 10px !important; padding: 6px 12px !important; }
  .dealer-card-btn-delete { font-size: 12px !important; padding: 6px 8px !important; }
  .dealer-card-actions { width: 100% !important; flex-wrap: wrap !important; gap: 6px !important; }
  .dealer-card-actions button { flex: 1 1 auto !important; font-size: 10px !important; padding: 7px 10px !important; }

  /* Overview grids */
  .admin-stats-grid           { grid-template-columns: repeat(3,1fr) !important; gap: 8px !important; padding: 10px !important; }
  .admin-stats-grid > div     { padding: 10px 8px !important; }
  .admin-stats-grid > div h2  { font-size: 13px !important; }
  .admin-stats-grid > div p   { font-size: 9px !important; }
  .admin-overview-metric-grid { grid-template-columns: 1fr !important; }
  .admin-system-metrics       { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; }
  .admin-dealer-stats         { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; }

  /* Overview stats pad */
  .admin-overview-stats-pad { padding: 10px 12px 14px 12px !important; }

  /* Modals */
  .dealer-detail-modal  { max-width: calc(100vw - 32px) !important; border-radius: 14px !important; }
  .dealer-modal-stats-grid { grid-template-columns: 1fr !important; }
  .dealer-modal-tab-label  { font-size: 10px !important; padding: 8px 4px !important; }
  .suspension-modal   { padding: 20px 16px !important; border-radius: 14px !important; }
  .admin-action-modal { padding: 22px 16px !important; border-radius: 14px !important; }

  /* Toast */
  .admin-toast { left: 12px !important; right: 12px !important; bottom: 16px !important; font-size: 12px !important; }

  /* Filter toggle */
  .filter-collapsible-wrapper { max-height: 400px !important; }
  .filter-toggle-btn { padding: 8px 12px !important; font-size: 11px !important; border-radius: 10px !important; }

  /* Emergency tab nav */
  .emergency-tab-nav { flex-direction: row !important; }
  .emergency-tab-nav button { flex: 1 !important; padding: 9px 6px !important; font-size: 10px !important; }
  .emergency-tab-nav button svg { display: none !important; }
}

/* ══════════════════════════════════════════════════════════
   SECTION 15: SMALL MOBILE (< 480px)
══════════════════════════════════════════════════════════ */

@media (max-width: 479px) {
  /* Header */
  .admin-header { padding: 0 10px !important; height: 56px !important; gap: 6px !important; }
  .brand_logo   { height: 30px !important; }
  .admin-role-badge-wrapper { display: none !important; }
  .premium-nav-btn { width: 36px !important; height: 36px !important; }
  .admin-filter-sidebar { top: 56px !important; padding: 7px 10px !important; gap: 6px !important; }
  .admin-filter-sidebar input, .admin-filter-sidebar select { width: 110px !important; min-width: 95px !important; font-size: 10.5px !important; }

  /* Cards */
  .booking-card-inner { padding: 12px !important; }
  .user-card-inner    { padding: 10px 12px !important; gap: 6px !important; }
  .dealer-card-inner  { padding: 10px 12px !important; gap: 6px !important; }
  .admin-booking-card { padding: 10px !important; }
  .booking-card-meta-grid { grid-template-columns: 1fr !important; gap: 6px !important; margin: 0px !important }
  .booking-card-actions button { font-size: 9px !important; padding: 5px 8px !important; min-width: 50px !important; }
  .booking-card-status-badge span { font-size: 8px !important; padding: 2px 6px !important; }

  /* User card */
  .user-card-avatar   { width: 32px !important; height: 32px !important; font-size: 12px !important; }
  .user-card-name     { font-size: 12px !important; }
  .user-card-email    { font-size: 10px !important; }
  .user-card-row-stats { justify-content: center !important; gap: 20px !important; }
  .user-card-stat-value   { font-size: 12px !important; }
  .user-card-stat-revenue { font-size: 13px !important; }
  .user-card-btn-bookings { font-size: 9px !important; padding: 5px 10px !important; }
  .user-card-btn-suspend, .user-card-btn-make-dealer, .user-card-btn-revoke-dealer { font-size: 9px !important; padding: 5px 8px !important; }

  /* Dealer card */
  .dealer-card-avatar   { width: 32px !important; height: 32px !important; font-size: 12px !important; }
  .dealer-card-name     { font-size: 12px !important; }
  .dealer-card-email    { font-size: 10px !important; }
  .dealer-card-location { font-size: 9px !important; }
  .dealer-card-row-stats { gap: 20px !important; }
  .dealer-card-stat-value   { font-size: 12px !important; }
  .dealer-card-stat-revenue { font-size: 13px !important; }
  .dealer-card-btn-details, .dealer-card-btn-locations, .dealer-card-btn-approve,
  .dealer-card-btn-reject, .dealer-card-btn-suspend, .dealer-card-btn-reinstate { font-size: 9px !important; padding: 5px 10px !important; }
  .dealer-card-btn-delete { font-size: 11px !important; padding: 5px 7px !important; }

  /* Overview */
  .admin-overview-stats-pad { padding: 8px 10px 10px 10px !important; }
  .admin-stats-grid { grid-template-columns: repeat(3,1fr) !important; gap: 6px !important; padding: 8px !important; }
  .admin-stats-grid > div    { padding: 8px 6px !important; }
  .admin-stats-grid > div h2 { font-size: 12px !important; }
  .admin-stats-grid > div p  { font-size: 8px !important; }
  .admin-dealer-stats { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }

  /* Modals */
  .dealer-detail-modal, .suspension-modal, .admin-action-modal { max-width: calc(100vw - 20px) !important; border-radius: 12px !important; padding: 18px 14px !important; }

  /* Toasts & bars */
  .admin-toast    { left: 8px !important; right: 8px !important; }
  .admin-bulk-bar { left: 8px !important; right: 8px !important; bottom: 8px !important; padding: 8px 10px !important; border-radius: 10px !important; }

  /* Emergency nav */
  .emergency-tab-nav button { padding: 7px 4px !important; font-size: 9px !important; }
}

/* ══════════════════════════════════════════════════════════
   SECTION 16: EMERGENCY SECTION — MOBILE LAYOUT
   Overrides Section 10's desktop sticky rules only on mobile.
   Key fix: use position:static (not sticky) so the sidebar
   stacks above content naturally in column flow.
══════════════════════════════════════════════════════════ */

@media (max-width: 767px) {
  /* Sidebar base container: reset flex-basis/height/position so
     it actually stacks instead of staying pinned at 22% width. */
  .emergency-sidebar {
    flex: 0 0 100% !important;
    width: 100% !important;
    height: auto !important;
    position: relative !important;
    top: auto !important;
    overflow: visible !important;
    padding-right: 0 !important;
    display: block !important;
  }

  /* Sidebar header: no longer needs sticky (it's in normal flow now) */
  .emergency-sidebar-header {
    position: static !important;
    z-index: auto !important;
  }

  /* Tab nav: horizontal */
  .emergency-tab-nav {
    flex-direction: row !important;
    padding: 4px !important;
    gap: 4px !important;
    margin-bottom: 8px !important;
  }
  .emergency-tab-nav .emergency-tab-btn {
    flex: 1 !important;
    padding: 8px 6px !important;
    font-size: 10px !important;
    gap: 4px !important;
    border-radius: 8px !important;
  }
  .emergency-tab-nav .emergency-tab-btn > svg { display: none !important; }

  /* Filter toggle */
  .emergency-sidebar .filter-toggle-btn {
    padding: 8px 12px !important;
    font-size: 11px !important;
    border-radius: 10px !important;
  }

  /* Scrollable area: let it flow */
  .emergency-sidebar .premium-scroll {
    overflow-y: visible !important;
    overflow-x: visible !important;
    max-height: none !important;
    flex: none !important;
    height: auto !important;
  }

  /* Collapsible filter */
  .emergency-sidebar .filter-collapsible-wrapper         { max-height: 300px !important; }
  .emergency-sidebar .filter-collapsible-wrapper.collapsed { max-height: 0 !important; }
  .emergency-sidebar .filter-collapsible-wrapper > div { gap: 8px !important; padding-top: 8px !important; }

  /* ─── Content area: full width below sidebar ─── */
  .admin-split-layout .admin-content-area {
    flex: none !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
    padding: 8px 0 0 !important;
  }

  /* Section header inside emergency content */
  .admin-content-area .admin-section-header {
    position: static !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 4px !important;
    padding-bottom: 12px !important;
    margin-bottom: 12px !important;
  }
  .admin-content-area .admin-section-header h2 { font-size: 18px !important; }
  .admin-content-area .admin-section-header p  { font-size: 12px !important; }
  .admin-content-area .admin-section-header-badge { display: none !important; }

  /* Content scroll: visible on mobile */
  .admin-content-area .premium-scroll {
    overflow-y: visible !important;
    max-height: none !important;
    padding-bottom: 20px !important;
  }

  /* ─── Tab content wrapper (className="emergency-tab-content") ─── */
  .emergency-tab-content {
    padding: 14px !important;
    border-radius: 14px !important;
  }

  /* ─── BREAKDOWN TAB: stat cards → 2 columns ─── */
  /* Target via className="breakdown-stat-grid" added in BreakdownRequests.jsx */
  .breakdown-stat-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }
  .breakdown-stat-grid > div {
    padding: 12px 14px !important;
    border-radius: 10px !important;
    gap: 10px !important;
  }
  .breakdown-stat-grid > div > div:first-child {
    width: 36px !important;
    height: 36px !important;
    border-radius: 10px !important;
  }
  .breakdown-stat-grid > div p:last-child { font-size: 18px !important; }

  /* ─── BREAKDOWN TAB: filters → search full-width, dropdowns side-by-side ─── */
  /* Target via className="breakdown-filter-grid" added in BreakdownRequests.jsx */
  .breakdown-filter-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    grid-template-rows: auto auto !important;
    gap: 8px !important;
  }
  .breakdown-filter-grid > div:nth-child(1) { grid-column: 1 / -1 !important; }
  .breakdown-filter-grid > div:nth-child(2) { grid-column: 1 / 2 !important; }
  .breakdown-filter-grid > div:nth-child(3) { grid-column: 2 / 3 !important; }

  /* ─── AUTOMATION TAB: sweep controls ─── */
  /* Target via className="automation-sweep-controls" added in AdminStatusAutomation.jsx */
  .automation-sweep-controls {
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 12px 14px !important;
    gap: 10px !important;
    margin-bottom: 16px !important;
    border-radius: 12px !important;
  }
  .automation-sweep-controls > button:first-child {
    width: 100% !important;
    justify-content: center !important;
    padding: 10px 16px !important;
    font-size: 12px !important;
  }
  .automation-sweep-controls > label {
    width: 100% !important;
    padding: 8px 10px !important;
    justify-content: center !important;
    font-size: 11px !important;
  }
  .automation-sweep-controls > div:last-child {
    margin-left: 0 !important;
    width: 100% !important;
    justify-content: center !important;
  }

  /* ─── AUTOMATION TAB: info banner ─── */
  /* Target via className="automation-info-banner" added in AdminStatusAutomation.jsx */
  .automation-info-banner {
    padding: 10px 12px !important;
    margin-bottom: 16px !important;
    gap: 8px !important;
    border-radius: 10px !important;
  }
  .automation-info-banner p { font-size: 11px !important; line-height: 1.5 !important; }

  /* ─── AUTOMATION + EXTENSION TAB: stat cards → 2 columns ─── */
  /* Target via className="emergency-stat-grid" added in AdminStatusAutomation.jsx and AdminExtensionRequests.jsx */
  .emergency-stat-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
  }
  .emergency-stat-grid > div {
    padding: 12px 14px !important;
    border-radius: 10px !important;
    gap: 10px !important;
  }
  .emergency-stat-grid > div > div:first-child {
    width: 36px !important;
    height: 36px !important;
    border-radius: 10px !important;
  }
  .emergency-stat-grid > div p:nth-child(2) { font-size: 18px !important; }

  /* ─── EXTENSION TAB: expired warning ─── */
  /* Target via className="extension-expired-warning" */
  .extension-expired-warning {
    padding: 10px 12px !important;
    margin-bottom: 14px !important;
    gap: 8px !important;
    border-radius: 10px !important;
    font-size: 12px !important;
  }

  /* ─── EXTENSION TAB: filter tabs → 2×2 grid ─── */
  /* Target via className="extension-filter-tabs" */
  .extension-filter-tabs {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 4px !important;
    padding: 4px !important;
  }
  .extension-filter-tabs > button {
    padding: 8px 10px !important;
    font-size: 11px !important;
    justify-content: center !important;
    border-radius: 8px !important;
  }

  /* ─── SHARED: reset button full-width ─── */
  .emergency-reset-btn-wrapper {
    justify-content: stretch !important;
  }
  .emergency-reset-btn-wrapper > button {
    width: 100% !important;
    justify-content: center !important;
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 17: EMERGENCY SECTION — SMALL MOBILE (< 480px)
══════════════════════════════════════════════════════════ */

@media (max-width: 479px) {
  .emergency-tab-content { padding: 10px !important; border-radius: 12px !important; }

  /* Breakdown stat cards: tighter but stay 2-col */
  .breakdown-stat-grid         { gap: 6px !important; }
  .breakdown-stat-grid > div  { padding: 10px !important; gap: 8px !important; }
  .breakdown-stat-grid > div > div:first-child { width: 30px !important; height: 30px !important; }
  .breakdown-stat-grid > div p:last-child { font-size: 16px !important; }

  /* Automation + Extension stat cards */
  .emergency-stat-grid         { gap: 6px !important; }
  .emergency-stat-grid > div  { padding: 10px !important; gap: 8px !important; }
  .emergency-stat-grid > div > div:first-child { width: 30px !important; height: 30px !important; }
  .emergency-stat-grid > div p:nth-child(2) { font-size: 16px !important; }

  /* Sweep controls */
  .automation-sweep-controls > button:first-child { font-size: 11px !important; padding: 9px 12px !important; }

  /* KPI widget */
  .emergency-sidebar-header .kpi-widget-sticky p:nth-child(2) { font-size: 14px !important; }
}

/* ══════════════════════════════════════════════════════════
   SECTION 19: SYSTEM SIDEBAR — MOBILE RESPONSIVE
══════════════════════════════════════════════════════════ */

@media (max-width: 767px) {
  .system-sidebar {
    flex: 0 0 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    max-height: none !important;
    position: relative !important;
    top: auto !important;
    overflow: visible !important;
    padding-right: 0 !important;
    display: block !important;
  }

  .system-sidebar-header {
    position: relative !important;
    top: auto !important;
  }

  .system-sidebar .premium-scroll {
    overflow-y: visible !important;
    overflow-x: hidden !important;
    max-height: none !important;
  }

  .admin-split-layout:has(.system-sidebar) {
    flex-direction: column !important;
    gap: 10px !important;
    padding: 12px 0px !important;
    width: 100% !important;
  }

  .admin-split-layout .admin-content-area {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }

  .system-content-card {
    padding: 12px !important;
    border-radius: 14px !important;
  }
}

@media (max-width: 479px) {
  .admin-split-layout:has(.system-sidebar) {
    padding: 8px 0px !important;
    gap: 8px !important;
  }
  .system-content-card {
    padding: 8px !important;
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 18: SAFE AREA & REDUCE MOTION
══════════════════════════════════════════════════════════ */

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  @media (max-width: 767px) {
    .admin-bulk-bar { padding-bottom: calc(10px + env(safe-area-inset-bottom)) !important; }
    .admin-toast    { bottom: calc(12px + env(safe-area-inset-bottom)) !important; }
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-sidebar, .admin-main, .page-section {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.template-content-wrapper {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  border-radius: 0 !important;
}
.template-content-wrapper > div {
  padding: 12px !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 20: CAR ANALYTICS — BASE (DESKTOP) LAYOUT
══════════════════════════════════════════════════════════ */

.car-card {
  position: relative !important;
}

.car-card-row {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 16px 20px !important;
  cursor: pointer !important;
}

.car-thumbnail {
  width: 56px !important;
  height: 40px !important;
  object-fit: cover !important;
  border-radius: 8px !important;
  flex-shrink: 0 !important;
  background: rgba(255,255,255,0.04) !important;
}

.car-info {
  flex: 1 1 auto !important;
  min-width: 0 !important;
}

.car-model {
  margin: 0 !important;
  color: #fff !important;
  font-weight: 700 !important;
  font-size: 14px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.car-dealer {
  margin: 4px 0 0 !important;
  color: rgba(255,255,255,0.4) !important;
  font-size: 11px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  overflow: hidden !important;
}

.car-dealer-chip {
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  min-width: 0 !important;
}

.car-dealer-chip svg { flex-shrink: 0 !important; }

.car-dealer-sep { flex-shrink: 0 !important; }

.car-metrics-row {
  display: contents !important;
}

.car-utilization {
  width: 120px !important;
  flex-shrink: 0 !important;
}

.car-revenue {
  text-align: right !important;
  flex-shrink: 0 !important;
}

.car-expand {
  color: rgba(255,255,255,0.3) !important;
  display: flex !important;
  align-items: center !important;
  flex-shrink: 0 !important;
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1) !important;
}

.car-card.expanded .car-expand {
  transform: rotate(180deg) !important;
}

.car-details {
  max-height: 0px;
  opacity: 0;
  overflow: hidden;
  padding: 0 20px;
  border-top: 1px solid transparent;
  transition:
    max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease,
    padding 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.3s ease;
}

.car-card.expanded .car-details {
  padding: 0 20px 20px;
  border-top-color: rgba(255,255,255,0.06);
}

.car-details-inner {
  min-width: 0 !important;
}

/* ══════════════════════════════════════════════════════════
   SECTION 21: CAR ANALYTICS — TABLET (≤1023px)
══════════════════════════════════════════════════════════ */

@media (max-width: 1023px) {
  .car-card-row { padding: 14px 16px !important; gap: 12px !important; }
  .car-utilization { width: 100px !important; }
}

/* ══════════════════════════════════════════════════════════
   SECTION 22: CAR ANALYTICS — MOBILE (≤767px)
══════════════════════════════════════════════════════════ */

@media (max-width: 767px) {
  .fleet-stat-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }
  .fleet-stat-grid > div { padding: 10px !important; }
  .fleet-stat-grid > div p:first-of-type { font-size: 1.05rem !important; }

  .fleet-alert { padding: 8px 12px !important; margin-bottom: 14px !important; }
  .fleet-alert p { font-size: 12px !important; }

  .car-card-row {
    flex-wrap: wrap !important;
    padding: 12px 14px !important;
    gap: 10px 12px !important;
  }

  .car-thumbnail {
    width: 48px !important;
    height: 36px !important;
  }

  .car-model { font-size: 13px !important; }
  .car-dealer { font-size: 10px !important; gap: 6px !important; }

  .car-expand { order: 4 !important; }

  .car-metrics-row {
    display: flex !important;
    flex: 1 1 100% !important;
    width: 100% !important;
    order: 10 !important;
    align-items: center !important;
    gap: 14px !important;
    margin-top: 4px !important;
    padding-top: 10px !important;
    border-top: 1px solid rgba(255,255,255,0.05) !important;
  }

  .car-metrics-row .car-utilization {
    width: auto !important;
    flex: 1 1 auto !important;
    min-width: 0 !important;
  }

  .car-metrics-row .car-revenue {
    flex: 0 0 auto !important;
    text-align: right !important;
  }

  .car-details { padding: 0 !important; }
  .car-card.expanded .car-details { padding: 0 !important; }
}

/* ══════════════════════════════════════════════════════════
   SECTION 23: CAR ANALYTICS — SMALL MOBILE (≤479px)
══════════════════════════════════════════════════════════ */

@media (max-width: 479px) {
  .fleet-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
  .fleet-stat-grid > div { padding: 8px !important; }
  .fleet-stat-grid > div p:first-of-type { font-size: 0.95rem !important; }
  .fleet-stat-grid > div p:last-of-type { font-size: 10px !important; }

  .car-card-row { padding: 10px 12px !important; gap: 8px 10px !important; }
  .car-rank { width: 26px !important; height: 26px !important; font-size: 11px !important; }
  .car-thumbnail { width: 40px !important; height: 30px !important; }
  .car-model { font-size: 12px !important; }
  .car-dealer { font-size: 9px !important; gap: 5px !important; }
  .car-metrics-row { gap: 10px !important; }
  .car-revenue p:first-child { font-size: 14px !important; }
}

/* ══════════════════════════════════════════════════════════
   SECTION 24: UNIVERSAL SIDEBAR MOBILE STACKING FIX
   ────────────────────────────────────────────────────────
   THE ROOT CAUSE OF THE OVERLAPPING/SQUISHED UI:
   Every "*-sidebar" panel (bookings, users, dealers, reviews,
   notifications, fleet, locations, trends, templates, settings,
   export, backup, etc.) shares the same desktop pattern:
   flex:0 0 22%, sticky, fixed height, hidden overflow. Several
   of these — specifically Fleet (.fleet-sidebar), Locations
   (.locations-sidebar), Trends (.trends-sidebar), Templates
   (.template-sidebar), Settings (.settings-sidebar), Export
   (.export-sidebar) and Backup (.backup-sidebar) — never got a
   working mobile override. They tried to rely on a
   ":first-child" selector to reset themselves on small screens,
   but in every one of those sections the sidebar div is NOT
   actually the first child of ".admin-split-layout" — a local
   <style> tag written above it in the JSX is. That selector
   silently never matched, so those sidebars stayed pinned at
   ~22% of the viewport width on phones, crushing every icon
   into its label. This single rule fixes all of them at once,
   by targeting the real class name instead of a fragile
   positional selector, so nothing gets missed again.
══════════════════════════════════════════════════════════ */
@media (max-width: 767px) {
  .fleet-sidebar, .locations-sidebar, .trends-sidebar,
  .template-sidebar, .settings-sidebar, .export-sidebar, .backup-sidebar {
    flex: 0 0 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    max-height: none !important;
    position: relative !important;
    top: auto !important;
    overflow: visible !important;
    padding-right: 0 !important;
    display: block !important;
  }

  .fleet-sidebar-header, .locations-sidebar-header, .trends-sidebar-header,
  .template-sidebar-header, .settings-sidebar-header,
  .export-sidebar-header, .backup-sidebar-header {
    position: relative !important;
    top: auto !important;
  }

  .fleet-sidebar .ca-scroll,
  .locations-sidebar .loc-scroll,
  .trends-sidebar .tr-scroll,
  .template-sidebar .al-scroll,
  .settings-sidebar .as-scroll,
  .export-sidebar .er-scroll,
  .backup-sidebar .db-scroll {
    overflow-y: visible !important;
    overflow-x: hidden !important;
    max-height: none !important;
  }

  /* Belt-and-suspenders: make sure every section's split layout
     stacks even if a section-local media query missed it. */
  .admin-split-layout {
    flex-direction: column !important;
  }
  .admin-content-area {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 25: COLLAPSIBLE TRIGGER — ICON/LABEL OVERLAP GUARD
══════════════════════════════════════════════════════════ */
@media (max-width: 479px) {
  .filter-toggle-btn,
  [class*="collapsible-trigger"] {
    gap: 8px !important;
  }
  .filter-toggle-btn span:first-child,
  [class*="collapsible-trigger"] > span:first-child {
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }
  .filter-toggle-btn svg,
  [class*="collapsible-trigger"] svg {
    flex-shrink: 0 !important;
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 26: COMPACT FILTER GRID (≤479px ONLY)  — v3
   ────────────────────────────────────────────────────────
   THE ROOT CAUSE OF THE "STILL OVERLAPPING" REPORT (round 2):
   Two separate bugs stacked on top of each other:

   1) The v1 rule used ":has(button)" to force PermissionGuard-
      wrapped action buttons to full width. But components like
      IconSelect render their OWN trigger as an internal
      <button> too — so ":has(button)" also force-expanded
      IconSelect (e.g. the "Operational Status" dropdown) to
      full width. That pushed the very next item ("Chronological:
      Newest") onto its own orphaned row, which is exactly why
      they stopped pairing. Fixed by dropping ":has(button)"
      entirely — only a DIRECT "> button" child is treated as an
      action button now.

   2) CSS Grid items default to "min-width: auto", meaning a
      grid cell refuses to shrink below its CONTENT's natural
      size — not the 50% the column track asks for. Since these
      inputs/selects have deeply nested content (absolutely
      positioned icon + padded text + chevron) with an implicit
      natural width wider than 50%, the grid cells were
      overflowing past their track and visually overlapping
      their neighbour, even though the grid math said "1fr 1fr".
      Fixed by forcing "min-width: 0" on every grid item, which
      is the standard fix for this well-known Grid/Flexbox
      shrink-to-fit gotcha.
══════════════════════════════════════════════════════════ */
@media (max-width: 479px) {
  .filter-collapsible-wrapper > div {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
    align-items: start !important;
  }

  /* Critical: allow grid cells to actually shrink to 50% instead
     of overflowing to fit their content's natural width. */
  .filter-collapsible-wrapper > div > * {
    min-width: 0 !important;
  }

  /* First control (search) always gets its own full-width row */
  .filter-collapsible-wrapper > div > *:first-child {
    grid-column: 1 / -1 !important;
  }

  /* Real top-level buttons/links (Reset, Select All, etc.) stay
     full-width. Intentionally NOT using ":has(button)" here —
     see note above about IconSelect false-positives. */
  .filter-collapsible-wrapper > div > button,
  .filter-collapsible-wrapper > div > a {
    grid-column: 1 / -1 !important;
  }

  /* A lone leftover control (odd item out) gets the full row too,
     instead of sitting alone at half width with empty space beside it */
  .filter-collapsible-wrapper > div > *:last-child:nth-child(even) {
    grid-column: 1 / -1 !important;
  }

  /* Give paired-up controls breathing room: kill any lingering
     native select arrow (which can double up with a custom SVG
     chevron and look like an overlap), trim the font so labels
     have more room before truncating, and guarantee overflow
     text actually truncates instead of colliding with the
     chevron/icon next to it. */
  .filter-collapsible-wrapper input,
  .filter-collapsible-wrapper select,
  .filter-collapsible-wrapper .icon-select-trigger {
    width: 100% !important;
    box-sizing: border-box !important;
    font-size: 11.5px !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    height: 40px !important;
  }

  /* Custom dropdown triggers (e.g. IconSelect's flex-based
     <button>) already truncate their own label span, but pin
     every icon inside them so it never gets crushed by the text
     next to it. */
  .filter-collapsible-wrapper button svg,
  .filter-collapsible-wrapper [class*="premium-select-wrapper"] svg {
    flex-shrink: 0 !important;
  }

  /* Any absolutely-positioned decorative icon sitting in front of
     an input/select (the little colored SVG at the left edge)
     should never be able to grow past its own box and crowd the
     text that starts right after it. */
  .filter-collapsible-wrapper > div > * > span[style*="position: absolute"],
  .filter-collapsible-wrapper > div > * > span[style*="position:absolute"] {
    pointer-events: none !important;
  }
}
`;