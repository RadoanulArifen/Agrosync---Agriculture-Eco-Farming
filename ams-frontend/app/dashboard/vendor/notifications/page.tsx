'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, CreditCard,
} from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader,
} from '@/components/dashboard/DashboardComponents';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { VENDOR_FALLBACK_USER, VENDOR_NAV_ITEMS } from '@/components/dashboard/vendorConfig';
import { orderService, productService } from '@/services';
import type { Order, Product } from '@/types';
import { formatBDT, formatDateTime } from '@/utils';

const VENDOR_ID = 'vnd_001';

export default function VendorNotificationsPage() {
  const { user } = useRoleUserContext({ role: 'vendor', fallbackUser: VENDOR_FALLBACK_USER });
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    productService.getProducts(undefined, VENDOR_ID).then(setProducts);
    orderService.getOrders().then((data) => setOrders(data.filter((order) => order.vendorId === VENDOR_ID)));
  }, []);

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

    return [...newOrderAlerts, ...lowStockAlerts, ...paymentAlerts].slice(0, 8);
  }, [orders, products]);

  return (
    <DashboardShell
      navItems={VENDOR_NAV_ITEMS}
      role="vendor"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Verified Vendor'}
      notificationCount={alerts.length}
    >
      <PageHeader title="Alerts" subtitle="New order alerts, low stock warnings, and payment updates for your shop" />

      <Card className="mb-6">
        <SectionHeader title="Alert Summary" subtitle="Notification system overview" />
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
