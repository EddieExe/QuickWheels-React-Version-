// src/utils/analyticsUtils.js
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Calculate fleet utilization
 * @param {Array} cars - List of cars
 * @param {Array} bookings - List of bookings
 * @param {string} period - 'daily', 'weekly', 'monthly'
 * @returns {object} { utilization, totalCars, activeBookings, chartData }
 */
export const calculateFleetUtilization = (cars, bookings, period = 'monthly') => {
  const totalCars = cars.length;
  if (totalCars === 0) return { utilization: 0, totalCars, activeBookings: 0, chartData: [] };
  
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'daily':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
    default:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
  }
  
  // Count active bookings (confirmed or active trips)
  const activeBookings = bookings.filter(b => {
    const bookingDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return (b.status === 'confirmed' || b.status === 'active' || b.status === 'dealer_confirmed') &&
           bookingDate >= startDate;
  }).length;
  
  const utilization = (activeBookings / totalCars) * 100;
  
  // Generate chart data by day
  const chartData = [];
  const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayBookings = bookings.filter(b => {
      const bookingDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return (b.status === 'confirmed' || b.status === 'active' || b.status === 'dealer_confirmed') &&
             bookingDate.toDateString() === date.toDateString();
    }).length;
    
    chartData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      utilization: (dayBookings / totalCars) * 100,
      bookings: dayBookings,
    });
  }
  
  return {
    utilization: Math.round(utilization * 10) / 10,
    totalCars,
    activeBookings,
    chartData,
  };
};

/**
 * Calculate average trip duration
 * @param {Array} bookings - List of completed bookings
 * @returns {object} { averageDays, totalTrips, totalDays, chartData }
 */
export const calculateAverageTripDuration = (bookings) => {
  const completedBookings = bookings.filter(b => 
    b.status === 'completed' && b.days && b.days > 0
  );
  
  const totalTrips = completedBookings.length;
  const totalDays = completedBookings.reduce((sum, b) => sum + (b.days || 0), 0);
  const averageDays = totalTrips > 0 ? totalDays / totalTrips : 0;
  
  // Group by trip duration ranges
  const ranges = {
    '1-3 days': 0,
    '4-7 days': 0,
    '8-14 days': 0,
    '15-30 days': 0,
    '30+ days': 0,
  };
  
  completedBookings.forEach(b => {
    const days = b.days || 0;
    if (days <= 3) ranges['1-3 days']++;
    else if (days <= 7) ranges['4-7 days']++;
    else if (days <= 14) ranges['8-14 days']++;
    else if (days <= 30) ranges['15-30 days']++;
    else ranges['30+ days']++;
  });
  
  const chartData = Object.entries(ranges).map(([range, count]) => ({
    range,
    count,
    percentage: totalTrips > 0 ? (count / totalTrips) * 100 : 0,
  }));
  
  return {
    averageDays: Math.round(averageDays * 10) / 10,
    totalTrips,
    totalDays,
    chartData,
  };
};

/**
 * Calculate customer satisfaction metrics
 * @param {Array} reviews - List of reviews from bookings
 * @returns {object} { averageRating, totalReviews, distribution, trend }
 */
export const calculateCustomerSatisfaction = (reviews) => {
  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      trend: [],
      satisfactionRate: 0,
    };
  }
  
  const totalReviews = reviews.length;
  const sumRatings = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const averageRating = sumRatings / totalReviews;
  
  // Rating distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    const rating = Math.floor(r.rating || 0);
    if (rating >= 1 && rating <= 5) distribution[rating]++;
  });
  
  // Satisfaction rate (4-5 star ratings)
  const satisfiedCount = (distribution[4] || 0) + (distribution[5] || 0);
  const satisfactionRate = (satisfiedCount / totalReviews) * 100;
  
  // Monthly trend (last 6 months)
  const monthlyTrend = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthReviews = reviews.filter(r => {
      const reviewDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return reviewDate.getMonth() === monthDate.getMonth() &&
             reviewDate.getFullYear() === monthDate.getFullYear();
    });
    
    const monthAvg = monthReviews.length > 0 
      ? monthReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / monthReviews.length 
      : 0;
    
    monthlyTrend.push({
      month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      rating: Math.round(monthAvg * 10) / 10,
      count: monthReviews.length,
    });
  }
  
  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
    distribution,
    trend: monthlyTrend,
    satisfactionRate: Math.round(satisfactionRate),
    satisfiedCount,
  };
};

/**
 * Calculate on-time performance
 * @param {Array} bookings - List of completed bookings
 * @returns {object} { onTimeRate, onTimeReturns, lateReturns, chartData }
 */
export const calculateOnTimePerformance = (bookings) => {
  const completedBookings = bookings.filter(b => 
    b.status === 'completed' && b.dropoffDate && b.returnVerifiedAt
  );
  
  let onTimeReturns = 0;
  let lateReturns = 0;
  const lateBreakdown = {
    '0-2 hours': 0,
    '2-6 hours': 0,
    '6-12 hours': 0,
    '12-24 hours': 0,
    '24+ hours': 0,
  };
  
  completedBookings.forEach(b => {
    const expectedReturn = new Date(b.dropoffDate);
    const actualReturn = new Date(b.returnVerifiedAt);
    const delayHours = (actualReturn - expectedReturn) / (1000 * 60 * 60);
    
    if (delayHours <= 0) {
      onTimeReturns++;
    } else {
      lateReturns++;
      if (delayHours <= 2) lateBreakdown['0-2 hours']++;
      else if (delayHours <= 6) lateBreakdown['2-6 hours']++;
      else if (delayHours <= 12) lateBreakdown['6-12 hours']++;
      else if (delayHours <= 24) lateBreakdown['12-24 hours']++;
      else lateBreakdown['24+ hours']++;
    }
  });
  
  const totalReturns = completedBookings.length;
  const onTimeRate = totalReturns > 0 ? (onTimeReturns / totalReturns) * 100 : 0;
  
  const chartData = Object.entries(lateBreakdown).map(([range, count]) => ({
    range,
    count,
    percentage: lateReturns > 0 ? (count / lateReturns) * 100 : 0,
  }));
  
  return {
    onTimeRate: Math.round(onTimeRate),
    onTimeReturns,
    lateReturns,
    totalReturns,
    lateBreakdown: chartData,
  };
};

/**
 * Calculate damage rate
 * @param {Array} bookings - List of completed bookings with inspections
 * @returns {object} { damageRate, damageCases, totalTrips, damageTypes }
 */
export const calculateDamageRate = (bookings) => {
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalTrips = completedBookings.length;
  
  let damageCases = 0;
  const damageSeverity = {
    minor: 0,
    moderate: 0,
    major: 0,
    severe: 0,
  };
  const damageTotalCost = { minor: 0, moderate: 0, major: 0, severe: 0 };
  
  completedBookings.forEach(b => {
    if (b.extraChargesBreakdown && b.extraChargesBreakdown.damages > 0) {
      damageCases++;
      
      // Estimate severity based on cost
      const cost = b.extraChargesBreakdown.damages;
      if (cost <= 50) {
        damageSeverity.minor++;
        damageTotalCost.minor += cost;
      } else if (cost <= 200) {
        damageSeverity.moderate++;
        damageTotalCost.moderate += cost;
      } else if (cost <= 500) {
        damageSeverity.major++;
        damageTotalCost.major += cost;
      } else {
        damageSeverity.severe++;
        damageTotalCost.severe += cost;
      }
    }
  });
  
  const damageRate = totalTrips > 0 ? (damageCases / totalTrips) * 100 : 0;
  
  const damageTypes = Object.entries(damageSeverity).map(([severity, count]) => ({
    severity,
    count,
    percentage: damageCases > 0 ? (count / damageCases) * 100 : 0,
    totalCost: damageTotalCost[severity],
    averageCost: count > 0 ? damageTotalCost[severity] / count : 0,
  }));
  
  return {
    damageRate: Math.round(damageRate * 10) / 10,
    damageCases,
    totalTrips,
    damageSeverity,
    damageTypes,
    totalDamageCost: Object.values(damageTotalCost).reduce((a, b) => a + b, 0),
  };
};

/**
 * Calculate revenue per car
 * @param {Array} cars - List of cars
 * @param {Array} bookings - List of completed bookings
 * @returns {object} { averageRevenue, totalRevenue, carRevenue, topCars }
 */
export const calculateRevenuePerCar = (cars, bookings) => {
  const completedBookings = bookings.filter(b => 
    b.status === 'completed' && b.total
  );
  
  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalCars = cars.length;
  const averageRevenue = totalCars > 0 ? totalRevenue / totalCars : 0;
  
  // Calculate revenue per car model
  const carRevenue = {};
  completedBookings.forEach(b => {
    const model = b.carModel;
    if (!carRevenue[model]) {
      carRevenue[model] = { revenue: 0, bookings: 0, car: cars.find(c => c.model === model) };
    }
    carRevenue[model].revenue += b.total || 0;
    carRevenue[model].bookings++;
  });
  
  const topCars = Object.entries(carRevenue)
    .map(([model, data]) => ({
      model,
      revenue: data.revenue,
      bookings: data.bookings,
      avgPerBooking: data.revenue / data.bookings,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  return {
    averageRevenue: Math.round(averageRevenue),
    totalRevenue,
    totalCars,
    carRevenue,
    topCars,
  };
};

/**
 * Calculate maintenance costs
 * @param {Array} maintenanceRecords - List of maintenance records
 * @returns {object} { totalCost, costByType, monthlyTrend }
 */
export const calculateMaintenanceCosts = (maintenanceRecords) => {
  if (!maintenanceRecords || maintenanceRecords.length === 0) {
    return {
      totalCost: 0,
      costByType: [],
      monthlyTrend: [],
      averagePerCar: 0,
    };
  }
  
  const costByType = {};
  let totalCost = 0;
  
  maintenanceRecords.forEach(record => {
    const type = record.type || 'routine';
    const cost = record.cost || 0;
    totalCost += cost;
    
    if (!costByType[type]) {
      costByType[type] = { cost: 0, count: 0 };
    }
    costByType[type].cost += cost;
    costByType[type].count++;
  });
  
  const costByTypeArray = Object.entries(costByType).map(([type, data]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    cost: data.cost,
    count: data.count,
    percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
  }));
  
  // Monthly trend (last 6 months)
  const monthlyTrend = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthRecords = maintenanceRecords.filter(r => {
      const recordDate = r.date?.toDate ? r.date.toDate() : new Date(r.date);
      return recordDate.getMonth() === monthDate.getMonth() &&
             recordDate.getFullYear() === monthDate.getFullYear();
    });
    
    const monthCost = monthRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
    
    monthlyTrend.push({
      month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      cost: monthCost,
      count: monthRecords.length,
    });
  }
  
  return {
    totalCost,
    costByType: costByTypeArray,
    monthlyTrend,
    averagePerCar: 0, // Would need total cars
  };
};