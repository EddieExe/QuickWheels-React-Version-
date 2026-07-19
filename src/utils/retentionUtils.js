// src/utils/retentionUtils.js

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/**
 * Build per-customer activity from the FULL bookings history.
 * Returns a map keyed by userEmail.
 */
export function buildUserActivity(bookings) {
  const users = {};

  bookings.forEach(b => {
    const email = b.userEmail;
    const date = toDate(b.createdAt);
    if (!email || !date) return;

    if (!users[email]) {
      users[email] = {
        email,
        name: b.userName || email,
        bookings: [],
      };
    }
    users[email].bookings.push({ date, total: b.total || 0, status: b.status });
  });

  Object.values(users).forEach(u => {
    u.bookings.sort((a, b) => a.date - b.date);
    u.firstBookingDate = u.bookings[0].date;
    u.lastBookingDate  = u.bookings[u.bookings.length - 1].date;
    u.cohort           = monthKey(u.firstBookingDate);
    u.totalBookings    = u.bookings.length;
    u.totalRevenue     = u.bookings.reduce((s, b) => s + b.total, 0);
  });

  return users;
}

/**
 * Cohort retention table.
 * Each row = a cohort (month of first booking).
 * Each column = % of that cohort that booked again M0, M1, ... Mn months later.
 *
 * @param users        output of buildUserActivity (full history)
 * @param maxMonths    how many months out to track (default 6)
 * @param cohortFilter optional [startDate, endDate] — only include cohorts
 *                      whose first-booking month falls in this range
 */
export function buildCohortRetention(users, maxMonths = 6, cohortFilter = null) {
  const now = new Date();
  const cohorts = {};

  Object.values(users).forEach(u => {
    if (!cohorts[u.cohort]) cohorts[u.cohort] = [];
    cohorts[u.cohort].push(u);
  });

  let cohortKeys = Object.keys(cohorts).sort();

  if (cohortFilter) {
    const [start, end] = cohortFilter;
    cohortKeys = cohortKeys.filter(key => {
      const d = new Date(`${key}-01`);
      return d >= new Date(start.getFullYear(), start.getMonth(), 1)
          && d <= end;
    });
  }

  return cohortKeys.map(cohortKey => {
    const cohortUsers = cohorts[cohortKey];
    const cohortDate  = new Date(`${cohortKey}-01`);
    const size        = cohortUsers.length;
    const elapsed     = monthsBetween(cohortDate, now);

    const retention = [];
    for (let m = 0; m <= maxMonths; m++) {
      if (m > elapsed) {
        // This offset hasn't happened yet for this cohort
        retention.push({ month: m, active: null, pct: null });
        continue;
      }
      const activeCount = cohortUsers.filter(u =>
        u.bookings.some(b => monthsBetween(cohortDate, b.date) === m)
      ).length;
      retention.push({
        month: m,
        active: activeCount,
        pct: size > 0 ? Math.round((activeCount / size) * 100) : 0,
      });
    }

    return { cohort: cohortKey, label: monthLabel(cohortKey), size, retention };
  });
}

/** Overall repeat-customer summary stats (full history). */
export function calculateRepeatStats(users) {
  const all   = Object.values(users);
  const total = all.length;
  const repeat = all.filter(u => u.totalBookings > 1).length;
  const totalBookings = all.reduce((s, u) => s + u.totalBookings, 0);

  const gaps = [];
  all.forEach(u => {
    for (let i = 1; i < u.bookings.length; i++) {
      gaps.push((u.bookings[i].date - u.bookings[i - 1].date) / 86400000);
    }
  });
  const avgGap = gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0;

  return {
    totalCustomers: total,
    repeatCustomers: repeat,
    repeatRate: total > 0 ? ((repeat / total) * 100).toFixed(1) : "0.0",
    avgBookingsPerCustomer: total > 0 ? (totalBookings / total).toFixed(1) : "0.0",
    avgDaysBetweenBookings: Math.round(avgGap),
  };
}

/** Top repeat customers, sorted by booking count then revenue. */
export function getTopRepeatCustomers(users, limit = 10) {
  return Object.values(users)
    .filter(u => u.totalBookings > 1)
    .sort((a, b) => b.totalBookings - a.totalBookings || b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}