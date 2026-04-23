'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard, MessageSquare, ShoppingCart, Wheat,
  TrendingUp, CloudRain, Bell, User, Package,
} from 'lucide-react';
import { authService, notificationService } from '@/services';
import type { Farmer } from '@/types';
import type { NavItem } from '@/components/dashboard/DashboardShell';

export const FARMER_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/farmer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/farmer/advisory', label: 'Crop Advisory', icon: MessageSquare },
  { href: '/dashboard/farmer/marketplace', label: 'Marketplace', icon: ShoppingCart },
  { href: '/dashboard/farmer/crop-listings', label: 'My Crop Listings', icon: Wheat },
  { href: '/dashboard/farmer/orders', label: 'My Orders', icon: Package },
  { href: '/dashboard/farmer/prices', label: 'Price Tracker', icon: TrendingUp },
  { href: '/dashboard/farmer/weather', label: 'Weather', icon: CloudRain },
  { href: '/dashboard/farmer/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/farmer/profile', label: 'My Profile', icon: User },
];

export function useFarmerContext() {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentFarmer = authService.getCurrentFarmer() ?? null;
    setFarmer(currentFarmer);

    if (!currentFarmer) {
      setLoading(false);
      return;
    }

    const syncNotificationCount = () => {
      notificationService.getNotifications(currentFarmer.id)
        .then((notifications) => {
          setUnreadNotifications(notifications.filter((notification) => !notification.isRead).length);
        })
        .finally(() => setLoading(false));
    };

    syncNotificationCount();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== 'ams_notifications') return;
      syncNotificationCount();
    };

    const handleNotificationsUpdated = () => {
      syncNotificationCount();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleNotificationsUpdated);
    window.addEventListener('ams:notifications-updated', handleNotificationsUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleNotificationsUpdated);
      window.removeEventListener('ams:notifications-updated', handleNotificationsUpdated);
    };
  }, []);

  return { farmer, unreadNotifications, loading };
}
