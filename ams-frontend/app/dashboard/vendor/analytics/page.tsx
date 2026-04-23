'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, FileText, TrendingUp } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, PageHeader, SectionHeader, StatCard,
} from '@/components/dashboard/DashboardComponents';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { VENDOR_FALLBACK_USER, VENDOR_NAV_ITEMS } from '@/components/dashboard/vendorConfig';
import { orderService, productService } from '@/services';
import type { Order, Product } from '@/types';
import { formatBDT } from '@/utils';

const VENDOR_ID = 'vnd_001';

export default function VendorAnalyticsPage() {
  const { user } = useRoleUserContext({ role: 'vendor', fallbackUser: VENDOR_FALLBACK_USER });
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    productService.getProducts(undefined, VENDOR_ID).then(setProducts);
    orderService.getOrders().then((data) => setOrders(data.filter((order) => order.vendorId === VENDOR_ID)));
  }, []);

  const monthlyRevenue = useMemo(() => orders.reduce((sum, order) => sum + order.totalAmount, 0), [orders]);
  const lastMonthBaseline = Math.max(monthlyRevenue - 5400, 1);
  const salesGrowth = useMemo(() => (((monthlyRevenue - lastMonthBaseline) / lastMonthBaseline) * 100), [lastMonthBaseline, monthlyRevenue]);

  const revenueByWeek = useMemo(() => {
    const ranges = [
      { label: 'Week 1', dates: ['2026-04-01', '2026-04-07'] },
      { label: 'Week 2', dates: ['2026-04-08', '2026-04-14'] },
      { label: 'Week 3', dates: ['2026-04-15', '2026-04-21'] },
      { label: 'Week 4', dates: ['2026-04-22', '2026-04-30'] },
    ];

    return ranges.map((range) => ({
      name: range.label,
      revenue: orders
        .filter((order) => order.placedAt.slice(0, 10) >= range.dates[0] && order.placedAt.slice(0, 10) <= range.dates[1])
        .reduce((sum, order) => sum + order.totalAmount, 0),
    }));
  }, [orders]);

  const salesTrend = useMemo(() => revenueByWeek.map((item, index) => ({
    name: item.name,
    growth: index === 0 ? 0 : item.revenue - revenueByWeek[index - 1].revenue,
  })), [revenueByWeek]);

  const topProduct = useMemo(() => {
    const quantityByProduct = orders.reduce<Record<string, number>>((acc, order) => {
      order.items.forEach((item) => {
        acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
      });
      return acc;
    }, {});

    return products
      .map((product) => ({
        ...product,
        soldUnits: quantityByProduct[product.id] || 0,
      }))
      .sort((a, b) => b.soldUnits - a.soldUnits)[0];
  }, [orders, products]);

  return (
    <DashboardShell
      navItems={VENDOR_NAV_ITEMS}
      role="vendor"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Verified Vendor'}
      notificationCount={0}
    >
      <PageHeader title="Sales Analytics" subtitle="Revenue chart, sales growth, top products, and monthly vendor report" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Monthly Revenue" value={formatBDT(monthlyRevenue)} icon={TrendingUp} iconBg="bg-green-50" />
        <StatCard label="Sales Growth" value={`${salesGrowth.toFixed(1)}%`} icon={BarChart3} iconBg="bg-blue-50" />
        <StatCard label="Top Product" value={topProduct?.nameEn || 'No data'} icon={FileText} iconBg="bg-amber-50" subtitle={topProduct ? `${topProduct.soldUnits} units sold` : 'Waiting for orders'} />
        <StatCard label="Monthly Orders" value={orders.length} icon={TrendingUp} iconBg="bg-rose-50" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Revenue Chart" subtitle="Weekly revenue overview" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `৳${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => [formatBDT(value as number), 'Revenue']} />
                <Bar dataKey="revenue" fill="#16a34a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Sales Growth" subtitle="Week-over-week performance" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [formatBDT(value as number), 'Growth']} />
                <Line type="monotone" dataKey="growth" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <SectionHeader title="Top Product" subtitle="Best performing product this month" />
          {topProduct ? (
            <div className="grid gap-4 md:grid-cols-[96px_1fr]">
              <div className="h-24 w-24 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${topProduct.photos[0]})` }} />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{topProduct.nameEn}</h2>
                <p className="mt-1 text-sm text-gray-500">{topProduct.category} · {formatBDT(topProduct.price)} / {topProduct.unit}</p>
                <p className="mt-3 text-sm text-gray-600">{topProduct.description}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">{topProduct.soldUnits} units sold</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Stock left {topProduct.stockQty}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Rating {topProduct.rating}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No sales data available yet.</div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Monthly Report" subtitle="Vendor business snapshot" />
          <div className="space-y-4 text-sm text-gray-600">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Revenue</div>
              <div className="mt-1 text-lg font-bold text-gray-900">{formatBDT(monthlyRevenue)}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Orders Closed</div>
              <div className="mt-1 text-lg font-bold text-gray-900">{orders.filter((order) => order.status === 'delivered').length}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Products Listed</div>
              <div className="mt-1 text-lg font-bold text-gray-900">{products.length}</div>
            </div>
            <div className="rounded-2xl bg-forest/5 p-4 text-forest">
              <div className="font-semibold">Report Summary</div>
              <p className="mt-2 text-sm">
                {user.companyName || user.name} is showing {salesGrowth >= 0 ? 'positive' : 'negative'} momentum with
                {' '}{orders.length} marketplace orders tracked this month.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
