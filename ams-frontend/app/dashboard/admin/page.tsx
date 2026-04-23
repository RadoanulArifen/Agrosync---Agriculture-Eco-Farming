'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Building2, CreditCard, MessageSquare,
  Search, UserCheck, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, MiniTable, PageHeader, SectionHeader, StatCard, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';
import type { AdminStats, Tenant } from '@/types';
import { formatBDT, formatDate } from '@/utils';

const PLAN_COLORS = ['#6b7280', '#3b82f6', '#1a4731', '#f59e0b'];

export default function AdminDashboard() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; type: string; label: string; href: string }>>([]);

  useEffect(() => {
    adminService.getStats().then(setStats);
    adminService.getTenants().then(setTenants);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    adminService.globalSearch(search).then(setSearchResults);
  }, [search]);

  const advisorySeries = useMemo(() => [
    { day: 'Mon', cases: 12 },
    { day: 'Tue', cases: 18 },
    { day: 'Wed', cases: 15 },
    { day: 'Thu', cases: 20 },
    { day: 'Fri', cases: 24 },
    { day: 'Sat', cases: 11 },
    { day: 'Sun', cases: 9 },
  ], []);
  const mrrSeries = useMemo(() => [
    { month: 'Nov', revenue: 780000 },
    { month: 'Dec', revenue: 890000 },
    { month: 'Jan', revenue: 950000 },
    { month: 'Feb', revenue: 1050000 },
    { month: 'Mar', revenue: 1150000 },
    { month: 'Apr', revenue: 1250000 },
  ], []);

  const planData = useMemo(() => {
    const counts: Record<string, number> = {};
    tenants.forEach((tenant) => {
      counts[tenant.planTier] = (counts[tenant.planTier] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], index) => ({ name, value, color: PLAN_COLORS[index % PLAN_COLORS.length] }));
  }, [tenants]);

  const alerts = useMemo(() => {
    if (!stats) return [];
    return [
      stats.activeAdvisories > 2 ? { label: 'High pending cases', detail: `${stats.activeAdvisories} advisory cases need attention`, color: 'bg-amber-50 text-amber-800 border-amber-100' } : null,
      { label: 'System error watch', detail: 'No critical system errors detected in the last 24 hours', color: 'bg-green-50 text-green-800 border-green-100' },
      { label: 'Suspicious activity', detail: '2 repeated failed logins detected and recorded in audit logs', color: 'bg-red-50 text-red-800 border-red-100' },
    ].filter(Boolean) as Array<{ label: string; detail: string; color: string }>;
  }, [stats]);

  if (!stats) {
    return (
      <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
        <PageHeader title="Loading admin overview..." subtitle="Preparing platform monitoring data" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'} notificationCount={alerts.length}>
      <PageHeader title="Platform Overview" subtitle="Read-only monitoring dashboard with clickable cards, alerts, and quick admin actions" />

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <SectionHeader title="Global Search" subtitle="Search farmer, officer, tenant, or advisory case" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search farmer / officer / tenant / case..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((item) => (
                <Link key={`${item.type}-${item.id}`} href={item.href} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                    <div className="text-xs uppercase text-gray-400">{item.type}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Quick Actions" subtitle="Admin shortcuts panel" />
          <div className="grid gap-3">
            <Link href="/dashboard/admin/tenants" className="btn-primary flex w-full items-center justify-center gap-2">Add Tenant</Link>
            <Link href="/dashboard/admin/officers" className="btn-outline flex w-full items-center justify-center gap-2">Add Officer</Link>
            <Link href="/dashboard/admin/vendors" className="btn-warning flex w-full items-center justify-center gap-2">Approve Vendors</Link>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/dashboard/admin/farmers"><StatCard label="Total Farmers" value={stats.totalFarmers} icon={Users} iconBg="bg-blue-50" trend={{ value: 'Open farmers page', positive: true }} /></Link>
        <Link href="/dashboard/admin/advisory"><StatCard label="Advisory Cases" value={stats.totalAdvisories} icon={MessageSquare} iconBg="bg-purple-50" trend={{ value: 'Open cases list', positive: true }} /></Link>
        <Link href="/dashboard/admin/billing"><StatCard label="Monthly Revenue" value={formatBDT(stats.mrr)} icon={CreditCard} iconBg="bg-green-50" trend={{ value: 'Open billing', positive: true }} /></Link>
        <Link href="/dashboard/admin/officers"><StatCard label="Active Officers" value={stats.totalOfficers} icon={UserCheck} iconBg="bg-orange-50" trend={{ value: 'Open officers', positive: true }} /></Link>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader title="System Health & Revenue" subtitle="Monitoring charts" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mrrSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `৳${Math.round(value / 1000)}k`} />
                  <Tooltip formatter={(value) => [formatBDT(value as number), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#1a4731" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={advisorySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="cases" fill="#2d6a4f" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Alerts" subtitle="Admin alert system" />
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.label} className={`rounded-2xl border p-4 ${alert.color}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>
                    <div className="font-semibold">{alert.label}</div>
                    <div className="mt-1 text-sm">{alert.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <SectionHeader title="Recent Tenants" subtitle="Card click and table actions lead to tenant management" action={<Link href="/dashboard/admin/tenants" className="text-sm font-semibold text-forest">Manage all</Link>} />
          <MiniTable
            headers={['Tenant', 'Plan', 'Farmers', 'Status', 'MRR', 'Joined']}
            rows={tenants.map((tenant) => [
              <div key={tenant.id}>
                <div className="font-semibold text-sm text-gray-800">{tenant.name}</div>
                <div className="text-xs text-gray-400">{tenant.subdomain}</div>
              </div>,
              <span key={tenant.planTier} className="rounded-full bg-forest/10 px-2 py-1 text-xs font-semibold capitalize text-forest">{tenant.planTier}</span>,
              tenant.farmerCount,
              <StatusBadge key={tenant.status} status={tenant.status} />,
              tenant.mrr > 0 ? formatBDT(tenant.mrr) : 'Trial',
              formatDate(tenant.createdAt),
            ])}
          />
        </Card>

        <Card>
          <SectionHeader title="Plan Mix" subtitle="Tenant distribution" />
          <div className="flex items-center justify-center">
            <PieChart width={180} height={180}>
              <Pie data={planData} cx={90} cy={90} innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                {planData.map((entry, index) => <Cell key={entry.name} fill={entry.color || PLAN_COLORS[index]} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2">
            {planData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="capitalize text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Navigation Hub" subtitle="Final simple admin view" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { href: '/dashboard/admin/tenants', label: 'Tenants', desc: 'Organizations manage', icon: Building2 },
              { href: '/dashboard/admin/farmers', label: 'Farmers', desc: 'User control', icon: Users },
              { href: '/dashboard/admin/officers', label: 'Officers', desc: 'Workforce manage', icon: UserCheck },
              { href: '/dashboard/admin/vendors', label: 'Vendors', desc: 'Marketplace control', icon: Building2 },
              { href: '/dashboard/admin/advisory', label: 'Cases', desc: 'Advisory system', icon: MessageSquare },
              { href: '/dashboard/admin/billing', label: 'Billing', desc: 'Money', icon: CreditCard },
              { href: '/dashboard/admin/analytics', label: 'Analytics', desc: 'Insights', icon: Building2 },
              { href: '/dashboard/admin/audit', label: 'Logs', desc: 'Tracking', icon: Building2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="rounded-2xl border border-gray-100 p-4 hover:bg-gray-50">
                  <Icon className="h-5 w-5 text-forest" />
                  <div className="mt-3 font-semibold text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-500">{item.desc}</div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Override & Roles" subtitle="Must-have admin controls" />
          <div className="space-y-4 text-sm text-gray-600">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="font-semibold text-gray-900">Role & Permission System</div>
              <div className="mt-1">Super Admin, Admin, Moderator role management is available from Settings.</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="font-semibold text-gray-900">Case Override System</div>
              <div className="mt-1">Force assign officers, override AI diagnosis, and add internal notes from Advisory Cases.</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="font-semibold text-gray-900">Bulk Actions</div>
              <div className="mt-1">Bulk farmer block and bulk vendor approve are available on their management pages.</div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
