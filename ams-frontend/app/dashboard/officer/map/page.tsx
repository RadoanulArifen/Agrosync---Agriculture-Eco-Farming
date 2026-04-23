'use client';

import { AlertTriangle, MapPinned, Radar } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { OFFICER_FALLBACK_USER, OFFICER_NAV_ITEMS } from '@/components/dashboard/officerConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';

const DISTRICT_HEAT = [
  { district: 'Mymensingh', cases: 12, disease: 'Rice Blast', risk: 'High', color: 'bg-red-50 border-red-200 text-red-700' },
  { district: 'Tangail', cases: 7, disease: 'Stem Borer', risk: 'Medium', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { district: 'Jamalpur', cases: 4, disease: 'Leaf Spot', risk: 'Low', color: 'bg-green-50 border-green-200 text-green-700' },
];

export default function OfficerRegionalMapPage() {
  const { user, notificationCount } = useRoleUserContext({
    role: 'officer',
    fallbackUser: OFFICER_FALLBACK_USER,
  });

  return (
    <DashboardShell navItems={OFFICER_NAV_ITEMS} role="officer" userName={user.name} userSubtitle={user.designation || 'Agricultural Officer'} notificationCount={notificationCount}>
      <PageHeader title="Regional Map" subtitle="Location analysis, disease spread detection, and hotspot identification" />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionHeader title="Coverage Heatmap" subtitle="Simulated district-based monitoring view" />
          <div className="grid sm:grid-cols-3 gap-4">
            {DISTRICT_HEAT.map((district) => (
              <div key={district.district} className={`rounded-2xl border p-5 ${district.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <MapPinned className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">{district.risk}</span>
                </div>
                <div className="text-lg font-bold">{district.district}</div>
                <div className="text-sm mt-1">{district.cases} active cases</div>
                <div className="text-xs mt-3">Primary issue: {district.disease}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Hotspot Insight" subtitle="Auto-detected focus area" />
          <div className="space-y-4">
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Mymensingh hotspot
              </div>
              <p className="text-sm text-red-700 mt-2">Rice Blast cases are increasing across 3 unions. Field visit recommended within 24 hours.</p>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                <Radar className="w-4 h-4" />
                Disease spread trend
              </div>
              <p className="text-sm text-blue-700 mt-2">Recent advisory reports indicate spread moving from Mymensingh toward Tangail lowland crop zones.</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
