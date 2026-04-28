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
  UserSettings, AdvisoryPriority, PaymentGateway,
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
const USER_SESSION_UPDATED_EVENT = 'ams:user-session-updated';
const NOTIFICATION_SYNC_STORAGE_KEY = 'ams_notifications_sync';
const DEMO_CROP_LISTING_IDS = new Set(['CRP-001', 'CRP-002']);
const DEFAULT_USER_SETTINGS: UserSettings = {
  emailNotifications: true,
  pushNotifications: true,
  outbreakWarnings: true,
  urgentAdvisory: true,
  newCaseAlert: true,
};

class ApiRequestError extends Error {
  status?: number;

  isNetworkError: boolean;

  constructor(message: string, options: { status?: number; isNetworkError?: boolean } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.isNetworkError = Boolean(options.isNetworkError);
  }
}

const shouldFallbackToMock = (error: unknown) => {
  if (!API_V1) return true;
  return error instanceof ApiRequestError && error.isNetworkError;
};

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_V1) {
    throw new ApiRequestError('Backend API URL is not configured.', { isNetworkError: true });
  }

  let response: Response;
  try {
    response = await fetch(`${API_V1}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new ApiRequestError(
      error instanceof Error ? error.message : 'Backend API request failed.',
      { isNetworkError: true },
    );
  }

  let payload: { status?: 'success' | 'error'; data?: T; message?: string } | undefined;
  try {
    payload = await response.json() as { status?: 'success' | 'error'; data?: T; message?: string };
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    throw new ApiRequestError(
      payload?.message || `Backend API request failed: ${response.status}`,
      { status: response.status },
    );
  }

  if (payload?.status === 'error') {
    throw new ApiRequestError(payload.message || 'Backend API request failed.', { status: response.status });
  }

  return payload?.data as T;
}

async function apiOrMock<T>(path: string, fallback: () => Promise<T> | T, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, options);
  } catch (error) {
    if (!shouldFallbackToMock(error)) {
      throw error;
    }
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
const CURRENT_ROLE_USER_IDS_BY_ROLE_STORAGE_KEY = 'ams_current_role_user_ids_by_role';
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
const ADMIN_ORDER_SETTLEMENT_META_STORAGE_KEY = 'ams_admin_order_settlement_meta';
const DEMO_ADVISORY_CASE_IDS = new Set([
  'ADV-2026-0000001',
  'ADV-2026-0000002',
  'ADV-2026-0000003',
  'ADV-2026-0000004',
]);

let farmersStore: Farmer[] = [...MOCK_FARMERS];
let roleUsersStore: DashboardRoleUser[] = [];
let advisoryCasesStore: AdvisoryCase[] = [];
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

const normalizeOrderSettlement = (order: Order): Order => {
  const fallbackSettlementStatus: Order['settlementStatus'] = (
    order.settlementStatus
    || (order.status === 'delivered' && order.paymentStatus === 'paid' ? 'ready_for_release' : 'held')
  );

  return {
    ...order,
    settlementStatus: fallbackSettlementStatus,
    settlementReleasedAt: order.settlementReleasedAt,
    settlementReleasedBy: order.settlementReleasedBy,
  };
};

const sanitizeAdvisoryCases = (cases: AdvisoryCase[]) => (
  cases.filter((item) => !DEMO_ADVISORY_CASE_IDS.has(item.id))
);

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

const emitNotificationsUpdated = () => {
  if (!canUseStorage()) return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  persistStorageItem(NOTIFICATION_SYNC_STORAGE_KEY, String(Date.now()), 'notification sync');
};

const notifyUserSessionUpdated = () => {
  if (!canUseStorage()) return;
  window.dispatchEvent(new CustomEvent(USER_SESSION_UPDATED_EVENT));
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
  notifyUserSessionUpdated();
};

const readAdvisoryCasesStore = (): AdvisoryCase[] => {
  if (!canUseStorage()) return advisoryCasesStore;

  const saved = window.localStorage.getItem(ADVISORY_CASES_STORAGE_KEY);
  if (!saved) return advisoryCasesStore;

  try {
    const parsed = JSON.parse(saved) as AdvisoryCase[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      advisoryCasesStore = sanitizeAdvisoryCases(parsed);
    }
  } catch (error) {
    console.error('[MOCK] Failed to read advisory cases store', error);
  }

  return advisoryCasesStore;
};

const writeAdvisoryCasesStore = (cases: AdvisoryCase[]) => {
  advisoryCasesStore = sanitizeAdvisoryCases(cases);
  if (canUseStorage()) {
    persistStorageItem(ADVISORY_CASES_STORAGE_KEY, JSON.stringify(advisoryCasesStore), 'advisory cases store');
  }
};

const mergeAdvisoryCases = (cases: AdvisoryCase[]) => {
  const advisoryCaseMap = new Map<string, AdvisoryCase>();

  [...readAdvisoryCasesStore(), ...cases].forEach((item) => {
    advisoryCaseMap.set(item.id, item);
  });

  writeAdvisoryCasesStore(
    Array.from(advisoryCaseMap.values()).sort((left, right) => (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )),
  );
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
    emitNotificationsUpdated();
  }
};

const addNotification = (notification: Notification) => {
  writeNotificationsStore([notification, ...readNotificationsStore()]);
};

const extractListingIdFromNotification = (message: string): string | undefined => (
  message.match(/\(([^)]+)\)\.?$/)?.[1]?.trim() || undefined
);

const extractCompanyNameFromInterestMessage = (message: string): string => {
  const lower = message.toLowerCase();
  const interestIndex = lower.indexOf(' expressed interest in ');
  if (interestIndex > 0) return message.slice(0, interestIndex).trim();
  const repeatIndex = lower.indexOf(' sent another order request ');
  if (repeatIndex > 0) return message.slice(0, repeatIndex).trim();
  return 'Company';
};

const extractCropTypeFromInterestMessage = (message: string): string => (
  message.match(/expressed interest in your (.+?) listing/i)?.[1]?.trim()
  || message.match(/another order request for your (.+?) listing/i)?.[1]?.trim()
  || 'Crop'
);

const isNewMatchRequestNotification = (notification: Notification): boolean => (
  notification.type === 'crop_deal' && notification.title === 'New Match Request'
);

const resolveCompanyUser = (companyId?: string, companyName?: string) => (
  readRoleUsersStore().find((user) => (
    user.role === 'company'
    && (
      (companyId && (user.id === companyId || user.companyId === companyId))
      || (companyName && (
        user.companyName?.trim().toLowerCase() === companyName.trim().toLowerCase()
        || user.name.trim().toLowerCase() === companyName.trim().toLowerCase()
      ))
    )
  ))
);

const resolveFarmerUser = (farmerId?: string, farmerName?: string) => (
  readRoleUsersStore().find((user) => (
    user.role === 'farmer'
    && (
      (farmerId && user.id === farmerId)
      || (farmerName && user.name.trim().toLowerCase() === farmerName.trim().toLowerCase())
    )
  ))
);

const resolveCompanyNotificationTargets = (companyId?: string, companyName?: string): string[] => {
  const companyUser = resolveCompanyUser(companyId, companyName);
  return Array.from(new Set([companyId, companyUser?.id].filter(Boolean) as string[]));
};

const resolveFarmerNotificationTargets = (farmerId?: string, farmerName?: string): string[] => {
  const farmerUser = resolveFarmerUser(farmerId, farmerName);
  return Array.from(new Set([farmerId, farmerUser?.id].filter(Boolean) as string[]));
};

const upsertLocalCropDeal = (deal: CropDeal) => {
  const existingDeals = readCropDealsStore();
  const duplicateIndex = existingDeals.findIndex((item) => (
    item.id === deal.id
    || (
      item.listingId === deal.listingId
      && item.companyId === deal.companyId
      && item.status !== 'cancelled'
    )
  ));

  if (duplicateIndex >= 0) {
    const nextDeals = [...existingDeals];
    nextDeals[duplicateIndex] = {
      ...nextDeals[duplicateIndex],
      ...deal,
      id: nextDeals[duplicateIndex].id,
    };
    writeCropDealsStore(nextDeals);
    return nextDeals[duplicateIndex];
  }

  writeCropDealsStore([deal, ...existingDeals]);
  return deal;
};

const normalizeDealIdentity = (deal: CropDeal) => (
  `${deal.listingId}|${deal.companyName.trim().toLowerCase()}|${deal.farmerId}`
);

const dedupeCropDeals = (deals: CropDeal[]): CropDeal[] => {
  const byIdentity = new Map<string, CropDeal>();

  deals.forEach((deal) => {
    const key = normalizeDealIdentity(deal);
    const existing = byIdentity.get(key);

    if (!existing) {
      byIdentity.set(key, deal);
      return;
    }

    const existingIsCancelled = existing.status === 'cancelled';
    const nextIsCancelled = deal.status === 'cancelled';
    if (existingIsCancelled !== nextIsCancelled) {
      byIdentity.set(key, existingIsCancelled ? deal : existing);
      return;
    }

    const existingIsSynthetic = existing.id.startsWith('synced_');
    const nextIsSynthetic = deal.id.startsWith('synced_');
    if (existingIsSynthetic !== nextIsSynthetic) {
      byIdentity.set(key, existingIsSynthetic ? deal : existing);
      return;
    }

    const existingTime = new Date(existing.confirmedAt || 0).getTime();
    const nextTime = new Date(deal.confirmedAt || 0).getTime();
    if (nextTime >= existingTime) {
      byIdentity.set(key, deal);
    }
  });

  return Array.from(byIdentity.values());
};

const addCompanyDealDecisionNotifications = (
  deal: Pick<CropDeal, 'companyId' | 'companyName' | 'farmerName' | 'listingId'>,
  status: 'confirmed' | 'locked' | 'accepted' | 'cancelled',
  createdAt = new Date().toISOString(),
) => {
  resolveCompanyNotificationTargets(deal.companyId, deal.companyName).forEach((recipientId, index) => {
    const title = status === 'confirmed'
      ? 'Deal Accepted by Farmer'
      : status === 'locked'
        ? 'Deal Locked by Farmer'
      : status === 'accepted'
        ? 'Order Accepted by Farmer'
        : 'Deal Rejected by Farmer';
    const message = status === 'confirmed'
      ? `${deal.farmerName} accepted your offer for listing ${deal.listingId}.`
      : status === 'locked'
        ? `${deal.farmerName} locked your final deal terms for listing ${deal.listingId}.`
      : status === 'accepted'
        ? `${deal.farmerName} accepted your order for listing ${deal.listingId}.`
        : `${deal.farmerName} rejected your offer for listing ${deal.listingId}.`;

    addNotification({
      id: `notif_${Date.now()}_${index}`,
      userId: recipientId,
      type: 'crop_deal',
      title,
      message,
      channel: ['push', 'email'],
      isRead: false,
      createdAt,
    });
  });
};

const addFarmerDealDecisionNotifications = (
  deal: Pick<CropDeal, 'farmerId' | 'farmerName' | 'companyName' | 'listingId'>,
  status: 'confirmed' | 'locked' | 'accepted' | 'cancelled',
  createdAt = new Date().toISOString(),
) => {
  resolveFarmerNotificationTargets(deal.farmerId, deal.farmerName).forEach((recipientId, index) => {
    const title = status === 'confirmed'
      ? 'You Accepted the Offer'
      : status === 'locked'
        ? 'You Locked the Deal'
      : status === 'accepted'
        ? 'You Accepted the Order'
        : 'You Rejected the Offer';
    const message = status === 'confirmed'
      ? `You accepted ${deal.companyName}'s offer for listing ${deal.listingId}.`
      : status === 'locked'
        ? `You locked the final deal with ${deal.companyName} for listing ${deal.listingId}.`
      : status === 'accepted'
        ? `You accepted ${deal.companyName}'s order for listing ${deal.listingId}.`
        : `You rejected ${deal.companyName}'s offer for listing ${deal.listingId}.`;

    addNotification({
      id: `notif_${Date.now()}_farmer_${index}`,
      userId: recipientId,
      type: 'crop_deal',
      title,
      message,
      channel: ['push', 'sms'],
      isRead: false,
      createdAt,
    });
  });
};

const markFarmerMatchRequestNotificationsResolved = (
  deal: Pick<CropDeal, 'farmerId' | 'farmerName' | 'companyName' | 'listingId'>,
) => {
  const targetUserIds = new Set(resolveFarmerNotificationTargets(deal.farmerId, deal.farmerName));
  if (!targetUserIds.size) return;

  const normalizedCompanyName = deal.companyName.trim().toLowerCase();
  const nextNotifications = readNotificationsStore().map((notification) => {
    if (!targetUserIds.has(notification.userId)) return notification;
    if (!isNewMatchRequestNotification(notification)) return notification;

    const listingId = extractListingIdFromNotification(notification.message);
    const companyName = extractCompanyNameFromInterestMessage(notification.message).trim().toLowerCase();
    if (listingId !== deal.listingId || companyName !== normalizedCompanyName) {
      return notification;
    }

    return { ...notification, isRead: true, title: 'Match Request Resolved' };
  });

  writeNotificationsStore(nextNotifications);
};

const addFarmerCompanyActionNotifications = (
  deal: Pick<CropDeal, 'farmerId' | 'farmerName' | 'companyName' | 'listingId'>,
  status: 'negotiating' | 'locked' | 'order_placed' | 'cancelled' | 'completed',
  createdAt = new Date().toISOString(),
) => {
  resolveFarmerNotificationTargets(deal.farmerId, deal.farmerName).forEach((recipientId, index) => {
    const title = status === 'negotiating'
      ? 'Company Sent a New Offer'
      : status === 'locked'
        ? 'Company Locked the Deal'
      : status === 'order_placed'
        ? 'Company Placed an Order'
      : status === 'completed'
        ? 'Deal Payment Completed'
        : 'Company Cancelled the Deal';
    const message = status === 'negotiating'
      ? `${deal.companyName} updated offer terms for listing ${deal.listingId}.`
      : status === 'locked'
        ? `${deal.companyName} locked deal terms for listing ${deal.listingId}.`
      : status === 'order_placed'
        ? `${deal.companyName} placed the order for listing ${deal.listingId}. Please accept or reject it.`
      : status === 'completed'
        ? `${deal.companyName} completed the payment flow for listing ${deal.listingId}.`
        : `${deal.companyName} cancelled the deal for listing ${deal.listingId}.`;

    addNotification({
      id: `notif_${Date.now()}_company_${index}`,
      userId: recipientId,
      type: 'crop_deal',
      title,
      message,
      channel: ['push', 'sms'],
      isRead: false,
      createdAt,
    });
  });
};

const readOrdersStore = (): Order[] => {
  if (!canUseStorage()) return ordersStore.map(normalizeOrderSettlement);

  const saved = window.localStorage.getItem(ORDERS_STORAGE_KEY);
  if (!saved) return ordersStore.map(normalizeOrderSettlement);

  try {
    const parsed = JSON.parse(saved) as Order[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      ordersStore = parsed.map(normalizeOrderSettlement);
    }
  } catch (error) {
    console.error('[MOCK] Failed to read orders store', error);
  }

  return ordersStore.map(normalizeOrderSettlement);
};

const writeOrdersStore = (orders: Order[]) => {
  ordersStore = orders.map(normalizeOrderSettlement);
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

const readUserSettingsStore = (): Record<string, UserSettings> => {
  if (!canUseStorage()) return {};

  const saved = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
  if (!saved) return {};

  try {
    return JSON.parse(saved) as Record<string, UserSettings>;
  } catch (error) {
    console.error('[MOCK] Failed to read user settings store', error);
    return {};
  }
};

const writeUserSettingsStore = (settings: Record<string, UserSettings>) => {
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
  notifyUserSessionUpdated();
};

const setCurrentRoleUserId = (userId: string) => {
  if (canUseStorage()) {
    window.localStorage.setItem(CURRENT_ROLE_USER_STORAGE_KEY, userId);
    const userRole = readRoleUsersStore().find((user) => user.id === userId)?.role;
    if (userRole) {
      const roleSessions = readJsonRecord<string>(CURRENT_ROLE_USER_IDS_BY_ROLE_STORAGE_KEY);
      roleSessions[userRole] = userId;
      writeJsonRecord(CURRENT_ROLE_USER_IDS_BY_ROLE_STORAGE_KEY, roleSessions);
    }
  }
  notifyUserSessionUpdated();
};

const clearCurrentSession = (role?: ManagedUserRole) => {
  if (!canUseStorage()) return;
  if (!role) {
    window.localStorage.removeItem(CURRENT_ROLE_USER_STORAGE_KEY);
    window.localStorage.removeItem(CURRENT_FARMER_STORAGE_KEY);
    window.localStorage.removeItem(CURRENT_ROLE_USER_IDS_BY_ROLE_STORAGE_KEY);
    notifyUserSessionUpdated();
    return;
  }

  const roleSessions = readJsonRecord<string>(CURRENT_ROLE_USER_IDS_BY_ROLE_STORAGE_KEY);
  const roleUserId = roleSessions[role];
  if (roleUserId) {
    delete roleSessions[role];
    writeJsonRecord(CURRENT_ROLE_USER_IDS_BY_ROLE_STORAGE_KEY, roleSessions);
  }

  if (role === 'farmer') {
    window.localStorage.removeItem(CURRENT_FARMER_STORAGE_KEY);
  }

  const currentUserId = window.localStorage.getItem(CURRENT_ROLE_USER_STORAGE_KEY);
  if (currentUserId) {
    const currentUserRole = readRoleUsersStore().find((user) => user.id === currentUserId)?.role;
    if (currentUserRole === role) {
      window.localStorage.removeItem(CURRENT_ROLE_USER_STORAGE_KEY);
    }
  }

  notifyUserSessionUpdated();
};

const removeUserAssociatedMockData = (user: DashboardRoleUser) => {
  writeNotificationsStore(readNotificationsStore().filter((item) => item.userId !== user.id));

  const settingsStore = readUserSettingsStore();
  if (settingsStore[user.id]) {
    delete settingsStore[user.id];
    writeUserSettingsStore(settingsStore);
  }

  if (user.role === 'farmer') {
    writeAdvisoryCasesStore(readAdvisoryCasesStore().filter((item) => item.farmerId !== user.id));
    writeOrdersStore(readOrdersStore().filter((item) => item.farmerId !== user.id));
    writeCropListingsStore(readCropListingsStore().filter((item) => item.farmerId !== user.id));
    writeCropDealsStore(readCropDealsStore().filter((item) => item.farmerId !== user.id));
    if (canUseStorage()) {
      window.localStorage.removeItem(getCartStorageKey(user.id));
    }
  }

  if (user.role === 'officer') {
    writeAdvisoryCasesStore(readAdvisoryCasesStore().map((item) => (
      item.officerId === user.id
        ? { ...item, officerId: undefined, officerName: undefined }
        : item
    )));
  }

  if (user.role === 'vendor') {
    writeProductsStore(readProductsStore().filter((item) => item.vendorId !== user.id));
    writeOrdersStore(readOrdersStore().filter((item) => item.vendorId !== user.id));
  }

  if (user.role === 'company') {
    writeCropDealsStore(readCropDealsStore().filter((item) => item.companyId !== user.id));
  }

  writeTenantsStore(readTenantsStore().map((tenant) => (
    tenant.adminUserId === user.id
      ? { ...tenant, adminUserId: '' }
      : tenant
  )));

  writeRoleUsersStore(readRoleUsersStore().filter((item) => item.id !== user.id));
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

const getCurrentRoleUser = (role?: ManagedUserRole): DashboardRoleUser | undefined => {
  const users = readRoleUsersStore();

  if (canUseStorage()) {
    if (role) {
      const roleSessions = readJsonRecord<string>(CURRENT_ROLE_USER_IDS_BY_ROLE_STORAGE_KEY);
      const roleUserId = roleSessions[role];
      if (roleUserId) {
        const roleUser = users.find((user) => user.id === roleUserId);
        if (roleUser?.role === role) {
          return roleUser;
        }
      }
    }

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

  getCurrentUser(role?: ManagedUserRole): DashboardRoleUser | undefined {
    return getCurrentRoleUser(role);
  },

  async adminLogin(
    email: string,
    password: string,
  role?: ManagedUserRole,
  ): Promise<{ success: boolean; role?: string; token?: string; requiresOtp?: boolean; otpToken?: string; message?: string }> {
    let apiError: unknown;
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
      apiError = error;
      console.warn('[API] Login API failed, trying local/mock fallback for /auth/login:', error);
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

    if (apiError && !shouldFallbackToMock(apiError)) {
      return { success: false, message: apiError instanceof Error ? apiError.message : 'Login failed.' };
    }

    return { success: false, message: 'Invalid credentials.' };
  },

  async registerRoleUser(
    data: Partial<DashboardRoleUser> & { role: ManagedUserRole; name: string; email?: string; phone: string; password: string; registrationOtpToken?: string },
  ): Promise<{ success: boolean; user?: DashboardRoleUser; message?: string }> {
    try {
      const result = await apiRequest<{ success: boolean; user?: DashboardRoleUser; message?: string }>('/auth/register-role', jsonBody(data));
      if (result.success) persistApiUserSession(result.user);
      return result;
    } catch (error) {
      if (!shouldFallbackToMock(error)) {
        return { success: false, message: error instanceof Error ? error.message : 'Registration failed.' };
      }
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
    try {
      const result = await apiRequest<{ success: boolean; user?: DashboardRoleUser }>(`/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (result.success && result.user) {
        persistApiUserSession(result.user);
      }

      return result;
    } catch (error) {
      if (!shouldFallbackToMock(error)) {
        throw error;
      }
      console.warn('[API] Falling back to local mock for user profile update:', error);
    }

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
      persistApiUserSession(updatedUser);
    }

    return { success: Boolean(updatedUser), user: updatedUser };
  },

  async changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await apiRequest<{ success: boolean }>(`/users/${encodeURIComponent(userId)}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, nextPassword }),
      });

      if (result.success) {
        const users = readRoleUsersStore();
        writeRoleUsersStore(users.map((item) => (
          item.id === userId ? { ...item, password: nextPassword } : item
        )));
      }

      return result;
    } catch (error) {
      if (!shouldFallbackToMock(error)) {
        return { success: false, message: error instanceof Error ? error.message : 'Password change failed.' };
      }
      console.warn('[API] Falling back to local mock for password change:', error);
    }

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

  async deleteAccount(userId: string): Promise<{ success: boolean; message?: string }> {
    const localUser = readRoleUsersStore().find((item) => item.id === userId);
    const isDeletingCurrentSession = localUser
      ? getCurrentRoleUser(localUser.role)?.id === userId
      : getCurrentRoleUser()?.id === userId;

    try {
      const result = await apiRequest<{ success: boolean }>(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (result.success && localUser) {
        removeUserAssociatedMockData(localUser);
      }
      if (result.success && isDeletingCurrentSession) {
        clearCurrentSession();
      }
      return result;
    } catch (error) {
      if (!shouldFallbackToMock(error)) {
        return { success: false, message: error instanceof Error ? error.message : 'Account deletion failed.' };
      }
      console.warn('[API] Falling back to local mock for account deletion:', error);
    }

    await delay(300);
    const user = readRoleUsersStore().find((item) => item.id === userId);
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    removeUserAssociatedMockData(user);
    if (isDeletingCurrentSession) {
      clearCurrentSession();
    }

    return { success: true };
  },

  resetDemoData() {
    roleUsersStore = [...DEFAULT_ROLE_USERS];
    advisoryCasesStore = [];
    notificationsStore = [...MOCK_NOTIFICATIONS];
    farmersStore = [...MOCK_FARMERS];
    ordersStore = [...MOCK_ORDERS].map(normalizeOrderSettlement);

    if (canUseStorage()) {
      window.localStorage.setItem(ROLE_USERS_STORAGE_KEY, JSON.stringify(roleUsersStore));
      window.localStorage.setItem(ADVISORY_CASES_STORAGE_KEY, JSON.stringify(advisoryCasesStore));
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationsStore));
      window.localStorage.setItem(FARMERS_STORAGE_KEY, JSON.stringify(farmersStore));
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersStore));
      window.localStorage.removeItem(USER_SETTINGS_STORAGE_KEY);
      window.localStorage.removeItem(MOCK_OTP_SESSION_STORAGE_KEY);
      window.localStorage.removeItem(CURRENT_ROLE_USER_IDS_BY_ROLE_STORAGE_KEY);
      farmersStore.forEach((farmer) => window.localStorage.removeItem(getCartStorageKey(farmer.id)));
    }

    clearCurrentSession();
  },

  async quickDemoLogin(role: ManagedUserRole): Promise<{ success: boolean; role?: ManagedUserRole }> {
    const credential = DEMO_CREDENTIALS[role];
    const result = await this.adminLogin(credential.email, credential.password, role);
    return { success: result.success, role: result.role as ManagedUserRole | undefined };
  },

  logout(role?: ManagedUserRole) {
    clearMockOtpSession();
    clearCurrentSession(role);
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
  async getAdvisoryCases(
    filters?: string | Partial<{ farmerId: string; officerId: string; q: string; status: AdvisoryCase['status'] }>,
  ): Promise<AdvisoryCase[]> {
    const options = typeof filters === 'string' ? { farmerId: filters } : (filters || {});
    const params = new URLSearchParams();
    if (options.farmerId) params.set('farmerId', options.farmerId);
    if (options.officerId) params.set('officerId', options.officerId);
    if (options.q) params.set('q', options.q);
    if (options.status) params.set('status', options.status);
    const query = params.toString();
    const path = `/advisory-cases${query ? `?${query}` : ''}`;

    try {
      const cases = await apiRequest<AdvisoryCase[]>(path);
      mergeAdvisoryCases(cases);
      return cases;
    } catch (error) {
      console.warn(`[API] Falling back to local mock for ${path}:`, error);
    }

    await delay();
    let cases = readAdvisoryCasesStore();
    if (options.farmerId) cases = cases.filter((c) => c.farmerId === options.farmerId);
    if (options.officerId) cases = cases.filter((c) => c.officerId === options.officerId);
    if (options.status) cases = cases.filter((c) => c.status === options.status);
    if (options.q) {
      const needle = options.q.toLowerCase();
      cases = cases.filter((c) => (
        c.id.toLowerCase().includes(needle)
        || c.cropType.toLowerCase().includes(needle)
        || c.description.toLowerCase().includes(needle)
        || c.farmerName.toLowerCase().includes(needle)
      ));
    }

    return cases;
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
    priority: AdvisoryPriority;
  }): Promise<{ success: boolean; caseId?: string }> {
    const farmer = readFarmersStore().find((item) => item.id === data.farmerId);

    try {
      const result = await apiRequest<{ success: boolean; caseId?: string }>('/advisory-cases', jsonBody(data));

      if (result.success && result.caseId) {
        mergeAdvisoryCases([{
          id: result.caseId,
          farmerId: data.farmerId,
          farmerName: farmer?.name ?? 'Farmer',
          farmerDivision: farmer?.division ?? '',
          farmerDistrict: farmer?.district ?? '',
          farmerUpazila: farmer?.upazila ?? '',
          cropType: data.cropType,
          description: data.description,
          photos: data.photos,
          status: 'pending',
          priority: data.priority,
          createdAt: new Date().toISOString(),
        }]);
      }

      return result;
    } catch (error) {
      console.warn('[API] Falling back to local mock for /advisory-cases:', error);
    }

    await delay(1200);
    const year = new Date().getFullYear();
    const caseId = `ADV-${year}-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}`;
    const newCase: AdvisoryCase = {
      id: caseId,
      farmerId: data.farmerId,
      farmerName: farmer?.name ?? 'Farmer',
      farmerDivision: farmer?.division ?? '',
      farmerDistrict: farmer?.district ?? '',
      farmerUpazila: farmer?.upazila ?? '',
      cropType: data.cropType,
      description: data.description,
      photos: data.photos,
      status: 'pending',
      priority: data.priority,
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

    const officers = readRoleUsersStore().filter((item) => item.role === 'officer');
    const settingsStore = readUserSettingsStore();
    const location = [farmer?.upazila, farmer?.district, farmer?.division].filter(Boolean).join(', ');

    officers.forEach((officer) => {
      const coveredDistricts = (officer.regionDistricts || []).map((district) => district.toLowerCase());
      const matchesDistrict = !farmer?.district || coveredDistricts.includes(farmer.district.toLowerCase());
      if (!matchesDistrict) return;

      const preferences = settingsStore[officer.id] || DEFAULT_USER_SETTINGS;
      const shouldNotify = data.priority === 'urgent' ? preferences.urgentAdvisory : preferences.newCaseAlert;
      if (!shouldNotify) return;

      addNotification({
        id: `notif_${Date.now()}_${officer.id}`,
        userId: officer.id,
        type: 'advisory',
        title: data.priority === 'urgent' ? 'Urgent New Case Alert' : 'New Case Alert',
        message: `${data.priority === 'urgent' ? 'Urgent' : 'Normal'} ${data.cropType} advisory ${caseId} submitted from ${location}.`,
        channel: ['push', 'email'],
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    return { success: true, caseId };
  },

  async respondToCase(caseId: string, response: string, officerId: string): Promise<{ success: boolean }> {
    const officer = readRoleUsersStore().find((user) => user.id === officerId || user.officerId === officerId);

    try {
      const result = await apiRequest<{ success: boolean }>(`/advisory-cases/${encodeURIComponent(caseId)}/respond`, jsonBody({ response, officerId }));

      if (result.success) {
        writeAdvisoryCasesStore(readAdvisoryCasesStore().map((item) => (
          item.id === caseId
            ? {
              ...item,
              status: 'responded' as const,
              officerId: officer?.id ?? officerId,
              officerName: officer?.name ?? 'Officer',
              officerResponse: response,
              respondedAt: new Date().toISOString(),
            }
            : item
        )));
      }

      return result;
    } catch (error) {
      console.warn('[API] Falling back to local mock for advisory response:', error);
    }

    await delay(800);
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
    const cases = await this.getAdvisoryCases();
    return cases.filter((c) => c.officerId === officerId || c.status === 'pending' || c.status === 'assigned' || c.status === 'ai_analyzed');
  },

  async getRegionalStats(): Promise<Array<{ division: string; district: string; total_cases: number; pending_cases: number; responded_cases: number; resolved_cases: number }>> {
    return apiOrMock('/advisory-cases/regional/stats', async () => {
      await delay();
      const cases = readAdvisoryCasesStore();
      const statsMap = new Map<string, { division: string; district: string; total: number; pending: number; responded: number; resolved: number }>();
      
      // Import district mapping
      const { bangladeshDistricts } = await import('@/utils/bangladeshDistricts');
      
      cases.forEach((c) => {
        const district = c.farmerDistrict || 'Unknown';
        const districtInfo = bangladeshDistricts.find(d => d.name.toLowerCase() === district.toLowerCase());
        const division = c.farmerDivision || districtInfo?.division || 'Unknown';
        const key = `${division}-${district}`;
        
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            division,
            district,
            total: 0,
            pending: 0,
            responded: 0,
            resolved: 0,
          });
        }
        const stat = statsMap.get(key)!;
        stat.total += 1;
        if (c.status === 'pending') stat.pending += 1;
        if (c.status === 'responded') stat.responded += 1;
        if (c.status === 'closed') stat.resolved += 1;
      });

      return Array.from(statsMap.values()).map(s => ({
        division: s.division,
        district: s.district,
        total_cases: s.total,
        pending_cases: s.pending,
        responded_cases: s.responded,
        resolved_cases: s.resolved,
      }));
    });
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
    const params = new URLSearchParams({ includeCropListings: '1' });
    if (category) params.set('category', category);
    return apiOrMock(`/products?${params.toString()}`, async () => {
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
  async getOrders(farmerId?: string, vendorId?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (farmerId) params.set('farmerId', farmerId);
    if (vendorId) params.set('vendorId', vendorId);
    return apiOrMock(`/orders${params.toString() ? `?${params.toString()}` : ''}`, async () => {
    await delay();
    let orders = readOrdersStore();
    if (farmerId) orders = orders.filter((o) => o.farmerId === farmerId);
    if (vendorId) orders = orders.filter((o) => o.vendorId === vendorId);
    return orders.map(normalizeOrderSettlement);
    }).then((orders) => orders.map(normalizeOrderSettlement));
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
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Order placement failed.',
      };
    }
  },

  async initiateOrderStripePayment(data: {
    orderId: string;
    farmerId: string;
  }): Promise<{ success: boolean; gatewayPageUrl?: string; alreadyPaid?: boolean; message?: string }> {
    try {
      return await apiRequest<{ success: boolean; gatewayPageUrl?: string; alreadyPaid?: boolean; message?: string }>(
        '/payments/orders/stripe/initiate',
        jsonBody(data),
      );
    } catch (error) {
      console.warn('[API] Stripe order payment initiation failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start Stripe sandbox payment.',
      };
    }
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
        ? (() => {
          const nextPaymentStatus: Order['paymentStatus'] = (
            order.paymentGateway === 'cod' && (status === 'delivered' || status === 'completed')
              ? 'paid'
              : order.paymentStatus
          );
          const nextSettlementStatus: NonNullable<Order['settlementStatus']> = (
            order.settlementStatus === 'released'
              ? 'released'
              : (status === 'delivered' || status === 'completed') && nextPaymentStatus === 'paid'
                ? 'ready_for_release'
                : 'held'
          );
          return {
            ...order,
            status,
            paymentStatus: nextPaymentStatus,
            settlementStatus: nextSettlementStatus,
            deliveredAt: status === 'delivered' ? new Date().toISOString() : order.deliveredAt,
          };
        })()
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
  async getSettings(userId: string): Promise<UserSettings> {
    return apiOrMock(`/settings/${encodeURIComponent(userId)}`, async () => {
    await delay(150);
    const store = readUserSettingsStore();
    return store[userId] || DEFAULT_USER_SETTINGS;
    });
  },

  async updateSettings(userId: string, settings: UserSettings) {
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
  ensureFarmerDealsFromNotifications(
    farmerId: string,
    notifications: Notification[],
  ): CropDeal[] {
    const farmerUser = resolveFarmerUser(farmerId);
    const allListings = readCropListingsStore();
    const relevantNotificationListingIds = new Set(
      notifications
        .filter(isNewMatchRequestNotification)
        .map((notification) => extractListingIdFromNotification(notification.message))
        .filter(Boolean) as string[],
    );

    const ownListings = allListings.filter((listing) => (
      listing.farmerId === farmerId
      || (farmerUser?.name && listing.farmerName === farmerUser.name)
      || relevantNotificationListingIds.has(listing.id)
    ));
    const ownListingMap = new Map(ownListings.map((listing) => [listing.id, listing]));
    const existingDeals = readCropDealsStore();
    const nextDeals = [...existingDeals];

    notifications
      .filter(isNewMatchRequestNotification)
      .forEach((notification, index) => {
        const listingId = extractListingIdFromNotification(notification.message);
        if (!listingId) return;

        const listing = ownListingMap.get(listingId) || allListings.find((item) => item.id === listingId);
        const fallbackCropType = extractCropTypeFromInterestMessage(notification.message);
        const fallbackFarmerName = farmerUser?.name || listing?.farmerName || 'Farmer';

        const alreadyExists = nextDeals.some((deal) => (
          deal.listingId === listingId
          && extractCompanyNameFromInterestMessage(notification.message).toLowerCase() === deal.companyName.toLowerCase()
          && ['pending', 'negotiating', 'confirmed', 'locked', 'order_placed', 'accepted', 'delivered', 'completed'].includes(deal.status)
        ));
        if (alreadyExists) return;

        const companyName = extractCompanyNameFromInterestMessage(notification.message);
        const companyUser = resolveCompanyUser(undefined, companyName);
        const quantityKg = Math.max(1, listing?.quantityKg ?? 1);
        const agreedPrice = Math.max(1, listing?.askingPrice ?? 1);

        nextDeals.unshift({
          id: `synced_${listingId}_${index}`,
          listingId,
          companyId: companyUser?.id || `company_${index}`,
          companyName,
          farmerId,
          farmerName: fallbackFarmerName,
          agreedPrice,
          quantityKg,
          commissionPct: 3,
          commissionAmt: Math.round(agreedPrice * quantityKg * 0.03),
          status: 'pending',
          confirmedAt: notification.createdAt,
          paymentStatus: 'pending',
          paymentGateway: 'bkash',
        });

        if (listing) {
          ownListingMap.set(listing.id, listing);
        } else {
          ownListingMap.set(listingId, {
            id: listingId,
            farmerId,
            farmerName: fallbackFarmerName,
            farmerDistrict: farmerUser?.district || '',
            cropType: fallbackCropType,
            variety: '',
            quantityKg,
            qualityGrade: 'B',
            askingPrice: agreedPrice,
            harvestDate: new Date().toISOString().slice(0, 10),
            district: farmerUser?.district || '',
            upazila: farmerUser?.upazila || '',
            photos: [],
            status: 'matched',
            createdAt: notification.createdAt,
            matchedCompanyId: companyUser?.id,
          });
        }
      });

    writeCropDealsStore(dedupeCropDeals(nextDeals));
    return nextDeals.filter((deal) => (
      deal.farmerId === farmerId
      || (farmerUser?.name && deal.farmerName === farmerUser.name)
      || ownListingMap.has(deal.listingId)
      || relevantNotificationListingIds.has(deal.listingId)
    ));
  },

  async getCropListings(farmerId?: string): Promise<CropListing[]> {
    const listings = await apiOrMock(`/crop-listings${farmerId ? `?farmerId=${encodeURIComponent(farmerId)}` : ''}`, async () => {
      await delay();
      return readCropListingsStore();
    });

    if (farmerId) {
      return listings.filter((listing) => listing.farmerId === farmerId);
    }

    return listings
      .filter((listing) => Boolean(listing.farmerId?.trim()) && !DEMO_CROP_LISTING_IDS.has(listing.id))
      .map((listing) => ({ ...listing }));
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

  async updateCropListing(listingId: string, data: Partial<CropListing>): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/crop-listings/${encodeURIComponent(listingId)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.warn('[API] Falling back to local mock for crop listing update:', error);
    }

    await delay(400);
    const updated = readCropListingsStore().map((listing) => (
      listing.id === listingId
        ? { ...listing, ...data, id: listing.id }
        : listing
    ));
    writeCropListingsStore(updated);
    return { success: true };
  },

  async deleteCropListing(listingId: string): Promise<{ success: boolean }> {
    try {
      return await apiRequest<{ success: boolean }>(`/crop-listings/${encodeURIComponent(listingId)}`, { method: 'DELETE' });
    } catch (error) {
      console.warn('[API] Falling back to local mock for crop listing delete:', error);
    }

    await delay(300);
    writeCropListingsStore(readCropListingsStore().filter((listing) => listing.id !== listingId));
    return { success: true };
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
    quantityKg?: number;
    paymentGateway?: PaymentGateway;
    listing?: CropListing;
    allowRepeat?: boolean;
  }): Promise<{ success: boolean; matchId?: string; message?: string }> {
    const localListing = readCropListingsStore().find((item) => item.id === data.listingId) || data.listing;
    const companyUser = resolveCompanyUser(data.companyId, data.companyName);
    const normalizedCompanyId = companyUser?.id || data.companyId;
    const allowRepeat = Boolean(data.allowRepeat);

    const applyLocalInterestSync = (
      matchId: string,
      listing: CropListing,
      options?: { preserveExistingStatus?: boolean },
    ) => {
      const farmerUserId = resolveFarmerUser(listing.farmerId, listing.farmerName)?.id || listing.farmerId;
      const quantityKg = Math.max(1, Math.min(data.quantityKg || listing.quantityKg, listing.quantityKg));
      const existingDeal = readCropDealsStore().find((deal) => (
        (deal.id === matchId || (deal.listingId === listing.id && deal.companyId === normalizedCompanyId))
        && deal.status !== 'cancelled'
      ));
      const preserveExistingStatus = Boolean(options?.preserveExistingStatus && existingDeal);
      const nextDeal: CropDeal = {
        id: existingDeal?.id || matchId,
        listingId: listing.id,
        companyId: normalizedCompanyId,
        companyName: companyUser?.companyName || data.companyName,
        farmerId: farmerUserId,
        farmerName: listing.farmerName,
        agreedPrice: preserveExistingStatus ? existingDeal!.agreedPrice : listing.askingPrice,
        quantityKg: preserveExistingStatus ? existingDeal!.quantityKg : quantityKg,
        commissionPct: 3,
        commissionAmt: preserveExistingStatus
          ? existingDeal!.commissionAmt
          : Math.round(listing.askingPrice * quantityKg * 0.03),
        status: preserveExistingStatus ? existingDeal!.status : 'confirmed',
        paymentGateway: preserveExistingStatus ? existingDeal!.paymentGateway : data.paymentGateway,
        paymentStatus: preserveExistingStatus ? existingDeal!.paymentStatus : 'pending',
        confirmedAt: preserveExistingStatus ? existingDeal!.confirmedAt : new Date().toISOString(),
      };

      if (allowRepeat) {
        writeCropDealsStore([nextDeal, ...readCropDealsStore()]);
      } else {
        upsertLocalCropDeal(nextDeal);
      }

      writeCropListingsStore(readCropListingsStore().map((item) => (
        item.id === listing.id ? { ...item, status: 'matched', matchedCompanyId: normalizedCompanyId } : item
      )));

      // Cart add flow: farmer should be notified only when company places order.
    };

    try {
      const result = await apiRequest<{ success: boolean; matchId?: string; message?: string }>('/crop-deals/interest', jsonBody(data));
      if (!result.success) {
        // Backend returned a logical failure (often listing-id mismatch between API and local state).
        // Continue into robust local fallback so the user flow does not break.
        throw new Error(result.message || 'Could not send interest from backend.');
      }

      if (localListing) {
        const preserveExistingStatus = (result.message || '').toLowerCase().includes('already sent');
        applyLocalInterestSync(
          result.matchId || `deal_${String(Date.now()).slice(-6)}`,
          localListing,
          { preserveExistingStatus },
        );
      }
      emitNotificationsUpdated();
      return result;
    } catch (error) {
      console.warn('[API] Falling back to local/mock flow for crop interest:', error);
    }

    await delay(500);
    const listing = localListing;
    if (!listing) return { success: false, message: 'Listing not found.' };

    if (!allowRepeat) {
      const existing = readCropDealsStore().find((deal) => (
        deal.listingId === data.listingId
        && deal.companyId === normalizedCompanyId
        && deal.status !== 'cancelled'
      ));
      if (existing) return { success: true, matchId: existing.id, message: 'Interest already sent.' };
    }

    const matchId = allowRepeat ? `deal_${String(Date.now())}_${Math.floor(Math.random() * 1000)}` : `deal_${String(Date.now()).slice(-6)}`;
    applyLocalInterestSync(matchId, listing);

    return { success: true, matchId };
  },

  async initiateDealPayment(data: {
    dealId: string;
    companyId: string;
    listingId?: string;
    paymentGateway?: PaymentGateway;
  }): Promise<{ success: boolean; gatewayPageUrl?: string; alreadyPaid?: boolean; message?: string }> {
    const endpoint = data.paymentGateway === 'stripe'
      ? '/payments/stripe/initiate'
      : '/payments/sslcommerz/initiate';
    try {
      return await apiRequest<{ success: boolean; gatewayPageUrl?: string; alreadyPaid?: boolean; message?: string }>(
        endpoint,
        jsonBody(data),
      );
    } catch (error) {
      console.warn('[API] Payment initiation failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start sandbox payment. Please try again.',
      };
    }
  },

  async getCompanyMatches(companyId: string): Promise<CropDeal[]> {
    const companyUser = resolveCompanyUser(companyId);
    const candidateCompanyIds = new Set([companyId, companyUser?.id, companyUser?.companyId].filter(Boolean) as string[]);

    if (API_V1) {
      try {
        const apiDeals = await apiRequest<CropDeal[]>(`/crop-deals?companyId=${encodeURIComponent(companyId)}`);
        const localDeals = readCropDealsStore().filter((deal) => (
          candidateCompanyIds.has(deal.companyId)
          || (companyUser?.companyName && deal.companyName === companyUser.companyName)
          || (companyUser?.name && deal.companyName === companyUser.name)
        ));
        return dedupeCropDeals([...apiDeals, ...localDeals]).sort((a, b) => (
          new Date(b.confirmedAt || 0).getTime() - new Date(a.confirmedAt || 0).getTime()
        ));
      } catch (error) {
        console.warn('[API] Falling back to local/mock flow for company deals:', error);
      }
    }

    await delay(300);
    return readCropDealsStore().filter((deal) => (
      candidateCompanyIds.has(deal.companyId)
      || (companyUser?.companyName && deal.companyName === companyUser.companyName)
      || (companyUser?.name && deal.companyName === companyUser.name)
    ));
  },

  async getFarmerDeals(farmerId: string): Promise<CropDeal[]> {
    const farmerUser = resolveFarmerUser(farmerId);
    const relevantListingIds = new Set<string>();

    const collectRelevantDeals = (deals: CropDeal[], listings: CropListing[] = readCropListingsStore()): CropDeal[] => {
      const ownListings = listings.filter((listing) => (
        listing.farmerId === farmerId
        || (farmerUser?.name && listing.farmerName === farmerUser.name)
        || relevantListingIds.has(listing.id)
      ));
      const ownListingIds = new Set(ownListings.map((listing) => listing.id));
      const candidateIds = new Set<string>([
        farmerId,
        farmerUser?.id,
        ...ownListings.map((listing) => listing.farmerId),
      ].filter(Boolean) as string[]);

      return deals.filter((deal) => (
        candidateIds.has(deal.farmerId)
        || ownListingIds.has(deal.listingId)
        || relevantListingIds.has(deal.listingId)
        || (farmerUser?.name && deal.farmerName === farmerUser.name)
      ));
    };

    if (API_V1) {
      try {
        const scopedDeals = await apiRequest<CropDeal[]>(`/crop-deals?farmerId=${encodeURIComponent(farmerId)}`);
        const localDeals = collectRelevantDeals(readCropDealsStore());
        return dedupeCropDeals([...scopedDeals, ...localDeals]).sort((a, b) => (
          new Date(b.confirmedAt || 0).getTime() - new Date(a.confirmedAt || 0).getTime()
        ));
      } catch (error) {
        console.warn(`[API] Falling back to local/mock flow for farmer deals for ${farmerId}:`, error);
      }
    }
    await delay(300);
    const localDeals = collectRelevantDeals(readCropDealsStore());
    const mergedById = new Map<string, CropDeal>();
    [...localDeals].forEach((deal) => mergedById.set(deal.id, deal));
    return dedupeCropDeals(Array.from(mergedById.values()));
  },

  async updateDealStatus(
    dealId: string,
    status: CropDeal['status'],
    options?: {
      actorRole?: 'farmer' | 'company';
      actorId?: string;
      agreedPrice?: number;
      quantityKg?: number;
      paymentGateway?: PaymentGateway;
      paymentStatus?: 'paid' | 'pending' | 'failed';
      dealContext?: Pick<CropDeal, 'companyId' | 'companyName' | 'farmerId' | 'farmerName' | 'listingId'>;
    },
  ): Promise<{ success: boolean; message?: string }> {
    const localDeals = readCropDealsStore();
    const targetDeal = localDeals.find((deal) => deal.id === dealId);
    const contextListingId = options?.dealContext?.listingId;
    const contextCompanyId = options?.dealContext?.companyId;
    const contextCompanyName = options?.dealContext?.companyName?.trim().toLowerCase();
    const contextFarmerId = options?.dealContext?.farmerId;
    const contextFarmerName = options?.dealContext?.farmerName?.trim().toLowerCase();
    const contextResolvedDeal = !targetDeal && contextListingId
      ? localDeals.find((deal) => (
        deal.listingId === contextListingId
        && (!contextCompanyId || deal.companyId === contextCompanyId)
        && (!contextCompanyName || deal.companyName.trim().toLowerCase() === contextCompanyName)
        && (!contextFarmerId || deal.farmerId === contextFarmerId)
        && (!contextFarmerName || deal.farmerName.trim().toLowerCase() === contextFarmerName)
      ))
      : undefined;
    const resolvedTargetDeal = targetDeal || contextResolvedDeal;
    const effectiveDealId = resolvedTargetDeal?.id || dealId;

    try {
      const result = await apiRequest<{ success: boolean }>(`/crop-deals/${encodeURIComponent(effectiveDealId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          actorRole: options?.actorRole,
          actorId: options?.actorId,
          agreedPrice: options?.agreedPrice,
          quantityKg: options?.quantityKg,
          paymentGateway: options?.paymentGateway,
          paymentStatus: options?.paymentStatus,
        }),
      });
      if (!result.success) {
        throw new ApiRequestError(
          'Backend returned unsuccessful deal status update.',
          { isNetworkError: true },
        );
      }
      if (result.success) {
        if (options?.actorRole === 'farmer' && (status === 'confirmed' || status === 'locked' || status === 'accepted' || status === 'cancelled')) {
          const rawCompanyName = options?.dealContext?.companyName || targetDeal?.companyName || 'Company';
          const rawFarmerName = options?.dealContext?.farmerName || targetDeal?.farmerName || 'Farmer';
          const resolvedCompanyId = options?.dealContext?.companyId
            || targetDeal?.companyId
            || resolveCompanyUser(undefined, rawCompanyName)?.id
            || '';
          const resolvedFarmerId = options?.dealContext?.farmerId
            || targetDeal?.farmerId
            || options?.actorId
            || resolveFarmerUser(undefined, rawFarmerName)?.id
            || '';
          const notificationDeal = {
            companyId: resolvedCompanyId,
            companyName: rawCompanyName,
            farmerId: resolvedFarmerId,
            farmerName: rawFarmerName,
            listingId: options?.dealContext?.listingId || targetDeal?.listingId || dealId,
          };
          addCompanyDealDecisionNotifications({
            companyId: notificationDeal.companyId,
            companyName: notificationDeal.companyName,
            farmerName: notificationDeal.farmerName,
            listingId: notificationDeal.listingId,
          }, status);
          addFarmerDealDecisionNotifications({
            farmerId: notificationDeal.farmerId,
            farmerName: notificationDeal.farmerName,
            companyName: notificationDeal.companyName,
            listingId: notificationDeal.listingId,
          }, status);
          markFarmerMatchRequestNotificationsResolved({
            farmerId: notificationDeal.farmerId,
            farmerName: notificationDeal.farmerName,
            companyName: notificationDeal.companyName,
            listingId: notificationDeal.listingId,
          });
        }
        if (options?.actorRole === 'company' && (status === 'negotiating' || status === 'locked' || status === 'order_placed' || status === 'cancelled' || status === 'completed')) {
          const rawCompanyName = options?.dealContext?.companyName || targetDeal?.companyName || 'Company';
          const rawFarmerName = options?.dealContext?.farmerName || targetDeal?.farmerName || 'Farmer';
          const resolvedFarmerId = options?.dealContext?.farmerId
            || targetDeal?.farmerId
            || resolveFarmerUser(undefined, rawFarmerName)?.id
            || '';
          const notificationDeal = {
            companyName: rawCompanyName,
            farmerId: resolvedFarmerId,
            farmerName: rawFarmerName,
            listingId: options?.dealContext?.listingId || targetDeal?.listingId || dealId,
          };
          addFarmerCompanyActionNotifications({
            farmerId: notificationDeal.farmerId,
            farmerName: notificationDeal.farmerName,
            companyName: notificationDeal.companyName,
            listingId: notificationDeal.listingId,
          }, status);
        }
        emitNotificationsUpdated();
      }
      return result;
    } catch (error) {
      const allowLocalFallback = shouldFallbackToMock(error)
        || (error instanceof ApiRequestError && error.status === 404 && Boolean(resolvedTargetDeal || options?.dealContext?.listingId))
        || (error instanceof ApiRequestError && typeof error.status === 'number' && error.status >= 500);
      if (!allowLocalFallback) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Could not update deal status.',
        };
      }
      console.warn('[API] Falling back to local/mock flow for deal status:', error);
    }

    await delay(300);
    const fallbackTargetDeal = resolvedTargetDeal || readCropDealsStore().find((deal) => deal.id === effectiveDealId) || readCropDealsStore().find((deal) => deal.id === dealId);
    if (!fallbackTargetDeal) return { success: false };

    const nowIso = new Date().toISOString();

    writeCropDealsStore(readCropDealsStore().map((deal) => (
      (deal.id === effectiveDealId || deal.id === dealId)
        ? {
          ...deal,
          status,
          agreedPrice: typeof options?.agreedPrice === 'number' ? options.agreedPrice : deal.agreedPrice,
          quantityKg: typeof options?.quantityKg === 'number' ? options.quantityKg : deal.quantityKg,
          confirmedAt: status === 'confirmed' ? nowIso : deal.confirmedAt,
          paymentGateway: options?.paymentGateway ?? deal.paymentGateway,
          paymentStatus: options?.paymentStatus ?? (status === 'completed' ? 'paid' : deal.paymentStatus),
        }
        : deal
    )));

    if (status === 'confirmed') {
      writeCropListingsStore(readCropListingsStore().map((listing) => (
        listing.id === fallbackTargetDeal.listingId
          ? { ...listing, status: 'matched', matchedCompanyId: fallbackTargetDeal.companyId }
          : listing
      )));
    }

    if (status === 'cancelled') {
      writeCropListingsStore(readCropListingsStore().map((listing) => (
        listing.id === fallbackTargetDeal.listingId
          ? { ...listing, status: 'active', matchedCompanyId: undefined }
          : listing
      )));
    }

    if (options?.actorRole === 'farmer' && (status === 'confirmed' || status === 'locked' || status === 'accepted' || status === 'cancelled')) {
      const rawCompanyName = options?.dealContext?.companyName || fallbackTargetDeal.companyName;
      const rawFarmerName = options?.dealContext?.farmerName || fallbackTargetDeal.farmerName;
      const resolvedCompanyId = options?.dealContext?.companyId
        || fallbackTargetDeal.companyId
        || resolveCompanyUser(undefined, rawCompanyName)?.id
        || '';
      const resolvedFarmerId = options?.dealContext?.farmerId
        || fallbackTargetDeal.farmerId
        || resolveFarmerUser(undefined, rawFarmerName)?.id
        || '';
      const notificationDeal = {
        companyId: resolvedCompanyId,
        companyName: rawCompanyName,
        farmerId: resolvedFarmerId,
        farmerName: rawFarmerName,
        listingId: options?.dealContext?.listingId || fallbackTargetDeal.listingId,
      };
      addCompanyDealDecisionNotifications({
        companyId: notificationDeal.companyId,
        companyName: notificationDeal.companyName,
        farmerName: notificationDeal.farmerName,
        listingId: notificationDeal.listingId,
      }, status, nowIso);
      addFarmerDealDecisionNotifications({
        farmerId: notificationDeal.farmerId,
        farmerName: notificationDeal.farmerName,
        companyName: notificationDeal.companyName,
        listingId: notificationDeal.listingId,
      }, status, nowIso);
      markFarmerMatchRequestNotificationsResolved({
        farmerId: notificationDeal.farmerId,
        farmerName: notificationDeal.farmerName,
        companyName: notificationDeal.companyName,
        listingId: notificationDeal.listingId,
      });
    }
    if (options?.actorRole === 'company' && (status === 'negotiating' || status === 'locked' || status === 'order_placed' || status === 'cancelled' || status === 'completed')) {
      const rawCompanyName = options?.dealContext?.companyName || fallbackTargetDeal.companyName;
      const rawFarmerName = options?.dealContext?.farmerName || fallbackTargetDeal.farmerName;
      const resolvedFarmerId = options?.dealContext?.farmerId
        || fallbackTargetDeal.farmerId
        || resolveFarmerUser(undefined, rawFarmerName)?.id
        || '';
      const notificationDeal = {
        companyName: rawCompanyName,
        farmerId: resolvedFarmerId,
        farmerName: rawFarmerName,
        listingId: options?.dealContext?.listingId || fallbackTargetDeal.listingId,
      };
      addFarmerCompanyActionNotifications({
        farmerId: notificationDeal.farmerId,
        farmerName: notificationDeal.farmerName,
        companyName: notificationDeal.companyName,
        listingId: notificationDeal.listingId,
      }, status, nowIso);
    }

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
    const localNotifications = readNotificationsStore().filter((n) => n.userId === userId);

    if (API_V1) {
      try {
        const apiNotifications = await apiRequest<Notification[]>(`/notifications/${encodeURIComponent(userId)}`);
        const merged = new Map<string, Notification>();
        [...apiNotifications, ...localNotifications].forEach((notification) => {
          const key = notification.id || `${notification.title}_${notification.message}_${notification.createdAt}_${notification.userId}`;
          merged.set(key, notification);
        });
        return Array.from(merged.values()).sort((left, right) => (
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        ));
      } catch (error) {
        console.warn(`[API] Falling back to local/mock notifications for ${userId}:`, error);
      }
    }

    await delay(400);
    return localNotifications;
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    const markLocally = () => {
      const notifications = readNotificationsStore().map((notification) => (
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      ));
      writeNotificationsStore(notifications);
    };

    try {
      const result = await apiRequest<{ success: boolean }>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' });
      markLocally();
      emitNotificationsUpdated();
      return result;
    } catch (error) {
      console.warn('[API] Falling back to local mock for notification read:', error);
    }

    await delay(200);
    markLocally();
    return { success: true };
  },

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    const markAllLocally = () => {
      const notifications = readNotificationsStore().map((notification) => (
        notification.userId === userId ? { ...notification, isRead: true } : notification
      ));
      writeNotificationsStore(notifications);
    };

    try {
      const result = await apiRequest<{ success: boolean }>(`/notifications/user/${encodeURIComponent(userId)}/read-all`, { method: 'PATCH' });
      markAllLocally();
      emitNotificationsUpdated();
      return result;
    } catch (error) {
      console.warn('[API] Falling back to local mock for notifications read all:', error);
    }

    await delay(300);
    markAllLocally();
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
    const orders = readOrdersStore();
    const pendingSettlements = orders.filter((order) => order.settlementStatus === 'ready_for_release').length;
    const heldSettlementAmount = orders
      .filter((order) => order.settlementStatus === 'held' || order.settlementStatus === 'ready_for_release')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    const releasedSettlementAmount = orders
      .filter((order) => order.settlementStatus === 'released')
      .reduce((sum, order) => sum + order.totalAmount, 0);
    return {
      totalFarmers: farmers.length,
      totalOfficers: officers.length,
      totalVendors: vendors.length,
      totalAdvisories: cases.length,
      activeAdvisories: cases.filter((item) => item.status !== 'closed' && item.status !== 'responded').length,
      totalOrders: orders.length,
      pendingSettlements,
      heldSettlementAmount,
      releasedSettlementAmount,
      mrr: tenants.reduce((sum, tenant) => sum + tenant.mrr, 0),
      uptime: MOCK_ADMIN_STATS.uptime,
      advisoryDeliveryRate: MOCK_ADMIN_STATS.advisoryDeliveryRate,
    };
    });
  },

  async getAdminOrders(filters?: Partial<{
    status: Order['status'];
    paymentStatus: Order['paymentStatus'];
    settlementStatus: NonNullable<Order['settlementStatus']>;
  }>): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
    if (filters?.settlementStatus) params.set('settlementStatus', filters.settlementStatus);
    const query = params.toString();
    return apiRequest<Order[]>(`/admin/orders${query ? `?${query}` : ''}`);
  },

  async updateOrderSettlement(orderId: string, action: 'release' | 'hold'): Promise<{ success: boolean; message?: string }> {
    try {
      return await apiRequest<{ success: boolean; message?: string }>(`/admin/orders/${encodeURIComponent(orderId)}/settlement`, {
        method: 'PATCH',
        body: JSON.stringify({ action, adminId: 'usr_adm_001' }),
      });
    } catch (error) {
      if (!shouldFallbackToMock(error)) {
        return { success: false, message: error instanceof Error ? error.message : 'Failed to update settlement.' };
      }
      console.warn('[API] Falling back to local mock for order settlement update:', error);
    }

    await delay(300);
    const targetOrder = readOrdersStore().find((order) => order.id === orderId);
    if (!targetOrder) {
      return { success: false, message: 'Order not found.' };
    }
    const normalized = normalizeOrderSettlement(targetOrder);
    if (action === 'release') {
      if (!['delivered', 'completed'].includes(normalized.status)) {
        return { success: false, message: 'Payment can be released only after delivery confirmation.' };
      }
      if (normalized.paymentStatus !== 'paid') {
        return { success: false, message: 'Order payment is not completed yet.' };
      }
    }

    const updatedAt = new Date().toISOString();
    const settlementMeta = readJsonRecord<{
      settlementStatus?: NonNullable<Order['settlementStatus']>;
      settlementReleasedAt?: string;
      settlementReleasedBy?: string;
    }>(ADMIN_ORDER_SETTLEMENT_META_STORAGE_KEY);
    writeJsonRecord(ADMIN_ORDER_SETTLEMENT_META_STORAGE_KEY, {
      ...settlementMeta,
      [orderId]: action === 'release'
        ? {
          settlementStatus: 'released',
          settlementReleasedAt: updatedAt,
          settlementReleasedBy: 'usr_adm_001',
        }
        : {
          settlementStatus: 'held',
          settlementReleasedAt: '',
          settlementReleasedBy: '',
        },
    });

    writeOrdersStore(readOrdersStore().map((order) => (
      order.id === orderId
        ? {
          ...order,
          settlementStatus: action === 'release' ? 'released' : 'held',
          settlementReleasedAt: action === 'release' ? updatedAt : undefined,
          settlementReleasedBy: action === 'release' ? 'usr_adm_001' : undefined,
        }
        : order
    )));

    addAuditLog({
      entity: 'order',
      action: action === 'release' ? 'settlement_release' : 'settlement_hold',
      actor: 'Super Admin',
      details: `${action === 'release' ? 'Released' : 'Held'} settlement for order ${orderId}.`,
    });

    return { success: true };
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
    try {
      return await apiRequest<{ success: boolean }>(`/admin/farmers/${encodeURIComponent(farmerId)}/state`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (!shouldFallbackToMock(error)) {
        return { success: false };
      }
      console.warn('[API] Falling back to local mock for farmer admin state:', error);
    }

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
    try {
      return await apiRequest<{ success: boolean }>(`/admin/officers/${encodeURIComponent(officerId)}/state`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (!shouldFallbackToMock(error)) {
        return { success: false };
      }
      console.warn('[API] Falling back to local mock for officer admin state:', error);
    }

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
