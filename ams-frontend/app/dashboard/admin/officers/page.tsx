'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';

export default function AdminOfficersPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [officers, setOfficers] = useState<Array<any>>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewOfficer, setViewOfficer] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', region: '' });

  const refresh = async () => setOfficers(await adminService.getOfficers());
  useEffect(() => { refresh(); }, []);

  const performanceRows = useMemo(() => officers.map((officer: any, index: number) => ({
    ...officer,
    solved: 12 + index * 4,
    avgTime: `${3 + index}h`,
  })), [officers]);

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
      <PageHeader title="Officers" subtitle="Add officers, assign region, track performance, and activate/deactivate" />
      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}
      {error && <Card className="mb-6 border-red-200 bg-red-50"><div className="text-sm text-red-700">{error}</div></Card>}

      {viewOfficer && (
        <Card className="mb-6">
          <SectionHeader title="Officer Details" subtitle={`Profile view for ${viewOfficer.name}`} />
          <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-700">
            <div><span className="text-gray-400">Name:</span> {viewOfficer.name}</div>
            <div><span className="text-gray-400">Email:</span> {viewOfficer.email || '-'}</div>
            <div><span className="text-gray-400">Phone:</span> {viewOfficer.phone || '-'}</div>
            <div><span className="text-gray-400">Status:</span> {viewOfficer.availabilityStatus || 'available'}</div>
            <div className="md:col-span-2"><span className="text-gray-400">Region:</span> {(viewOfficer.regionDistricts || []).join(', ') || '-'}</div>
          </div>
          <div className="mt-3">
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setViewOfficer(null)}>Close View</button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <SectionHeader title="Add Officer" subtitle="New workforce registration" />
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            setMessage('');
            setError('');
            const result = await adminService.addOfficer(form);
            if (!result.success) {
              setError('Could not add officer.');
              return;
            }
            setMessage('Officer added successfully.');
            setForm({ name: '', email: '', phone: '', region: '' });
            refresh();
          }}>
            <input className="input-field" placeholder="Officer name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
            <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} required />
            <input className="input-field" placeholder="District / Upazila region" value={form.region} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))} required />
            <button type="submit" className="btn-primary w-full">Add Officer</button>
          </form>
        </Card>

        <Card>
          <SectionHeader title="Officer Directory" subtitle="Assign region, performance, and status control" />
          <div className="space-y-4">
            {performanceRows.map((officer: any) => (
              <div key={officer.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{officer.name}</h3>
                      <span className={`badge ${officer.availabilityStatus === 'offline' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{officer.availabilityStatus}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">{officer.email} · {officer.phone}</div>
                    <div className="mt-1 text-sm text-gray-500">Region: {(officer.regionDistricts || []).join(', ')}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={async () => {
                      setMessage('');
                      setError('');
                      const assignedRegion = (officer.regionDistricts && officer.regionDistricts.length > 0)
                        ? officer.regionDistricts.join(', ')
                        : (officer.district || 'Dhaka');
                      const result = await adminService.updateOfficerAdminState(officer.id, { assignedRegion });
                      if (!result.success) {
                        setError('Could not assign officer region.');
                        return;
                      }
                      setMessage('Officer region assigned.');
                      refresh();
                    }} className="btn-outline px-4 py-2 text-sm">Assign Region</button>
                    <button type="button" onClick={() => {
                      setMessage(`Performance: ${officer.name} solved ${officer.solved} cases with ${officer.avgTime} average response time.`);
                      setViewOfficer(officer);
                    }} className="btn-info px-4 py-2 text-sm">View Performance</button>
                    <button type="button" onClick={async () => {
                      setMessage('');
                      setError('');
                      const result = await adminService.updateOfficerAdminState(officer.id, { active: officer.availabilityStatus === 'offline' });
                      if (!result.success) {
                        setError(`Could not ${officer.availabilityStatus === 'offline' ? 'activate' : 'disable'} officer.`);
                        return;
                      }
                      setMessage(`Officer ${officer.availabilityStatus === 'offline' ? 'activated' : 'disabled'}.`);
                      refresh();
                    }} className="btn-danger px-4 py-2 text-sm">
                      {officer.availabilityStatus === 'offline' ? 'Activate' : 'Disable'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Cases Solved</div><div className="mt-1 font-bold text-gray-900">{officer.solved}</div></div>
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Avg Response Time</div><div className="mt-1 font-bold text-gray-900">{officer.avgTime}</div></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
