'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, CloudRain, MessageSquare, Package, Wheat } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, MiniTable, PageHeader, SectionHeader, StatCard, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import {
  advisoryService, orderService, priceService, weatherService, notificationService,
} from '@/services';
import type { AdvisoryCase, CropPrice, Notification, Order, WeatherForecast } from '@/types';
import { formatDate, formatDateTime } from '@/utils';

const QUICK_LINKS = FARMER_NAV_ITEMS.filter((item) => item.href !== '/dashboard/farmer');

export default function FarmerDashboard() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [cases, setCases] = useState<AdvisoryCase[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!farmer) return undefined;

    let active = true;

    const refreshDashboard = async () => {
      if (!active) return;

      const [nextCases, nextOrders, nextPrices, nextWeather, nextNotifications] = await Promise.all([
        advisoryService.getAdvisoryCases(farmer.id),
        orderService.getOrders(farmer.id),
        priceService.getCropPrices(),
        weatherService.getWeatherForecast(farmer.district, farmer.upazila),
        notificationService.getNotifications(farmer.id),
      ]);

      if (!active) return;
      setCases(nextCases);
      setOrders(nextOrders);
      setPrices(nextPrices);
      setWeather(nextWeather);
      setNotifications(nextNotifications);
    };

    void refreshDashboard();

    const intervalId = window.setInterval(() => {
      void refreshDashboard();
    }, 5000);
    const handleRefresh = () => {
      void refreshDashboard();
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

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading dashboard..." subtitle="Preparing your farmer account" />
      </DashboardShell>
    );
  }

  const pendingOrders = orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled');

  return (
    <DashboardShell
      navItems={FARMER_NAV_ITEMS}
      role="farmer"
      userName={farmer.name}
      userSubtitle={`FID: ${farmer.fid}`}
      notificationCount={unreadNotifications}
    >
      <PageHeader
        title={`Welcome back, ${farmer.name.split(' ')[0]}!`}
        subtitle={`${farmer.district} District · ${farmer.landAcres} acres · ${farmer.cropTypes.join(', ') || 'No crops yet'}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Advisory Cases" value={cases.length} icon={MessageSquare} iconBg="bg-blue-50" />
        <StatCard label="Active Orders" value={pendingOrders.length} icon={Package} iconBg="bg-orange-50" />
        <StatCard label="Tracked Crops" value={prices.length} icon={Wheat} iconBg="bg-green-50" />
        <StatCard label="Unread Alerts" value={unreadNotifications} icon={Bell} iconBg="bg-red-50" />
      </div>

      <Card className="mb-6">
        <SectionHeader title="Quick Access" subtitle="Open each linked page from here" />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-forest/20 p-4 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-forest" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
                <div className="font-semibold text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-400 mt-1">Open dedicated page</div>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card>
          <SectionHeader
            title="Recent Advisory Cases"
            action={<Link href="/dashboard/farmer/advisory" className="text-sm text-forest font-medium">Open Page</Link>}
          />
          <MiniTable
            headers={['Case ID', 'Crop', 'Status', 'Date']}
            rows={cases.slice(0, 4).map((caseItem) => [
              <span key={caseItem.id} className="font-mono text-xs text-gray-500">{caseItem.id}</span>,
              caseItem.cropType,
              <StatusBadge key={caseItem.status} status={caseItem.status} />,
              <span key={caseItem.createdAt} className="text-xs text-gray-400">{formatDate(caseItem.createdAt)}</span>,
            ])}
          />
        </Card>

        <Card>
          <SectionHeader
            title="Notifications"
            action={<Link href="/dashboard/farmer/notifications" className="text-sm text-forest font-medium">Open Page</Link>}
          />
          <div className="space-y-3">
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className={`rounded-xl p-3 ${notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border border-blue-100'}`}>
                <div className="text-sm font-semibold text-gray-800">{notification.title}</div>
                <div className="text-xs text-gray-500 mt-1">{notification.message}</div>
                <div className="text-[10px] text-gray-400 mt-2">{formatDateTime(notification.createdAt)}</div>
              </div>
            ))}
            {notifications.length === 0 && <div className="text-sm text-gray-400">No notifications for this farmer yet.</div>}
          </div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-6 mt-6">
        <Card>
          <SectionHeader
            title="Weather Snapshot"
            action={<Link href="/dashboard/farmer/weather" className="text-sm text-forest font-medium">Open Page</Link>}
          />
          {weather ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-3xl">
                <CloudRain className="w-7 h-7 text-forest" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{weather.current.tempMax}°C</div>
                <div className="text-sm text-gray-500">{weather.current.condition} in {weather.district}</div>
                <div className="text-xs text-gray-400 mt-1">Humidity {weather.current.humidity}% · Wind {weather.current.windSpeed} km/h</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Weather data is loading.</div>
          )}
        </Card>

        <Card>
          <SectionHeader
            title="Order Summary"
            action={<Link href="/dashboard/farmer/orders" className="text-sm text-forest font-medium">Open Page</Link>}
          />
          <div className="space-y-3">
            {orders.slice(0, 3).map((order) => (
              <div key={order.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{order.vendorName}</div>
                    <div className="text-xs text-gray-400">{order.id}</div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
            {orders.length === 0 && <div className="text-sm text-gray-400">No orders available for this farmer yet.</div>}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
