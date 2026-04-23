import {
  Bell, LayoutDashboard, Package, Settings, ShoppingCart, TrendingUp, User,
} from 'lucide-react';
import type { NavItem } from '@/components/dashboard/DashboardShell';

export const VENDOR_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/vendor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/vendor/products', label: 'My Products', icon: Package },
  { href: '/dashboard/vendor/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/vendor/analytics', label: 'Sales Analytics', icon: TrendingUp },
  { href: '/dashboard/vendor/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/vendor/notifications', label: 'Alerts', icon: Bell },
  { href: '/dashboard/vendor/settings', label: 'Settings', icon: Settings },
];

export const VENDOR_FALLBACK_USER = {
  id: 'usr_vnd_001',
  vendorId: 'VND-001',
  name: 'AgroSupply BD',
  nameBn: 'এগ্রো সাপ্লাই বিডি',
  email: 'vendor@ams.com.bd',
  phone: '01711000011',
  role: 'vendor' as const,
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
  bkashAccount: '01711000011',
};
