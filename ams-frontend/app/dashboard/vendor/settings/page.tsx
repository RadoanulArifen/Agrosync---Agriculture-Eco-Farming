'use client';

import { useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, PageHeader, SectionHeader,
} from '@/components/dashboard/DashboardComponents';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { VENDOR_FALLBACK_USER, VENDOR_NAV_ITEMS } from '@/components/dashboard/vendorConfig';
import { authService } from '@/services';

export default function VendorSettingsPage() {
  const { user } = useRoleUserContext({ role: 'vendor', fallbackUser: VENDOR_FALLBACK_USER });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    orderAlerts: true,
    stockAlerts: true,
    paymentAlerts: true,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (passwordForm.next !== passwordForm.confirm) {
      setError('New password and confirm password do not match.');
      return;
    }

    const result = await authService.changePassword(user.id, passwordForm.current, passwordForm.next);
    if (!result.success) {
      setError(result.message || 'Password change failed.');
      return;
    }

    setMessage('Password updated successfully.');
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  return (
    <DashboardShell
      navItems={VENDOR_NAV_ITEMS}
      role="vendor"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Verified Vendor'}
      notificationCount={Object.values(settings).filter(Boolean).length}
    >
      <PageHeader title="Settings" subtitle="Change password, toggle notifications, and manage vendor preferences" />

      {(message || error) && (
        <Card className={`mb-6 ${error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>{error || message}</div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Password Change" subtitle="Keep your vendor account secure" />
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <input className="input-field" type="password" placeholder="Current password" value={passwordForm.current} onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))} />
            <input className="input-field" type="password" placeholder="New password" value={passwordForm.next} onChange={(e) => setPasswordForm((prev) => ({ ...prev, next: e.target.value }))} />
            <input className="input-field" type="password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))} />
            <button type="submit" className="btn-primary">Save Password</button>
          </form>
        </Card>

        <Card>
          <SectionHeader title="Notification Preferences" subtitle="Turn system alerts on or off" />
          <div className="space-y-3">
            {[
              ['emailNotifications', 'Email notifications'],
              ['pushNotifications', 'Push notifications'],
              ['orderAlerts', 'New order alerts'],
              ['stockAlerts', 'Low stock alerts'],
              ['paymentAlerts', 'Payment alerts'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type="checkbox"
                  checked={settings[key as keyof typeof settings]}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setMessage('Vendor preferences saved successfully.')} className="btn-primary mt-4">
            Save Preferences
          </button>
        </Card>
      </div>
    </DashboardShell>
  );
}
