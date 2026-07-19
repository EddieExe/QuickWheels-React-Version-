// src/utils/demandAnalyticsUtils.js

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ISO-ish week number (1-53), folded to 52 for a clean year-grid
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Approximate "Mon D" label for a given week number (for axis ticks)
function weekLabel(weekNum) {
  const jan1 = new Date(Date.UTC(2024, 0, 1));
  const approx = new Date(jan1.getTime() + (weekNum - 1) * 7 * 86400000);
  return approx.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * A7.1 — Peak Season Prediction
 * Frequency analysis on real booking pickup dates, grouped by week-of-year
 * (aggregated across all years present in the data). Computes a rolling
 * 4-week average per week and flags weeks where actual count exceeds the
 * rolling average by more than one standard deviation — these are "peaks".
 */
export function calculatePeakSeasonAnalysis(bookings, options = {}) {
  const { excludeStatuses = ['rejected'] } = options;

  const weeks = Array.from({ length: 52 }, (_, i) => ({
    week: i + 1,
    label: weekLabel(i + 1),
    count: 0,
  }));

  const yearsSeen = new Set();

  bookings.forEach(b => {
    if (excludeStatuses.includes(b.status)) return;
    const date = toDate(b.pickupDate || b.createdAt);
    if (!date) return;
    yearsSeen.add(date.getFullYear());
    let wk = getWeekNumber(date);
    if (wk > 52) wk = 52;
    weeks[wk - 1].count++;
  });

  const yearsSpan = Math.max(1, yearsSeen.size);
  const counts = weeks.map(w => w.count);

  const rolling = weeks.map((_, i) => {
    let sum = 0;
    for (let j = 0; j < 4; j++) sum += counts[(i - j + 52) % 52];
    return sum / 4;
  });

  const deviations = counts.map((c, i) => c - rolling[i]);
  const devMean = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const devVariance = deviations.reduce((a, b) => a + Math.pow(b - devMean, 2), 0) / deviations.length;
  const devStdDev = Math.sqrt(devVariance);

  const result = weeks.map((w, i) => ({
    ...w,
    avgCount: Math.round((w.count / yearsSpan) * 10) / 10, // per-year average — used for forecasting
    rollingAvg: Math.round(rolling[i] * 10) / 10,
    deviation: Math.round(deviations[i] * 10) / 10,
    isPeak: w.count > 0 && deviations[i] > devStdDev && devStdDev > 0,
  }));

  const totalBookings = counts.reduce((a, b) => a + b, 0);
  const overallMean = totalBookings / 52;

  return {
    weeks: result,
    yearsSpan,
    overallMean: Math.round(overallMean * 10) / 10,
    stdDev: Math.round(devStdDev * 10) / 10,
    peakWeeks: result.filter(w => w.isPeak),
    busiestWeek: result.reduce((max, w) => (w.count > (max?.count ?? -1) ? w : max), null),
    totalBookings,
    maxCount: Math.max(...counts, 1),
  };
}

/**
 * A7.5 — Demand Forecast
 * Projects historical seasonal patterns (from calculatePeakSeasonAnalysis)
 * forward into the next `weeksAhead` weeks, using the per-year average
 * count for each week-of-year as the baseline prediction. Confidence is
 * lower with fewer years of historical data — surfaced via `yearsSpan`.
 */
export function forecastUpcomingDemand(bookings, weeksAhead = 8, options = {}) {
  const peak = calculatePeakSeasonAnalysis(bookings, options);
  const currentWeek = getWeekNumber(new Date());

  const forecast = Array.from({ length: weeksAhead }, (_, i) => {
    const offset = i + 1;
    let wk = currentWeek + offset;
    if (wk > 52) wk -= 52;

    const weekData = peak.weeks[wk - 1];
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + offset * 7);

    return {
      weekOffset: offset,
      week: wk,
      label: weekData.label,
      forecastDateLabel: forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      // Per-year average for this week-of-year — the actual forecast number
      predictedBookings: weekData.avgCount,
      historicalTotal: weekData.count,
      deviation: weekData.deviation,
      isHistoricalPeak: weekData.isPeak,
    };
  });

  return {
    forecast,
    overallMean: peak.overallMean,
    stdDev: peak.stdDev,
    yearsSpan: peak.yearsSpan,
    maxPredicted: Math.max(...forecast.map(f => f.predictedBookings), 1),
  };
}

/**
 * A7.6 — Price Optimization Suggestions
 * Two layers of suggestions:
 *  1. Weekly fleet-wide adjustment — based on how far each forecasted
 *     week deviates from the rolling-average baseline (in std-devs).
 *  2. Per-car-model adjustment — based on how each model's booking
 *     volume compares to the average across all models.
 *
 * Both are advisory percentages, not auto-applied.
 */
export function generatePricingSuggestions(forecast, stdDev, cars = [], bookings = [], options = {}) {
  const { excludeStatuses = ['cancelled', 'rejected'] } = options;

  // ── Weekly fleet-wide suggestions ──
  const weeklySuggestions = forecast.map(f => {
    let adjustmentPct = 0;
    let label = "Standard pricing";

    if (stdDev > 0) {
      if (f.deviation > stdDev) { adjustmentPct = 15; label = "🔥 Surge pricing recommended"; }
      else if (f.deviation > stdDev * 0.5) { adjustmentPct = 8; label = "📈 Slight increase recommended"; }
      else if (f.deviation < -stdDev) { adjustmentPct = -15; label = "📉 Discount recommended to boost demand"; }
      else if (f.deviation < -stdDev * 0.5) { adjustmentPct = -8; label = "🏷️ Slight discount recommended"; }
    }

    return { ...f, adjustmentPct, label };
  });

  // ── Per-car-model suggestions ──
  const modelCounts = {};
  bookings.forEach(b => {
    if (excludeStatuses.includes(b.status)) return;
    if (!b.carModel) return;
    modelCounts[b.carModel] = (modelCounts[b.carModel] || 0) + 1;
  });

  const counts = Object.values(modelCounts);
  const modelMean = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const modelVariance = counts.length > 0
    ? counts.reduce((a, c) => a + Math.pow(c - modelMean, 2), 0) / counts.length
    : 0;
  const modelStd = Math.sqrt(modelVariance);

  const carSuggestions = cars
    .filter(car => car.price > 0)
    .map(car => {
      const bookingCount = modelCounts[car.model] || 0;
      const deviation = bookingCount - modelMean;

      let adjustmentPct = 0;
      let label = "Standard pricing";
      if (modelStd > 0) {
        if (deviation > modelStd) { adjustmentPct = 10; label = "🔥 High demand — consider increase"; }
        else if (deviation < -modelStd) { adjustmentPct = -10; label = "📉 Low demand — consider discount/promo"; }
      } else if (bookingCount === 0) {
        label = "No bookings yet";
      }

      return {
        carId: car.id,
        model: car.model,
        currentPrice: car.price,
        bookingCount,
        adjustmentPct,
        label,
        suggestedPrice: Math.round(car.price * (1 + adjustmentPct / 100)),
      };
    })
    .sort((a, b) => b.bookingCount - a.bookingCount);

  return {
    weeklySuggestions,
    carSuggestions,
    modelMean: Math.round(modelMean * 10) / 10,
    modelStd: Math.round(modelStd * 10) / 10,
  };
}

/**
 * A7.2a — Pickup day-of-week frequency
 * Which days of the week do trips actually start on?
 */
export function calculatePickupDayFrequency(bookings, options = {}) {
  const { excludeStatuses = ['rejected'] } = options;
  const counts = Array(7).fill(0);

  bookings.forEach(b => {
    if (excludeStatuses.includes(b.status)) return;
    const date = toDate(b.pickupDate);
    if (!date) return;
    counts[date.getDay()]++;
  });

  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  return {
    days: DAY_NAMES.map((day, i) => ({
      day,
      count: counts[i],
      pct: Math.round((counts[i] / max) * 100),
      shareOfTotal: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
    })),
    busiestDay: DAY_NAMES[counts.indexOf(Math.max(...counts))],
    total,
  };
}

/**
 * A7.2b — Booking creation heatmap (day-of-week x hour-of-day)
 * When do customers actually make bookings? Useful for staffing support
 * and timing marketing pushes.
 */
export function calculateBookingCreationHeatmap(bookings, options = {}) {
  const { excludeStatuses = ['rejected'] } = options;
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));

  bookings.forEach(b => {
    if (excludeStatuses.includes(b.status)) return;
    const date = toDate(b.createdAt);
    if (!date) return;
    grid[date.getDay()][date.getHours()]++;
  });

  const max = Math.max(...grid.flat(), 1);

  // Find the single busiest day/hour cell
  let busiest = { day: 0, hour: 0, count: 0 };
  grid.forEach((row, day) => row.forEach((count, hour) => {
    if (count > busiest.count) busiest = { day, hour, count };
  }));

  return { grid, max, dayNames: DAY_NAMES, busiest };
}