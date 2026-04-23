'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';
import type { Tenant } from '@/types';
import { formatBDT, formatDate } from '@/utils';

export default function AdminTenantsPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', subdomain: '', planTier: 'basic' as Tenant['planTier'] });

  const refresh = async () => setTenants(await adminService.getTenants());

  useEffect(() => {
    refresh();
  }, []);

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
      <PageHeader title="Tenants" subtitle="Create tenant, assign plan, activate/deactivate, and view usage" />
      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <SectionHeader title="Add Tenant" subtitle="SaaS core organization setup" />
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await adminService.createTenant(form);
              setMessage('Tenant created successfully.');
              setForm({ name: '', subdomain: '', planTier: 'basic' });
              refresh();
            }}
          >
            <input className="input-field" placeholder="Organization name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <input className="input-field" placeholder="Subdomain" value={form.subdomain} onChange={(e) => setForm((prev) => ({ ...prev, subdomain: e.target.value }))} required />
            <select className="input-field" value={form.planTier} onChange={(e) => setForm((prev) => ({ ...prev, planTier: e.target.value as Tenant['planTier'] }))}>
              <option value="basic">Basic</option>
              <option value="standard">Pro / Standard</option>
              <option value="professional">Enterprise / Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button type="submit" className="btn-primary w-full">Add Tenant</button>
          </form>
        </Card>

        <Card>
          <SectionHeader title="Organizations" subtitle="Tenant actions: edit, suspend/activate, view details" />
          <div className="space-y-4">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-gray-900">{tenant.name}</h3>
                      <StatusBadge status={tenant.status} />
                    </div>
                    <div className="mt-1 text-sm text-gray-500">{tenant.subdomain} · Plan {tenant.planTier}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={async () => { await adminService.updateTenant(tenant.id, { planTier: tenant.planTier === 'basic' ? 'standard' : 'professional' }); setMessage('Tenant updated.'); refresh(); }} className="btn-outline px-4 py-2 text-sm">Edit</button>
                    <button type="button" onClick={async () => { await adminService.setTenantStatus(tenant.id, tenant.status === 'suspended' ? 'active' : 'suspended'); setMessage(`Tenant ${tenant.status === 'suspended' ? 'activated' : 'suspended'}.`); refresh(); }} className="btn-warning px-4 py-2 text-sm">
                      {tenant.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                    <button type="button" className="btn-neutral px-4 py-2 text-sm">View Details</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Farmers</div><div className="mt-1 font-bold text-gray-900">{tenant.farmerCount}</div></div>
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Cases</div><div className="mt-1 font-bold text-gray-900">{Math.max(tenant.farmerCount / 10, 3).toFixed(0)}</div></div>
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">MRR</div><div className="mt-1 font-bold text-gray-900">{tenant.mrr > 0 ? formatBDT(tenant.mrr) : 'Trial'}</div></div>
                </div>
                <div className="mt-3 text-xs text-gray-400">Created {formatDate(tenant.createdAt)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
