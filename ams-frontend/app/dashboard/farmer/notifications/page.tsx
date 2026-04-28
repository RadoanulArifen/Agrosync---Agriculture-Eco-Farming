'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { cropService, notificationService } from '@/services';
import type { Notification } from '@/types';
import { formatDateTime } from '@/utils';

export default function FarmerNotificationsPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingDealIdsByListing, setPendingDealIdsByListing] = useState<Record<string, string>>({});
  const [markingAll, setMarkingAll] = useState(false);
  const [processingNotificationId, setProcessingNotificationId] = useState<string | null>(null);

  const extractListingId = (message: string): string | undefined => (
    message.match(/\(([^)]+)\)\.?$/)?.[1]?.trim() || undefined
  );

  const isNewMatchRequest = (notification: Notification): boolean => (
    notification.type === 'crop_deal' && notification.title === 'New Match Request'
  );

  const loadNotifications = async (farmerId: string) => {
    const [nextNotifications, deals] = await Promise.all([
      notificationService.getNotifications(farmerId),
      cropService.getFarmerDeals(farmerId),
    ]);
    const pendingMap: Record<string, string> = {};
    deals
      .filter((deal) => deal.status === 'pending')
      .forEach((deal) => {
        if (!pendingMap[deal.listingId]) {
          pendingMap[deal.listingId] = deal.id;
        }
      });

    setPendingDealIdsByListing(pendingMap);
    setNotifications(nextNotifications);
    return nextNotifications;
  };

  const handleMatchDecision = async (notification: Notification, status: 'confirmed' | 'cancelled') => {
    if (!farmer) return;
    const listingId = extractListingId(notification.message);
    if (!listingId) return;
    const dealId = pendingDealIdsByListing[listingId];
    if (!dealId) return;

    setProcessingNotificationId(notification.id);
    const result = await cropService.updateDealStatus(dealId, status, {
      actorRole: 'farmer',
      actorId: farmer.id,
    });
    setProcessingNotificationId(null);

    if (!result.success) return;
    await loadNotifications(farmer.id);
  };

  useEffect(() => {
    if (!farmer) return undefined;

    let active = true;

    const refreshNotifications = async () => {
      if (!active) return;
      const nextNotifications = await loadNotifications(farmer.id);
      if (nextNotifications.some((notification) => !notification.isRead)) {
        await notificationService.markAllAsRead(farmer.id);
        if (active) {
          await loadNotifications(farmer.id);
        }
      }
    };

    void refreshNotifications();

    const intervalId = window.setInterval(() => {
      void refreshNotifications();
    }, 5000);

    const handleRefresh = () => {
      void refreshNotifications();
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('ams:notifications-updated', handleRefresh);
    window.addEventListener('ams:user-session-updated', handleRefresh);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('ams:notifications-updated', handleRefresh);
      window.removeEventListener('ams:user-session-updated', handleRefresh);
    };
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
                  {isNewMatchRequest(notification) && (() => {
                    const listingId = extractListingId(notification.message);
                    const dealId = listingId ? pendingDealIdsByListing[listingId] : undefined;
                    if (!dealId) return null;

                    const isBusy = processingNotificationId === notification.id;

                    return (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleMatchDecision(notification, 'confirmed')}
                          className="btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isBusy ? 'Updating...' : 'Accept Request'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleMatchDecision(notification, 'cancelled')}
                          className="btn-danger px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isBusy ? 'Updating...' : 'Reject Request'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
