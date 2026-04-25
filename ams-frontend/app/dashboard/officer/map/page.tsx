'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MapPinned, Radar } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { OFFICER_FALLBACK_USER, OFFICER_NAV_ITEMS } from '@/components/dashboard/officerConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { advisoryService } from '@/services';
import { cn } from '@/utils';

interface RegionalStat {
  division: string;
  district: string;
  total_cases: number;
  pending_cases: number;
  responded_cases: number;
  resolved_cases: number;
}

const getRiskMeta = (cases: number) => {
  if (cases >= 10) {
    return {
      label: 'High',
      className: 'bg-red-50 border-red-200 text-red-700',
    };
  }

  if (cases >= 5) {
    return {
      label: 'Medium',
      className: 'bg-amber-50 border-amber-200 text-amber-700',
    };
  }

  if (cases > 0) {
    return {
      label: 'Low',
      className: 'bg-green-50 border-green-200 text-green-700',
    };
  }

  return {
    label: 'Monitored',
    className: 'bg-slate-50 border-slate-200 text-slate-600',
  };
};

export default function OfficerRegionalMapPage() {
  const { user, notificationCount } = useRoleUserContext({
    role: 'officer',
    fallbackUser: OFFICER_FALLBACK_USER,
  });
  const [regionalStats, setRegionalStats] = useState<RegionalStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    advisoryService.getRegionalStats()
      .then((stats) => {
        if (active) {
          setRegionalStats(stats);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const coverageStats = useMemo(() => {
    return [...regionalStats]
      .filter((item) => item.district.trim() !== '')
      .sort((left, right) => right.total_cases - left.total_cases || left.district.localeCompare(right.district));
  }, [regionalStats]);

  const hotspot = coverageStats.find((item) => item.total_cases > 0);
  const spreadTarget = coverageStats.find((item) => item.district !== hotspot?.district && item.total_cases > 0);
  const totalActiveCases = coverageStats.reduce((sum, item) => sum + item.total_cases, 0);
  const totalPendingCases = coverageStats.reduce((sum, item) => sum + item.pending_cases, 0);

  return (
    <DashboardShell navItems={OFFICER_NAV_ITEMS} role="officer" userName={user.name} userSubtitle={user.designation || 'Agricultural Officer'} notificationCount={notificationCount}>
      <PageHeader title="Regional Map" subtitle="Location analysis, disease spread detection, and hotspot identification" />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionHeader title="Coverage Heatmap" subtitle="Simulated district-based monitoring view" />
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
              ))}
            </div>
          ) : coverageStats.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="No district coverage data yet"
              description="Farmer advisory submissions will start appearing here by district."
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {coverageStats.map((district) => {
                const risk = getRiskMeta(district.total_cases);

                return (
                  <div key={district.district} className={cn('rounded-2xl border p-5', risk.className)}>
                    <div className="flex items-center justify-between mb-3">
                      <MapPinned className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase">{risk.label}</span>
                    </div>
                    <div className="text-lg font-bold">{district.district}</div>
                    <div className="text-sm mt-1">{district.total_cases} active cases</div>
                    <div className="mt-3 space-y-1 text-xs">
                      <div>Pending: {district.pending_cases}</div>
                      <div>Responded: {district.responded_cases}</div>
                      <div>Resolved: {district.resolved_cases}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Hotspot Insight" subtitle="Auto-detected focus area" />
          <div className="space-y-4">
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                {hotspot ? `${hotspot.district} hotspot` : 'No hotspot yet'}
              </div>
              <p className="text-sm text-red-700 mt-2">
                {hotspot
                  ? `${hotspot.total_cases} advisory case${hotspot.total_cases === 1 ? '' : 's'} recorded from ${hotspot.district}, including ${hotspot.pending_cases} pending review. Prioritize this zone first.`
                  : 'No farmer advisory case has been submitted from your covered districts yet.'}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                <Radar className="w-4 h-4" />
                Disease spread trend
              </div>
              <p className="text-sm text-blue-700 mt-2">
                {spreadTarget && hotspot
                  ? `Coverage now shows ${totalActiveCases} total active cases across your monitored districts, with the next concentration in ${spreadTarget.district}. Pending queue currently stands at ${totalPendingCases}.`
                  : `Coverage monitoring now reflects ${coverageStats.length} farmer-posted district${coverageStats.length === 1 ? '' : 's'}. New farmer submissions will update this panel automatically.`}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
