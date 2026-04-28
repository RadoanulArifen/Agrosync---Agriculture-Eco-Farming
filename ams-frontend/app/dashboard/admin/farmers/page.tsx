'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';

export default function AdminFarmersPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [farmers, setFarmers] = useState<Array<any>>([]);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewFarmer, setViewFarmer] = useState<any | null>(null);

  const refresh = async () => setFarmers(await adminService.getAdminFarmers());
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => farmers.filter((farmer) => `${farmer.name} ${farmer.fid} ${farmer.district}`.toLowerCase().includes(query.toLowerCase())), [farmers, query]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
      <PageHeader title="Farmers" subtitle="List/search farmers, verify KYC, view profile, and block/unblock users" />
      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}
      {error && <Card className="mb-6 border-red-200 bg-red-50"><div className="text-sm text-red-700">{error}</div></Card>}

      <Card className="mb-6">
        <SectionHeader title="Search & Bulk Actions" subtitle="Global farmer moderation" />
        <div className="flex flex-col gap-4 lg:flex-row">
          <input className="input-field flex-1" placeholder="Search by farmer name / FID / district" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="button" className="btn-outline" onClick={async () => {
            setMessage('');
            setError('');
            const results = await Promise.all(selectedIds.map((id) => adminService.updateFarmerAdminState(id, { blocked: true })));
            if (results.some((result) => !result.success)) {
              setError('Could not block some selected farmers.');
              return;
            }
            setMessage('Selected farmers blocked successfully.');
            setSelectedIds([]);
            refresh();
          }}>Bulk Block</button>
        </div>
      </Card>

      {viewFarmer && (
        <Card className="mb-6">
          <SectionHeader title="Farmer Details" subtitle={`Profile view for ${viewFarmer.name}`} />
          <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-700">
            <div><span className="text-gray-400">FID:</span> {viewFarmer.fid}</div>
            <div><span className="text-gray-400">Name:</span> {viewFarmer.name}</div>
            <div><span className="text-gray-400">Email:</span> {viewFarmer.email || '-'}</div>
            <div><span className="text-gray-400">Phone:</span> {viewFarmer.phone || '-'}</div>
            <div><span className="text-gray-400">Division:</span> {viewFarmer.division || '-'}</div>
            <div><span className="text-gray-400">District:</span> {viewFarmer.district || '-'}</div>
            <div><span className="text-gray-400">Upazila:</span> {viewFarmer.upazila || '-'}</div>
            <div><span className="text-gray-400">Land:</span> {viewFarmer.landAcres || 0} acres</div>
          </div>
          <div className="mt-3">
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setViewFarmer(null)}>Close View</button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map((farmer) => (
          <Card key={farmer.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.includes(farmer.id)} onChange={() => toggleSelected(farmer.id)} className="mt-1" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{farmer.name}</h3>
                    <span className={`badge ${farmer.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{farmer.verified ? 'Verified' : 'Unverified'}</span>
                    <span className={`badge ${farmer.blocked ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{farmer.blocked ? 'Blocked' : 'Active'}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{farmer.fid} · {farmer.district}, {farmer.upazila}</div>
                  <div className="mt-1 text-sm text-gray-500">{farmer.email} · {farmer.phone}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setViewFarmer(farmer)}>View</button>
                <button type="button" onClick={async () => {
                  setMessage('');
                  setError('');
                  const result = await adminService.updateFarmerAdminState(farmer.id, { verified: true });
                  if (!result.success) {
                    setError('Could not verify farmer.');
                    return;
                  }
                  setMessage('Farmer verified successfully.');
                  refresh();
                }} className="btn-success px-4 py-2 text-sm">Verify</button>
                <button type="button" onClick={async () => {
                  setMessage('');
                  setError('');
                  const result = await adminService.updateFarmerAdminState(farmer.id, { blocked: !farmer.blocked });
                  if (!result.success) {
                    setError(`Could not ${farmer.blocked ? 'unblock' : 'block'} farmer.`);
                    return;
                  }
                  setMessage(`Farmer ${farmer.blocked ? 'unblocked' : 'blocked'} successfully.`);
                  refresh();
                }} className="btn-danger px-4 py-2 text-sm">
                  {farmer.blocked ? 'Unblock' : 'Block'}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
