'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { OFFICER_FALLBACK_USER, OFFICER_NAV_ITEMS } from '@/components/dashboard/officerConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { authService, userSettingsService } from '@/services';

export default function OfficerSettingsPage() {
  const { user, notificationCount } = useRoleUserContext({
    role: 'officer',
    fallbackUser: OFFICER_FALLBACK_USER,
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    outbreakWarnings: true,
    urgentAdvisory: true,
    newCaseAlert: true,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    userSettingsService.getSettings(user.id).then(setSettings).catch(() => {
      setError('Failed to load notification settings.');
    });
  }, [user.id]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleSettingSave = async () => {
    setMessage('');
    setError('');
    try {
      await userSettingsService.updateSettings(user.id, settings);
      setMessage('Notification settings saved successfully.');
    } catch (saveError) {
      console.error('[OfficerSettings] Failed to save settings', saveError);
      setError('Notification settings save failed.');
    }
  };

  return (
    <DashboardShell navItems={OFFICER_NAV_ITEMS} role="officer" userName={user.name} userSubtitle={user.designation || 'Agricultural Officer'} notificationCount={notificationCount}>
      <PageHeader title="Settings" subtitle="System config, password change, and officer notification settings" />

      {(message || error) && (
        <Card className={`mb-6 ${error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>{error || message}</div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Password Change" subtitle="Update officer account password" />
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <input className="input-field" type="password" placeholder="Current password" value={passwordForm.current} onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))} />
            <input className="input-field" type="password" placeholder="New password" value={passwordForm.next} onChange={(e) => setPasswordForm((prev) => ({ ...prev, next: e.target.value }))} />
            <input className="input-field" type="password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))} />
            <button type="submit" className="btn-primary">Save Password</button>
          </form>
        </Card>

        <Card>
          <SectionHeader title="Notification Settings" subtitle="Control officer alert delivery preferences" />
          <div className="space-y-3">
            {[
              ['emailNotifications', 'Email notifications'],
              ['pushNotifications', 'Push notifications'],
              ['outbreakWarnings', 'Outbreak warnings'],
              ['urgentAdvisory', 'Urgent advisory alerts'],
              ['newCaseAlert', 'New case alerts'],
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
          <button type="button" onClick={handleSettingSave} className="btn-primary mt-4">Save Settings</button>
        </Card>
      </div>
    </DashboardShell>
  );
}
