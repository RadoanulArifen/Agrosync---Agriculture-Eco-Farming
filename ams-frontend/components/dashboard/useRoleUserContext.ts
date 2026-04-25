'use client';

import { useEffect, useState } from 'react';
import { authService, notificationService } from '@/services';
import type { DashboardRoleUser, ManagedUserRole } from '@/types';

interface UseRoleUserContextOptions {
  role: ManagedUserRole;
  fallbackUser: DashboardRoleUser;
}

export function useRoleUserContext({ role, fallbackUser }: UseRoleUserContextOptions) {
  const resolveUser = () => {
    const currentUser = authService.getCurrentUser();
    return currentUser?.role === role ? currentUser : fallbackUser;
  };

  const [user, setUser] = useState<DashboardRoleUser>(() => (
    typeof window === 'undefined' ? fallbackUser : resolveUser()
  ));
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(() => typeof window === 'undefined');

  useEffect(() => {
    const syncUser = () => {
      const resolvedUser = resolveUser();
      setUser(resolvedUser);
      return resolvedUser;
    };

    const resolvedUser = syncUser();

    const syncNotificationCount = (targetUser = syncUser()) => {
      notificationService.getNotifications(targetUser.id)
        .then((notifications) => {
          setNotificationCount(notifications.filter((notification) => !notification.isRead).length);
        })
        .finally(() => setLoading(false));
    };

    syncNotificationCount();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && !['ams_notifications', 'ams_role_users', 'ams_current_role_user_id'].includes(event.key)) return;
      syncNotificationCount();
    };

    const handleUserSessionUpdated = () => {
      syncNotificationCount();
    };

    const handleNotificationsUpdated = () => {
      syncNotificationCount();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleNotificationsUpdated);
    window.addEventListener('ams:notifications-updated', handleNotificationsUpdated);
    window.addEventListener('ams:user-session-updated', handleUserSessionUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleNotificationsUpdated);
      window.removeEventListener('ams:notifications-updated', handleNotificationsUpdated);
      window.removeEventListener('ams:user-session-updated', handleUserSessionUpdated);
    };
  }, [fallbackUser, role]);

  return { user, notificationCount, loading };
}
