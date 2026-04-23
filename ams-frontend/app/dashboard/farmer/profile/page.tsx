'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import RoleProfileEditor from '@/components/dashboard/RoleProfileEditor';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { authService } from '@/services';

export default function FarmerProfilePage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [extra, setExtra] = useState({
    landAcres: String(farmer?.landAcres ?? ''),
    cropTypes: farmer?.cropTypes.join(', ') ?? '',
    bkashAccount: farmer?.bkashAccount ?? '',
  });

  useEffect(() => {
    if (!farmer) return;
    setExtra({
      landAcres: String(farmer.landAcres ?? ''),
      cropTypes: farmer.cropTypes.join(', '),
      bkashAccount: farmer.bkashAccount ?? '',
    });
  }, [farmer]);

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading profile..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="My Profile" subtitle="Registered farmer details and edit option" />

        <RoleProfileEditor
          key={farmer.id}
          user={{ ...farmer, role: 'farmer', password: 'password123' }}
          title="Farmer Information"
        subtitle="Update your account details from here"
        extraFields={(
          <Card className="bg-gray-50" padding={false}>
            <div className="p-5 space-y-4">
              <SectionHeader title="Farmer Details" subtitle={`FID: ${farmer.fid}`} />
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs text-gray-400">Land Size (Acres)</span>
                  <input
                    className="input-field mt-2"
                    value={extra.landAcres}
                    onChange={(e) => setExtra((prev) => ({ ...prev, landAcres: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">bKash Account</span>
                  <input
                    className="input-field mt-2"
                    value={extra.bkashAccount}
                    onChange={(e) => setExtra((prev) => ({ ...prev, bkashAccount: e.target.value }))}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs text-gray-400">Crop Types</span>
                  <input
                    className="input-field mt-2"
                    value={extra.cropTypes}
                    onChange={(e) => setExtra((prev) => ({ ...prev, cropTypes: e.target.value }))}
                  />
                </label>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={async () => {
                  await authService.updateRoleUser(farmer.id, {
                    landAcres: Number.parseFloat(extra.landAcres) || 0,
                    cropTypes: extra.cropTypes.split(',').map((item) => item.trim()).filter(Boolean),
                    bkashAccount: extra.bkashAccount,
                  });
                  window.location.reload();
                }}
              >
                Save Farmer Details
              </button>
            </div>
          </Card>
        )}
      />
    </DashboardShell>
  );
}
