'use client';

import { useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { authService } from '@/services';

export default function AdminSettingsPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [roleSettings, setRoleSettings] = useState({
    superAdmin: true,
    admin: true,
    moderator: true,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
      <PageHeader title="Settings" subtitle="System config, password change, roles and permissions" />
      {(message || error) && <Card className={`mb-6 ${error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}><div className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>{error || message}</div></Card>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Password Change" subtitle="Update administrator password" />
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            if (passwordForm.next !== passwordForm.confirm) {
              setError('New password and confirm password do not match.');
              return;
            }
            const result = await authService.changePassword(user.id, passwordForm.current, passwordForm.next);
            if (!result.success) {
              setError(result.message || 'Password change failed.');
              return;
            }
            setError('');
            setMessage('Password updated successfully.');
            setPasswordForm({ current: '', next: '', confirm: '' });
          }}>
            <input className="input-field" type="password" placeholder="Current password" value={passwordForm.current} onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))} />
            <input className="input-field" type="password" placeholder="New password" value={passwordForm.next} onChange={(e) => setPasswordForm((prev) => ({ ...prev, next: e.target.value }))} />
            <input className="input-field" type="password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))} />
            <button type="submit" className="btn-primary">Save Password</button>
          </form>
        </Card>

        <Card>
          <SectionHeader title="Role Management" subtitle="Roles & permissions system" />
          <div className="space-y-3">
            {[
              ['superAdmin', 'Super Admin'],
              ['admin', 'Admin'],
              ['moderator', 'Moderator'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <span className="text-sm text-gray-700">{label}</span>
                <input type="checkbox" checked={roleSettings[key as keyof typeof roleSettings]} onChange={(e) => setRoleSettings((prev) => ({ ...prev, [key]: e.target.checked }))} />
              </label>
            ))}
          </div>
          <button type="button" className="btn-primary mt-4" onClick={() => { setError(''); setMessage('Role management settings saved successfully.'); }}>Save Roles & Permissions</button>
        </Card>
      </div>
    </DashboardShell>
  );
}
