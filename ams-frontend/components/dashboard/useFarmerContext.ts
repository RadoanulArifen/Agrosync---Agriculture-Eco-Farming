'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard, MessageSquare, ShoppingCart, Wheat,
  TrendingUp, CloudRain, Bell, User, Package, Handshake,
} from 'lucide-react';
import { authService, notificationService } from '@/services';
import type { Farmer } from '@/types';
import type { NavItem } from '@/components/dashboard/DashboardShell';

export const FARMER_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/farmer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/farmer/advisory', label: 'Crop Advisory', icon: MessageSquare },
  { href: '/dashboard/farmer/marketplace', label: 'Marketplace', icon: ShoppingCart },
  { href: '/dashboard/farmer/crop-listings', label: 'My Crop Listings', icon: Wheat },
  { href: '/dashboard/farmer/deals', label: 'Deals', icon: Handshake },
  { href: '/dashboard/farmer/sales-orders', label: 'Sales Orders', icon: Package },
  { href: '/dashboard/farmer/orders', label: 'My Orders Tracking', icon: Package },
  { href: '/dashboard/farmer/prices', label: 'Price Tracker', icon: TrendingUp },
  { href: '/dashboard/farmer/weather', label: 'Weather', icon: CloudRain },
  { href: '/dashboard/farmer/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/farmer/profile', label: 'My Profile', icon: User },
];

export function useFarmerContext() {
  const resolveFarmer = () => authService.getCurrentFarmer() ?? null;

  const [farmer, setFarmer] = useState<Farmer | null>(() => (
    typeof window === 'undefined' ? null : resolveFarmer()
  ));
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(() => typeof window === 'undefined');

  useEffect(() => {
    const syncFarmer = () => {
      const currentFarmer = resolveFarmer();
      setFarmer(currentFarmer);
      return currentFarmer;
    };

    const currentFarmer = syncFarmer();

    if (!currentFarmer) {
      setLoading(false);
      return;
    }

    const syncNotificationCount = (targetFarmer = syncFarmer()) => {
      if (!targetFarmer) {
        setUnreadNotifications(0);
        setLoading(false);
        return;
      }

      notificationService.getNotifications(targetFarmer.id)
        .then((notifications) => {
          setUnreadNotifications(notifications.filter((notification) => !notification.isRead).length);
        })
        .finally(() => setLoading(false));
    };

    syncNotificationCount();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && !['ams_notifications', 'ams_notifications_sync', 'ams_role_users', 'ams_current_role_user_id', 'ams_current_role_user_ids_by_role', 'ams_current_farmer_id'].includes(event.key)) return;
      syncNotificationCount();
    };

    const handleUserSessionUpdated = () => {
      syncNotificationCount();
    };

    const handleNotificationsUpdated = () => {
      syncNotificationCount();
    };

    const intervalId = window.setInterval(() => {
      syncNotificationCount();
    }, 5000);

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleNotificationsUpdated);
    window.addEventListener('ams:notifications-updated', handleNotificationsUpdated);
    window.addEventListener('ams:user-session-updated', handleUserSessionUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleNotificationsUpdated);
      window.removeEventListener('ams:notifications-updated', handleNotificationsUpdated);
      window.removeEventListener('ams:user-session-updated', handleUserSessionUpdated);
    };
  }, []);

  return { farmer, unreadNotifications, loading };
}
