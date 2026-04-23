'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';
import { SUBSCRIPTION_PLANS } from '@/constants';
import type { Tenant } from '@/types';
import { formatBDT, formatDate } from '@/utils';

export default function AdminBillingPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    adminService.getTenants().then(setTenants);
  }, []);

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
      <PageHeader title="Billing" subtitle="Subscription plans, payments, and tenant billing history" />
      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}

      <Card className="mb-6">
        <SectionHeader title="Subscription Plans" subtitle="Create plan and update pricing" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="font-semibold text-gray-900">{plan.name}</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{plan.priceMonthly ? formatBDT(plan.priceMonthly) : 'Custom'}</div>
              <div className="mt-1 text-sm text-gray-500">Monthly billing</div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setMessage('Create Plan action is ready for backend integration.')} className="btn-outline flex-1 px-4 py-2 text-sm">Create Plan</button>
                <button type="button" onClick={() => setMessage(`Price update flow opened for ${plan.name}.`)} className="btn-warning px-4 py-2 text-sm">Update Price</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Tenant Billing History" subtitle="Invoices and payment overview" />
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{tenant.name}</div>
                  <div className="mt-1 text-sm text-gray-500">Plan {tenant.planTier} · Joined {formatDate(tenant.createdAt)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-outline px-4 py-2 text-sm">View Invoice</button>
                  <button type="button" className="btn-info px-4 py-2 text-sm">Analytics</button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Monthly Charge</div><div className="mt-1 font-bold text-gray-900">{tenant.mrr > 0 ? formatBDT(tenant.mrr) : 'Trial'}</div></div>
                <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Status</div><div className="mt-1 font-bold capitalize text-gray-900">{tenant.status}</div></div>
                <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Farmers Served</div><div className="mt-1 font-bold text-gray-900">{tenant.farmerCount}</div></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}
