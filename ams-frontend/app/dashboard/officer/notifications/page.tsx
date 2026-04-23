'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, Siren } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { OFFICER_FALLBACK_USER, OFFICER_NAV_ITEMS } from '@/components/dashboard/officerConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { notificationService } from '@/services';
import type { Notification } from '@/types';
import { formatDateTime } from '@/utils';

const ALERTS = [
  { id: 'alert_001', type: 'New Case Alert', icon: Bell, color: 'bg-blue-50 border-blue-100 text-blue-700', text: '3 new farmer advisory cases need review in Mymensingh.' },
  { id: 'alert_002', type: 'Outbreak Warning', icon: AlertTriangle, color: 'bg-red-50 border-red-100 text-red-700', text: 'Possible Rice Blast hotspot detected across Mymensingh paddy belts.' },
  { id: 'alert_003', type: 'Urgent Advisory', icon: Siren, color: 'bg-amber-50 border-amber-100 text-amber-700', text: 'One urgent mustard advisory has been pending for more than 6 hours.' },
];

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

  const handleMarkAllAsDone = async () => {
    if (notificationCount === 0) return;

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
            disabled={markingAll || notificationCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? 'Updating...' : 'Mark all as done'}
          </button>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="text-xs text-blue-500">New Case Alerts</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">3</div>
          </div>
          <div className="rounded-2xl bg-red-50 p-4">
            <div className="text-xs text-red-500">Outbreak Warnings</div>
            <div className="text-2xl font-bold text-red-700 mt-1">1</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="text-xs text-amber-500">Urgent Advisory</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">1</div>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="text-xs text-gray-500">System Inbox</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">{systemNotifications.length}</div>
          </div>
        </div>
      </Card>

      {ALERTS.length === 0 && systemNotifications.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="No alerts right now" description="Officer notifications will appear here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {systemNotifications.map((notification) => (
            <Card key={notification.id} className={notification.isRead ? 'border border-gray-100 bg-gray-50' : 'border border-blue-100 bg-blue-50/50'}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-800">{notification.title}</div>
                  <div className="mt-1 text-sm text-gray-600">{notification.message}</div>
                  <div className="mt-2 text-xs text-gray-400">{formatDateTime(notification.createdAt)}</div>
                </div>
              </div>
            </Card>
          ))}
          {ALERTS.map((alert) => {
            const Icon = alert.icon;
            return (
              <Card key={alert.id} className={`border ${alert.color}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{alert.type}</div>
                    <div className="text-sm mt-1">{alert.text}</div>
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
