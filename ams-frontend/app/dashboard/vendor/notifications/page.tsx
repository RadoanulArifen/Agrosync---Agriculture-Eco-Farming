'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, CheckCheck, CreditCard,
} from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader,
} from '@/components/dashboard/DashboardComponents';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { VENDOR_FALLBACK_USER, VENDOR_NAV_ITEMS } from '@/components/dashboard/vendorConfig';
import { notificationService, orderService, productService } from '@/services';
import type { Notification, Order, Product } from '@/types';
import { formatBDT, formatDateTime } from '@/utils';

export default function VendorNotificationsPage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'vendor', fallbackUser: VENDOR_FALLBACK_USER });
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const vendorId = user.vendorId || user.id;

  const loadNotifications = async () => {
    const nextNotifications = await notificationService.getNotifications(user.id);
    setSystemNotifications(nextNotifications);
    return nextNotifications;
  };

  useEffect(() => {
    loadNotifications();
    productService.getProducts(undefined, vendorId).then(setProducts);
    orderService.getOrders(undefined, vendorId).then(setOrders);
  }, [user.id, user.vendorId, vendorId]);

  const handleMarkAllAsDone = async () => {
    if (notificationCount === 0) return;

    setMarkingAll(true);
    await notificationService.markAllAsRead(user.id);
    await loadNotifications();
    setMarkingAll(false);
  };

  const alerts = useMemo(() => {
    const newOrderAlerts = orders
      .filter((order) => order.status === 'pending' || order.status === 'confirmed')
      .map((order) => ({
        id: `order_${order.id}`,
        title: 'New order alert',
        message: `${order.farmerName} placed order ${order.id} worth ${formatBDT(order.totalAmount)}.`,
        icon: Bell,
        color: 'border-blue-100 bg-blue-50 text-blue-700',
        createdAt: order.placedAt,
      }));

    const lowStockAlerts = products
      .filter((product) => product.stockQty <= 50)
      .map((product) => ({
        id: `stock_${product.id}`,
        title: 'Low stock alert',
        message: `${product.nameEn} only has ${product.stockQty} units left in stock.`,
        icon: AlertTriangle,
        color: 'border-amber-100 bg-amber-50 text-amber-700',
        createdAt: new Date().toISOString(),
      }));

    const paymentAlerts = orders
      .filter((order) => order.paymentStatus === 'paid')
      .map((order) => ({
        id: `payment_${order.id}`,
        title: 'Payment alert',
        message: `Payment received for ${order.id} via ${order.paymentGateway.toUpperCase()}.`,
        icon: CreditCard,
        color: 'border-green-100 bg-green-50 text-green-700',
        createdAt: order.placedAt,
      }));

    const mappedSystem = systemNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      icon: Bell,
      color: notification.isRead ? 'border-gray-100 bg-gray-50 text-gray-700' : 'border-blue-100 bg-blue-50 text-blue-700',
      createdAt: notification.createdAt,
    }));

    return [...mappedSystem, ...newOrderAlerts, ...lowStockAlerts, ...paymentAlerts].slice(0, 8);
  }, [orders, products, systemNotifications]);

  return (
    <DashboardShell
      navItems={VENDOR_NAV_ITEMS}
      role="vendor"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Verified Vendor'}
      notificationCount={notificationCount}
    >
      <PageHeader title="Alerts" subtitle="New order alerts, low stock warnings, and payment updates for your shop" />

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
            <div className="text-xs text-blue-600">New Orders</div>
            <div className="mt-1 text-2xl font-bold text-blue-900">{orders.filter((order) => order.status === 'pending' || order.status === 'confirmed').length}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="text-xs text-amber-600">Low Stock</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{products.filter((product) => product.stockQty <= 50).length}</div>
          </div>
          <div className="rounded-2xl bg-green-50 p-4">
            <div className="text-xs text-green-600">Payments Received</div>
            <div className="mt-1 text-2xl font-bold text-green-900">{orders.filter((order) => order.paymentStatus === 'paid').length}</div>
          </div>
        </div>
      </Card>

      {alerts.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="No alerts right now" description="Vendor notifications will appear here automatically." />
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
