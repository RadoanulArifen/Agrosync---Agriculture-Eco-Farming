'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Bell, Box, Package, ShoppingCart, TrendingUp,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, MiniTable, PageHeader, SectionHeader, StatCard, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { VENDOR_FALLBACK_USER, VENDOR_NAV_ITEMS } from '@/components/dashboard/vendorConfig';
import { orderService, productService } from '@/services';
import type { Order, Product } from '@/types';
import { formatBDT, formatDate } from '@/utils';

const STOCK_ALERT_THRESHOLD = 50;
const REALIZED_SALE_STATUSES: Order['status'][] = ['delivered'];

const getOrderDate = (order: Order) => order.deliveredAt || order.placedAt;

export default function VendorDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useRoleUserContext({
    role: 'vendor',
    fallbackUser: VENDOR_FALLBACK_USER,
  });

  useEffect(() => {
    productService.getProducts(undefined, 'vnd_001').then(setProducts);
    orderService.getOrders().then((data) => setOrders(data.filter((order) => order.vendorId === 'vnd_001')));
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === 'pending' || order.status === 'confirmed'),
    [orders],
  );
  const realizedSales = useMemo(
    () => orders.filter((order) => REALIZED_SALE_STATUSES.includes(order.status)),
    [orders],
  );
  const monthlyRevenue = useMemo(
    () => realizedSales
      .filter((order) => getOrderDate(order).startsWith('2026-04'))
      .reduce((sum, order) => sum + order.totalAmount, 0),
    [realizedSales],
  );
  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stockQty <= STOCK_ALERT_THRESHOLD),
    [products],
  );
  const weeklyRevenue = useMemo(() => {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const baseDate = new Date('2026-04-22T00:00:00');

    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(baseDate);
      current.setDate(baseDate.getDate() - (6 - index));
      const key = current.toISOString().slice(0, 10);
      const revenue = realizedSales
        .filter((order) => getOrderDate(order).slice(0, 10) === key)
        .reduce((sum, order) => sum + order.totalAmount, 0);

      return {
        day: dayLabels[current.getDay()],
        revenue,
      };
    });
  }, [realizedSales]);

  const topProduct = useMemo(() => {
    const unitsByProduct = realizedSales.reduce<Record<string, { quantity: number; productName: string }>>((acc, order) => {
      order.items.forEach((item) => {
        const current = acc[item.productId] || { quantity: 0, productName: item.productName };
        acc[item.productId] = {
          productName: item.productName,
          quantity: current.quantity + item.quantity,
        };
      });
      return acc;
    }, {});

    return Object.values(unitsByProduct).sort((a, b) => b.quantity - a.quantity)[0];
  }, [realizedSales]);

  return (
    <DashboardShell
      navItems={VENDOR_NAV_ITEMS}
      role="vendor"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Verified Vendor'}
      notificationCount={lowStockProducts.length + pendingOrders.length}
    >
      <PageHeader
        title="Vendor Dashboard"
        subtitle={`${user.accessLabel || 'Marketplace Vendor'} overview with products, orders, alerts, and revenue insights`}
      />

      {lowStockProducts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <div className="font-semibold text-amber-900">Low stock alert</div>
                <p className="text-sm text-amber-800">
                  {lowStockProducts.length} {lowStockProducts.length === 1 ? 'product is' : 'products are'} running low. Update stock before new farmer orders arrive.
                </p>
              </div>
            </div>
            <Link href="/dashboard/vendor/products" className="btn-outline text-sm px-4 py-2">
              Update Stock
            </Link>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Products" value={products.length} icon={Package} iconBg="bg-blue-50" />
        <StatCard label="Pending Orders" value={pendingOrders.length} icon={ShoppingCart} iconBg="bg-yellow-50" />
        <StatCard
          label="Monthly Revenue"
          value={formatBDT(monthlyRevenue)}
          icon={TrendingUp}
          iconBg="bg-green-50"
          trend={{ value: `${realizedSales.length} completed sales`, positive: monthlyRevenue > 0 }}
        />
        <StatCard
          label="Low Stock Alert"
          value={lowStockProducts.length}
          icon={Bell}
          iconBg="bg-red-50"
          subtitle="Immediate attention needed"
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Weekly Revenue"
            subtitle="Overview page graph for the last 7 days"
            action={<Link href="/dashboard/vendor/analytics" className="text-sm font-semibold text-forest">Full analytics</Link>}
          />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyRevenue} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `৳${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => [formatBDT(value as number), 'Revenue']} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Quick Access" subtitle="Linked vendor pages" />
          <div className="space-y-3">
            {[
              { href: '/dashboard/vendor/products', label: 'My Products', detail: 'Add, edit, delete, and stock update', icon: Box },
              { href: '/dashboard/vendor/orders', label: 'Orders', detail: 'Accept, reject, and status change', icon: ShoppingCart },
              { href: '/dashboard/vendor/analytics', label: 'Sales Analytics', detail: 'Revenue chart and monthly report', icon: TrendingUp },
              { href: '/dashboard/vendor/notifications', label: 'Alerts', detail: 'Order, stock, and payment alerts', icon: Bell },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 transition hover:border-forest/20 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
                      <Icon className="h-4 w-4 text-forest" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.detail}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Recent Orders"
            subtitle="Farmer orders assigned to your shop"
            action={<Link href="/dashboard/vendor/orders" className="btn-outline text-sm px-4 py-2">Manage Orders</Link>}
          />
          <MiniTable
            headers={['Order ID', 'Buyer', 'Amount', 'Payment', 'Status', 'Date']}
            rows={orders.slice(0, 5).map((order) => [
              <span key={order.id} className="font-mono text-xs text-gray-500">{order.id}</span>,
              <div key={order.farmerName}>
                <div className="font-medium text-gray-800">{order.farmerName}</div>
                <div className="text-xs text-gray-400">{order.vendorName}</div>
              </div>,
              <span key={order.totalAmount} className="font-semibold">{formatBDT(order.totalAmount)}</span>,
              <span key={order.paymentGateway} className="text-xs font-semibold uppercase text-gray-500">{order.paymentGateway}</span>,
              <StatusBadge key={order.status} status={order.status} />,
              <span key={order.placedAt} className="text-xs text-gray-400">{formatDate(order.placedAt)}</span>,
            ])}
          />
        </Card>

        <Card>
          <SectionHeader title="Business Snapshot" subtitle="Today at a glance" />
          <div className="space-y-4">
            <div className="rounded-2xl bg-green-50 p-4">
              <div className="text-xs uppercase tracking-wide text-green-600">Top Product</div>
              <div className="mt-2 text-lg font-bold text-green-900">{topProduct?.productName || 'No sales yet'}</div>
              <div className="mt-1 text-sm text-green-700">
                {topProduct ? `${topProduct.quantity} units sold from delivered sales` : 'Delivered sales will unlock insights here'}
              </div>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4">
              <div className="text-xs uppercase tracking-wide text-blue-600">Buyer Info Ready</div>
              <div className="mt-2 text-sm text-blue-800">
                Every order record now links to the buyer details and delivery information inside the Orders page.
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="text-xs uppercase tracking-wide text-amber-600">Stock Coverage</div>
              <div className="mt-2 text-lg font-bold text-amber-900">{products.reduce((sum, product) => sum + product.stockQty, 0)}</div>
              <div className="mt-1 text-sm text-amber-700">Total units available across active products</div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
