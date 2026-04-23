'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/services';
import { Card, SectionHeader } from '@/components/dashboard/DashboardComponents';
import type { DashboardRoleUser } from '@/types';

interface ExtraFieldRenderProps {
  editable: boolean;
}

interface RoleProfileEditorProps {
  user: DashboardRoleUser;
  title: string;
  subtitle: string;
  extraFields?: React.ReactNode | ((props: ExtraFieldRenderProps) => React.ReactNode);
  getExtraPayload?: () => Partial<DashboardRoleUser>;
  onCancelEdit?: () => void;
}

export default function RoleProfileEditor({
  user,
  title,
  subtitle,
  extraFields,
  getExtraPayload,
  onCancelEdit,
}: RoleProfileEditorProps) {
  const buildForm = () => ({
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
  const [form, setForm] = useState(buildForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    setForm(buildForm());
    setEditing(false);
    setSaved('');
  }, [user]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved('');
  };

  const handleCancel = () => {
    setForm(buildForm());
    setEditing(false);
    setSaved('');
    onCancelEdit?.();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const result = await authService.updateRoleUser(user.id, { ...form, ...(getExtraPayload?.() ?? {}) });
    setSaving(false);
    setSaved(result.success ? 'Profile updated successfully.' : 'Failed to update profile.');
    if (result.success) {
      setEditing(false);
      window.setTimeout(() => window.location.reload(), 400);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeader title={title} subtitle={subtitle} />
        {!editing ? (
          <button type="button" className="btn-outline" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button type="button" className="btn-outline" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" form={`profile-form-${user.id}`} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <form id={`profile-form-${user.id}`} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="form-label">Full Name</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Name (BN)</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.nameBn} onChange={(e) => updateField('nameBn', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Email</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Phone</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Division</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.division} onChange={(e) => updateField('division', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">District</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.district} onChange={(e) => updateField('district', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Upazila / Area</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.upazila} onChange={(e) => updateField('upazila', e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">Designation</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.designation} onChange={(e) => updateField('designation', e.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className="form-label">Access Label</span>
            <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.accessLabel} onChange={(e) => updateField('accessLabel', e.target.value)} />
          </label>
        </div>

        {typeof extraFields === 'function' ? extraFields({ editable: editing }) : extraFields}
        {saved && <span className="text-sm text-green-600">{saved}</span>}
      </form>
    </Card>
  );
}
