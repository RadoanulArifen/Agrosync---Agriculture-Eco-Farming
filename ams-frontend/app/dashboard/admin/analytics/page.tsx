'use client';

import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';
import { formatBDT } from '@/utils';

export default function AdminAnalyticsPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { adminService.getStats().then(setStats); }, []);

  const growth = [
    { month: 'Jan', farmers: 40, revenue: 200000 },
    { month: 'Feb', farmers: 55, revenue: 300000 },
    { month: 'Mar', farmers: 75, revenue: 420000 },
    { month: 'Apr', farmers: 88, revenue: 510000 },
  ];

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
      <PageHeader title="Analytics" subtitle="Growth charts, revenue, usage stats, export, and date filter" />
      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}

      <Card className="mb-6">
        <SectionHeader title="Analytics Controls" subtitle="Export and date range" />
        <div className="flex flex-wrap gap-3">
          <input className="input-field max-w-xs" defaultValue="2026-04" />
          <button type="button" className="btn-outline" onClick={() => setMessage('CSV export prepared. PDF export can be connected next.')}>Export CSV/PDF</button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Growth Charts" subtitle="Platform user growth" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="farmers" fill="#2d6a4f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionHeader title="Revenue Trend" subtitle="Monthly growth" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `৳${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => [formatBDT(value as number), 'Revenue']} />
                <Line dataKey="revenue" stroke="#f59e0b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {stats && (
        <Card className="mt-6">
          <SectionHeader title="Usage Stats" subtitle="Current platform snapshot" />
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-gray-50 p-4"><div className="text-xs text-gray-400">Farmers</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.totalFarmers}</div></div>
            <div className="rounded-2xl bg-gray-50 p-4"><div className="text-xs text-gray-400">Officers</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.totalOfficers}</div></div>
            <div className="rounded-2xl bg-gray-50 p-4"><div className="text-xs text-gray-400">Revenue</div><div className="mt-1 text-2xl font-bold text-gray-900">{formatBDT(stats.mrr)}</div></div>
            <div className="rounded-2xl bg-gray-50 p-4"><div className="text-xs text-gray-400">Advisory Cases</div><div className="mt-1 text-2xl font-bold text-gray-900">{stats.totalAdvisories}</div></div>
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
