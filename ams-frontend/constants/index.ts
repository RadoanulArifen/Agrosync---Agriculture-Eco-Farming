import type { SubscriptionPlan } from '@/types';

export const APP_NAME = 'AgriculMS';
export const APP_NAME_BN = 'কৃষি ব্যবস্থাপনা';
export const APP_TAGLINE = 'AI-Powered Digital Agriculture Platform for Bangladesh';

export const DISTRICTS = [
  'Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barishal',
  'Sylhet', 'Rangpur', 'Mymensingh', 'Comilla', 'Gazipur',
  'Narayanganj', 'Tangail', 'Faridpur', 'Bogura', 'Dinajpur',
];

export const CROP_TYPES = [
  'Rice (Aman)', 'Rice (Boro)', 'Rice (Aus)', 'Wheat', 'Jute',
  'Mustard', 'Potato', 'Onion', 'Garlic', 'Tomato',
  'Brinjal', 'Pumpkin', 'Lentil', 'Chickpea', 'Mango',
  'Banana', 'Papaya', 'Sugarcane', 'Maize', 'Sunflower',
];

export const PRODUCT_CATEGORIES = [
  'Fertilizer', 'Pesticide', 'Seed', 'Medicine', 'Equipment',
] as const;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    priceMonthly: 999,
    priceAnnual: 9590,
    features: {
      farmerRegistrations: 'Up to 50',
      aaeCases: '50 cases/mo',
      smsPerMonth: '200/mo',
      marketplace: 'View only',
      cropListing: false,
      weatherAlerts: false,
      aiChatbot: false,
      mobileApp: 'Basic',
      support: '72hr email',
      apiAccess: 'None',
    },
  },
  {
    id: 'standard',
    name: 'Standard',
    priceMonthly: 2999,
    priceAnnual: 28790,
    features: {
      farmerRegistrations: 'Up to 200',
      aaeCases: '200 cases/mo',
      smsPerMonth: '1,000/mo',
      marketplace: 'Full',
      cropListing: true,
      weatherAlerts: true,
      aiChatbot: false,
      mobileApp: 'Full',
      support: '48hr email+chat',
      apiAccess: 'Read-only',
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    priceMonthly: 5999,
    priceAnnual: 57590,
    features: {
      farmerRegistrations: 'Up to 1,000',
      aaeCases: '1,000 cases/mo',
      smsPerMonth: '5,000/mo',
      marketplace: 'Full',
      cropListing: true,
      weatherAlerts: true,
      aiChatbot: true,
      mobileApp: 'Full',
      support: '12hr priority',
      apiAccess: 'Full',
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 0,
    priceAnnual: 0,
    features: {
      farmerRegistrations: 'Unlimited',
      aaeCases: 'Unlimited',
      smsPerMonth: 'Unlimited',
      marketplace: 'Full',
      cropListing: true,
      weatherAlerts: true,
      aiChatbot: true,
      mobileApp: 'Full + White-Label',
      support: 'Dedicated CSM + 4hr SLA',
      apiAccess: 'Full + Webhook',
    },
  },
];

export const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#products', label: 'Products' },
  { href: '#blog', label: 'Blog' },
  { href: '#contact', label: 'Contact' },
];

export const DASHBOARD_ROUTES = {
  farmer: '/dashboard/farmer',
  admin: '/dashboard/admin',
  officer: '/dashboard/officer',
  vendor: '/dashboard/vendor',
  company: '/dashboard/company',
};

export const DASHBOARD_PROFILE_ROUTES = {
  farmer: '/dashboard/farmer/profile',
  admin: '/dashboard/admin/profile',
  officer: '/dashboard/officer/profile',
  vendor: '/dashboard/vendor/profile',
  company: '/dashboard/company/profile',
};

export const DASHBOARD_NOTIFICATION_ROUTES = {
  farmer: '/dashboard/farmer/notifications',
  admin: '/dashboard/admin/notifications',
  officer: '/dashboard/officer/notifications',
  vendor: '/dashboard/vendor/notifications',
  company: '/dashboard/company/notifications',
};
