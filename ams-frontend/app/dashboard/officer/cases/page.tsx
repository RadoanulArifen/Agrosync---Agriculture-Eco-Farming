'use client';

import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader } from '@/components/dashboard/DashboardComponents';
import OfficerCaseBoard from '@/components/dashboard/OfficerCaseBoard';
import { OFFICER_FALLBACK_USER, OFFICER_NAV_ITEMS } from '@/components/dashboard/officerConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';

export default function OfficerCasesPage() {
  const { user, notificationCount } = useRoleUserContext({
    role: 'officer',
    fallbackUser: OFFICER_FALLBACK_USER,
  });

  return (
    <DashboardShell
      navItems={OFFICER_NAV_ITEMS}
      role="officer"
      userName={user.name}
      userSubtitle={user.designation || 'Agricultural Officer'}
      notificationCount={notificationCount}
    >
      <PageHeader title="Advisory Cases" subtitle="Main working area for reviewing, analyzing, and responding to farmer cases" />
      <Card className="mb-6 bg-blue-50 border-blue-100">
        <div className="text-sm text-blue-800">
          New advisory cases, urgent crop issues, and AI-analyzed cases will appear here. Click any case to see full details and send a response.
        </div>
      </Card>
      <OfficerCaseBoard user={user} />
    </DashboardShell>
  );
}
