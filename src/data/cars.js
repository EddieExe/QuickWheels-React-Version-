const cars = [
  // Sedans
  { id: 1, type: "Sedan", model: "Nissan Sentra", seats: 5, bags: "2 Large + 1 Small", transmission: "Automatic (CVT)", range: "420 miles (676 km)", price: 45, image: "/Images/Sedan/nissan_sentra.png" },
  { id: 2, type: "Sedan", model: "Mazda 3", seats: 5, bags: "2 Large + 1 Small", transmission: "Automatic", range: "400 miles (644 km)", price: 50, image: "/Images/Sedan/mazda3.png" },
  { id: 3, type: "Sedan", model: "Subaru WRX", seats: 5, bags: "2 Large + 1 Small", transmission: "Automatic (CVT)", range: "360 miles (579 km)", price: 65, image: "/Images/Sedan/subaru_wrx.png" },
  { id: 4, type: "Sedan", model: "Lexus ES", seats: 5, bags: "2 Large + 1 Small", transmission: "Automatic", range: "440 miles (708 km)", price: 85, image: "/Images/Sedan/lexus_es.png" },
  { id: 5, type: "Sedan", model: "Cadillac CTS-V", seats: 5, bags: "2 Large + 1 Small", transmission: "Automatic", range: "370 miles (595 km)", price: 110, image: "/Images/Sedan/cadillac_cts-v.png" },

  // Convertibles
  { id: 6, type: "Convertible", model: "Audi A5 Cabriolet", seats: 4, bags: "1 Large + 1 Small", transmission: "Automatic", range: "390 miles (628 km)", price: 120, image: "/Images/Convertible/audi-A5-cabriolet.png" },
  { id: 7, type: "Convertible", model: "Mercedes E-Class", seats: 4, bags: "1 Large + 1 Small", transmission: "Automatic", range: "430 miles (692 km)", price: 140, image: "/Images/Convertible/e-class.png" },
  { id: 8, type: "Convertible", model: "BMW 4 Series", seats: 4, bags: "1 Large + 1 Small", transmission: "Automatic", range: "400 miles (644 km)", price: 130, image: "/Images/Convertible/bmw-4.png" },
  { id: 9, type: "Convertible", model: "Jaguar F-Type", seats: 2, bags: "2 Small", transmission: "Automatic", range: "340 miles (547 km)", price: 220, image: "/Images/Convertible/jaguar.png" },
  { id: 10, type: "Convertible", model: "BMW Z4 Roadster", seats: 2, bags: "2 Small", transmission: "Automatic", range: "330 miles (531 km)", price: 125, image: "/Images/Convertible/BMW-Z4_Roadster.png" },

  // SUVs
  { id: 11, type: "SUV", model: "Genesis GV70", seats: 5, bags: "4 Large", transmission: "Automatic", range: "410 miles (660 km)", price: 150, image: "/Images/SUV/Genesis_GV.png" },
  { id: 12, type: "SUV", model: "Hyundai Tucson", seats: 5, bags: "3 Large", transmission: "Automatic", range: "400 miles (644 km)", price: 95, image: "/Images/SUV/hyundai_tucson.png" },
  { id: 13, type: "SUV", model: "Jeep Compass", seats: 5, bags: "3 Large", transmission: "Automatic", range: "350 miles (563 km)", price: 100, image: "/Images/SUV/jeep-compass.png" },
  { id: 14, type: "SUV", model: "KIA Seltos", seats: 5, bags: "3 Large", transmission: "Automatic", range: "400 miles (644 km)", price: 85, image: "/Images/SUV/kia_seltos.png" },
  { id: 15, type: "SUV", model: "Mazda CX-5", seats: 5, bags: "3 Large", transmission: "Automatic", range: "420 miles (676 km)", price: 80, image: "/Images/SUV/mazda_cx5.png" },

  // Luxury
  { id: 16, type: "Luxury", model: "Lamborghini Urus", seats: 5, bags: "3 Large", transmission: "Automatic", range: "300 miles (482 km)", price: 550, image: "/Images/Luxury/urus.png" },
  { id: 17, type: "Luxury", model: "Range Rover", seats: 5, bags: "3 Large", transmission: "Automatic", range: "420 miles (676 km)", price: 220, image: "/Images/Luxury/range-rover.png" },
  { id: 18, type: "Luxury", model: "Bentley Mulliner", seats: 4, bags: "2 Large", transmission: "Automatic", range: "400 miles (644 km)", price: 350, image: "/Images/Luxury/Bentley Mulliner.png" },
  { id: 19, type: "Luxury", model: "Rolls Royce Ghost", seats: 4, bags: "2 Large", transmission: "Automatic", range: "350 miles (563 km)", price: 650, image: "/Images/Luxury/rolls-royce-ghost.png" },
  { id: 20, type: "Luxury", model: "Mercedes S-Class", seats: 5, bags: "3 Large", transmission: "Automatic", range: "460 miles (740 km)", price: 250, image: "/Images/Luxury/s-class.png" },

  // Pickup Trucks
  { id: 21, type: "Pickup", model: "RAM TRX", seats: 5, bags: "6 Large", transmission: "Automatic (8-Speed)", range: "330 miles (531 km)", price: 180, image: "/Images/Pickup Trucks/ram_trx2.png" },
  { id: 22, type: "Pickup", model: "Ford F150 Lightning", seats: 5, bags: "6 Large", transmission: "Automatic (Single Speed)", range: "320 miles (515 km)", price: 150, image: "/Images/Pickup Trucks/Ford-F-150-Lightning.png" },
  { id: 23, type: "Pickup", model: "Ford F150 Raptor", seats: 5, bags: "6 Large", transmission: "Automatic (10-Speed)", range: "420 miles (676 km)", price: 170, image: "/Images/Pickup Trucks/ford-f150-raptor.png" },
  { id: 24, type: "Pickup", model: "GMC Sierra 1500", seats: 5, bags: "6 Large", transmission: "Automatic", range: "400 miles (644 km)", price: 140, image: "/Images/Pickup Trucks/gmc-sierra-1500.png" },
  { id: 25, type: "Pickup", model: "SsangYong Musso", seats: 5, bags: "6 Large", transmission: "Automatic", range: "400 miles (644 km)", price: 110, image: "/Images/Pickup Trucks/musso.png" },

  // Vans
  { id: 26, type: "Van", model: "Ford Transit", seats: 12, bags: "6 Large", transmission: "Automatic", range: "400 miles (644 km)", price: 160, image: "/Images/Van/ford_transit.png" },
  { id: 27, type: "Van", model: "Honda Odyssey", seats: 7, bags: "4 Large", transmission: "Automatic", range: "380 miles (611 km)", price: 150, image: "/Images/Van/Honda-Odyssey.png" },
  { id: 28, type: "Van", model: "Hyundai Staria", seats: 9, bags: "5 Large", transmission: "Automatic", range: "350 miles (563 km)", price: 130, image: "/Images/Van/hyundai-staria.png" },
  { id: 29, type: "Van", model: "Toyota Sienna", seats: 7, bags: "4 Large", transmission: "Automatic", range: "400 miles (644 km)", price: 140, image: "/Images/Van/toyota_sienna.png" },
  { id: 30, type: "Van", model: "VW Transporter", seats: 7, bags: "4 Large", transmission: "Automatic", range: "420 miles (676 km)", price: 145, image: "/Images/Van/volkswagen.png" },
];

export default cars;