'use client';

import { useEffect, useState } from 'react';
import { authService, notificationService } from '@/services';
import type { DashboardRoleUser, ManagedUserRole } from '@/types';

interface UseRoleUserContextOptions {
  role: ManagedUserRole;
  fallbackUser: DashboardRoleUser;
}

export function useRoleUserContext({ role, fallbackUser }: UseRoleUserContextOptions) {
  const [user, setUser] = useState<DashboardRoleUser>(fallbackUser);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    const resolvedUser = currentUser?.role === role ? currentUser : fallbackUser;
    setUser(resolvedUser);

    const syncNotificationCount = () => {
      notificationService.getNotifications(resolvedUser.id)
        .then((notifications) => {
          setNotificationCount(notifications.filter((notification) => !notification.isRead).length);
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
  }, [fallbackUser, role]);

  return { user, notificationCount, loading };
}
