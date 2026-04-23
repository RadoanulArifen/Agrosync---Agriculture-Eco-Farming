'use client';

import DashboardShell from '@/components/dashboard/DashboardShell';
import { PageHeader } from '@/components/dashboard/DashboardComponents';
import RoleProfileEditor from '@/components/dashboard/RoleProfileEditor';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';

export default function AdminProfilePage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'} notificationCount={notificationCount}>
      <PageHeader title="Admin Profile" subtitle="Edit platform admin account information" />
      <RoleProfileEditor user={user} title="Administrator Details" subtitle="Registration data for this admin role" />
    </DashboardShell>
  );
}
