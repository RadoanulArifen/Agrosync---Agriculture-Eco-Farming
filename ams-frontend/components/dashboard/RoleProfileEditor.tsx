'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/services';
import { Card, SectionHeader } from '@/components/dashboard/DashboardComponents';
import type { BdLocationOption } from '@/services/bdLocations';
import { getDistrictsByDivision, getUpazilasByDistrictId } from '@/services/bdLocations';
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

const DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

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
  const [districts, setDistricts] = useState<BdLocationOption[]>([]);
  const [upazilas, setUpazilas] = useState<BdLocationOption[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [locationLoading, setLocationLoading] = useState({ districts: false, upazilas: false });
  const [locationError, setLocationError] = useState({ districts: '', upazilas: '' });
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  useEffect(() => {
    setForm(buildForm());
    setEditing(false);
    setSaved('');
    setDistricts([]);
    setUpazilas([]);
    setSelectedDistrictId('');
    setLocationLoading({ districts: false, upazilas: false });
    setLocationError({ districts: '', upazilas: '' });
    setDeleting(false);
    setDeleteMessage('');
  }, [user]);

  useEffect(() => {
    let active = true;

    const hydrateLocationOptions = async () => {
      if (!editing || !form.division) {
        if (active) {
          setDistricts([]);
          setUpazilas([]);
          setSelectedDistrictId('');
          setLocationError({ districts: '', upazilas: '' });
        }
        return;
      }

      setLocationLoading((prev) => ({ ...prev, districts: true }));

      try {
        const districtOptions = await getDistrictsByDivision(form.division);
        if (!active) return;

        setDistricts(districtOptions);
        const matchedDistrict = districtOptions.find((item) => item.name.toLowerCase() === form.district.toLowerCase());
        const matchedDistrictId = matchedDistrict?.id || '';
        setSelectedDistrictId(matchedDistrictId);
        setLocationError((prev) => ({ ...prev, districts: '' }));

        if (!matchedDistrictId) {
          setUpazilas([]);
          return;
        }

        setLocationLoading((prev) => ({ ...prev, upazilas: true }));

        try {
          const upazilaOptions = await getUpazilasByDistrictId(matchedDistrictId);
          if (!active) return;
          setUpazilas(upazilaOptions);
          setLocationError((prev) => ({ ...prev, upazilas: '' }));
        } catch (upazilaLoadError) {
          console.error('Failed to load upazilas', upazilaLoadError);
          if (!active) return;
          setUpazilas([]);
          setLocationError((prev) => ({ ...prev, upazilas: 'Upazila list could not be loaded. You can type it manually.' }));
        } finally {
          if (active) {
            setLocationLoading((prev) => ({ ...prev, upazilas: false }));
          }
        }
      } catch (districtLoadError) {
        console.error('Failed to load districts', districtLoadError);
        if (!active) return;
        setDistricts([]);
        setUpazilas([]);
        setSelectedDistrictId('');
        setLocationError((prev) => ({ ...prev, districts: 'District list could not be loaded. You can type it manually.' }));
      } finally {
        if (active) {
          setLocationLoading((prev) => ({ ...prev, districts: false }));
        }
      }
    };

    void hydrateLocationOptions();

    return () => {
      active = false;
    };
  }, [editing, form.division, form.district]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved('');
  };

  const handleStartEdit = () => {
    if (deleting) return;
    setEditing(true);
    setSaved('');
  };

  const handleDivisionChange = async (division: string) => {
    setForm((prev) => ({
      ...prev,
      division,
      district: '',
      upazila: '',
    }));
    setDistricts([]);
    setUpazilas([]);
    setSelectedDistrictId('');
    setLocationError({ districts: '', upazilas: '' });
    setSaved('');

    if (!division) {
      return;
    }

    setLocationLoading((prev) => ({ ...prev, districts: true }));

    try {
      const districtOptions = await getDistrictsByDivision(division);
      setDistricts(districtOptions);
    } catch (districtLoadError) {
      console.error('Failed to load districts', districtLoadError);
      setLocationError((prev) => ({ ...prev, districts: 'District list could not be loaded. You can type it manually.' }));
    } finally {
      setLocationLoading((prev) => ({ ...prev, districts: false }));
    }
  };

  const handleDistrictChange = async (districtId: string) => {
    const district = districts.find((item) => item.id === districtId);

    setSelectedDistrictId(districtId);
    setForm((prev) => ({
      ...prev,
      district: district?.name || '',
      upazila: '',
    }));
    setUpazilas([]);
    setLocationError((prev) => ({ ...prev, upazilas: '' }));
    setSaved('');

    if (!districtId) {
      return;
    }

    setLocationLoading((prev) => ({ ...prev, upazilas: true }));

    try {
      const upazilaOptions = await getUpazilasByDistrictId(districtId);
      setUpazilas(upazilaOptions);
    } catch (upazilaLoadError) {
      console.error('Failed to load upazilas', upazilaLoadError);
      setLocationError((prev) => ({ ...prev, upazilas: 'Upazila list could not be loaded. You can type it manually.' }));
    } finally {
      setLocationLoading((prev) => ({ ...prev, upazilas: false }));
    }
  };

  const handleCancel = () => {
    setForm(buildForm());
    setEditing(false);
    setSaved('');
    setDistricts([]);
    setUpazilas([]);
    setSelectedDistrictId('');
    setLocationLoading({ districts: false, upazilas: false });
    setLocationError({ districts: '', upazilas: '' });
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
    }
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;

    const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (!confirmed) return;

    const secondConfirmation = window.confirm('Your profile, login, and account data will be removed. Continue?');
    if (!secondConfirmation) return;

    setDeleteMessage('');
    setDeleting(true);

    const result = await authService.deleteAccount(user.id);

    if (!result.success) {
      setDeleting(false);
      setDeleteMessage(result.message || 'Account deletion failed. Please try again.');
      return;
    }

    const loginHref = user.role === 'farmer' ? '/auth/farmer-login' : '/auth/admin-login';
    window.location.href = loginHref;
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeader title={title} subtitle={subtitle} />
        {!editing ? (
          <button type="button" className="btn-outline disabled:opacity-60" disabled={deleting} onClick={handleStartEdit}>
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button type="button" className="btn-outline" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" form={`profile-form-${user.id}`} disabled={saving || deleting} className="btn-primary disabled:opacity-60">
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
            <select className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing} value={form.division} onChange={(e) => void handleDivisionChange(e.target.value)}>
              <option value="">Select division</option>
              {DIVISIONS.map((division) => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="form-label">District</span>
            {locationLoading.districts || districts.length > 0 ? (
              <select
                className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!editing || !form.division || locationLoading.districts}
                value={selectedDistrictId}
                onChange={(e) => void handleDistrictChange(e.target.value)}
              >
                <option value="">
                  {locationLoading.districts ? 'Loading districts...' : 'Select district'}
                </option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
            ) : (
              <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing || !form.division} value={form.district} onChange={(e) => updateField('district', e.target.value)} />
            )}
            {locationError.districts && <span className="mt-2 block text-xs text-amber-600">{locationError.districts}</span>}
          </label>
          <label className="block">
            <span className="form-label">Upazila / Area</span>
            {locationLoading.upazilas || upazilas.length > 0 ? (
              <select
                className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!editing || !form.district || locationLoading.upazilas}
                value={form.upazila}
                onChange={(e) => updateField('upazila', e.target.value)}
              >
                <option value="">
                  {locationLoading.upazilas ? 'Loading upazilas...' : 'Select upazila'}
                </option>
                {upazilas.map((upazila) => (
                  <option key={upazila.id} value={upazila.name}>{upazila.name}</option>
                ))}
              </select>
            ) : (
              <input className="input-field mt-2 disabled:bg-gray-50 disabled:text-gray-500" disabled={!editing || !form.district} value={form.upazila} onChange={(e) => updateField('upazila', e.target.value)} />
            )}
            {locationError.upazilas && <span className="mt-2 block text-xs text-amber-600">{locationError.upazilas}</span>}
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

      <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/60 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-red-700">Delete Account</h3>
            <p className="text-sm text-red-600">Permanently remove this account from your dashboard.</p>
          </div>
          <button type="button" onClick={handleDeleteAccount} disabled={deleting || saving} className="btn-danger disabled:opacity-60">
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
        {deleteMessage && <p className="mt-3 text-sm text-red-600">{deleteMessage}</p>}
      </div>
    </Card>
  );
}
