'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { PageHeader } from '@/components/dashboard/DashboardComponents';
import RoleProfileEditor from '@/components/dashboard/RoleProfileEditor';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { OFFICER_FALLBACK_USER, OFFICER_NAV_ITEMS } from '@/components/dashboard/officerConfig';

export default function OfficerProfilePage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'officer', fallbackUser: OFFICER_FALLBACK_USER });
  const resetDetails = () => {
    setDetails({
      specialtyTags: user.specialtyTags?.join(', ') ?? '',
      regionDistricts: user.regionDistricts?.join(', ') ?? '',
    });
  };
  const [details, setDetails] = useState({
    specialtyTags: user.specialtyTags?.join(', ') ?? '',
    regionDistricts: user.regionDistricts?.join(', ') ?? '',
  });

  useEffect(() => {
    setDetails({
      specialtyTags: user.specialtyTags?.join(', ') ?? '',
      regionDistricts: user.regionDistricts?.join(', ') ?? '',
    });
  }, [user]);

  return (
    <DashboardShell navItems={OFFICER_NAV_ITEMS} role="officer" userName={user.name} userSubtitle={user.designation || 'Agricultural Officer'} notificationCount={notificationCount}>
      <PageHeader title="My Profile" subtitle="Manage personal info, specialty, covered districts, and contact details" />
      <RoleProfileEditor
        key={user.id}
        user={user}
        title="Officer Details"
        subtitle={`Officer ID: ${user.officerId || '-'}`}
        getExtraPayload={() => ({
          specialtyTags: details.specialtyTags.split(',').map((item) => item.trim()).filter(Boolean),
          regionDistricts: details.regionDistricts.split(',').map((item) => item.trim()).filter(Boolean),
        })}
        onCancelEdit={resetDetails}
        extraFields={({ editable }) => (
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-gray-400">Specialties</span>
              <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editable} value={details.specialtyTags} onChange={(e) => setDetails((prev) => ({ ...prev, specialtyTags: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Coverage Districts</span>
              <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editable} value={details.regionDistricts} onChange={(e) => setDetails((prev) => ({ ...prev, regionDistricts: e.target.value }))} />
            </label>
          </div>
        )}
      />
    </DashboardShell>
  );
}
