'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import RoleProfileEditor from '@/components/dashboard/RoleProfileEditor';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { authService } from '@/services';
import { VENDOR_FALLBACK_USER, VENDOR_NAV_ITEMS } from '@/components/dashboard/vendorConfig';

export default function VendorProfilePage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'vendor', fallbackUser: VENDOR_FALLBACK_USER });
  const [deliveryDistricts, setDeliveryDistricts] = useState(user.deliveryDistricts?.join(', ') ?? '');
  const [shopName, setShopName] = useState(user.companyName || user.name);
  const [bkashAccount, setBkashAccount] = useState(user.bkashAccount || user.phone);

  useEffect(() => {
    setDeliveryDistricts(user.deliveryDistricts?.join(', ') ?? '');
    setShopName(user.companyName || user.name);
    setBkashAccount(user.bkashAccount || user.phone);
  }, [user]);

  return (
    <DashboardShell navItems={VENDOR_NAV_ITEMS} role="vendor" userName={user.companyName || user.name} userSubtitle={user.designation || 'Verified Vendor'} notificationCount={notificationCount}>
      <PageHeader title="Vendor Profile" subtitle="Edit vendor registration and delivery coverage" />
      <RoleProfileEditor
        key={user.id}
        user={user}
        title="Vendor Details"
        subtitle={`Vendor ID: ${user.vendorId || '-'}`}
        extraFields={(
          <Card className="bg-gray-50" padding={false}>
            <div className="space-y-4 p-5">
              <SectionHeader title="Shop & Payment Info" subtitle="Manage shop name, address coverage, and bKash method" />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-gray-400">Shop Name</span>
                  <input className="input-field mt-2" value={shopName} onChange={(e) => setShopName(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">bKash Number</span>
                  <input className="input-field mt-2" value={bkashAccount} onChange={(e) => setBkashAccount(e.target.value)} />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs text-gray-400">Delivery Districts / Address Coverage</span>
                  <input className="input-field mt-2" value={deliveryDistricts} onChange={(e) => setDeliveryDistricts(e.target.value)} />
                </label>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={async () => {
                  await authService.updateRoleUser(user.id, {
                    companyName: shopName,
                    bkashAccount,
                    deliveryDistricts: deliveryDistricts.split(',').map((item) => item.trim()).filter(Boolean),
                  });
                  window.location.reload();
                }}
              >
                Save Vendor Details
              </button>
            </div>
          </Card>
        )}
      />
    </DashboardShell>
  );
}
