'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, Siren } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { OFFICER_FALLBACK_USER, OFFICER_NAV_ITEMS } from '@/components/dashboard/officerConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { notificationService } from '@/services';
import type { Notification } from '@/types';
import { formatDateTime } from '@/utils';

export default function OfficerNotificationsPage() {
  const { user, notificationCount } = useRoleUserContext({
    role: 'officer',
    fallbackUser: OFFICER_FALLBACK_USER,
  });
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    const nextNotifications = await notificationService.getNotifications(user.id);
    setSystemNotifications(nextNotifications);
    return nextNotifications;
  };

  useEffect(() => {
    loadNotifications();
  }, [user.id]);

  const unreadNotifications = useMemo(
    () => systemNotifications.filter((notification) => !notification.isRead),
    [systemNotifications],
  );
  const newCaseAlerts = useMemo(
    () => unreadNotifications.filter((notification) => notification.type === 'advisory'),
    [unreadNotifications],
  );
  const urgentAlerts = useMemo(
    () => unreadNotifications.filter((notification) => /urgent/i.test(`${notification.title} ${notification.message}`)),
    [unreadNotifications],
  );
  const outbreakWarnings = useMemo(
    () => unreadNotifications.filter((notification) => /outbreak|hotspot/i.test(`${notification.title} ${notification.message}`)),
    [unreadNotifications],
  );

  const handleMarkAllAsDone = async () => {
    if (unreadNotifications.length === 0) return;

    setMarkingAll(true);
    await notificationService.markAllAsRead(user.id);
    await loadNotifications();
    setMarkingAll(false);
  };

  return (
    <DashboardShell navItems={OFFICER_NAV_ITEMS} role="officer" userName={user.name} userSubtitle={user.designation || 'Agricultural Officer'} notificationCount={notificationCount}>
      <PageHeader title="Alerts" subtitle="Notification center for new cases, outbreak warnings, and urgent advisories" />

      <Card className="mb-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader title="Notification Summary" subtitle={notificationCount > 0 ? `${notificationCount} unread system notification${notificationCount > 1 ? 's' : ''}` : 'System notifications are up to date'} />
          <button
            type="button"
            onClick={handleMarkAllAsDone}
            disabled={markingAll || unreadNotifications.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? 'Updating...' : 'Mark all as done'}
          </button>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="text-xs text-blue-500">New Case Alerts</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{newCaseAlerts.length}</div>
          </div>
          <div className="rounded-2xl bg-red-50 p-4">
            <div className="text-xs text-red-500">Outbreak Warnings</div>
            <div className="text-2xl font-bold text-red-700 mt-1">{outbreakWarnings.length}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="text-xs text-amber-500">Urgent Advisory</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{urgentAlerts.length}</div>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Unread Inbox</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">{unreadNotifications.length}</div>
          </div>
        </div>
      </Card>

      {systemNotifications.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="No alerts right now" description="Officer notifications will appear here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {systemNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.isRead
                ? 'border border-gray-100 bg-gray-50'
                : /urgent/i.test(`${notification.title} ${notification.message}`)
                  ? 'border border-amber-100 bg-amber-50/80'
                  : /outbreak|hotspot/i.test(`${notification.title} ${notification.message}`)
                    ? 'border border-red-100 bg-red-50/80'
                    : 'border border-blue-100 bg-blue-50/50'}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.isRead ? 'bg-gray-300' : /urgent/i.test(`${notification.title} ${notification.message}`) ? 'bg-amber-500' : /outbreak|hotspot/i.test(`${notification.title} ${notification.message}`) ? 'bg-red-500' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {notification.title.toLowerCase().includes('urgent') ? <Siren className="h-4 w-4 text-amber-600" /> : notification.title.toLowerCase().includes('outbreak') || notification.title.toLowerCase().includes('hotspot') ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <Bell className="h-4 w-4 text-blue-600" />}
                    <div className="font-semibold text-sm text-gray-800">{notification.title}</div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{notification.message}</div>
                  <div className="mt-2 text-xs text-gray-400">{formatDateTime(notification.createdAt)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
