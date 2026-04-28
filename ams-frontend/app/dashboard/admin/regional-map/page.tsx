'use client';

import React from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import RegionalMap from '@/components/dashboard/RegionalMap';

export default function RegionalMapPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });

  return (
    <DashboardShell
      navItems={ADMIN_NAV_ITEMS}
      role="admin"
      userName={user.name}
      userSubtitle={user.designation || 'Platform Administrator'}
    >
      <PageHeader
        title="Regional Cases Map"
        subtitle="District-wise advisory case distribution in the same admin dashboard design."
      />
      <Card padding={false} className="overflow-hidden">
        <RegionalMap />
      </Card>
    </DashboardShell>
  );
}
