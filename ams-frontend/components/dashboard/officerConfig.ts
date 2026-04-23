'use client';

import { Bell, LayoutDashboard, Map, MessageSquare, Settings, User } from 'lucide-react';
import type { DashboardRoleUser } from '@/types';
import type { NavItem } from '@/components/dashboard/DashboardShell';

export const OFFICER_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/officer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/officer/cases', label: 'Advisory Cases', icon: MessageSquare, badge: 3 },
  { href: '/dashboard/officer/map', label: 'Regional Map', icon: Map },
  { href: '/dashboard/officer/notifications', label: 'Alerts', icon: Bell, badge: 1 },
  { href: '/dashboard/officer/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/officer/settings', label: 'Settings', icon: Settings },
];

export const OFFICER_FALLBACK_USER: DashboardRoleUser = {
  id: 'usr_off_001',
  officerId: 'OFF-001',
  name: 'Dr. Rahim Uddin',
  nameBn: 'ডঃ রহিম উদ্দিন',
  phone: '01711000001',
  email: 'rahim@dae.gov.bd',
  role: 'officer',
  tenantId: 'tenant_001',
  specialtyTags: ['Rice Disease', 'Pest Control'],
  regionDistricts: ['Mymensingh', 'Tangail', 'Jamalpur'],
  designation: 'Agricultural Officer',
  accessLabel: 'Regional Advisory Officer',
  district: 'Mymensingh',
  division: 'Mymensingh',
  avatar: 'https://i.pravatar.cc/150?img=11',
  createdAt: '2026-01-05T00:00:00Z',
  password: 'password123',
};
