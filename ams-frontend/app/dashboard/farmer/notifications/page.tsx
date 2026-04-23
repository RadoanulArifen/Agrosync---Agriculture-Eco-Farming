'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { notificationService } from '@/services';
import type { Notification } from '@/types';
import { formatDateTime } from '@/utils';

export default function FarmerNotificationsPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async (farmerId: string) => {
    const nextNotifications = await notificationService.getNotifications(farmerId);
    setNotifications(nextNotifications);
    return nextNotifications;
  };

  useEffect(() => {
    if (!farmer) return;

    loadNotifications(farmer.id).then(async (nextNotifications) => {
      if (nextNotifications.some((notification) => !notification.isRead)) {
        await notificationService.markAllAsRead(farmer.id);
        await loadNotifications(farmer.id);
      }
    });
  }, [farmer]);

  const handleMarkAllAsDone = async () => {
    if (!farmer || unreadNotifications === 0) return;

    setMarkingAll(true);
    await notificationService.markAllAsRead(farmer.id);
    await loadNotifications(farmer.id);
    setMarkingAll(false);
  };

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading notifications..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="Notifications" subtitle="Recent alerts, advisory updates, and platform messages" />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader title="Inbox" subtitle={unreadNotifications > 0 ? `${unreadNotifications} unread notification${unreadNotifications > 1 ? 's' : ''}` : 'All notifications are up to date'} />
          <button
            type="button"
            onClick={handleMarkAllAsDone}
            disabled={markingAll || unreadNotifications === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? 'Updating...' : 'Mark all as done'}
          </button>
        </div>
      </Card>

      {notifications.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="No notifications yet" description="Farmer notifications will appear here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.isRead ? '' : 'border-blue-100 bg-blue-50/50'}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full ${notification.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">{notification.title}</div>
                  <div className="text-sm text-gray-500 mt-1">{notification.message}</div>
                  <div className="text-xs text-gray-400 mt-2">{formatDateTime(notification.createdAt)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
