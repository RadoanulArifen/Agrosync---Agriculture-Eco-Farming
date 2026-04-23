'use client';
import { useState } from 'react';
import {
  Clock, CheckCircle, AlertTriangle,
} from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { StatCard, PageHeader } from '@/components/dashboard/DashboardComponents';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { OFFICER_FALLBACK_USER, OFFICER_NAV_ITEMS } from '@/components/dashboard/officerConfig';
import OfficerCaseBoard from '@/components/dashboard/OfficerCaseBoard';

export default function OfficerDashboard() {
  const [counts, setCounts] = useState({ pending: 0, responded: 0 });
  const { user, notificationCount } = useRoleUserContext({
    role: 'officer',
    fallbackUser: OFFICER_FALLBACK_USER,
  });

  return (
    <DashboardShell navItems={OFFICER_NAV_ITEMS} role="officer" userName={user.name}
      userSubtitle={`Specialties: ${(user.specialtyTags || OFFICER_FALLBACK_USER.specialtyTags || []).join(', ')}`} notificationCount={notificationCount}>
      <PageHeader title="Officer Dashboard" subtitle={`${(user.regionDistricts || OFFICER_FALLBACK_USER.regionDistricts || []).join(' · ')} — Advisory Center`} />

      {/* Status bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Available for Cases
        </div>
        <span className="text-sm text-gray-500">Max 20 active cases</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Cases" value={counts.pending} icon={Clock} iconBg="bg-yellow-50" />
        <StatCard label="Responded Today" value={counts.responded} icon={CheckCircle} iconBg="bg-green-50" trend={{ value: 'Good pace', positive: true }} />
        <StatCard label="Avg Response Time" value="24 min" icon={Clock} iconBg="bg-blue-50" />
        <StatCard label="Outbreak Alerts" value={(user.regionDistricts || []).length > 2 ? 1 : 0} icon={AlertTriangle} iconBg="bg-red-50" />
      </div>

      <OfficerCaseBoard user={user} compact listOnly onCountsChange={setCounts} />
    </DashboardShell>
  );
}
