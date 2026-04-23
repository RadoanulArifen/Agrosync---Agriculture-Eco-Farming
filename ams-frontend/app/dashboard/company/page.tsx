'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Bell, HandshakeIcon, Search, TrendingUp, Wheat,
} from 'lucide-react';
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, MiniTable, PageHeader, SectionHeader, StatCard, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { COMPANY_FALLBACK_USER, COMPANY_NAV_ITEMS } from '@/components/dashboard/companyConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { cropService, priceService } from '@/services';
import type { CropDeal, CropListing, CropPrice } from '@/types';
import { formatBDT, formatDate } from '@/utils';

export default function CompanyDashboard() {
  const { user } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [listings, setListings] = useState<CropListing[]>([]);
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [matches, setMatches] = useState<CropDeal[]>([]);

  useEffect(() => {
    cropService.getCropListings().then(setListings);
    cropService.getCompanyMatches(user.id).then(setMatches);
    priceService.getCropPrices().then(setPrices);
  }, [user.id]);

  const activeListings = useMemo(() => listings.filter((listing) => listing.status === 'active'), [listings]);
  const matchedFarmers = useMemo(() => matches.length, [matches]);
  const avgMarketPrice = useMemo(() => {
    if (!prices.length) return 0;
    return Math.round(prices.reduce((sum, price) => sum + price.currentPrice, 0) / prices.length);
  }, [prices]);
  const quickStats = useMemo(() => [
    { label: 'Negotiation Ready', value: matches.filter((match) => match.status === 'pending').length },
    { label: 'Deal Stage', value: matches.filter((match) => match.status === 'confirmed').length },
    { label: 'Tracked Crops', value: prices.length },
    { label: 'Interest Watchlist', value: user.cropInterests?.length || 0 },
  ], [matches, prices.length, user.cropInterests]);

  return (
    <DashboardShell
      navItems={COMPANY_NAV_ITEMS}
      role="company"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Procurement Company'}
      notificationCount={matchedFarmers}
    >
      <PageHeader
        title="Company Dashboard"
        subtitle="Overview of active listings, matched farmers, market prices, and company quick stats"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Listings Count" value={activeListings.length} icon={Wheat} iconBg="bg-green-50" />
        <StatCard label="Matched Farmers" value={matchedFarmers} icon={HandshakeIcon} iconBg="bg-blue-50" />
        <StatCard label="Market Price" value={`${formatBDT(avgMarketPrice)}/kg`} icon={TrendingUp} iconBg="bg-amber-50" />
        <StatCard label="Quick Stats" value={quickStats.reduce((sum, item) => sum + Number(item.value), 0)} icon={Bell} iconBg="bg-rose-50" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Market Price Trend"
            subtitle="Fast decision support for crop buying"
            action={<Link href="/dashboard/company/prices" className="text-sm font-semibold text-forest">Price analytics</Link>}
          />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prices[0]?.history || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value) => value.slice(5)} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`৳${value}/kg`, 'Price']} />
                <Line type="monotone" dataKey="price" stroke="#1a4731" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Quick Access" subtitle="Main company buttons" />
          <div className="space-y-3">
            {[
              { href: '/dashboard/company/listings', label: 'Browse Listings', detail: 'Search, filter, and express interest', icon: Search },
              { href: '/dashboard/company/matches', label: 'Matched Farmers', detail: 'Negotiate and place order', icon: HandshakeIcon },
              { href: '/dashboard/company/prices', label: 'Price Analytics', detail: 'Track crop price movement', icon: TrendingUp },
              { href: '/dashboard/company/notifications', label: 'Notifications', detail: 'Alerts for listing and order updates', icon: Bell },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 transition hover:border-forest/20 hover:bg-gray-50">
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

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionHeader
            title="Active Crop Listings"
            subtitle="Latest farmer listings in the marketplace"
            action={<Link href="/dashboard/company/listings" className="btn-outline px-4 py-2 text-sm">Browse All</Link>}
          />
          <MiniTable
            headers={['Crop', 'Farmer', 'Quantity', 'Price', 'Status', 'Harvest']}
            rows={listings.slice(0, 5).map((listing) => [
              <div key={listing.id}>
                <div className="font-medium text-gray-900">{listing.cropType}</div>
                <div className="text-xs text-gray-400">{listing.variety}</div>
              </div>,
              `${listing.farmerName} (${listing.district})`,
              `${listing.quantityKg.toLocaleString('en-BD')} kg`,
              `৳${listing.askingPrice}/kg`,
              <StatusBadge key={listing.status} status={listing.status} />,
              formatDate(listing.harvestDate),
            ])}
          />
        </Card>

        <Card>
          <SectionHeader title="Quick Stats" subtitle="Company action insights" />
          <div className="space-y-4">
            {quickStats.map((item) => (
              <div key={item.label} className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">{item.label}</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Already Matched" subtitle="Deals now in connection stage" />
        {matches.length === 0 ? (
          <div className="text-sm text-gray-500">No matched farmers yet. Express interest from Browse Listings.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {matches.map((match) => (
              <div key={match.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{match.farmerName}</div>
                  <StatusBadge status={match.status} />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Quantity {match.quantityKg.toLocaleString('en-BD')} kg at {formatBDT(match.agreedPrice)}/kg
                </div>
                <div className="mt-1 text-xs text-gray-400">Connection already created and now in deal stage.</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
