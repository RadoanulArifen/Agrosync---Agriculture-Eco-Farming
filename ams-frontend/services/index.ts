/**
 * MOCK API SERVICES LAYER
 * Replace these functions with real Laravel API calls later.
 * All functions return Promises to match real API behavior.
 * Base URL pattern: process.env.NEXT_PUBLIC_API_URL + '/api/v1/...'
 */

import type {
  Farmer, Product, Order, AdvisoryCase, CropListing,
  CropPrice, WeatherForecast, Notification, BlogPost, ProductCategory,
  Testimonial, AdminStats, Tenant, Officer, DashboardRoleUser, ManagedUserRole, CropDeal,
} from '@/types';

import {
  MOCK_FARMERS, MOCK_PRODUCTS, MOCK_ORDERS, MOCK_ADVISORY_CASES,
  MOCK_CROP_LISTINGS, MOCK_CROP_PRICES, MOCK_WEATHER, MOCK_NOTIFICATIONS,
  MOCK_BLOG_POSTS, MOCK_TESTIMONIALS, MOCK_ADMIN_STATS, MOCK_TENANTS,
  MOCK_OFFICERS,
} from './mockData';

// Simulate network delay
const delay = (ms = 500) => new Promise((res) => setTimeout(res, ms));

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const API_V1 = API_BASE_URL ? `${API_BASE_URL}/api/v1` : '';
const NOTIFICATIONS_UPDATED_EVENT = 'ams:notifications-updated';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_V1) {
    throw new Error('Backend API URL is not configured.');
  }

  const response = await fetch(`${API_V1}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Backend API request failed: ${response.status}`);
  }

  const payload = await response.json() as { status: 'success' | 'error'; data?: T; message?: string };
  if (payload.status === 'error') {
    throw new Error(payload.message || 'Backend API request failed.');
  }

  return payload.data as T;
}

async function apiOrMock<T>(path: string, fallback: () => Promise<T> | T, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, options);
  } catch (error) {
    console.warn(`[API] Falling back to local mock for ${path}:`, error);
    return fallback();
  }
}

const jsonBody = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
});

interface OpenMeteoGeoResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

interface OpenMeteoForecastResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    rain?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    rain_sum?: number[];
    relative_humidity_2m_mean?: number[];
    wind_speed_10m_max?: number[];
  };
}

const WEATHER_CODE_MAP: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear Sky', icon: '☀️' },
  1: { condition: 'Mostly Sunny', icon: '🌤️' },
  2: { condition: 'Partly Cloudy', icon: '⛅' },
  3: { condition: 'Cloudy', icon: '☁️' },
  45: { condition: 'Foggy', icon: '🌫️' },
  48: { condition: 'Rime Fog', icon: '🌫️' },
  51: { condition: 'Light Drizzle', icon: '🌦️' },
  53: { condition: 'Drizzle', icon: '🌦️' },
  55: { condition: 'Heavy Drizzle', icon: '🌧️' },
  61: { condition: 'Light Rain', icon: '🌦️' },
  63: { condition: 'Rain', icon: '🌧️' },
  65: { condition: 'Heavy Rain', icon: '🌧️' },
  80: { condition: 'Rain Showers', icon: '🌦️' },
  81: { condition: 'Strong Showers', icon: '🌧️' },
  82: { condition: 'Violent Showers', icon: '⛈️' },
  95: { condition: 'Thunderstorm', icon: '⛈️' },
  96: { condition: 'Thunderstorm With Hail', icon: '⛈️' },
  99: { condition: 'Severe Thunderstorm', icon: '⛈️' },
};

const getWeatherMeta = (code = 0) => WEATHER_CODE_MAP[code] ?? { condition: 'Changing Weather', icon: '🌤️' };

const buildWeatherAdvisory = (rainfall: number, windSpeed: number, tempMax: number, condition: string) => {
  if (rainfall >= 25) return 'Heavy rain expected. Avoid pesticide spraying and keep harvested crops covered.';
  if (windSpeed >= 35) return 'Strong wind is possible. Secure seedbeds, nets, and lightweight farm structures.';
  if (tempMax >= 36) return 'High heat expected. Irrigate early morning or evening and protect workers from midday sun.';
  if (condition.toLowerCase().includes('thunder')) return 'Thunderstorm risk. Pause open-field work when lightning is nearby.';
  return 'Good conditions for routine field work. Keep monitoring humidity before spraying.';
};

const toWeatherFallback = (district: string): WeatherForecast => ({
  ...MOCK_WEATHER,
  location: district,
  district,
  current: { ...MOCK_WEATHER.current, district },
  forecast: MOCK_WEATHER.forecast.map((day) => ({ ...day, district })),
});

async function fetchOpenMeteoForecast(district: string): Promise<WeatherForecast> {
  const placeQuery = encodeURIComponent(`${district}, Bangladesh`);
  const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${placeQuery}&count=1&language=en&format=json`);

  if (!geoResponse.ok) {
    throw new Error('Unable to resolve weather location');
  }

  const geoData = await geoResponse.json() as { results?: OpenMeteoGeoResult[] };
  const place = geoData.results?.[0];

  if (!place) {
    throw new Error('Weather location not found');
  }

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(place.latitude));
  forecastUrl.searchParams.set('longitude', String(place.longitude));
  forecastUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m');
  forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,rain_sum,relative_humidity_2m_mean,wind_speed_10m_max');
  forecastUrl.searchParams.set('timezone', 'auto');
  forecastUrl.searchParams.set('forecast_days', '7');

  const weatherResponse = await fetch(forecastUrl.toString(), { cache: 'no-store' });

  if (!weatherResponse.ok) {
    throw new Error('Unable to load weather forecast');
  }

  const data = await weatherResponse.json() as OpenMeteoForecastResponse;
  const daily = data.daily;
  const currentMeta = getWeatherMeta(data.current?.weather_code ?? daily?.weather_code?.[0]);
  const currentTemp = Math.round(data.current?.temperature_2m ?? daily?.temperature_2m_max?.[0] ?? MOCK_WEATHER.current.tempMax);
  const currentRainfall = Math.round(data.current?.rain ?? daily?.rain_sum?.[0] ?? 0);
  const currentWind = Math.round(data.current?.wind_speed_10m ?? daily?.wind_speed_10m_max?.[0] ?? 0);

  const forecast = (daily?.time ?? []).map((date, index) => {
    const meta = getWeatherMeta(daily?.weather_code?.[index]);
    const rainfall = Math.round(daily?.rain_sum?.[index] ?? 0);
    const windSpeed = Math.round(daily?.wind_speed_10m_max?.[index] ?? 0);
    const tempMax = Math.round(daily?.temperature_2m_max?.[index] ?? currentTemp);

    return {
      district: place.name,
      date,
      tempMin: Math.round(daily?.temperature_2m_min?.[index] ?? tempMax),
      tempMax,
      rainfall,
      humidity: Math.round(daily?.relative_humidity_2m_mean?.[index] ?? data.current?.relative_humidity_2m ?? 0),
      windSpeed,
      condition: meta.condition,
      icon: meta.icon,
      advisory: buildWeatherAdvisory(rainfall, windSpeed, tempMax, meta.condition),
    };
  });

  const current = {
    district: place.name,
    date: data.current?.time?.split('T')[0] ?? forecast[0]?.date ?? new Date().toISOString().slice(0, 10),
    tempMin: forecast[0]?.tempMin ?? currentTemp,
    tempMax: currentTemp,
    rainfall: currentRainfall,
    humidity: Math.round(data.current?.relative_humidity_2m ?? forecast[0]?.humidity ?? 0),
    windSpeed: currentWind,
    condition: currentMeta.condition,
    icon: currentMeta.icon,
    advisory: buildWeatherAdvisory(currentRainfall, currentWind, currentTemp, currentMeta.condition),
  };

  const alerts = forecast
    .filter((day) => day.rainfall >= 25 || day.windSpeed >= 35 || day.tempMax >= 36 || day.condition.toLowerCase().includes('thunder'))
    .map((day) => `${day.condition} expected on ${day.date}. ${day.advisory}`);

  return {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
    district: place.name,
    current,
    forecast,
    alerts,
  };
}

const FARMERS_STORAGE_KEY = 'ams_mock_farmers';
const CURRENT_FARMER_STORAGE_KEY = 'ams_current_farmer_id';
const ROLE_USERS_STORAGE_KEY = 'ams_role_users';
const CURRENT_ROLE_USER_STORAGE_KEY = 'ams_current_role_user_id';
const ADVISORY_CASES_STORAGE_KEY = 'ams_advisory_cases';
const NOTIFICATIONS_STORAGE_KEY = 'ams_notifications';
const ORDERS_STORAGE_KEY = 'ams_orders';
const CART_STORAGE_KEY = 'ams_cart_items';
const USER_SETTINGS_STORAGE_KEY = 'ams_user_settings';
const MOCK_OTP_SESSION_STORAGE_KEY = 'ams_mock_otp_session';
const PRODUCTS_STORAGE_KEY = 'ams_products';
const CROP_LISTINGS_STORAGE_KEY = 'ams_crop_listings';
const CROP_DEALS_STORAGE_KEY = 'ams_crop_deals';
const TENANTS_STORAGE_KEY = 'ams_tenants';
const ADMIN_FARMER_META_STORAGE_KEY = 'ams_admin_farmer_meta';
const ADMIN_OFFICER_META_STORAGE_KEY = 'ams_admin_officer_meta';
const ADMIN_VENDOR_META_STORAGE_KEY = 'ams_admin_vendor_meta';
const ADMIN_CASE_META_STORAGE_KEY = 'ams_admin_case_meta';
const ADMIN_AUDIT_LOG_STORAGE_KEY = 'ams_admin_audit_logs';

let farmersStore: Farmer[] = [...MOCK_FARMERS];
let roleUsersStore: DashboardRoleUser[] = [];
let advisoryCasesStore: AdvisoryCase[] = [...MOCK_ADVISORY_CASES];
let notificationsStore: Notification[] = [...MOCK_NOTIFICATIONS];
let ordersStore: Order[] = [...MOCK_ORDERS];
let productsStore: Product[] = [...MOCK_PRODUCTS];
let cropListingsStore: CropListing[] = [...MOCK_CROP_LISTINGS];
let cropDealsStore: CropDeal[] = [
  {
    id: 'deal_001',
    listingId: 'CRP-002',
    companyId: 'usr_cmp_001',
    companyName: 'AgroTrade BD',
    farmerId: 'usr_002',
    farmerName: 'Fatema Begum',
    agreedPrice: 118,
    quantityKg: 2000,
    commissionPct: 3,
    commissionAmt: 7080,
    status: 'confirmed',
    confirmedAt: '2026-04-16T10:00:00Z',
  },
];
let tenantsStore: Tenant[] = [...MOCK_TENANTS];

const canUseStorage = () => typeof window !== 'undefined';

const persistStorageItem = (key: string, value: string, label: string) => {
  if (!canUseStorage()) return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[MOCK] Failed to persist ${label} to localStorage. Falling back to in-memory state.`, error);
    return false;
  }
};

export const DEMO_CREDENTIALS: Record<ManagedUserRole, { email: string; password: string; label: string }> = {
  admin: { email: 'admin@ams.com.bd', password: 'password123', label: 'Admin' },
  officer: { email: 'rahim@dae.gov.bd', password: 'password123', label: 'Officer' },
  vendor: { email: 'vendor@ams.com.bd', password: 'password123', label: 'Vendor' },
  company: { email: 'company@ams.com.bd', password: 'password123', label: 'Company' },
  farmer: { email: 'abdul.karim@farmer.com', password: 'password123', label: 'Farmer' },
};

const DEFAULT_ROLE_USERS: DashboardRoleUser[] = [
  ...MOCK_FARMERS.map((farmer) => ({
    ...farmer,
    role: 'farmer' as const,
    password: 'password123',
    accessLabel: 'Registered Farmer',
  })),
  ...MOCK_OFFICERS.map((officer) => ({
    ...officer,
    role: 'officer' as const,
    password: 'password123',
    designation: 'Agricultural Officer',
    accessLabel: 'Regional Advisory Officer',
  })),
  {
    id: 'usr_vnd_001',
    vendorId: 'VND-001',
    name: 'AgroSupply BD',
    nameBn: 'এগ্রো সাপ্লাই বিডি',
    email: 'vendor@ams.com.bd',
    phone: '01711000011',
    role: 'vendor',
    tenantId: 'tenant_001',
    avatar: 'https://i.pravatar.cc/150?img=21',
    createdAt: '2026-01-08T00:00:00Z',
    password: 'password123',
    companyName: 'AgroSupply BD',
    district: 'Dhaka',
    division: 'Dhaka',
    deliveryDistricts: ['Dhaka', 'Mymensingh', 'Rajshahi'],
    designation: 'Verified Vendor',
    accessLabel: 'Marketplace Vendor',
  },
  {
    id: 'usr_cmp_001',
    companyId: 'CMP-001',
    name: 'AgroTrade BD',
    nameBn: 'এগ্রোট্রেড বিডি',
    email: 'company@ams.com.bd',
    phone: '01711000012',
    role: 'company',
    tenantId: 'tenant_001',
    avatar: 'https://i.pravatar.cc/150?img=25',
    createdAt: '2026-01-09T00:00:00Z',
    password: 'password123',
    companyName: 'AgroTrade BD',
    registrationNo: 'TRADE-2026-001',
    district: 'Dhaka',
    division: 'Dhaka',
    cropInterests: ['Rice (Aman)', 'Potato', 'Mango'],
    designation: 'Procurement Company',
    accessLabel: 'Crop Buyer',
  },
  {
    id: 'usr_adm_001',
    name: 'Super Admin',
    nameBn: 'সুপার অ্যাডমিন',
    email: 'admin@ams.com.bd',
    phone: '01711000010',
    role: 'admin',
    tenantId: 'tenant_001',
    avatar: 'https://i.pravatar.cc/150?img=30',
    createdAt: '2026-01-01T00:00:00Z',
    password: 'password123',
    designation: 'Platform Administrator',
    district: 'Dhaka',
    division: 'Dhaka',
    accessLabel: 'Full Platform Access',
  },
];

const toFarmerRecord = (user: DashboardRoleUser): Farmer => ({
  id: user.id,
  fid: user.fid ?? `AGS-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`,
  nidHash: user.nidHash ?? `mock_nid_${user.id}`,
  name: user.name,
  nameBn: user.nameBn,
  email: user.email,
  phone: user.phone,
  role: 'farmer',
  tenantId: user.tenantId,
  avatar: user.avatar,
  createdAt: user.createdAt,
  district: user.district ?? '',
  upazila: user.upazila ?? '',
  division: user.division ?? '',
  landAcres: user.landAcres ?? 0,
  cropTypes: user.cropTypes ?? [],
  bkashAccount: user.bkashAccount,
});

const syncFarmersFromRoleUsers = (users: DashboardRoleUser[]) => {
  const farmers = users.filter((user) => user.role === 'farmer').map(toFarmerRecord);
  writeFarmersStore(farmers.length > 0 ? farmers : [...MOCK_FARMERS]);
};

const readRoleUsersStore = (): DashboardRoleUser[] => {
  if (!roleUsersStore.length) {
    roleUsersStore = [...DEFAULT_ROLE_USERS];
  }

  if (!canUseStorage()) return roleUsersStore;

  const saved = window.localStorage.getItem(ROLE_USERS_STORAGE_KEY);
  if (!saved) return roleUsersStore;

  try {
    const parsed = JSON.parse(saved) as DashboardRoleUser[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      roleUsersStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read role users store', error);
  }

  syncFarmersFromRoleUsers(roleUsersStore);
  return roleUsersStore;
};

const writeRoleUsersStore = (users: DashboardRoleUser[]) => {
  roleUsersStore = users;
  if (canUseStorage()) {
    persistStorageItem(ROLE_USERS_STORAGE_KEY, JSON.stringify(roleUsersStore), 'role users store');
  }
  syncFarmersFromRoleUsers(roleUsersStore);
};

const readAdvisoryCasesStore = (): AdvisoryCase[] => {
  if (!canUseStorage()) return advisoryCasesStore;

  const saved = window.localStorage.getItem(ADVISORY_CASES_STORAGE_KEY);
  if (!saved) return advisoryCasesStore;

  try {
    const parsed = JSON.parse(saved) as AdvisoryCase[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      advisoryCasesStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read advisory cases store', error);
  }

  return advisoryCasesStore;
};

const writeAdvisoryCasesStore = (cases: AdvisoryCase[]) => {
  advisoryCasesStore = cases;
  if (canUseStorage()) {
    persistStorageItem(ADVISORY_CASES_STORAGE_KEY, JSON.stringify(advisoryCasesStore), 'advisory cases store');
  }
};

const readNotificationsStore = (): Notification[] => {
  if (!canUseStorage()) return notificationsStore;

  const saved = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  if (!saved) return notificationsStore;

  try {
    const parsed = JSON.parse(saved) as Notification[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      notificationsStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read notifications store', error);
  }

  return notificationsStore;
};

const writeNotificationsStore = (notifications: Notification[]) => {
  notificationsStore = notifications;
  if (canUseStorage()) {
    persistStorageItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationsStore), 'notifications store');
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  }
};

const addNotification = (notification: Notification) => {
  writeNotificationsStore([notification, ...readNotificationsStore()]);
};

const readOrdersStore = (): Order[] => {
  if (!canUseStorage()) return ordersStore;

  const saved = window.localStorage.getItem(ORDERS_STORAGE_KEY);
  if (!saved) return ordersStore;

  try {
    const parsed = JSON.parse(saved) as Order[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      ordersStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read orders store', error);
  }

  return ordersStore;
};

const writeOrdersStore = (orders: Order[]) => {
  ordersStore = orders;
  if (canUseStorage()) {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersStore));
  }
};

const readProductsStore = (): Product[] => {
  if (!canUseStorage()) return productsStore;

  const saved = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (!saved) return productsStore;

  try {
    const parsed = JSON.parse(saved) as Product[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      productsStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read products store', error);
  }

  return productsStore;
};

const writeProductsStore = (products: Product[]) => {
  productsStore = products;
  if (canUseStorage()) {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(productsStore));
  }
};

const cropListingToProduct = (listing: CropListing): Product => ({
  id: `listing_${listing.id}`,
  vendorId: listing.farmerId,
  vendorName: listing.farmerName,
  nameEn: `${listing.cropType}${listing.variety ? ` (${listing.variety})` : ''}`,
  nameBn: listing.cropType,
  category: listing.productCategory ?? 'Fresh Vegetables',
  price: listing.askingPrice,
  unit: 'kg',
  stockQty: listing.quantityKg,
  description: `${listing.qualityGrade} grade ${listing.cropType} from ${listing.upazila}, ${listing.district}. Harvest date: ${listing.harvestDate}.`,
  manufacturer: listing.farmerName,
  photos: listing.photos,
  deliveryDistricts: [listing.district],
  estimatedDeliveryDays: 2,
  rating: 4.6,
  reviewCount: Math.max(12, Math.round(listing.quantityKg / 20)),
  isRecommended: false,
});

const readMarketplaceProducts = (): Product[] => {
  const listedProductIds = new Set(readProductsStore().map((product) => product.id));
  const farmerProducts = readCropListingsStore()
    .filter((listing) => listing.status === 'active')
    .map(cropListingToProduct)
    .filter((product) => !listedProductIds.has(product.id));

  return [...farmerProducts, ...readProductsStore()];
};

const readCropListingsStore = (): CropListing[] => {
  if (!canUseStorage()) return cropListingsStore;

  const saved = window.localStorage.getItem(CROP_LISTINGS_STORAGE_KEY);
  if (!saved) return cropListingsStore;

  try {
    const parsed = JSON.parse(saved) as CropListing[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      cropListingsStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read crop listings store', error);
  }

  return cropListingsStore;
};

const writeCropListingsStore = (listings: CropListing[]) => {
  cropListingsStore = listings;
  if (canUseStorage()) {
    window.localStorage.setItem(CROP_LISTINGS_STORAGE_KEY, JSON.stringify(cropListingsStore));
  }
};

const readCropDealsStore = (): CropDeal[] => {
  if (!canUseStorage()) return cropDealsStore;

  const saved = window.localStorage.getItem(CROP_DEALS_STORAGE_KEY);
  if (!saved) return cropDealsStore;

  try {
    const parsed = JSON.parse(saved) as CropDeal[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      cropDealsStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read crop deals store', error);
  }

  return cropDealsStore;
};

const writeCropDealsStore = (deals: CropDeal[]) => {
  cropDealsStore = deals;
  if (canUseStorage()) {
    window.localStorage.setItem(CROP_DEALS_STORAGE_KEY, JSON.stringify(cropDealsStore));
  }
};

const readTenantsStore = (): Tenant[] => {
  if (!canUseStorage()) return tenantsStore;

  const saved = window.localStorage.getItem(TENANTS_STORAGE_KEY);
  if (!saved) return tenantsStore;

  try {
    const parsed = JSON.parse(saved) as Tenant[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      tenantsStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read tenants store', error);
  }

  return tenantsStore;
};

const writeTenantsStore = (tenants: Tenant[]) => {
  tenantsStore = tenants;
  if (canUseStorage()) {
    window.localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(tenantsStore));
  }
};

const readJsonRecord = <T>(key: string, fallback: Record<string, T> = {}): Record<string, T> => {
  if (!canUseStorage()) return fallback;
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as Record<string, T>;
  } catch (error) {
    console.error(`[MOCK] Failed to read ${key}`, error);
    return fallback;
  }
};

const writeJsonRecord = <T>(key: string, value: Record<string, T>) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const readJsonArray = <T>(key: string, fallback: T[] = []): T[] => {
  if (!canUseStorage()) return fallback;
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T[];
  } catch (error) {
    console.error(`[MOCK] Failed to read ${key}`, error);
    return fallback;
  }
};

const writeJsonArray = <T>(key: string, value: T[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const readMockOtpSession = (): { email: string; role?: ManagedUserRole; otpToken: string; purpose?: 'login' | 'registration' } | undefined => {
  if (!canUseStorage()) return undefined;
  const saved = window.localStorage.getItem(MOCK_OTP_SESSION_STORAGE_KEY);
  if (!saved) return undefined;

  try {
    return JSON.parse(saved) as { email: string; role?: ManagedUserRole; otpToken: string; purpose?: 'login' | 'registration' };
  } catch (error) {
    console.error('[MOCK] Failed to read OTP session', error);
    return undefined;
  }
};

const writeMockOtpSession = (value: { email: string; role?: ManagedUserRole; otpToken: string; purpose?: 'login' | 'registration' }) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MOCK_OTP_SESSION_STORAGE_KEY, JSON.stringify(value));
};

const clearMockOtpSession = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(MOCK_OTP_SESSION_STORAGE_KEY);
};

const addAuditLog = (entry: {
  entity: string;
  action: string;
  actor: string;
  details: string;
}) => {
  const current = readJsonArray<{
    id: string;
    entity: string;
    action: string;
    actor: string;
    details: string;
    createdAt: string;
  }>(ADMIN_AUDIT_LOG_STORAGE_KEY, [
    {
      id: 'audit_001',
      entity: 'tenant',
      action: 'create',
      actor: 'Super Admin',
      details: 'Created Mymensingh Farmers Cooperative tenant.',
      createdAt: '2026-04-20T09:00:00Z',
    },
    {
      id: 'audit_002',
      entity: 'case',
      action: 'reassign',
      actor: 'Super Admin',
      details: 'Reassigned advisory case ADV-2026-0000003 to Nasrin Akter.',
      createdAt: '2026-04-21T11:20:00Z',
    },
  ]);

  writeJsonArray(ADMIN_AUDIT_LOG_STORAGE_KEY, [
    {
      id: `audit_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...entry,
    },
    ...current,
  ]);
};

const getCartStorageKey = (farmerId: string) => `${CART_STORAGE_KEY}_${farmerId}`;

const readCartStore = (farmerId: string): { productId: string; quantity: number }[] => {
  if (!canUseStorage()) return [];

  const saved = window.localStorage.getItem(getCartStorageKey(farmerId));
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved) as { productId: string; quantity: number }[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read cart store', error);
  }

  return [];
};

const writeCartStore = (farmerId: string, items: { productId: string; quantity: number }[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(getCartStorageKey(farmerId), JSON.stringify(items));
};

const readUserSettingsStore = (): Record<string, {
  emailNotifications: boolean;
  pushNotifications: boolean;
  outbreakWarnings: boolean;
  urgentAdvisory: boolean;
  newCaseAlert: boolean;
}> => {
  if (!canUseStorage()) return {};

  const saved = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
  if (!saved) return {};

  try {
    return JSON.parse(saved) as Record<string, {
      emailNotifications: boolean;
      pushNotifications: boolean;
      outbreakWarnings: boolean;
      urgentAdvisory: boolean;
      newCaseAlert: boolean;
    }>;
  } catch (error) {
    console.error('[MOCK] Failed to read user settings store', error);
    return {};
  }
};

const writeUserSettingsStore = (settings: Record<string, {
  emailNotifications: boolean;
  pushNotifications: boolean;
  outbreakWarnings: boolean;
  urgentAdvisory: boolean;
  newCaseAlert: boolean;
}>) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

const readFarmersStore = (): Farmer[] => {
  if (!canUseStorage()) return farmersStore;

  const saved = window.localStorage.getItem(FARMERS_STORAGE_KEY);
  if (!saved) return farmersStore;

  try {
    const parsed = JSON.parse(saved) as Farmer[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      farmersStore = parsed;
    }
  } catch (error) {
    console.error('[MOCK] Failed to read farmer store', error);
  }

  return farmersStore;
};

const writeFarmersStore = (farmers: Farmer[]) => {
  farmersStore = farmers;
  if (canUseStorage()) {
    window.localStorage.setItem(FARMERS_STORAGE_KEY, JSON.stringify(farmersStore));
  }
};

const setCurrentFarmerId = (farmerId: string) => {
  if (canUseStorage()) {
    window.localStorage.setItem(CURRENT_FARMER_STORAGE_KEY, farmerId);
  }
};

const setCurrentRoleUserId = (userId: string) => {
  if (canUseStorage()) {
    window.localStorage.setItem(CURRENT_ROLE_USER_STORAGE_KEY, userId);
  }
};

const clearCurrentSession = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(CURRENT_ROLE_USER_STORAGE_KEY);
  window.localStorage.removeItem(CURRENT_FARMER_STORAGE_KEY);
};

const getCurrentFarmer = (): Farmer | undefined => {
  const currentUser = getCurrentRoleUser();
  if (currentUser?.role === 'farmer') {
    return toFarmerRecord(currentUser);
  }

  const farmers = readFarmersStore();
  if (canUseStorage()) {
    const currentFarmerId = window.localStorage.getItem(CURRENT_FARMER_STORAGE_KEY);
    if (currentFarmerId) {
      return farmers.find((farmer) => farmer.id === currentFarmerId);
    }
    return undefined;
  }

  return undefined;
};

const getCurrentRoleUser = (): DashboardRoleUser | undefined => {
  const users = readRoleUsersStore();

  if (canUseStorage()) {
    const currentUserId = window.localStorage.getItem(CURRENT_ROLE_USER_STORAGE_KEY);
    if (currentUserId) {
      return users.find((user) => user.id === currentUserId);
    }
    return undefined;
  }

  return undefined;
};

const persistApiUserSession = (user?: DashboardRoleUser) => {
  if (!user) return;

  const users = readRoleUsersStore();
  const existing = users.some((item) => item.id === user.id);
  writeRoleUsersStore(existing
    ? users.map((item) => (item.id === user.id ? { ...item, ...user, password: item.password || user.password || 'password123' } : item))
    : [{ ...user, password: user.password || 'password123' }, ...users]);
  setCurrentRoleUserId(user.id);
  if (user.role === 'farmer') {
    setCurrentFarmerId(user.id);
  }
};

const buildRoleUser = (
  data: Partial<DashboardRoleUser> & { role: ManagedUserRole; name: string; email?: string; phone: string; password: string },
): DashboardRoleUser => {
  const roleCount = readRoleUsersStore().filter((user) => user.role === data.role).length + 1;
  const suffix = String(roleCount).padStart(3, '0');
  const now = new Date().toISOString();
  const baseId = `usr_${data.role.slice(0, 3)}_${suffix}`;
  const common = {
    id: data.id ?? baseId,
    name: data.name,
    nameBn: data.nameBn ?? data.name,
    email: data.email ?? '',
    phone: data.phone,
    role: data.role,
    tenantId: data.tenantId ?? 'tenant_001',
    avatar: data.avatar ?? `https://i.pravatar.cc/150?img=${(roleCount % 60) + 1}`,
    createdAt: data.createdAt ?? now,
    password: data.password,
    district: data.district ?? '',
    division: data.division ?? '',
    upazila: data.upazila ?? '',
    designation: data.designation ?? '',
    accessLabel: data.accessLabel ?? '',
  } satisfies DashboardRoleUser;

  if (data.role === 'farmer') {
    const year = new Date().getFullYear();
    return {
      ...common,
      fid: data.fid ?? `AGS-${year}-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}`,
      nidHash: data.nidHash ?? `nid_${Date.now()}`,
      landAcres: data.landAcres ?? 0,
      cropTypes: data.cropTypes ?? [],
      bkashAccount: data.bkashAccount ?? data.phone,
      accessLabel: data.accessLabel ?? 'Registered Farmer',
    };
  }

  if (data.role === 'officer') {
    return {
      ...common,
      officerId: data.officerId ?? `OFF-${suffix}`,
      specialtyTags: data.specialtyTags ?? [],
      regionDistricts: data.regionDistricts ?? (data.district ? [data.district] : []),
      designation: data.designation ?? 'Agricultural Officer',
      accessLabel: data.accessLabel ?? 'Regional Advisory Officer',
    };
  }

  if (data.role === 'vendor') {
    return {
      ...common,
      vendorId: data.vendorId ?? `VND-${suffix}`,
      companyName: data.companyName ?? data.name,
      deliveryDistricts: data.deliveryDistricts ?? (data.district ? [data.district] : []),
      designation: data.designation ?? 'Verified Vendor',
      accessLabel: data.accessLabel ?? 'Marketplace Vendor',
    };
  }

  if (data.role === 'company') {
    return {
      ...common,
      companyId: data.companyId ?? `CMP-${suffix}`,
      companyName: data.companyName ?? data.name,
      registrationNo: data.registrationNo ?? `COMP-${new Date().getFullYear()}-${suffix}`,
      cropInterests: data.cropInterests ?? [],
      designation: data.designation ?? 'Procurement Company',
      accessLabel: data.accessLabel ?? 'Crop Buyer',
    };
  }

  return {
    ...common,
    designation: data.designation ?? 'Platform Administrator',
    accessLabel: data.accessLabel ?? 'Full Platform Access',
  };
};

// ============================================================
// AUTH SERVICES
// ============================================================
export const authService = {
  async sendOTP(
    email: string,
    role?: ManagedUserRole,
    purpose: 'login' | 'registration' = 'login',
    name?: string,
  ): Promise<{ success: boolean; message: string; otpToken?: string }> {
    return apiOrMock('/auth/send-otp', async () => {
    await delay(800);
    const normalizedEmail = email.trim().toLowerCase();
    if (purpose === 'registration') {
      const exists = readRoleUsersStore().some((user) => user.email?.toLowerCase() === normalizedEmail);
      if (exists) {
        return { success: false, message: 'This email is already registered for another account.' };
      }

      const otpToken = `mock_reg_otp_${Date.now()}`;
      writeMockOtpSession({ email: normalizedEmail, role, otpToken, purpose });
      console.log(`[MOCK] Registration OTP sent to ${email}`);
      return { success: true, message: 'OTP sent successfully to email', otpToken };
    }

    const matchingUser = readRoleUsersStore().find((user) => (
      user.email?.toLowerCase() === normalizedEmail
      && (!role || user.role === role)
    ));

    if (!matchingUser) {
      return { success: false, message: role ? `No ${role} account found with this email.` : 'No account found with this email.' };
    }

    const otpToken = `mock_login_otp_${Date.now()}`;
    writeMockOtpSession({ email: normalizedEmail, role, otpToken, purpose });
    console.log(`[MOCK] Login OTP sent to ${email}`);
    return { success: true, message: 'OTP sent successfully to email', otpToken };
    }, jsonBody({ email, role, purpose, name }));
  },

  async verifyOTP(
    email: string,
    otp: string,
    role?: ManagedUserRole,
    purpose: 'login' | 'registration' = 'login',
  ): Promise<{ success: boolean; user?: DashboardRoleUser; token?: string; role?: ManagedUserRole; verifiedToken?: string }> {
    try {
      const session = readMockOtpSession();
      const result = await apiRequest<{ success: boolean; user?: DashboardRoleUser; token?: string; role?: ManagedUserRole; verifiedToken?: string }>(
        '/auth/verify-otp',
        jsonBody({ email, otp, role, purpose, otpToken: session?.otpToken }),
      );
      if (result.success) {
        if (purpose === 'registration') {
          writeMockOtpSession({
            email: email.trim().toLowerCase(),
            role,
            otpToken: result.verifiedToken || session?.otpToken || '',
            purpose,
          });
        } else {
          clearMockOtpSession();
          persistApiUserSession(result.user);
        }
      }
      return result;
    } catch (error) {
      console.warn('[API] Falling back to local mock for /auth/verify-otp:', error);
    }

    await delay(600);
    const session = readMockOtpSession();
    if (otp === '123456' && session?.otpToken && session?.purpose === purpose) {
      if (purpose === 'registration') {
        return { success: true, verifiedToken: session.otpToken, role };
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = readRoleUsersStore().find((item) => (
        item.email?.toLowerCase() === normalizedEmail
        && (!role || item.role === role)
      ));
      if (user) {
        clearMockOtpSession();
        setCurrentRoleUserId(user.id);
        if (user.role === 'farmer') {
          setCurrentFarmerId(user.id);
        }
        return { success: true, user, token: `mock_jwt_token_${user.id}`, role: user.role };
      }
    }
    return { success: false };
  },

  getCurrentFarmer(): Farmer | undefined {
    return getCurrentFarmer();
  },

  getCurrentUser(): DashboardRoleUser | undefined {
    return getCurrentRoleUser();
  },

  async adminLogin(
    email: string,
    password: string,
    role?: ManagedUserRole,
  ): Promise<{ success: boolean; role?: string; token?: string; requiresOtp?: boolean; otpToken?: string; message?: string }> {
    try {
      const result = await apiRequest<{ success: boolean; role?: string; token?: string; user?: DashboardRoleUser; message?: string }>(
        '/auth/login',
        jsonBody({ email, password, role }),
      );
      if (result.success) {
        clearMockOtpSession();
        persistApiUserSession(result.user);
      }
      return result;
    } catch (error) {
      console.warn('[API] Falling back to local mock for /auth/login:', error);
    }

    await delay(700);
    const matchedUser = readRoleUsersStore().find((user) => (
      user.email?.toLowerCase() === email.toLowerCase()
      && user.password === password
      && (!role || user.role === role)
    ));

    if (matchedUser) {
      clearMockOtpSession();
      setCurrentRoleUserId(matchedUser.id);
      if (matchedUser.role === 'farmer') {
        setCurrentFarmerId(matchedUser.id);
      }
      return { success: true, role: matchedUser.role, token: `mock_jwt_${matchedUser.role}` };
    }
    return { success: false };
  },

  async registerRoleUser(
    data: Partial<DashboardRoleUser> & { role: ManagedUserRole; name: string; email?: string; phone: string; password: string; registrationOtpToken?: string },
  ): Promise<{ success: boolean; user?: DashboardRoleUser; message?: string }> {
    try {
      const result = await apiRequest<{ success: boolean; user?: DashboardRoleUser; message?: string }>('/auth/register-role', jsonBody(data));
      if (result.success) persistApiUserSession(result.user);
      return result;
    } catch (error) {
      console.warn('[API] Falling back to local mock for /auth/register-role:', error);
    }

    await delay(900);
    const users = readRoleUsersStore();
    const normalizedEmail = data.email?.trim().toLowerCase();

    if (normalizedEmail && users.some((user) => user.email?.toLowerCase() === normalizedEmail)) {
      return { success: false, message: 'This email is already registered for another account.' };
    }

    if (data.role === 'farmer' || data.role === 'officer') {
      const session = readMockOtpSession();
      if (!data.registrationOtpToken || !session?.otpToken || session.otpToken !== data.registrationOtpToken || session.purpose !== 'registration') {
        return { success: false, message: 'Please verify the registration OTP sent to your email before submitting.' };
      }
    }

    const newUser = buildRoleUser({ ...data, email: normalizedEmail });
    writeRoleUsersStore([...users, newUser]);
    setCurrentRoleUserId(newUser.id);
    if (newUser.role === 'farmer') {
      setCurrentFarmerId(newUser.id);
    }
    clearMockOtpSession();

    return { success: true, user: newUser };
  },

  async updateRoleUser(id: string, data: Partial<DashboardRoleUser>): Promise<{ success: boolean; user?: DashboardRoleUser }> {
    await delay(500);
    const users = readRoleUsersStore();
    let updatedUser: DashboardRoleUser | undefined;

    const updatedUsers = users.map((user) => {
      if (user.id !== id) return user;
      updatedUser = { ...user, ...data, id: user.id, role: user.role, password: user.password };
      return updatedUser;
    });

    writeRoleUsersStore(updatedUsers);
    if (updatedUser) {
      setCurrentRoleUserId(updatedUser.id);
      if (updatedUser.role === 'farmer') {
        setCurrentFarmerId(updatedUser.id);
      }
    }

    return { success: Boolean(updatedUser), user: updatedUser };
  },

  async changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<{ success: boolean; message?: string }> {
    await delay(300);
    const users = readRoleUsersStore();
    const user = users.find((item) => item.id === userId);

    if (!user) return { success: false, message: 'User not found.' };
    if (user.password !== currentPassword) return { success: false, message: 'Current password is incorrect.' };

    writeRoleUsersStore(users.map((item) => (
      item.id === userId ? { ...item, password: nextPassword } : item
    )));
    return { success: true };
  },

  resetDemoData() {
    roleUsersStore = [...DEFAULT_ROLE_USERS];
    advisoryCasesStore = [...MOCK_ADVISORY_CASES];
    notificationsStore = [...MOCK_NOTIFICATIONS];
    farmersStore = [...MOCK_FARMERS];
    ordersStore = [...MOCK_ORDERS];

    if (canUseStorage()) {
      window.localStorage.setItem(ROLE_USERS_STORAGE_KEY, JSON.stringify(roleUsersStore));
      window.localStorage.setItem(ADVISORY_CASES_STORAGE_KEY, JSON.stringify(advisoryCasesStore));
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationsStore));
      window.localStorage.setItem(FARMERS_STORAGE_KEY, JSON.stringify(farmersStore));
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersStore));
      window.localStorage.removeItem(USER_SETTINGS_STORAGE_KEY);
      window.localStorage.removeItem(MOCK_OTP_SESSION_STORAGE_KEY);
      farmersStore.forEach((farmer) => window.localStorage.removeItem(getCartStorageKey(farmer.id)));
    }

    clearCurrentSession();
  },

  async quickDemoLogin(role: ManagedUserRole): Promise<{ success: boolean; role?: ManagedUserRole }> {
    this.resetDemoData();
    const credential = DEMO_CREDENTIALS[role];
    const result = await this.adminLogin(credential.email, credential.password, role);
    return { success: result.success, role: result.role as ManagedUserRole | undefined };
  },

  logout() {
    clearCurrentSession();
  },
};

// ============================================================
// FARMER SERVICES
// ============================================================
export const farmerService = {
  async getFarmers(): Promise<Farmer[]> {
    return apiOrMock('/farmers', async () => {
    await delay();
    return readFarmersStore();
    });
  },

  async getFarmerById(id: string): Promise<Farmer | undefined> {
    return apiOrMock(`/farmers?q=${encodeURIComponent(id)}`, async () => {
    await delay(300);
    return readFarmersStore().find((f) => f.id === id);
    }).then((result) => Array.isArray(result) ? result.find((farmer) => farmer.id === id || farmer.fid === id) : result);
  },

  async registerFarmer(data: Partial<Farmer> & { password?: string; registrationOtpToken?: string }): Promise<{ success: boolean; fid?: string; message?: string }> {
    const result = await authService.registerRoleUser({
      role: 'farmer',
      name: data.name ?? data.nameBn ?? 'New Farmer',
      nameBn: data.nameBn ?? data.name ?? 'নতুন কৃষক',
      email: data.email ?? '',
      phone: data.phone ?? '',
      password: data.password ?? 'password123',
      nidHash: data.nidHash ?? `mock_nid_${Date.now()}`,
      division: data.division ?? '',
      district: data.district ?? '',
      upazila: data.upazila ?? '',
      landAcres: data.landAcres ?? 0,
      cropTypes: data.cropTypes ?? [],
      bkashAccount: data.bkashAccount ?? data.phone ?? '',
      tenantId: data.tenantId ?? 'tenant_001',
      avatar: data.avatar,
      registrationOtpToken: data.registrationOtpToken,
    });

    if (result.success && result.user?.fid) {
      console.log('[MOCK] Farmer registered:', result.user);
      return { success: true, fid: result.user.fid };
    }

    return { success: false, message: result.message || 'Farmer registration failed.' };
  },

  getCurrentFarmer(): Farmer | undefined {
    return getCurrentFarmer();
  },

  async searchFarmers(query: string): Promise<Farmer[]> {
    return apiOrMock(`/farmers?q=${encodeURIComponent(query)}`, async () => {
    await delay(400);
    return readFarmersStore().filter(
      (f) =>
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        f.fid.includes(query) ||
        f.district.toLowerCase().includes(query.toLowerCase()),
    );
    });
  },
};

// ============================================================
// ADVISORY SERVICES
// ============================================================
export const advisoryService = {
  async getAdvisoryCases(farmerId?: string): Promise<AdvisoryCase[]> {
    return apiOrMock(`/advisory-cases${farmerId ? `?farmerId=${encodeURIComponent(farmerId)}` : ''}`, async () => {
    await delay();
    const cases = readAdvisoryCasesStore();
    if (farmerId) return cases.filter((c) => c.farmerId === farmerId);
    return cases;
    });
  },

  async getAdvisoryById(id: string): Promise<AdvisoryCase | undefined> {
    return apiOrMock('/advisory-cases', async () => {
    await delay(300);
    return readAdvisoryCasesStore().find((c) => c.id === id);
    }).then((result) => Array.isArray(result) ? result.find((item) => item.id === id) : result);
  },

  async submitAdvisory(data: {
    farmerId: string;
    cropType: string;
    description: string;
    photos: string[];
  }): Promise<{ success: boolean; caseId?: string }> {
    try {
      return await apiRequest<{ success: boolean; caseId?: string }>('/advisory-cases', jsonBody(data));
    } catch (error) {
      console.warn('[API] Falling back to local mock for /advisory-cases:', error);
    }

    await delay(1200);
    const year = new Date().getFullYear();
    const caseId = `ADV-${year}-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}`;
    const farmer = readFarmersStore().find((item) => item.id === data.farmerId);
    const newCase: AdvisoryCase = {
      id: caseId,
      farmerId: data.farmerId,
      farmerName: farmer?.name ?? 'Farmer',
      farmerDistrict: farmer?.district ?? '',
      cropType: data.cropType,
      description: data.description,
      photos: data.photos,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    writeAdvisoryCasesStore([newCase, ...readAdvisoryCasesStore()]);

    addNotification({
      id: `notif_${Date.now()}`,
      userId: data.farmerId,
      type: 'advisory',
      title: 'Advisory Submitted',
      message: `Your advisory case ${caseId} has been submitted and is now waiting for officer review.`,
      channel: ['push', 'email'],
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true, caseId };
  },

  async respondToCase(caseId: string, response: string, officerId: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/advisory-cases/${encodeURIComponent(caseId)}/respond`, jsonBody({ response, officerId }));
    } catch (error) {
      console.warn('[API] Falling back to local mock for advisory response:', error);
    }

    await delay(800);
    const officer = readRoleUsersStore().find((user) => user.id === officerId || user.officerId === officerId);
    let farmerId = '';

    const updatedCases = readAdvisoryCasesStore().map((item) => {
      if (item.id !== caseId) return item;
      farmerId = item.farmerId;
      return {
        ...item,
        status: 'responded' as const,
        officerId: officer?.id ?? officerId,
        officerName: officer?.name ?? 'Officer',
        officerResponse: response,
        respondedAt: new Date().toISOString(),
      };
    });

    writeAdvisoryCasesStore(updatedCases);

    if (farmerId) {
      addNotification({
        id: `notif_${Date.now()}`,
        userId: farmerId,
        type: 'advisory',
        title: 'Officer Response Received',
        message: `An officer has responded to your advisory case ${caseId}. Open Crop Advisory to see the full response.`,
        channel: ['push', 'sms'],
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },

  async getOfficerCases(officerId: string): Promise<AdvisoryCase[]> {
    return apiOrMock('/advisory-cases', async () => {
    await delay();
    return readAdvisoryCasesStore().filter((c) => c.officerId === officerId || c.status === 'pending' || c.status === 'assigned' || c.status === 'ai_analyzed');
    }).then((cases) => cases.filter((c) => c.officerId === officerId || c.status === 'pending' || c.status === 'assigned' || c.status === 'ai_analyzed'));
  },
};

// ============================================================
// PRODUCT / MARKETPLACE SERVICES
// ============================================================
export const productService = {
  async getProducts(category?: string, vendorId?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (vendorId) params.set('vendorId', vendorId);
    return apiOrMock(`/products${params.toString() ? `?${params}` : ''}`, async () => {
    await delay();
    let products = readProductsStore();
    if (category) products = products.filter((p) => p.category === category);
    if (vendorId) products = products.filter((p) => p.vendorId === vendorId);
    return products;
    });
  },

  async getPublicProducts(category?: string): Promise<Product[]> {
    return apiOrMock(`/products${category ? `?category=${encodeURIComponent(category)}` : ''}`, async () => {
    await delay();
    let products = readMarketplaceProducts();
    if (category) products = products.filter((p) => p.category === category);
    return products;
    });
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return apiOrMock('/products', async () => {
    await delay(300);
    return readProductsStore().find((p) => p.id === id);
    }).then((result) => Array.isArray(result) ? result.find((item) => item.id === id) : result);
  },

  async getRecommendedProducts(diagnosis?: string): Promise<Product[]> {
    return apiOrMock('/products', async () => {
    await delay(600);
    return readProductsStore().filter((p) => p.isRecommended).slice(0, 3);
    }).then((products) => products.filter((p) => p.isRecommended).slice(0, 3));
  },

  async searchProducts(query: string): Promise<Product[]> {
    return apiOrMock('/products', async () => {
    await delay(400);
    return readProductsStore().filter(
      (p) =>
        p.nameEn.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()),
    );
    }).then((products) => products.filter(
      (p) =>
        p.nameEn.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()),
    ));
  },

  async createProduct(data: Omit<Product, 'id' | 'rating' | 'reviewCount'> & Partial<Pick<Product, 'rating' | 'reviewCount'>>): Promise<{ success: boolean; productId: string }> {
    try {
      return await apiRequest<{ success: boolean; productId: string }>('/products', jsonBody(data));
    } catch (error) {
      console.warn('[API] Falling back to local mock for product creation:', error);
    }

    await delay(500);
    const productId = `prod_${String(Date.now()).slice(-6)}`;
    const nextProduct: Product = {
      ...data,
      id: productId,
      rating: data.rating ?? 4.5,
      reviewCount: data.reviewCount ?? 0,
    };

    writeProductsStore([nextProduct, ...readProductsStore()]);
    return { success: true, productId };
  },

  async updateProduct(productId: string, data: Partial<Product>): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/products/${encodeURIComponent(productId)}`, { method: 'PATCH', body: JSON.stringify(data) });
    } catch (error) {
      console.warn('[API] Falling back to local mock for product update:', error);
    }

    await delay(400);
    const products = readProductsStore().map((product) => (
      product.id === productId ? { ...product, ...data, id: product.id } : product
    ));
    writeProductsStore(products);
    return { success: true };
  },

  async deleteProduct(productId: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
    } catch (error) {
      console.warn('[API] Falling back to local mock for product delete:', error);
    }

    await delay(300);
    writeProductsStore(readProductsStore().filter((product) => product.id !== productId));
    return { success: true };
  },

  async updateStock(productId: string, stockQty: number): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/products/${encodeURIComponent(productId)}`, { method: 'PATCH', body: JSON.stringify({ stockQty }) });
    } catch (error) {
      console.warn('[API] Falling back to local mock for stock update:', error);
    }

    await delay(250);
    const products = readProductsStore().map((product) => (
      product.id === productId ? { ...product, stockQty } : product
    ));
    writeProductsStore(products);
    return { success: true };
  },
};

// ============================================================
// ORDER SERVICES
// ============================================================
export const orderService = {
  async getOrders(farmerId?: string): Promise<Order[]> {
    return apiOrMock(`/orders${farmerId ? `?farmerId=${encodeURIComponent(farmerId)}` : ''}`, async () => {
    await delay();
    const orders = readOrdersStore();
    if (farmerId) return orders.filter((o) => o.farmerId === farmerId);
    return orders;
    });
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    return apiOrMock('/orders', async () => {
    await delay(300);
    return readOrdersStore().find((o) => o.id === id);
    }).then((result) => Array.isArray(result) ? result.find((item) => item.id === id) : result);
  },

  async placeOrder(data: {
    farmerId: string;
    items: { productId: string; quantity: number }[];
    paymentGateway: 'bkash' | 'nagad' | 'cod' | 'stripe';
  }): Promise<{ success: boolean; orderId?: string; message?: string }> {
    try {
      return await apiRequest<{ success: boolean; orderId?: string; message?: string }>('/orders', jsonBody(data));
    } catch (error) {
      console.warn('[API] Falling back to local mock for order placement:', error);
    }

    await delay(1500);
    if (data.items.length === 0) {
      return { success: false, message: 'Cart is empty.' };
    }

    const farmer = readFarmersStore().find((item) => item.id === data.farmerId);
    const products = data.items
      .map((item) => {
        const product = readProductsStore().find((productItem) => productItem.id === item.productId);
        return product ? { item, product } : null;
      })
      .filter(Boolean) as { item: { productId: string; quantity: number }; product: Product }[];

    if (products.length !== data.items.length) {
      return { success: false, message: 'Some cart items are unavailable.' };
    }

    const vendorId = products[0].product.vendorId;
    const vendorName = products[0].product.vendorName;
    const mixedVendor = products.some(({ product }) => product.vendorId !== vendorId);
    if (mixedVendor) {
      return { success: false, message: 'Please checkout products from one vendor at a time.' };
    }

    const year = new Date().getFullYear();
    const orderId = `ORD-${year}-${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`;
    const totalAmount = products.reduce((sum, { item, product }) => sum + (product.price * item.quantity), 0);
    const estimatedDays = Math.max(...products.map(({ product }) => product.estimatedDeliveryDays));
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + estimatedDays);

    const newOrder: Order = {
      id: orderId,
      farmerId: data.farmerId,
      farmerName: farmer?.name ?? 'Farmer',
      vendorId,
      vendorName,
      items: products.map(({ item, product }) => ({
        productId: product.id,
        productName: product.nameEn,
        quantity: item.quantity,
        price: product.price,
        unit: product.unit,
      })),
      totalAmount,
      status: data.paymentGateway === 'cod' ? 'pending' : 'confirmed',
      paymentGateway: data.paymentGateway,
      paymentStatus: data.paymentGateway === 'cod' ? 'pending' : 'paid',
      placedAt: new Date().toISOString(),
      estimatedDelivery: estimatedDeliveryDate.toISOString().slice(0, 10),
    };

    writeOrdersStore([newOrder, ...readOrdersStore()]);
    writeProductsStore(readProductsStore().map((product) => {
      const purchasedItem = products.find(({ product: itemProduct }) => itemProduct.id === product.id);
      if (!purchasedItem) return product;
      return {
        ...product,
        stockQty: Math.max(product.stockQty - purchasedItem.item.quantity, 0),
      };
    }));
    writeCartStore(data.farmerId, []);

    addNotification({
      id: `notif_${Date.now()}`,
      userId: data.farmerId,
      type: 'order',
      title: 'Order Placed Successfully',
      message: `Order ${orderId} has been placed via ${data.paymentGateway.toUpperCase()}. Estimated delivery: ${newOrder.estimatedDelivery}.`,
      channel: ['push', 'sms'],
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true, orderId };
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/orders/${encodeURIComponent(orderId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    } catch (error) {
      console.warn('[API] Falling back to local mock for order status:', error);
    }

    await delay(500);
    const orders = readOrdersStore().map((order) => (
      order.id === orderId
        ? {
          ...order,
          status,
          deliveredAt: status === 'delivered' ? new Date().toISOString() : order.deliveredAt,
        }
        : order
    ));
    writeOrdersStore(orders);
    return { success: true };
  },
};

export const cartService = {
  async getCart(farmerId: string): Promise<{ product: Product; quantity: number }[]> {
    return apiOrMock(`/farmers/${encodeURIComponent(farmerId)}/cart`, async () => {
    await delay(150);
    return readCartStore(farmerId)
      .map((item) => {
        const product = readProductsStore().find((productEntry) => productEntry.id === item.productId);
        return product ? { product, quantity: item.quantity } : null;
      })
      .filter(Boolean) as { product: Product; quantity: number }[];
    });
  },

  async addToCart(farmerId: string, productId: string, quantity = 1): Promise<{ success: boolean; message?: string }> {
    try {
      return await apiRequest<{ success: boolean; message?: string }>(`/farmers/${encodeURIComponent(farmerId)}/cart`, jsonBody({ productId, quantity }));
    } catch (error) {
      console.warn('[API] Falling back to local mock for add to cart:', error);
    }

    await delay(150);
    const product = readProductsStore().find((item) => item.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found.' };
    }

    const cart = readCartStore(farmerId);
    const existingProducts = cart
      .map((item) => readProductsStore().find((productItem) => productItem.id === item.productId))
      .filter(Boolean) as Product[];

    if (existingProducts.length > 0 && existingProducts.some((item) => item.vendorId !== product.vendorId)) {
      return { success: false, message: 'Cart currently supports one vendor at a time. Clear cart or checkout first.' };
    }

    const existingItem = cart.find((item) => item.productId === productId);
    const nextCart = existingItem
      ? cart.map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item))
      : [...cart, { productId, quantity }];

    writeCartStore(farmerId, nextCart);
    return { success: true };
  },

  async updateCartItem(farmerId: string, productId: string, quantity: number): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/farmers/${encodeURIComponent(farmerId)}/cart/${encodeURIComponent(productId)}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
    } catch (error) {
      console.warn('[API] Falling back to local mock for cart update:', error);
    }

    await delay(100);
    const cart = readCartStore(farmerId);
    const nextCart = quantity <= 0
      ? cart.filter((item) => item.productId !== productId)
      : cart.map((item) => (item.productId === productId ? { ...item, quantity } : item));
    writeCartStore(farmerId, nextCart);
    return { success: true };
  },

  async removeCartItem(farmerId: string, productId: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/farmers/${encodeURIComponent(farmerId)}/cart/${encodeURIComponent(productId)}`, { method: 'PATCH', body: JSON.stringify({ quantity: 0 }) });
    } catch (error) {
      console.warn('[API] Falling back to local mock for cart remove:', error);
    }

    await delay(100);
    writeCartStore(farmerId, readCartStore(farmerId).filter((item) => item.productId !== productId));
    return { success: true };
  },

  async clearCart(farmerId: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/farmers/${encodeURIComponent(farmerId)}/cart`, { method: 'DELETE' });
    } catch (error) {
      console.warn('[API] Falling back to local mock for cart clear:', error);
    }

    await delay(100);
    writeCartStore(farmerId, []);
    return { success: true };
  },
};

export const userSettingsService = {
  async getSettings(userId: string) {
    return apiOrMock(`/settings/${encodeURIComponent(userId)}`, async () => {
    await delay(150);
    const store = readUserSettingsStore();
    return store[userId] || {
      emailNotifications: true,
      pushNotifications: true,
      outbreakWarnings: true,
      urgentAdvisory: true,
      newCaseAlert: true,
    };
    });
  },

  async updateSettings(userId: string, settings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    outbreakWarnings: boolean;
    urgentAdvisory: boolean;
    newCaseAlert: boolean;
  }) {
    try {
      return await apiRequest<{ success: boolean }>(`/settings/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify(settings) });
    } catch (error) {
      console.warn('[API] Falling back to local mock for user settings:', error);
    }

    await delay(150);
    const store = readUserSettingsStore();
    writeUserSettingsStore({ ...store, [userId]: settings });
    return { success: true };
  },
};

// ============================================================
// CROP LISTING SERVICES
// ============================================================
export const cropService = {
  async getCropListings(farmerId?: string): Promise<CropListing[]> {
    return apiOrMock(`/crop-listings${farmerId ? `?farmerId=${encodeURIComponent(farmerId)}` : ''}`, async () => {
    await delay();
    const listings = readCropListingsStore();
    if (farmerId) return listings.filter((l) => l.farmerId === farmerId);
    return listings;
    });
  },

  async createCropListing(data: Partial<CropListing>): Promise<{ success: boolean; listingId?: string }> {
    try {
      return await apiRequest<{ success: boolean; listingId?: string }>('/crop-listings', jsonBody(data));
    } catch (error) {
      console.warn('[API] Falling back to local mock for crop listing creation:', error);
    }

    await delay(1000);
    const listingId = `CRP-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;
    const nextListing: CropListing = {
      id: listingId,
      farmerId: data.farmerId || 'unknown_farmer',
      farmerName: data.farmerName || 'Farmer',
      farmerDistrict: data.farmerDistrict || data.district || '',
      productCategory: data.productCategory || 'Fresh Vegetables',
      cropType: data.cropType || 'Rice (Aman)',
      variety: data.variety || 'Standard',
      quantityKg: data.quantityKg || 0,
      qualityGrade: data.qualityGrade || 'A',
      askingPrice: data.askingPrice || 0,
      harvestDate: data.harvestDate || new Date().toISOString().slice(0, 10),
      district: data.district || '',
      upazila: data.upazila || '',
      photos: data.photos || ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80'],
      status: data.status || 'active',
      createdAt: data.createdAt || new Date().toISOString(),
      matchedCompanyId: data.matchedCompanyId,
    };
    writeCropListingsStore([nextListing, ...readCropListingsStore()]);
    return { success: true, listingId };
  },

  async searchCropListings(filters: {
    cropType?: string;
    district?: string;
    minQty?: number;
    grade?: string;
  }): Promise<CropListing[]> {
    return apiOrMock('/crop-listings', async () => {
    await delay(600);
    let results = readCropListingsStore();
    if (filters.cropType) results = results.filter((l) => l.cropType === filters.cropType);
    if (filters.district) results = results.filter((l) => l.district === filters.district);
    if (filters.grade) results = results.filter((l) => l.qualityGrade === filters.grade);
    return results;
    }).then((listings) => {
      let results = listings;
      if (filters.cropType) results = results.filter((l) => l.cropType === filters.cropType);
      if (filters.district) results = results.filter((l) => l.district === filters.district);
      if (filters.grade) results = results.filter((l) => l.qualityGrade === filters.grade);
      if (filters.minQty) results = results.filter((l) => l.quantityKg >= filters.minQty!);
      return results;
    });
  },

  async expressInterest(data: {
    listingId: string;
    companyId: string;
    companyName: string;
  }): Promise<{ success: boolean; matchId?: string; message?: string }> {
    try {
      return await apiRequest<{ success: boolean; matchId?: string; message?: string }>('/crop-deals/interest', jsonBody(data));
    } catch (error) {
      console.warn('[API] Falling back to local mock for crop interest:', error);
    }

    await delay(500);
    const listing = readCropListingsStore().find((item) => item.id === data.listingId);
    if (!listing) return { success: false, message: 'Listing not found.' };

    const existing = readCropDealsStore().find((deal) => deal.listingId === data.listingId && deal.companyId === data.companyId);
    if (existing) return { success: true, matchId: existing.id, message: 'Interest already sent.' };

    const matchId = `deal_${String(Date.now()).slice(-6)}`;
    const nextDeal: CropDeal = {
      id: matchId,
      listingId: listing.id,
      companyId: data.companyId,
      companyName: data.companyName,
      farmerId: listing.farmerId,
      farmerName: listing.farmerName,
      agreedPrice: listing.askingPrice,
      quantityKg: listing.quantityKg,
      commissionPct: 3,
      commissionAmt: Math.round(listing.askingPrice * listing.quantityKg * 0.03),
      status: 'pending',
    };

    writeCropDealsStore([nextDeal, ...readCropDealsStore()]);
    writeCropListingsStore(readCropListingsStore().map((item) => (
      item.id === listing.id ? { ...item, status: 'matched', matchedCompanyId: data.companyId } : item
    )));

    addNotification({
      id: `notif_${Date.now()}`,
      userId: data.companyId,
      type: 'system',
      title: 'Interest Sent',
      message: `Interest sent for ${listing.cropType} listing ${listing.id}. Farmer connection is now in deal stage.`,
      channel: ['push', 'email'],
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true, matchId };
  },

  async getCompanyMatches(companyId: string): Promise<CropDeal[]> {
    return apiOrMock(`/crop-deals?companyId=${encodeURIComponent(companyId)}`, async () => {
    await delay(300);
    return readCropDealsStore().filter((deal) => deal.companyId === companyId);
    });
  },

  async updateDealStatus(dealId: string, status: CropDeal['status']): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/crop-deals/${encodeURIComponent(dealId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    } catch (error) {
      console.warn('[API] Falling back to local mock for deal status:', error);
    }

    await delay(300);
    writeCropDealsStore(readCropDealsStore().map((deal) => (
      deal.id === dealId
        ? {
          ...deal,
          status,
          confirmedAt: status === 'confirmed' ? new Date().toISOString() : deal.confirmedAt,
        }
        : deal
    )));
    return { success: true };
  },
};

// ============================================================
// PRICE TRACKING SERVICES
// ============================================================
export const priceService = {
  async getCropPrices(): Promise<CropPrice[]> {
    return apiOrMock('/crop-prices', async () => {
    await delay(600);
    return MOCK_CROP_PRICES;
    });
  },

  async getCropPriceByType(cropType: string): Promise<CropPrice | undefined> {
    return apiOrMock('/crop-prices', async () => {
    await delay(300);
    return MOCK_CROP_PRICES.find((p) => p.cropType === cropType);
    }).then((result) => Array.isArray(result) ? result.find((price) => price.cropType === cropType) : result);
  },

  async subscribeToPriceAlert(farmerId: string, cropType: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>('/price-alerts', jsonBody({ farmerId, cropType }));
    } catch (error) {
      console.warn('[API] Falling back to local mock for price alert:', error);
    }

    await delay(500);
    console.log('[MOCK] Price alert subscribed:', { farmerId, cropType });
    return { success: true };
  },
};

// ============================================================
// WEATHER SERVICES
// ============================================================
export const weatherService = {
  async getWeatherForecast(district: string, upazila?: string): Promise<WeatherForecast> {
    try {
      const params = new URLSearchParams({ district });
      if (upazila) params.set('upazila', upazila);

      return await apiRequest<WeatherForecast>(`/weather?${params.toString()}`);
    } catch (error) {
      console.warn('[WEATHER] Falling back to Open-Meteo / mock forecast:', error);

      try {
        return await fetchOpenMeteoForecast(upazila ? `${upazila}, ${district}` : district);
      } catch (fallbackError) {
        console.warn('[WEATHER] Falling back to local mock forecast:', fallbackError);
        await delay(300);
        return toWeatherFallback(district);
      }
    }
  },
};

// ============================================================
// NOTIFICATION SERVICES
// ============================================================
export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    return apiOrMock(`/notifications/${encodeURIComponent(userId)}`, async () => {
    await delay(400);
    return readNotificationsStore().filter((n) => n.userId === userId);
    });
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' });
    } catch (error) {
      console.warn('[API] Falling back to local mock for notification read:', error);
    }

    await delay(200);
    const notifications = readNotificationsStore().map((notification) => (
      notification.id === notificationId ? { ...notification, isRead: true } : notification
    ));
    writeNotificationsStore(notifications);
    return { success: true };
  },

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/notifications/user/${encodeURIComponent(userId)}/read-all`, { method: 'PATCH' });
    } catch (error) {
      console.warn('[API] Falling back to local mock for notifications read all:', error);
    }

    await delay(300);
    const notifications = readNotificationsStore().map((notification) => (
      notification.userId === userId ? { ...notification, isRead: true } : notification
    ));
    writeNotificationsStore(notifications);
    return { success: true };
  },
};

// ============================================================
// BLOG SERVICES
// ============================================================
export const blogService = {
  async getBlogPosts(): Promise<BlogPost[]> {
    await delay(500);
    return MOCK_BLOG_POSTS;
  },

  async getBlogById(id: string): Promise<BlogPost | undefined> {
    await delay(300);
    return MOCK_BLOG_POSTS.find((b) => b.id === id);
  },
};

// ============================================================
// TESTIMONIAL SERVICES
// ============================================================
export const testimonialService = {
  async getTestimonials(): Promise<Testimonial[]> {
    await delay(400);
    return MOCK_TESTIMONIALS;
  },
};

// ============================================================
// ADMIN SERVICES
// ============================================================
export const adminService = {
  async getStats(): Promise<AdminStats> {
    return apiOrMock('/admin/stats', async () => {
    await delay(600);
    const farmers = readFarmersStore();
    const officers = readRoleUsersStore().filter((user) => user.role === 'officer');
    const vendors = Array.from(new Set(readProductsStore().map((product) => product.vendorId)));
    const cases = readAdvisoryCasesStore();
    const tenants = readTenantsStore();
    return {
      totalFarmers: farmers.length,
      totalOfficers: officers.length,
      totalVendors: vendors.length,
      totalAdvisories: cases.length,
      activeAdvisories: cases.filter((item) => item.status !== 'closed' && item.status !== 'responded').length,
      mrr: tenants.reduce((sum, tenant) => sum + tenant.mrr, 0),
      uptime: MOCK_ADMIN_STATS.uptime,
      advisoryDeliveryRate: MOCK_ADMIN_STATS.advisoryDeliveryRate,
    };
    });
  },

  async getTenants(): Promise<Tenant[]> {
    return apiOrMock('/admin/tenants', async () => {
    await delay(500);
    return readTenantsStore();
    });
  },

  async getOfficers(): Promise<Officer[]> {
    return apiOrMock('/users?role=officer', async () => {
    await delay(400);
    const meta = readJsonRecord<{
      active: boolean;
      assignedRegion: string;
    }>(ADMIN_OFFICER_META_STORAGE_KEY);

    return MOCK_OFFICERS.map((officer) => ({
      ...officer,
      availabilityStatus: meta[officer.id]?.active === false ? 'offline' : officer.availabilityStatus,
      regionDistricts: meta[officer.id]?.assignedRegion
        ? meta[officer.id].assignedRegion.split(',').map((item) => item.trim()).filter(Boolean)
        : officer.regionDistricts,
    }));
    });
  },

  async createTenant(data: {
    name: string;
    subdomain: string;
    planTier: Tenant['planTier'];
  }): Promise<{ success: boolean; tenantId: string }> {
    try {
      return await apiRequest<{ success: boolean; tenantId: string }>('/admin/tenants', jsonBody(data));
    } catch (error) {
      console.warn('[API] Falling back to local mock for tenant creation:', error);
    }

    await delay(400);
    const tenantId = `tenant_${String(Date.now()).slice(-3)}`;
    const priceMap: Record<Tenant['planTier'], number> = {
      basic: 999,
      standard: 2999,
      professional: 5999,
      enterprise: 0,
    };
    const nextTenant: Tenant = {
      id: tenantId,
      name: data.name,
      subdomain: data.subdomain,
      planTier: data.planTier,
      adminUserId: 'usr_adm_001',
      status: 'trial',
      farmerCount: 0,
      createdAt: new Date().toISOString(),
      mrr: priceMap[data.planTier],
    };
    writeTenantsStore([nextTenant, ...readTenantsStore()]);
    addAuditLog({ entity: 'tenant', action: 'create', actor: 'Super Admin', details: `Created tenant ${data.name}.` });
    return { success: true, tenantId };
  },

  async updateTenant(tenantId: string, data: Partial<Tenant>): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/admin/tenants/${encodeURIComponent(tenantId)}`, { method: 'PATCH', body: JSON.stringify(data) });
    } catch (error) {
      console.warn('[API] Falling back to local mock for tenant update:', error);
    }

    await delay(300);
    writeTenantsStore(readTenantsStore().map((tenant) => (
      tenant.id === tenantId ? { ...tenant, ...data, id: tenant.id } : tenant
    )));
    addAuditLog({ entity: 'tenant', action: 'update', actor: 'Super Admin', details: `Updated tenant ${tenantId}.` });
    return { success: true };
  },

  async setTenantStatus(tenantId: string, status: Tenant['status']): Promise<{ success: boolean }> {
    return this.updateTenant(tenantId, { status });
  },

  async getAdminFarmers(): Promise<(Farmer & { verified: boolean; blocked: boolean })[]> {
    return apiOrMock('/farmers', async () => {
    await delay(300);
    const meta = readJsonRecord<{ verified: boolean; blocked: boolean }>(ADMIN_FARMER_META_STORAGE_KEY);
    return readFarmersStore().map((farmer) => ({
      ...farmer,
      verified: meta[farmer.id]?.verified ?? false,
      blocked: meta[farmer.id]?.blocked ?? false,
    }));
    }).then((farmers) => farmers.map((farmer) => ({
      ...farmer,
      verified: Boolean((farmer as Farmer & { verified?: boolean }).verified),
      blocked: Boolean((farmer as Farmer & { blocked?: boolean }).blocked),
    })));
  },

  async updateFarmerAdminState(farmerId: string, data: Partial<{ verified: boolean; blocked: boolean }>): Promise<{ success: boolean }> {
    await delay(250);
    const meta = readJsonRecord<{ verified: boolean; blocked: boolean }>(ADMIN_FARMER_META_STORAGE_KEY);
    writeJsonRecord(ADMIN_FARMER_META_STORAGE_KEY, {
      ...meta,
      [farmerId]: {
        verified: data.verified ?? meta[farmerId]?.verified ?? false,
        blocked: data.blocked ?? meta[farmerId]?.blocked ?? false,
      },
    });
    addAuditLog({ entity: 'farmer', action: 'moderate', actor: 'Super Admin', details: `Updated farmer ${farmerId} moderation state.` });
    return { success: true };
  },

  async addOfficer(data: {
    name: string;
    email: string;
    phone: string;
    region: string;
  }): Promise<{ success: boolean; officerId: string }> {
    try {
      const result = await apiRequest<{ success: boolean; user?: DashboardRoleUser }>('/auth/register-role', jsonBody({
        role: 'officer',
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: 'password123',
        district: data.region.split(',')[0]?.trim() || '',
        regionDistricts: data.region.split(',').map((item) => item.trim()).filter(Boolean),
      }));
      return { success: result.success, officerId: result.user?.id || '' };
    } catch (error) {
      console.warn('[API] Falling back to local mock for officer creation:', error);
    }

    await delay(350);
    const created = buildRoleUser({
      role: 'officer',
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: 'password123',
      district: data.region.split(',')[0]?.trim() || '',
      regionDistricts: data.region.split(',').map((item) => item.trim()).filter(Boolean),
    });
    writeRoleUsersStore([created, ...readRoleUsersStore()]);
    addAuditLog({ entity: 'officer', action: 'create', actor: 'Super Admin', details: `Added officer ${data.name}.` });
    return { success: true, officerId: created.id };
  },

  async updateOfficerAdminState(officerId: string, data: Partial<{ active: boolean; assignedRegion: string }>): Promise<{ success: boolean }> {
    await delay(250);
    const meta = readJsonRecord<{ active: boolean; assignedRegion: string }>(ADMIN_OFFICER_META_STORAGE_KEY);
    writeJsonRecord(ADMIN_OFFICER_META_STORAGE_KEY, {
      ...meta,
      [officerId]: {
        active: data.active ?? meta[officerId]?.active ?? true,
        assignedRegion: data.assignedRegion ?? meta[officerId]?.assignedRegion ?? '',
      },
    });
    addAuditLog({ entity: 'officer', action: 'update', actor: 'Super Admin', details: `Updated officer ${officerId}.` });
    return { success: true };
  },

  async getAdminVendors(): Promise<Array<{
    vendorId: string;
    vendorName: string;
    productCount: number;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
  }>> {
    try {
      const products = await apiRequest<Product[]>('/products');
      return Array.from(new Set(products.map((product) => product.vendorId))).map((vendorId) => {
        const vendorProducts = products.filter((product) => product.vendorId === vendorId);
        return {
          vendorId,
          vendorName: vendorProducts[0]?.vendorName || vendorId,
          productCount: vendorProducts.length,
          status: 'approved',
        };
      });
    } catch (error) {
      console.warn('[API] Falling back to local mock for admin vendors:', error);
    }

    await delay(250);
    const products = readProductsStore();
    const meta = readJsonRecord<{ status: 'pending' | 'approved' | 'rejected' | 'suspended' }>(ADMIN_VENDOR_META_STORAGE_KEY);
    return Array.from(new Set(products.map((product) => product.vendorId))).map((vendorId) => {
      const vendorProducts = products.filter((product) => product.vendorId === vendorId);
      return {
        vendorId,
        vendorName: vendorProducts[0]?.vendorName || vendorId,
        productCount: vendorProducts.length,
        status: meta[vendorId]?.status ?? 'pending',
      };
    });
  },

  async updateVendorStatus(vendorId: string, status: 'pending' | 'approved' | 'rejected' | 'suspended'): Promise<{ success: boolean }> {
    await delay(250);
    const meta = readJsonRecord<{ status: 'pending' | 'approved' | 'rejected' | 'suspended' }>(ADMIN_VENDOR_META_STORAGE_KEY);
    writeJsonRecord(ADMIN_VENDOR_META_STORAGE_KEY, {
      ...meta,
      [vendorId]: { status },
    });
    addAuditLog({ entity: 'vendor', action: 'moderate', actor: 'Super Admin', details: `Changed vendor ${vendorId} status to ${status}.` });
    return { success: true };
  },

  async getAdminCases(): Promise<Array<AdvisoryCase & { internalNote?: string; overriddenDiagnosis?: string }>> {
    return apiOrMock('/advisory-cases', async () => {
    await delay(250);
    const meta = readJsonRecord<{ internalNote?: string; overriddenDiagnosis?: string }>(ADMIN_CASE_META_STORAGE_KEY);
    return readAdvisoryCasesStore().map((item) => ({
      ...item,
      internalNote: meta[item.id]?.internalNote,
      overriddenDiagnosis: meta[item.id]?.overriddenDiagnosis,
    }));
    });
  },

  async updateCaseAdminState(caseId: string, data: Partial<{ status: AdvisoryCase['status']; officerId: string; officerName: string; internalNote: string; overriddenDiagnosis: string }>): Promise<{ success: boolean }> {
    await delay(300);
    if (data.status || data.officerId || data.officerName) {
      writeAdvisoryCasesStore(readAdvisoryCasesStore().map((item) => (
        item.id === caseId ? { ...item, ...data } : item
      )));
    }

    if (data.internalNote != null || data.overriddenDiagnosis != null) {
      const meta = readJsonRecord<{ internalNote?: string; overriddenDiagnosis?: string }>(ADMIN_CASE_META_STORAGE_KEY);
      writeJsonRecord(ADMIN_CASE_META_STORAGE_KEY, {
        ...meta,
        [caseId]: {
          internalNote: data.internalNote ?? meta[caseId]?.internalNote,
          overriddenDiagnosis: data.overriddenDiagnosis ?? meta[caseId]?.overriddenDiagnosis,
        },
      });
    }

    addAuditLog({ entity: 'case', action: 'override', actor: 'Super Admin', details: `Updated advisory case ${caseId}.` });
    return { success: true };
  },

  async globalSearch(query: string): Promise<Array<{ id: string; type: string; label: string; href: string }>> {
    try {
      const [farmers, users, tenants, cases] = await Promise.all([
        apiRequest<Farmer[]>('/farmers'),
        apiRequest<DashboardRoleUser[]>('/users'),
        apiRequest<Tenant[]>('/admin/tenants'),
        apiRequest<AdvisoryCase[]>('/advisory-cases'),
      ]);
      const q = query.toLowerCase();
      if (!q) return [];
      return [
        ...farmers
          .filter((farmer) => `${farmer.name} ${farmer.fid} ${farmer.district}`.toLowerCase().includes(q))
          .map((farmer) => ({ id: farmer.id, type: 'farmer', label: `${farmer.name} · ${farmer.fid}`, href: '/dashboard/admin/farmers' })),
        ...users
          .filter((user) => user.role === 'officer' && `${user.name} ${user.officerId || ''} ${user.district || ''}`.toLowerCase().includes(q))
          .map((user) => ({ id: user.id, type: 'officer', label: `${user.name} · ${user.officerId || 'Officer'}`, href: '/dashboard/admin/officers' })),
        ...tenants
          .filter((tenant) => `${tenant.name} ${tenant.subdomain}`.toLowerCase().includes(q))
          .map((tenant) => ({ id: tenant.id, type: 'tenant', label: `${tenant.name} · ${tenant.subdomain}`, href: '/dashboard/admin/tenants' })),
        ...cases
          .filter((item) => `${item.id} ${item.farmerName} ${item.cropType}`.toLowerCase().includes(q))
          .map((item) => ({ id: item.id, type: 'case', label: `${item.id} · ${item.cropType}`, href: '/dashboard/admin/advisory' })),
      ].slice(0, 10);
    } catch (error) {
      console.warn('[API] Falling back to local mock for global search:', error);
    }

    await delay(200);
    const q = query.toLowerCase();
    if (!q) return [];

    const farmers = readFarmersStore()
      .filter((farmer) => `${farmer.name} ${farmer.fid} ${farmer.district}`.toLowerCase().includes(q))
      .map((farmer) => ({ id: farmer.id, type: 'farmer', label: `${farmer.name} · ${farmer.fid}`, href: '/dashboard/admin/farmers' }));
    const officers = readRoleUsersStore()
      .filter((user) => user.role === 'officer' && `${user.name} ${user.officerId || ''} ${user.district || ''}`.toLowerCase().includes(q))
      .map((user) => ({ id: user.id, type: 'officer', label: `${user.name} · ${user.officerId || 'Officer'}`, href: '/dashboard/admin/officers' }));
    const tenants = readTenantsStore()
      .filter((tenant) => `${tenant.name} ${tenant.subdomain}`.toLowerCase().includes(q))
      .map((tenant) => ({ id: tenant.id, type: 'tenant', label: `${tenant.name} · ${tenant.subdomain}`, href: '/dashboard/admin/tenants' }));
    const cases = readAdvisoryCasesStore()
      .filter((item) => `${item.id} ${item.farmerName} ${item.cropType}`.toLowerCase().includes(q))
      .map((item) => ({ id: item.id, type: 'case', label: `${item.id} · ${item.cropType}`, href: '/dashboard/admin/advisory' }));

    return [...farmers, ...officers, ...tenants, ...cases].slice(0, 10);
  },

  async getAuditLogs(): Promise<Array<{ id: string; entity: string; action: string; actor: string; details: string; createdAt: string }>> {
    return apiOrMock('/admin/audit-logs', async () => {
    await delay(200);
    return readJsonArray(ADMIN_AUDIT_LOG_STORAGE_KEY, [
      {
        id: 'audit_001',
        entity: 'tenant',
        action: 'create',
        actor: 'Super Admin',
        details: 'Created Mymensingh Farmers Cooperative tenant.',
        createdAt: '2026-04-20T09:00:00Z',
      },
      {
        id: 'audit_002',
        entity: 'case',
        action: 'reassign',
        actor: 'Super Admin',
        details: 'Reassigned advisory case ADV-2026-0000003 to Nasrin Akter.',
        createdAt: '2026-04-21T11:20:00Z',
      },
    ]);
    });
  },
};
