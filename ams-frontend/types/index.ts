// ============================================================
// USER & AUTH TYPES
// ============================================================
export type UserRole = 'farmer' | 'officer' | 'vendor' | 'company' | 'admin' | 'super_admin';
export type ManagedUserRole = 'farmer' | 'officer' | 'vendor' | 'company' | 'admin';

export interface User {
  id: string;
  name: string;
  nameBn?: string;
  email?: string;
  phone: string;
  role: UserRole;
  tenantId: string;
  avatar?: string;
  createdAt: string;
}

export interface Farmer extends User {
  fid: string; // AGS-YYYY-XXXXXXX
  nidHash: string;
  district: string;
  upazila: string;
  division: string;
  landAcres: number;
  cropTypes: string[];
  cooperativeId?: string;
  bkashAccount?: string;
}

export interface Officer extends User {
  officerId: string;
  specialtyTags: string[];
  regionDistricts: string[];
  maxActiveCases: number;
  availabilityStatus: 'available' | 'busy' | 'offline';
}

export interface Vendor extends User {
  vendorId: string;
  companyName: string;
  deliveryDistricts: string[];
  totalProducts: number;
}

export interface Company extends User {
  companyId: string;
  companyName: string;
  registrationNo: string;
  cropInterests: string[];
}

export interface DashboardRoleUser extends User {
  role: ManagedUserRole;
  password: string;
  fid?: string;
  officerId?: string;
  vendorId?: string;
  companyId?: string;
  companyName?: string;
  registrationNo?: string;
  nidHash?: string;
  division?: string;
  district?: string;
  upazila?: string;
  landAcres?: number;
  cropTypes?: string[];
  cropInterests?: string[];
  bkashAccount?: string;
  specialtyTags?: string[];
  regionDistricts?: string[];
  deliveryDistricts?: string[];
  designation?: string;
  accessLabel?: string;
}

// ============================================================
// ADVISORY TYPES
// ============================================================
export type AdvisoryStatus = 'pending' | 'ai_analyzed' | 'assigned' | 'responded' | 'closed' | 'escalated';
export type AdvisoryPriority = 'normal' | 'urgent';

export interface AdvisoryCase {
  id: string; // ADV-YYYY-XXXXXXX
  farmerId: string;
  farmerName: string;
  farmerDivision?: string;
  farmerDistrict: string;
  farmerUpazila?: string;
  cropType: string;
  description: string;
  photos: string[];
  status: AdvisoryStatus;
  priority?: AdvisoryPriority;
  aiDiagnosis?: string;
  aiConfidence?: number;
  officerId?: string;
  officerName?: string;
  officerResponse?: string;
  createdAt: string;
  respondedAt?: string;
  closedAt?: string;
}

// ============================================================
// MARKETPLACE TYPES
// ============================================================
export type ProductCategory =
  | 'Fertilizer'
  | 'Pesticide'
  | 'Seed'
  | 'Medicine'
  | 'Equipment'
  | 'Organic'
  | 'Fresh Vegetables'
  | 'Dairy';

export interface Product {
  id: string;
  vendorId: string;
  vendorName: string;
  nameEn: string;
  nameBn: string;
  category: ProductCategory;
  price: number;
  unit: string;
  stockQty: number;
  description: string;
  manufacturer: string;
  photos: string[];
  deliveryDistricts: string[];
  estimatedDeliveryDays: number;
  rating: number;
  reviewCount: number;
  isRecommended?: boolean;
}

export type OrderStatus = 'pending' | 'confirmed' | 'accepted' | 'dispatched' | 'delivered' | 'completed' | 'cancelled' | 'returned';
export type PaymentGateway = 'bkash' | 'nagad' | 'cod' | 'stripe';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
}

export interface Order {
  id: string; // ORD-YYYY-XXXXXXXX
  farmerId: string;
  farmerName: string;
  vendorId: string;
  vendorName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentGateway: PaymentGateway;
  paymentStatus: 'paid' | 'pending' | 'failed';
  settlementStatus?: 'held' | 'ready_for_release' | 'released';
  settlementReleasedAt?: string;
  settlementReleasedBy?: string;
  placedAt: string;
  deliveredAt?: string;
  estimatedDelivery: string;
}

// ============================================================
// CROP LISTING TYPES
// ============================================================
export type QualityGrade = 'A' | 'B' | 'C';

export interface CropListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerDistrict: string;
  productCategory?: Extract<ProductCategory, 'Organic' | 'Fresh Vegetables' | 'Dairy'>;
  cropType: string;
  variety: string;
  quantityKg: number;
  qualityGrade: QualityGrade;
  askingPrice: number; // per kg
  harvestDate: string;
  district: string;
  upazila: string;
  photos: string[];
  status: 'active' | 'matched' | 'sold' | 'expired';
  createdAt: string;
  matchedCompanyId?: string;
}

export interface CropDeal {
  id: string;
  listingId: string;
  companyId: string;
  companyName: string;
  farmerId: string;
  farmerName: string;
  agreedPrice: number;
  quantityKg: number;
  commissionPct: number;
  commissionAmt: number;
  status: 'pending' | 'confirmed' | 'negotiating' | 'locked' | 'order_placed' | 'accepted' | 'delivered' | 'completed' | 'cancelled';
  confirmedAt?: string;
  paymentGateway?: PaymentGateway;
  paymentStatus?: 'paid' | 'pending' | 'failed';
}

// ============================================================
// PRICE TRACKING TYPES
// ============================================================
export interface CropPrice {
  cropType: string;
  currentPrice: number;
  unit: string;
  change7d: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  history: { date: string; price: number }[];
}

// ============================================================
// WEATHER TYPES
// ============================================================
export interface WeatherData {
  district: string;
  date: string;
  tempMin: number;
  tempMax: number;
  rainfall: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
  advisory?: string;
}

export interface WeatherForecast {
  location: string;
  district: string;
  current: WeatherData;
  forecast: WeatherData[];
  alerts: string[];
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================
export type NotificationChannel = 'sms' | 'email' | 'push' | 'whatsapp';
export type NotificationType = 'advisory' | 'order' | 'price_alert' | 'weather' | 'payment' | 'system' | 'crop_deal';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel[];
  isRead: boolean;
  createdAt: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  outbreakWarnings: boolean;
  urgentAdvisory: boolean;
  newCaseAlert: boolean;
}

// ============================================================
// DASHBOARD STATS TYPES
// ============================================================
export interface FarmerStats {
  totalAdvisories: number;
  activeOrders: number;
  activeListings: number;
  totalSpent: number;
  totalEarned: number;
}

export interface AdminStats {
  totalFarmers: number;
  totalOfficers: number;
  totalVendors: number;
  totalAdvisories: number;
  activeAdvisories: number;
  totalOrders?: number;
  pendingSettlements?: number;
  heldSettlementAmount?: number;
  releasedSettlementAmount?: number;
  mrr: number;
  uptime: string;
  advisoryDeliveryRate: number;
}

export interface OfficerStats {
  assignedCases: number;
  resolvedToday: number;
  avgResponseTime: string;
  pendingCases: number;
}

export interface VendorStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  monthlyRevenue: number;
  lowStockProducts: number;
}

// ============================================================
// SUBSCRIPTION / BILLING TYPES
// ============================================================
export type PlanTier = 'basic' | 'standard' | 'professional' | 'enterprise';

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  features: {
    farmerRegistrations: string;
    aaeCases: string;
    smsPerMonth: string;
    marketplace: string;
    cropListing: boolean;
    weatherAlerts: boolean;
    aiChatbot: boolean;
    mobileApp: string;
    support: string;
    apiAccess: string;
  };
}

// ============================================================
// TENANT TYPES
// ============================================================
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  planTier: PlanTier;
  adminUserId: string;
  status: 'active' | 'suspended' | 'trial';
  farmerCount: number;
  createdAt: string;
  mrr: number;
}

// ============================================================
// BLOG / NEWS TYPES
// ============================================================
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  thumbnail: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
}

// ============================================================
// TESTIMONIAL TYPES
// ============================================================
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  district: string;
  avatar: string;
  rating: number;
  text: string;
}
