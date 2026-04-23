'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, ShoppingCart, Wheat } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader,
} from '@/components/dashboard/DashboardComponents';
import { COMPANY_FALLBACK_USER, COMPANY_NAV_ITEMS } from '@/components/dashboard/companyConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { cropService, notificationService } from '@/services';
import type { CropDeal, CropListing, Notification } from '@/types';
import { formatDateTime } from '@/utils';

export default function CompanyNotificationsPage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);
  const [listings, setListings] = useState<CropListing[]>([]);
  const [matches, setMatches] = useState<CropDeal[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    const nextNotifications = await notificationService.getNotifications(user.id);
    setSystemNotifications(nextNotifications);
    return nextNotifications;
  };

  useEffect(() => {
    loadNotifications();
    cropService.getCropListings().then(setListings);
    cropService.getCompanyMatches(user.id).then(setMatches);
  }, [user.id]);

  const handleMarkAllAsDone = async () => {
    if (notificationCount === 0) return;

    setMarkingAll(true);
    await notificationService.markAllAsRead(user.id);
    await loadNotifications();
    setMarkingAll(false);
  };

  const alerts = useMemo(() => {
    const farmerAcceptAlerts = matches.map((match) => ({
      id: `match_${match.id}`,
      title: 'Farmer interest accepted',
      message: `${match.farmerName} is now matched with your company for listing ${match.listingId}.`,
      icon: Bell,
      color: 'border-blue-100 bg-blue-50 text-blue-700',
      createdAt: match.confirmedAt || new Date().toISOString(),
    }));

    const listingAlerts = listings.slice(0, 3).map((listing) => ({
      id: `listing_${listing.id}`,
      title: 'New crop listing alert',
      message: `${listing.cropType} listed by ${listing.farmerName} in ${listing.district}.`,
      icon: Wheat,
      color: 'border-green-100 bg-green-50 text-green-700',
      createdAt: listing.createdAt,
    }));

    const orderAlerts = matches
      .filter((match) => match.status === 'completed')
      .map((match) => ({
        id: `order_${match.id}`,
        title: 'Order update',
        message: `Order initiated for ${match.farmerName}. Deal ${match.id} moved to completed stage.`,
        icon: ShoppingCart,
        color: 'border-amber-100 bg-amber-50 text-amber-700',
        createdAt: match.confirmedAt || new Date().toISOString(),
      }));

    const mappedSystem = systemNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      icon: Bell,
      color: 'border-gray-100 bg-gray-50 text-gray-700',
      createdAt: notification.createdAt,
    }));

    return [...farmerAcceptAlerts, ...listingAlerts, ...orderAlerts, ...mappedSystem];
  }, [listings, matches, systemNotifications]);

  return (
    <DashboardShell
      navItems={COMPANY_NAV_ITEMS}
      role="company"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Procurement Company'}
      notificationCount={notificationCount}
    >
      <PageHeader title="Notifications" subtitle="Alerts for farmer match acceptance, new crop listings, and order updates" />

      <Card className="mb-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader title="Alert Summary" subtitle={notificationCount > 0 ? `${notificationCount} unread system notification${notificationCount > 1 ? 's' : ''}` : 'System notifications are up to date'} />
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
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="text-xs text-blue-600">Matched Farmers</div>
            <div className="mt-1 text-2xl font-bold text-blue-900">{matches.length}</div>
          </div>
          <div className="rounded-2xl bg-green-50 p-4">
            <div className="text-xs text-green-600">New Listings</div>
            <div className="mt-1 text-2xl font-bold text-green-900">{listings.length}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="text-xs text-amber-600">Order Updates</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{matches.filter((match) => match.status === 'completed').length}</div>
          </div>
        </div>
      </Card>

      {alerts.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="No notifications yet" description="Company alerts will appear here automatically." />
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
