import {
  Bell, HandshakeIcon, LayoutDashboard, Settings, TrendingUp, User, Wheat,
} from 'lucide-react';
import type { NavItem } from '@/components/dashboard/DashboardShell';

export const COMPANY_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/company', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/company/listings', label: 'Browse Listings', icon: Wheat },
  { href: '/dashboard/company/matches', label: 'Matched Farmers', icon: HandshakeIcon },
  { href: '/dashboard/company/prices', label: 'Price Analytics', icon: TrendingUp },
  { href: '/dashboard/company/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/company/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/company/settings', label: 'Settings', icon: Settings },
];

export const COMPANY_FALLBACK_USER = {
  id: 'usr_cmp_001',
  companyId: 'CMP-001',
  name: 'AgroTrade BD',
  nameBn: 'এগ্রোট্রেড বিডি',
  email: 'company@ams.com.bd',
  phone: '01711000012',
  role: 'company' as const,
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
  bkashAccount: '01711000012',
};
