'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, PageHeader, SectionHeader,
} from '@/components/dashboard/DashboardComponents';
import { COMPANY_FALLBACK_USER, COMPANY_NAV_ITEMS } from '@/components/dashboard/companyConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { priceService } from '@/services';
import type { CropPrice } from '@/types';

export default function CompanyPricesPage() {
  const { user } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [selectedCrop, setSelectedCrop] = useState('Rice (Aman)');

  useEffect(() => {
    priceService.getCropPrices().then(setPrices);
  }, []);

  const selectedPrice = useMemo(() => prices.find((price) => price.cropType === selectedCrop) || prices[0], [prices, selectedCrop]);

  return (
    <DashboardShell
      navItems={COMPANY_NAV_ITEMS}
      role="company"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Procurement Company'}
      notificationCount={0}
    >
      <PageHeader title="Price Analytics" subtitle="Track market price trends and identify which crop prices are moving up or down" />

      <Card className="mb-6">
        <SectionHeader title="Crop Selector" subtitle="Decision support for company buying strategy" />
        <select className="input-field max-w-sm" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
          {prices.map((price) => (
            <option key={price.cropType} value={price.cropType}>{price.cropType}</option>
          ))}
        </select>
      </Card>

      {selectedPrice && (
        <div className="mb-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <SectionHeader title={`${selectedPrice.cropType} Price Trend`} subtitle="Historical market price movement" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedPrice.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value) => value.slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`৳${value}/kg`, 'Market price']} />
                  <Line type="monotone" dataKey="price" stroke="#1a4731" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Decision Helper" subtitle="What is changing in the market?" />
            <div className="space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-400">Current Price</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">৳{selectedPrice.currentPrice}/{selectedPrice.unit.replace('BDT/', '')}</div>
              </div>
              <div className={`rounded-2xl p-4 ${selectedPrice.trend === 'up' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {selectedPrice.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {selectedPrice.trend === 'up' ? 'Price Increasing' : 'Price Decreasing'}
                </div>
                <div className="mt-2 text-sm">
                  Change over 7 days: {selectedPrice.changePercent > 0 ? '+' : ''}{selectedPrice.changePercent}%
                </div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                Buying decision hint: {selectedPrice.trend === 'up'
                  ? 'Prices are rising, so early negotiation may protect your margin.'
                  : 'Prices are softening, so you may wait or negotiate more aggressively.'}
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <SectionHeader title="All Crop Price Summary" subtitle="Which crop is getting expensive or cheaper?" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {prices.map((price) => (
            <div key={price.cropType} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">{price.cropType}</div>
                <div className={`text-xs font-bold ${price.trend === 'up' ? 'text-green-600' : price.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                  {price.trend}
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900">৳{price.currentPrice}</div>
              <div className="mt-1 text-sm text-gray-500">Per {price.unit.replace('BDT/', '')}</div>
              <div className="mt-3 text-sm text-gray-600">
                7 day change: <span className="font-medium">{price.changePercent > 0 ? '+' : ''}{price.changePercent}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}
