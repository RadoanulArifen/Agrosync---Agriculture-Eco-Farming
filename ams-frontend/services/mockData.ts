import type {
  Farmer, Officer, Vendor, Product, Order, AdvisoryCase,
  CropListing, CropPrice, WeatherForecast, Notification,
  BlogPost, Testimonial, AdminStats, Tenant,
} from '@/types';

// ===================== FARMERS =====================
export const MOCK_FARMERS: Farmer[] = [
  {
    id: 'usr_001', fid: 'AGS-2026-0000001', nidHash: 'hash_abc',
    name: 'Abdul Karim', nameBn: 'আব্দুল করিম', email: 'abdul.karim@farmer.com', phone: '01711234567',
    role: 'farmer', tenantId: 'tenant_001', district: 'Mymensingh',
    upazila: 'Trishal', division: 'Mymensingh', landAcres: 4.5,
    cropTypes: ['Rice (Aman)', 'Mustard', 'Potato'],
    bkashAccount: '01711234567', avatar: 'https://i.pravatar.cc/150?img=3',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'usr_002', fid: 'AGS-2026-0000002', nidHash: 'hash_def',
    name: 'Fatema Begum', nameBn: 'ফাতেমা বেগম', email: 'fatema.begum@farmer.com', phone: '01812345678',
    role: 'farmer', tenantId: 'tenant_001', district: 'Rajshahi',
    upazila: 'Godagari', division: 'Rajshahi', landAcres: 2.0,
    cropTypes: ['Rice (Boro)', 'Wheat', 'Mango'],
    bkashAccount: '01812345678', avatar: 'https://i.pravatar.cc/150?img=5',
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'usr_003', fid: 'AGS-2026-0000003', nidHash: 'hash_ghi',
    name: 'Mohammad Hasan', nameBn: 'মোহাম্মদ হাসান', email: 'mohammad.hasan@farmer.com', phone: '01916789012',
    role: 'farmer', tenantId: 'tenant_002', district: 'Bogura',
    upazila: 'Sherpur', division: 'Rajshahi', landAcres: 7.0,
    cropTypes: ['Potato', 'Onion', 'Garlic'],
    bkashAccount: '01916789012', avatar: 'https://i.pravatar.cc/150?img=7',
    createdAt: '2026-02-01T10:00:00Z',
  },
];

// ===================== OFFICERS =====================
export const MOCK_OFFICERS: Officer[] = [
  {
    id: 'usr_off_001', officerId: 'OFF-001', name: 'Dr. Rahim Uddin',
    nameBn: 'ডঃ রহিম উদ্দিন', phone: '01711000001', email: 'rahim@dae.gov.bd',
    role: 'officer', tenantId: 'tenant_001', specialtyTags: ['Rice Disease', 'Pest Control'],
    regionDistricts: ['Mymensingh', 'Tangail', 'Jamalpur'],
    maxActiveCases: 20, availabilityStatus: 'available',
    avatar: 'https://i.pravatar.cc/150?img=11', createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'usr_off_002', officerId: 'OFF-002', name: 'Nasrin Akter',
    nameBn: 'নাসরিন আক্তার', phone: '01811000002', email: 'nasrin@dae.gov.bd',
    role: 'officer', tenantId: 'tenant_001', specialtyTags: ['Vegetable', 'Soil Health'],
    regionDistricts: ['Rajshahi', 'Chapainawabganj', 'Naogaon'],
    maxActiveCases: 20, availabilityStatus: 'busy',
    avatar: 'https://i.pravatar.cc/150?img=15', createdAt: '2026-01-06T00:00:00Z',
  },
];

// ===================== ADVISORY CASES =====================
export const MOCK_ADVISORY_CASES: AdvisoryCase[] = [
  {
    id: 'ADV-2026-0000001', farmerId: 'usr_001', farmerName: 'Abdul Karim',
    farmerDistrict: 'Mymensingh', cropType: 'Rice (Aman)',
    description: 'My rice plants are showing yellow leaves and brown spots. Several plants have dried up.',
    photos: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80'],
    status: 'responded',
    aiDiagnosis: 'Bacterial Leaf Blight (Xanthomonas oryzae pv. oryzae)',
    aiConfidence: 87,
    officerId: 'usr_off_001', officerName: 'Dr. Rahim Uddin',
    officerResponse: 'Apply copper-based bactericide. Remove infected plants. Ensure proper drainage. Avoid excess nitrogen fertilizer.',
    createdAt: '2026-04-18T09:00:00Z', respondedAt: '2026-04-18T10:30:00Z',
  },
  {
    id: 'ADV-2026-0000002', farmerId: 'usr_002', farmerName: 'Fatema Begum',
    farmerDistrict: 'Rajshahi', cropType: 'Wheat',
    description: 'Fungal infection visible on wheat stems. Orange-red pustules appearing.',
    photos: ['https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80'],
    status: 'ai_analyzed',
    aiDiagnosis: 'Wheat Stem Rust (Puccinia graminis)',
    aiConfidence: 92,
    createdAt: '2026-04-20T07:30:00Z',
  },
  {
    id: 'ADV-2026-0000003', farmerId: 'usr_003', farmerName: 'Mohammad Hasan',
    farmerDistrict: 'Bogura', cropType: 'Potato',
    description: 'Potato leaves turning black with white mold appearing underneath.',
    photos: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80'],
    status: 'assigned',
    aiDiagnosis: 'Late Blight (Phytophthora infestans)',
    aiConfidence: 94,
    officerId: 'usr_off_002', officerName: 'Nasrin Akter',
    createdAt: '2026-04-21T06:00:00Z',
  },
  {
    id: 'ADV-2026-0000004', farmerId: 'usr_001', farmerName: 'Abdul Karim',
    farmerDistrict: 'Mymensingh', cropType: 'Mustard',
    description: 'Mustard plants showing stunted growth. Leaves curling inward.',
    photos: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80'],
    status: 'pending',
    createdAt: '2026-04-21T08:00:00Z',
  },
];

// ===================== PRODUCTS =====================
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod_001', vendorId: 'vnd_001', vendorName: 'AgroSupply BD',
    nameEn: 'Urea Fertilizer (Premium)', nameBn: 'ইউরিয়া সার (প্রিমিয়াম)',
    category: 'Fertilizer', price: 1200, unit: '50kg bag',
    stockQty: 500, description: 'High-quality granular urea for all crops. 46% nitrogen content.',
    manufacturer: 'KAFCO Bangladesh', photos: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80'],
    deliveryDistricts: ['Dhaka', 'Mymensingh', 'Tangail', 'Gazipur'],
    estimatedDeliveryDays: 3, rating: 4.7, reviewCount: 284, isRecommended: true,
  },
  {
    id: 'prod_002', vendorId: 'vnd_001', vendorName: 'AgroSupply BD',
    nameEn: 'Copper Bactericide Spray', nameBn: 'কপার ব্যাকটেরিসাইড স্প্রে',
    category: 'Pesticide', price: 450, unit: '500ml bottle',
    stockQty: 120, description: 'Effective against bacterial leaf blight, leaf spot, and blast diseases.',
    manufacturer: 'BAYER CropScience', photos: ['https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&q=80'],
    deliveryDistricts: ['Mymensingh', 'Rajshahi', 'Dhaka'],
    estimatedDeliveryDays: 2, rating: 4.8, reviewCount: 156, isRecommended: true,
  },
  {
    id: 'prod_003', vendorId: 'vnd_002', vendorName: 'BanglaSeed Co.',
    nameEn: 'BRRI Dhan-28 Rice Seed', nameBn: 'ব্রি ধান-২৮ বীজ',
    category: 'Seed', price: 800, unit: '5kg pack',
    stockQty: 350, description: 'High-yield Boro rice variety. Average yield 6 ton/hectare.',
    manufacturer: 'BRRI Bangladesh', photos: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80'],
    deliveryDistricts: ['All Bangladesh'],
    estimatedDeliveryDays: 4, rating: 4.9, reviewCount: 521, isRecommended: false,
  },
  {
    id: 'prod_004', vendorId: 'vnd_002', vendorName: 'BanglaSeed Co.',
    nameEn: 'Systemic Fungicide (Mancozeb)', nameBn: 'সিস্টেমিক ছত্রাকনাশক',
    category: 'Pesticide', price: 320, unit: '250g packet',
    stockQty: 200, description: 'Controls late blight, early blight, downy mildew in potato, tomato.',
    manufacturer: 'Syngenta Bangladesh', photos: ['https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80'],
    deliveryDistricts: ['Rajshahi', 'Dhaka', 'Bogura', 'Rangpur'],
    estimatedDeliveryDays: 3, rating: 4.6, reviewCount: 89, isRecommended: true,
  },
  {
    id: 'prod_005', vendorId: 'vnd_003', vendorName: 'FarmEquip BD',
    nameEn: 'Portable Pesticide Sprayer', nameBn: 'পোর্টেবল পেস্টিসাইড স্প্রেয়ার',
    category: 'Equipment', price: 3500, unit: '1 unit (16L)',
    stockQty: 45, description: 'Manual knapsack sprayer with adjustable nozzle. 16L capacity.',
    manufacturer: 'Kissan Agri Tools', photos: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?w=400&q=80'],
    deliveryDistricts: ['Dhaka', 'Chittagong', 'Rajshahi'],
    estimatedDeliveryDays: 5, rating: 4.3, reviewCount: 67, isRecommended: false,
  },
  {
    id: 'prod_006', vendorId: 'vnd_001', vendorName: 'AgroSupply BD',
    nameEn: 'DAP Fertilizer', nameBn: 'ডিএপি সার',
    category: 'Fertilizer', price: 1600, unit: '50kg bag',
    stockQty: 280, description: 'Diammonium Phosphate - rich in nitrogen and phosphorus.',
    manufacturer: 'BCL Bangladesh', photos: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80'],
    deliveryDistricts: ['All Bangladesh'],
    estimatedDeliveryDays: 3, rating: 4.5, reviewCount: 203, isRecommended: false,
  },
  {
    id: 'prod_007', vendorId: 'vnd_004', vendorName: 'Green Harvest Organic',
    nameEn: 'Organic Vermicompost', nameBn: 'জৈব ভার্মি কম্পোস্ট',
    category: 'Organic', price: 650, unit: '25kg bag',
    stockQty: 220, description: 'Nutrient-rich organic compost for vegetables, fruit trees, and field crops.',
    manufacturer: 'Green Harvest BD', photos: ['https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80'],
    deliveryDistricts: ['Dhaka', 'Mymensingh', 'Sylhet', 'Cumilla'],
    estimatedDeliveryDays: 3, rating: 4.8, reviewCount: 176, isRecommended: true,
  },
  {
    id: 'prod_008', vendorId: 'vnd_004', vendorName: 'Green Harvest Organic',
    nameEn: 'Neem Oil Bio Pesticide', nameBn: 'নিম তেল বায়ো পেস্টিসাইড',
    category: 'Organic', price: 520, unit: '1L bottle',
    stockQty: 140, description: 'Natural neem extract for safer pest control in vegetables and orchards.',
    manufacturer: 'BioCare Agro', photos: ['https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400&q=80'],
    deliveryDistricts: ['All Bangladesh'],
    estimatedDeliveryDays: 2, rating: 4.6, reviewCount: 132, isRecommended: false,
  },
  {
    id: 'prod_009', vendorId: 'vnd_005', vendorName: 'Rajshahi Fresh Farms',
    nameEn: 'Fresh Tomato Crate', nameBn: 'তাজা টমেটো ক্রেট',
    category: 'Fresh Vegetables', price: 950, unit: '20kg crate',
    stockQty: 90, description: 'Farm-picked tomatoes suitable for retailers, restaurants, and processors.',
    manufacturer: 'Rajshahi Fresh Farms', photos: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80'],
    deliveryDistricts: ['Rajshahi', 'Dhaka', 'Bogura', 'Natore'],
    estimatedDeliveryDays: 1, rating: 4.7, reviewCount: 244, isRecommended: true,
  },
  {
    id: 'prod_010', vendorId: 'vnd_006', vendorName: 'North Bengal Veg Supply',
    nameEn: 'Mixed Seasonal Vegetables', nameBn: 'মিশ্র মৌসুমি সবজি',
    category: 'Fresh Vegetables', price: 1250, unit: '25kg basket',
    stockQty: 75, description: 'Assorted seasonal vegetables sourced from verified local farmers.',
    manufacturer: 'North Bengal Veg Supply', photos: ['https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&q=80'],
    deliveryDistricts: ['Dhaka', 'Rangpur', 'Bogura', 'Mymensingh'],
    estimatedDeliveryDays: 1, rating: 4.5, reviewCount: 318, isRecommended: false,
  },
  {
    id: 'prod_011', vendorId: 'vnd_007', vendorName: 'MilkCo Dairy',
    nameEn: 'Pasteurized Cow Milk', nameBn: 'পাস্তুরিত গরুর দুধ',
    category: 'Dairy', price: 95, unit: '1L bottle',
    stockQty: 400, description: 'Fresh pasteurized cow milk supplied through chilled delivery channels.',
    manufacturer: 'MilkCo Dairy', photos: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80'],
    deliveryDistricts: ['Dhaka', 'Gazipur', 'Narayanganj'],
    estimatedDeliveryDays: 1, rating: 4.8, reviewCount: 427, isRecommended: true,
  },
  {
    id: 'prod_012', vendorId: 'vnd_008', vendorName: 'Village Dairy Hub',
    nameEn: 'Farm Fresh Yogurt', nameBn: 'খামারের টাটকা দই',
    category: 'Dairy', price: 180, unit: '1kg pot',
    stockQty: 160, description: 'Creamy yogurt prepared from fresh milk collected from cooperative farmers.',
    manufacturer: 'Village Dairy Hub', photos: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80'],
    deliveryDistricts: ['Dhaka', 'Mymensingh', 'Tangail'],
    estimatedDeliveryDays: 1, rating: 4.6, reviewCount: 191, isRecommended: false,
  },
];

// ===================== ORDERS =====================
export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2026-00000001', farmerId: 'usr_001', farmerName: 'Abdul Karim',
    vendorId: 'vnd_001', vendorName: 'AgroSupply BD',
    items: [
      { productId: 'prod_001', productName: 'Urea Fertilizer (Premium)', quantity: 2, price: 1200, unit: '50kg bag' },
      { productId: 'prod_002', productName: 'Copper Bactericide Spray', quantity: 3, price: 450, unit: '500ml bottle' },
    ],
    totalAmount: 3750, status: 'dispatched', paymentGateway: 'bkash', paymentStatus: 'paid',
    placedAt: '2026-04-18T11:00:00Z', estimatedDelivery: '2026-04-21',
  },
  {
    id: 'ORD-2026-00000002', farmerId: 'usr_002', farmerName: 'Fatema Begum',
    vendorId: 'vnd_002', vendorName: 'BanglaSeed Co.',
    items: [
      { productId: 'prod_003', productName: 'BRRI Dhan-28 Rice Seed', quantity: 5, price: 800, unit: '5kg pack' },
    ],
    totalAmount: 4000, status: 'delivered', paymentGateway: 'nagad', paymentStatus: 'paid',
    placedAt: '2026-04-10T09:00:00Z', estimatedDelivery: '2026-04-14', deliveredAt: '2026-04-13T15:00:00Z',
  },
  {
    id: 'ORD-2026-00000003', farmerId: 'usr_003', farmerName: 'Mohammad Hasan',
    vendorId: 'vnd_002', vendorName: 'BanglaSeed Co.',
    items: [
      { productId: 'prod_004', productName: 'Systemic Fungicide (Mancozeb)', quantity: 10, price: 320, unit: '250g packet' },
    ],
    totalAmount: 3200, status: 'pending', paymentGateway: 'cod', paymentStatus: 'pending',
    placedAt: '2026-04-21T08:30:00Z', estimatedDelivery: '2026-04-24',
  },
];

// ===================== CROP LISTINGS =====================
export const MOCK_CROP_LISTINGS: CropListing[] = [
  {
    id: 'CRP-001', farmerId: 'usr_001', farmerName: 'Abdul Karim', farmerDistrict: 'Mymensingh',
    cropType: 'Rice (Aman)', variety: 'BRRI Dhan-39', quantityKg: 5000, qualityGrade: 'A',
    askingPrice: 28, harvestDate: '2026-05-15', district: 'Mymensingh', upazila: 'Trishal',
    photos: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80'],
    status: 'active', createdAt: '2026-04-15T07:00:00Z',
  },
  {
    id: 'CRP-002', farmerId: 'usr_002', farmerName: 'Fatema Begum', farmerDistrict: 'Rajshahi',
    cropType: 'Mango', variety: 'Himsagar', quantityKg: 2000, qualityGrade: 'A',
    askingPrice: 120, harvestDate: '2026-06-01', district: 'Rajshahi', upazila: 'Paba',
    photos: ['https://images.unsplash.com/photo-1519096845289-95806ee03a1a?w=400&q=80'],
    status: 'matched', createdAt: '2026-04-12T08:00:00Z', matchedCompanyId: 'comp_001',
  },
  {
    id: 'CRP-003', farmerId: 'usr_003', farmerName: 'Mohammad Hasan', farmerDistrict: 'Bogura',
    cropType: 'Potato', variety: 'Cardinal', quantityKg: 15000, qualityGrade: 'B',
    askingPrice: 22, harvestDate: '2026-04-30', district: 'Bogura', upazila: 'Sherpur',
    photos: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80'],
    status: 'active', createdAt: '2026-04-20T06:00:00Z',
  },
];

// ===================== CROP PRICES =====================
export const MOCK_CROP_PRICES: CropPrice[] = [
  {
    cropType: 'Rice (Aman)', currentPrice: 28, unit: 'BDT/kg', change7d: 2.5,
    changePercent: 9.8, trend: 'up', lastUpdated: '2026-04-21T10:00:00Z',
    history: [
      { date: '2026-04-14', price: 25.5 }, { date: '2026-04-15', price: 26 },
      { date: '2026-04-16', price: 26.5 }, { date: '2026-04-17', price: 27 },
      { date: '2026-04-18', price: 27.5 }, { date: '2026-04-20', price: 27.8 },
      { date: '2026-04-21', price: 28 },
    ],
  },
  {
    cropType: 'Potato', currentPrice: 22, unit: 'BDT/kg', change7d: -3,
    changePercent: -12, trend: 'down', lastUpdated: '2026-04-21T10:00:00Z',
    history: [
      { date: '2026-04-14', price: 25 }, { date: '2026-04-15', price: 24.5 },
      { date: '2026-04-16', price: 24 }, { date: '2026-04-17', price: 23.5 },
      { date: '2026-04-18', price: 23 }, { date: '2026-04-20', price: 22.5 },
      { date: '2026-04-21', price: 22 },
    ],
  },
  {
    cropType: 'Wheat', currentPrice: 35, unit: 'BDT/kg', change7d: 0.5,
    changePercent: 1.4, trend: 'stable', lastUpdated: '2026-04-21T10:00:00Z',
    history: [
      { date: '2026-04-14', price: 34.5 }, { date: '2026-04-15', price: 34.6 },
      { date: '2026-04-16', price: 34.8 }, { date: '2026-04-17', price: 34.9 },
      { date: '2026-04-18', price: 35 }, { date: '2026-04-20', price: 35 },
      { date: '2026-04-21', price: 35 },
    ],
  },
  {
    cropType: 'Mango', currentPrice: 120, unit: 'BDT/kg', change7d: 15,
    changePercent: 14.3, trend: 'up', lastUpdated: '2026-04-21T10:00:00Z',
    history: [
      { date: '2026-04-14', price: 105 }, { date: '2026-04-15', price: 108 },
      { date: '2026-04-16', price: 110 }, { date: '2026-04-17', price: 113 },
      { date: '2026-04-18', price: 115 }, { date: '2026-04-20', price: 118 },
      { date: '2026-04-21', price: 120 },
    ],
  },
];

// ===================== WEATHER =====================
export const MOCK_WEATHER: WeatherForecast = {
  location: 'Mymensingh', district: 'Mymensingh',
  current: {
    district: 'Mymensingh', date: '2026-04-21', tempMin: 24, tempMax: 34,
    rainfall: 0, humidity: 72, windSpeed: 15, condition: 'Partly Cloudy', icon: '⛅',
    advisory: 'Good conditions for field work. Low disease risk today.',
  },
  forecast: [
    { district: 'Mymensingh', date: '2026-04-22', tempMin: 25, tempMax: 35, rainfall: 5, humidity: 78, windSpeed: 18, condition: 'Light Rain', icon: '🌦️' },
    { district: 'Mymensingh', date: '2026-04-23', tempMin: 22, tempMax: 31, rainfall: 30, humidity: 88, windSpeed: 25, condition: 'Heavy Rain', icon: '🌧️', advisory: '⚠️ Avoid pesticide spraying. Protect harvested crops.' },
    { district: 'Mymensingh', date: '2026-04-24', tempMin: 23, tempMax: 33, rainfall: 10, humidity: 82, windSpeed: 20, condition: 'Cloudy', icon: '☁️' },
    { district: 'Mymensingh', date: '2026-04-25', tempMin: 24, tempMax: 36, rainfall: 0, humidity: 68, windSpeed: 12, condition: 'Sunny', icon: '☀️' },
    { district: 'Mymensingh', date: '2026-04-26', tempMin: 25, tempMax: 37, rainfall: 0, humidity: 65, windSpeed: 10, condition: 'Hot & Sunny', icon: '🌤️' },
    { district: 'Mymensingh', date: '2026-04-27', tempMin: 24, tempMax: 35, rainfall: 2, humidity: 70, windSpeed: 14, condition: 'Partly Cloudy', icon: '⛅' },
  ],
  alerts: ['Heavy rain expected on April 23. Secure crop storage.'],
};

// ===================== NOTIFICATIONS =====================
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_001', userId: 'usr_001', type: 'advisory',
    title: 'Advisory Response Received', message: 'Dr. Rahim Uddin responded to your rice disease case ADV-2026-0000001.',
    channel: ['sms', 'push'], isRead: false, createdAt: '2026-04-18T10:35:00Z',
  },
  {
    id: 'notif_002', userId: 'usr_001', type: 'order',
    title: 'Order Dispatched', message: 'Your order ORD-2026-00000001 has been dispatched. Expected delivery: April 21.',
    channel: ['sms', 'push'], isRead: false, createdAt: '2026-04-19T14:00:00Z',
  },
  {
    id: 'notif_003', userId: 'usr_001', type: 'price_alert',
    title: 'Price Alert: Rice (Aman)', message: 'Rice (Aman) price increased by 9.8% in last 24 hours. Current: ৳28/kg.',
    channel: ['sms', 'push'], isRead: true, createdAt: '2026-04-21T09:00:00Z',
  },
  {
    id: 'notif_004', userId: 'usr_001', type: 'weather',
    title: 'Weather Alert', message: 'Heavy rain forecast for Mymensingh on April 23. Secure your crops.',
    channel: ['sms', 'push'], isRead: true, createdAt: '2026-04-21T08:00:00Z',
  },
];

// ===================== BLOG POSTS =====================
export const MOCK_BLOG_POSTS: BlogPost[] = [
  {
    id: 'blog_001', title: 'This Doctor is Also a Farmer',
    excerpt: 'How a retired physician in Mymensingh transformed 10 acres of land into a thriving organic farm.',
    content: '...', author: 'Staff Writer', category: 'Farmer Stories',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
    publishedAt: '2026-04-18', readTime: 4, tags: ['organic', 'farmer', 'success'],
  },
  {
    id: 'blog_002', title: 'Body-Friendly Lunch Recipes from Farm Fresh Produce',
    excerpt: 'Nutritious Bengali recipes using locally sourced organic vegetables from AMS partner farms.',
    content: '...', author: 'Nutrition Team', category: 'Food & Health',
    thumbnail: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&q=80',
    publishedAt: '2026-04-15', readTime: 6, tags: ['nutrition', 'organic', 'recipes'],
  },
  {
    id: 'blog_003', title: 'Healthiest Vegetables on Earth Grown in Bangladesh',
    excerpt: "Discover Bangladesh's top five superfoods that are changing how the world views South Asian agriculture.",
    content: '...', author: 'Research Team', category: 'Agriculture',
    thumbnail: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    publishedAt: '2026-04-10', readTime: 5, tags: ['vegetables', 'health', 'superfoods'],
  },
];

// ===================== TESTIMONIALS =====================
export const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: 'test_001', name: 'Abdul Karim', role: 'Rice Farmer',
    district: 'Mymensingh', avatar: 'https://i.pravatar.cc/150?img=3', rating: 5,
    text: 'The AI diagnosis saved my entire rice crop. Within 2 hours, I had expert advice and the right medicine delivered to my door. This platform changed my life.',
  },
  {
    id: 'test_002', name: 'Fatema Begum', role: 'Mango Farmer',
    district: 'Rajshahi', avatar: 'https://i.pravatar.cc/150?img=5', rating: 5,
    text: 'I sold my entire mango harvest directly to a company at the best price. No middlemen, transparent pricing. My family income doubled this season.',
  },
  {
    id: 'test_003', name: 'Mohammad Hasan', role: 'Potato Farmer',
    district: 'Bogura', avatar: 'https://i.pravatar.cc/150?img=7', rating: 4,
    text: 'The weather alerts and price tracking help me plan perfectly. The Bangla interface is easy even for my elderly father to use on his phone.',
  },
];

// ===================== ADMIN STATS =====================
export const MOCK_ADMIN_STATS: AdminStats = {
  totalFarmers: 12450, totalOfficers: 87, totalVendors: 234,
  totalAdvisories: 45890, activeAdvisories: 342, mrr: 1250000,
  uptime: '99.94%', advisoryDeliveryRate: 99.7,
};

// ===================== TENANTS =====================
export const MOCK_TENANTS: Tenant[] = [
  {
    id: 'tenant_001', name: 'Mymensingh Farmers Cooperative',
    subdomain: 'mymensingh-coop', planTier: 'professional',
    adminUserId: 'admin_001', status: 'active', farmerCount: 847,
    createdAt: '2026-01-01', mrr: 5999,
  },
  {
    id: 'tenant_002', name: 'Rajshahi Agricultural Alliance',
    subdomain: 'rajshahi-agri', planTier: 'standard',
    adminUserId: 'admin_002', status: 'active', farmerCount: 312,
    createdAt: '2026-02-15', mrr: 2999,
  },
  {
    id: 'tenant_003', name: 'Bogura Potato Growers',
    subdomain: 'bogura-potato', planTier: 'basic',
    adminUserId: 'admin_003', status: 'trial', farmerCount: 45,
    createdAt: '2026-04-01', mrr: 0,
  },
];
