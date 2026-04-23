'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import RoleProfileEditor from '@/components/dashboard/RoleProfileEditor';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { authService } from '@/services';
import { COMPANY_FALLBACK_USER, COMPANY_NAV_ITEMS } from '@/components/dashboard/companyConfig';

export default function CompanyProfilePage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [cropInterests, setCropInterests] = useState(user.cropInterests?.join(', ') ?? '');
  const [companyName, setCompanyName] = useState(user.companyName || user.name);
  const [bkashAccount, setBkashAccount] = useState(user.bkashAccount || user.phone);

  useEffect(() => {
    setCropInterests(user.cropInterests?.join(', ') ?? '');
    setCompanyName(user.companyName || user.name);
    setBkashAccount(user.bkashAccount || user.phone);
  }, [user]);

  return (
    <DashboardShell navItems={COMPANY_NAV_ITEMS} role="company" userName={user.companyName || user.name} userSubtitle={user.designation || 'Procurement Company'} notificationCount={notificationCount}>
      <PageHeader title="Company Profile" subtitle="Edit company registration and crop interests" />
      <RoleProfileEditor
        key={user.id}
        user={user}
        title="Company Details"
        subtitle={`Company ID: ${user.companyId || '-'} · Reg: ${user.registrationNo || '-'}`}
        extraFields={(
          <Card className="bg-gray-50" padding={false}>
            <div className="space-y-4 p-5">
              <SectionHeader title="Business & Payment Info" subtitle="Update company info, contact, and payment details" />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="form-label">Company Name</span>
                  <input className="input-field mt-2" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </label>
                <label className="block">
                  <span className="form-label">bKash / Payment Info</span>
                  <input className="input-field mt-2" value={bkashAccount} onChange={(e) => setBkashAccount(e.target.value)} />
                </label>
                <label className="block md:col-span-2">
                  <span className="form-label">Crop Interests</span>
                  <input className="input-field mt-2" value={cropInterests} onChange={(e) => setCropInterests(e.target.value)} />
                </label>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={async () => {
                  await authService.updateRoleUser(user.id, {
                    companyName,
                    bkashAccount,
                    cropInterests: cropInterests.split(',').map((item) => item.trim()).filter(Boolean),
                  });
                  window.location.reload();
                }}
              >
                Save Company Details
              </button>
            </div>
          </Card>
        )}
      />
    </DashboardShell>
  );
}
