'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, CreditCard, ShieldAlert,
} from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader,
} from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService, notificationService } from '@/services';
import type { Notification } from '@/types';
import { formatDateTime } from '@/utils';

export default function AdminNotificationsPage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);
  const [activeCases, setActiveCases] = useState(0);

  useEffect(() => {
    notificationService.getNotifications(user.id).then(setSystemNotifications);
    adminService.getStats().then((stats) => setActiveCases(stats.activeAdvisories));
  }, [user.id]);

  const alerts = useMemo(() => {
    const platformAlerts = [
      activeCases > 0 ? {
        id: 'active_cases',
        title: 'Active advisory cases',
        message: `${activeCases} advisory cases currently need admin attention across the platform.`,
        icon: AlertTriangle,
        color: 'border-amber-100 bg-amber-50 text-amber-700',
        createdAt: new Date().toISOString(),
      } : null,
      {
        id: 'security_watch',
        title: 'Security watch',
        message: 'Repeated failed login attempts are being monitored in the audit system.',
        icon: ShieldAlert,
        color: 'border-red-100 bg-red-50 text-red-700',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'billing_watch',
        title: 'Billing overview',
        message: 'Tenant billing, subscriptions, and revenue events are available for review.',
        icon: CreditCard,
        color: 'border-blue-100 bg-blue-50 text-blue-700',
        createdAt: new Date().toISOString(),
      },
    ].filter(Boolean) as Array<{
      id: string;
      title: string;
      message: string;
      icon: typeof Bell;
      color: string;
      createdAt: string;
    }>;

    const mappedSystem = systemNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      icon: Bell,
      color: 'border-gray-100 bg-gray-50 text-gray-700',
      createdAt: notification.createdAt,
    }));

    return [...platformAlerts, ...mappedSystem];
  }, [activeCases, systemNotifications]);

  return (
    <DashboardShell
      navItems={ADMIN_NAV_ITEMS}
      role="admin"
      userName={user.name}
      userSubtitle={user.designation || 'Platform Administrator'}
      notificationCount={notificationCount || alerts.length}
    >
      <PageHeader title="Notifications" subtitle="Platform alerts, security watch items, and admin-level system updates" />

      <Card className="mb-6">
        <SectionHeader title="Alert Summary" subtitle="Admin notification center" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="text-xs text-amber-600">Active Cases</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{activeCases}</div>
          </div>
          <div className="rounded-2xl bg-red-50 p-4">
            <div className="text-xs text-red-600">Security Watch</div>
            <div className="mt-1 text-2xl font-bold text-red-900">1</div>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="text-xs text-blue-600">System Updates</div>
            <div className="mt-1 text-2xl font-bold text-blue-900">{systemNotifications.length}</div>
          </div>
        </div>
      </Card>

      {alerts.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="No notifications yet" description="Admin platform notifications will appear here automatically." />
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <Card key={alert.id} className={`border ${alert.color}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div className="font-semibold">{alert.title}</div>
                      <div className="text-xs opacity-80">{formatDateTime(alert.createdAt)}</div>
                    </div>
                    <div className="mt-1 text-sm">{alert.message}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
