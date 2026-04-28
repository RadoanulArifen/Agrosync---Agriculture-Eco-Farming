import {
  Activity, Building2, CreditCard, LayoutDashboard, Map, MessageSquare, Package, ShoppingCart,
  Settings, TrendingUp, User, UserCheck, Users,
} from 'lucide-react';
import type { NavItem } from '@/components/dashboard/DashboardShell';

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/dashboard/admin/farmers', label: 'Farmers', icon: Users },
  { href: '/dashboard/admin/officers', label: 'Officers', icon: UserCheck },
  { href: '/dashboard/admin/vendors', label: 'Vendors', icon: Package },
  { href: '/dashboard/admin/orders', label: 'Order Control', icon: ShoppingCart },
  { href: '/dashboard/admin/advisory', label: 'Advisory Cases', icon: MessageSquare },
  { href: '/dashboard/admin/regional-map', label: 'Regional Map', icon: Map },
  { href: '/dashboard/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/dashboard/admin/audit', label: 'Audit Logs', icon: Activity },
  { href: '/dashboard/admin/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
];

export const ADMIN_FALLBACK_USER = {
  id: 'usr_adm_001',
  name: 'Super Admin',
  nameBn: 'সুপার অ্যাডমিন',
  email: 'admin@ams.com.bd',
  phone: '01711000010',
  role: 'admin' as const,
  tenantId: 'tenant_001',
  avatar: 'https://i.pravatar.cc/150?img=30',
  createdAt: '2026-01-01T00:00:00Z',
  password: 'password123',
  designation: 'Platform Administrator',
  district: 'Dhaka',
  division: 'Dhaka',
  accessLabel: 'Full Platform Access',
};
