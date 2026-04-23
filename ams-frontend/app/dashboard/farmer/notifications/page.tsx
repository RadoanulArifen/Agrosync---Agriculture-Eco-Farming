'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { notificationService } from '@/services';
import type { Notification } from '@/types';
import { formatDateTime } from '@/utils';

export default function FarmerNotificationsPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!farmer) return;
    notificationService.getNotifications(farmer.id).then(setNotifications);
  }, [farmer]);

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
