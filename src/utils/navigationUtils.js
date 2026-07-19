/**
 * Phase 5: Navigation Utilities
 * Fuel stations, service centers, toll alerts helpers
 */

// ── Nearby Fuel Stations (Mock Data) ───────────────────────
export function getNearbyFuelStations(lat, lng, count = 5) {
  // In production: Use Google Places API
  return [
    {
      id: 1,
      name: 'HP Petrol Pump - Highway',
      address: 'NH-48, Near Lonavala',
      distance: '2.5 km',
      rating: 4.2,
      fuelTypes: ['Petrol', 'Diesel'],
      prices: { petrol: '₹104.5/L', diesel: '₹89.7/L' },
      open: true,
      amenities: ['Restroom', 'Air', 'Convenience Store'],
      lat: lat + 0.02,
      lng: lng + 0.01,
    },
    {
      id: 2,
      name: 'Indian Oil - Expressway',
      address: 'Mumbai-Pune Expressway',
      distance: '8.3 km',
      rating: 4.0,
      fuelTypes: ['Petrol', 'Diesel', 'CNG'],
      prices: { petrol: '₹103.8/L', diesel: '₹88.9/L', cng: '₹76/kg' },
      open: true,
      amenities: ['Restroom', 'Restaurant', 'Mechanic'],
      lat: lat + 0.05,
      lng: lng - 0.02,
    },
    {
      id: 3,
      name: 'BPCL - City Center',
      address: 'Main Road, Khopoli',
      distance: '12.1 km',
      rating: 4.5,
      fuelTypes: ['Petrol', 'Diesel'],
      prices: { petrol: '₹105.1/L', diesel: '₹90.2/L' },
      open: true,
      amenities: ['Restroom', 'Air', 'Oil Change'],
      lat: lat - 0.03,
      lng: lng + 0.04,
    },
    {
      id: 4,
      name: 'Shell Select',
      address: 'Expressway Service Road',
      distance: '18.7 km',
      rating: 4.7,
      fuelTypes: ['Petrol', 'Diesel', 'Premium'],
      prices: { petrol: '₹108.5/L', diesel: '₹93.0/L', premium: '₹112/L' },
      open: true,
      amenities: ['Restroom', 'Cafe', 'Car Wash', 'Convenience Store'],
      lat: lat + 0.08,
      lng: lng - 0.06,
    },
    {
      id: 5,
      name: 'Reliance Fuel Station',
      address: 'Near Talegaon Toll',
      distance: '22.4 km',
      rating: 3.9,
      fuelTypes: ['Petrol', 'Diesel'],
      prices: { petrol: '₹102.9/L', diesel: '₹88.1/L' },
      open: false,
      amenities: ['Restroom', 'Air'],
      lat: lat - 0.04,
      lng: lng + 0.07,
    },
  ].slice(0, count);
}

// ── Nearby Service Centers (Mock Data) ─────────────────────
export function getNearbyServiceCenters(lat, lng, count = 4) {
  return [
    {
      id: 1,
      name: 'Toyota Authorized Service',
      address: 'NH-48, Wadgaon',
      distance: '5.2 km',
      rating: 4.5,
      phone: '+91 98765 43210',
      services: ['Engine Repair', 'AC Service', 'Body Work', 'Towing'],
      open: true,
      hours: '8:00 AM - 8:00 PM',
      lat: lat + 0.03,
      lng: lng - 0.01,
    },
    {
      id: 2,
      name: 'Multi-Brand Car Care',
      address: 'Expressway Service Lane',
      distance: '10.8 km',
      rating: 4.2,
      phone: '+91 98765 43211',
      services: ['General Service', 'Tire Change', 'Battery', 'Towing'],
      open: true,
      hours: '24 Hours',
      lat: lat - 0.02,
      lng: lng + 0.03,
    },
    {
      id: 3,
      name: 'QuickFix Auto Garage',
      address: 'Near HP Petrol Pump',
      distance: '15.3 km',
      rating: 4.0,
      phone: '+91 98765 43212',
      services: ['Emergency Repair', 'Towing', 'Tire Change'],
      open: true,
      hours: '6:00 AM - 10:00 PM',
      lat: lat + 0.06,
      lng: lng - 0.04,
    },
    {
      id: 4,
      name: 'Premium Auto Works',
      address: 'City Center, Lonavala',
      distance: '20.1 km',
      rating: 4.8,
      phone: '+91 98765 43213',
      services: ['Full Service', 'Diagnostics', 'Body Work', 'Painting'],
      open: true,
      hours: '9:00 AM - 7:00 PM',
      lat: lat - 0.05,
      lng: lng + 0.05,
    },
  ].slice(0, count);
}

// ── Toll Information (Mock Data) ───────────────────────────
export function getTollAlerts(routeDistance = 100) {
  const tolls = [
    {
      id: 1,
      name: 'Khalapur Toll Plaza',
      distance: '45 km ahead',
      cost: '₹105',
      vehicleType: 'Car/Jeep',
      paymentMethods: ['Cash', 'FASTag'],
      fastagLane: true,
      estimatedWait: '2-3 min',
      lat: 18.9200,
      lng: 73.2800,
    },
    {
      id: 2,
      name: 'Talegaon Toll Plaza',
      distance: '85 km ahead',
      cost: '₹85',
      vehicleType: 'Car/Jeep',
      paymentMethods: ['Cash', 'FASTag', 'Card'],
      fastagLane: true,
      estimatedWait: '5-8 min',
      lat: 18.7200,
      lng: 73.6800,
    },
    {
      id: 3,
      name: 'Khed Shivapur Toll',
      distance: '120 km ahead',
      cost: '₹130',
      vehicleType: 'Car/Jeep',
      paymentMethods: ['Cash', 'FASTag'],
      fastagLane: true,
      estimatedWait: '1-2 min',
      lat: 18.4000,
      lng: 73.8500,
    },
  ];
  
  return tolls.filter(t => {
    const dist = parseInt(t.distance);
    return dist <= routeDistance;
  });
}

// ── Navigation Directions (Mock) ───────────────────────────
export function getNavigationDirections(origin, destination) {
  const steps = [
    { instruction: 'Head north on Main Road', distance: '2.3 km', icon: '⬆️' },
    { instruction: 'Turn right onto NH-48 Highway', distance: '15.7 km', icon: '↗️' },
    { instruction: 'Continue straight on Expressway', distance: '45.2 km', icon: '⬆️' },
    { instruction: 'Take Exit 12 toward Lonavala', distance: '3.1 km', icon: '↗️' },
    { instruction: 'Merge onto Service Road', distance: '1.8 km', icon: '↗️' },
    { instruction: 'Turn left onto Destination Street', distance: '0.5 km', icon: '⬅️' },
    { instruction: 'Arrive at destination on the right', distance: '0.1 km', icon: '🏁' },
  ];
  
  const totalDistance = steps.reduce((sum, s) => sum + parseFloat(s.distance), 0);
  
  return {
    steps,
    totalDistance: `${totalDistance.toFixed(1)} km`,
    estimatedTime: `${Math.round(totalDistance / 60)}h ${Math.round((totalDistance % 60) / 60 * 60)}m`,
  };
}

// ── Format Distance ────────────────────────────────────────
export function formatDistance(meters) {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ── Get Direction Icon ─────────────────────────────────────
export function getDirectionIcon(bearing) {
  if (bearing >= 337.5 || bearing < 22.5) return '⬆️';
  if (bearing >= 22.5 && bearing < 67.5) return '↗️';
  if (bearing >= 67.5 && bearing < 112.5) return '➡️';
  if (bearing >= 112.5 && bearing < 157.5) return '↘️';
  if (bearing >= 157.5 && bearing < 202.5) return '⬇️';
  if (bearing >= 202.5 && bearing < 247.5) return '↙️';
  if (bearing >= 247.5 && bearing < 292.5) return '⬅️';
  return '↖️';
}