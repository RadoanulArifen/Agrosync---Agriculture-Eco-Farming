'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { priceService } from '@/services';
import type { CropPrice } from '@/types';

export default function FarmerPricesPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [prices, setPrices] = useState<CropPrice[]>([]);

  useEffect(() => {
    priceService.getCropPrices().then(setPrices);
  }, []);

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading price tracker..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  const featuredPrice = prices[0];

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="Price Tracker" subtitle="Monitor crop market prices and recent trends" />

      {prices.length === 0 ? (
        <Card>
          <EmptyState icon={TrendingUp} title="No price data found" description="Tracked crop prices will appear here." />
        </Card>
      ) : (
        <div className="space-y-6">
          {featuredPrice && (
            <Card>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-400">Featured crop</div>
                  <div className="text-2xl font-bold text-gray-900">{featuredPrice.cropType}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-forest">{featuredPrice.currentPrice} {featuredPrice.unit}</div>
                  <div className={`text-sm ${featuredPrice.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {featuredPrice.changePercent >= 0 ? '+' : ''}{featuredPrice.changePercent}% over 7 days
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={featuredPrice.history}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#1a4731" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {prices.map((price) => (
              <Card key={price.cropType}>
                <div className="text-sm text-gray-400">{price.cropType}</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{price.currentPrice} {price.unit}</div>
                <div className={`text-sm mt-2 ${price.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {price.changePercent >= 0 ? '+' : ''}{price.changePercent}% in 7 days
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
