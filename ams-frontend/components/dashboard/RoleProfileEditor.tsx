'use client';

import { useState } from 'react';
import { authService } from '@/services';
import { Card, SectionHeader } from '@/components/dashboard/DashboardComponents';
import type { DashboardRoleUser } from '@/types';

interface RoleProfileEditorProps {
  user: DashboardRoleUser;
  title: string;
  subtitle: string;
  extraFields?: React.ReactNode;
}

export default function RoleProfileEditor({
  user,
  title,
  subtitle,
  extraFields,
}: RoleProfileEditorProps) {
  const [form, setForm] = useState({
    name: user.name ?? '',
    nameBn: user.nameBn ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    division: user.division ?? '',
    district: user.district ?? '',
    upazila: user.upazila ?? '',
    designation: user.designation ?? '',
    accessLabel: user.accessLabel ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await authService.updateRoleUser(user.id, form);
    setSaving(false);
    setSaved(result.success ? 'Profile updated successfully.' : 'Failed to update profile.');
    if (result.success) {
      window.setTimeout(() => window.location.reload(), 400);
    }
  };

  return (
    <Card>
      <SectionHeader title={title} subtitle={subtitle} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="form-label">Full Name</span>
            <input className="input-field mt-2" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Name (BN)</span>
            <input className="input-field mt-2" value={form.nameBn} onChange={(e) => updateField('nameBn', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Email</span>
            <input className="input-field mt-2" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Phone</span>
            <input className="input-field mt-2" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Division</span>
            <input className="input-field mt-2" value={form.division} onChange={(e) => updateField('division', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">District</span>
            <input className="input-field mt-2" value={form.district} onChange={(e) => updateField('district', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Upazila / Area</span>
            <input className="input-field mt-2" value={form.upazila} onChange={(e) => updateField('upazila', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Designation</span>
            <input className="input-field mt-2" value={form.designation} onChange={(e) => updateField('designation', e.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className="form-label">Access Label</span>
            <input className="input-field mt-2" value={form.accessLabel} onChange={(e) => updateField('accessLabel', e.target.value)} />
          </label>
        </div>

        {extraFields}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600">{saved}</span>}
        </div>
      </form>
    </Card>
  );
}
