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

    notificationService.getNotifications(resolvedUser.id)
      .then((notifications) => {
        setNotificationCount(notifications.filter((notification) => !notification.isRead).length);
      })
      .finally(() => setLoading(false));
  }, [fallbackUser, role]);

  return { user, notificationCount, loading };
}
