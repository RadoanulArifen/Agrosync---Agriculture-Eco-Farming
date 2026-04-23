'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';

export default function AdminVendorsPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [vendors, setVendors] = useState<Array<any>>([]);
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const refresh = async () => setVendors(await adminService.getAdminVendors());
  useEffect(() => { refresh(); }, []);
  const pendingCount = useMemo(() => vendors.filter((vendor) => vendor.status === 'pending').length, [vendors]);

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'} notificationCount={pendingCount}>
      <PageHeader title="Vendors" subtitle="Approve sellers, check products, reject/suspend when needed, and bulk approve" />
      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}

      <Card className="mb-6">
        <SectionHeader title="Bulk Actions" subtitle="Marketplace control tools" />
        <button type="button" className="btn-primary" onClick={async () => {
          await Promise.all(selectedIds.map((id) => adminService.updateVendorStatus(id, 'approved')));
          setMessage('Selected vendors approved successfully.');
          setSelectedIds([]);
          refresh();
        }}>Bulk Approve</button>
      </Card>

      <div className="space-y-4">
        {vendors.map((vendor) => (
          <Card key={vendor.vendorId}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.includes(vendor.vendorId)} onChange={() => setSelectedIds((prev) => prev.includes(vendor.vendorId) ? prev.filter((item) => item !== vendor.vendorId) : [...prev, vendor.vendorId])} className="mt-1" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{vendor.vendorName}</h3>
                    <span className={`badge ${vendor.status === 'approved' ? 'bg-green-100 text-green-700' : vendor.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{vendor.status}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">Vendor ID: {vendor.vendorId}</div>
                  <div className="mt-1 text-sm text-gray-500">{vendor.productCount} listed products</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={async () => { await adminService.updateVendorStatus(vendor.vendorId, 'approved'); setMessage('Vendor approved.'); refresh(); }} className="btn-success px-4 py-2 text-sm">Approve</button>
                <button type="button" onClick={async () => { await adminService.updateVendorStatus(vendor.vendorId, 'rejected'); setMessage('Vendor rejected.'); refresh(); }} className="btn-danger px-4 py-2 text-sm">Reject</button>
                <button type="button" className="btn-outline px-4 py-2 text-sm">View Shop</button>
                <button type="button" onClick={async () => { await adminService.updateVendorStatus(vendor.vendorId, 'suspended'); setMessage('Vendor suspended.'); refresh(); }} className="btn-warning px-4 py-2 text-sm">Suspend</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
