'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, MessageSquare, X } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { advisoryService } from '@/services';
import type { AdvisoryCase, AdvisoryPriority } from '@/types';
import { formatDateTime } from '@/utils';

export default function FarmerAdvisoryPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [cases, setCases] = useState<AdvisoryCase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [form, setForm] = useState<{ cropType: string; priority: AdvisoryPriority; description: string }>({ cropType: '', priority: 'normal', description: '' });

  const compressImage = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const source = typeof reader.result === 'string' ? reader.result : '';
      const image = new Image();
      image.onerror = () => reject(new Error('Failed to process image.'));
      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Failed to prepare image canvas.'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSuccessMessage('Please choose a valid crop image.');
      event.target.value = '';
      return;
    }

    try {
      const optimizedImage = await compressImage(file);
      setPhotoPreview(optimizedImage);
      setSuccessMessage('');
    } catch (error) {
      console.error('[Advisory] Failed to optimize image upload', error);
      setSuccessMessage('Image processing failed. Please try another image.');
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (!farmer) return;
    advisoryService.getAdvisoryCases(farmer.id).then(setCases);
  }, [farmer]);

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading advisory..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const response = await advisoryService.submitAdvisory({
      farmerId: farmer.id,
      cropType: form.cropType,
      priority: form.priority,
      description: form.description,
      photos: photoPreview ? [photoPreview] : [],
    });
    setSubmitting(false);

    if (response.success) {
      setSuccessMessage(`Advisory submitted successfully. Case ID: ${response.caseId}`);
      const latestCases = await advisoryService.getAdvisoryCases(farmer.id);
      setCases(latestCases);
      setForm({ cropType: '', priority: 'normal', description: '' });
      setPhotoPreview('');
      setShowForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="Crop Advisory" subtitle="Submit crop problems and review previous advisory cases" />

      <div className="space-y-6">
        {successMessage && (
          <Card>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{successMessage}</div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <SectionHeader title="Submit New Advisory" subtitle="Describe the crop issue in detail" />
          <button type="button" onClick={() => setShowForm((value) => !value)} className="btn-primary text-sm py-2">
            {showForm ? 'Hide Form' : 'New Advisory'}
          </button>
        </div>

        {showForm && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                className="input-field"
                value={form.cropType}
                onChange={(e) => setForm({ ...form, cropType: e.target.value })}
                required
              >
                <option value="">Select crop type</option>
                {farmer.cropTypes.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
              </select>
              <select
                className="input-field"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as 'normal' | 'urgent' })}
                required
              >
                <option value="normal">Normal advisory</option>
                <option value="urgent">Urgent advisory</option>
              </select>
              <textarea
                className="input-field resize-none"
                rows={5}
                placeholder="Describe symptoms, affected area, and duration..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Crop Image</div>
                    <div className="text-xs text-gray-500">Optional. Add one clear photo of the affected crop or leaf.</div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-forest hover:text-forest">
                    <ImagePlus className="h-4 w-4" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                </div>

                {photoPreview && (
                  <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-2">
                    <button
                      type="button"
                      onClick={() => setPhotoPreview('')}
                      className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                      aria-label="Remove uploaded image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <img src={photoPreview} alt="Crop issue preview" className="h-52 w-full rounded-lg object-cover" />
                  </div>
                )}
              </div>
              <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-60">
                {submitting ? 'Submitting...' : 'Submit Advisory'}
              </button>
            </form>
          </Card>
        )}

        {cases.length === 0 ? (
          <Card>
            <EmptyState icon={MessageSquare} title="No advisory cases yet" description="Submitted advisory cases will appear here." />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {cases.map((caseItem) => (
              <Card key={caseItem.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-mono text-xs text-gray-400">{caseItem.id}</div>
                    <h3 className="font-bold text-gray-800">{caseItem.cropType}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${caseItem.priority === 'urgent' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {caseItem.priority === 'urgent' ? 'Urgent' : 'Normal'}
                    </span>
                    <StatusBadge status={caseItem.status} />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-3">{caseItem.description}</p>
                {caseItem.photos?.[0] && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <img src={caseItem.photos[0]} alt={`${caseItem.cropType} issue`} className="h-48 w-full object-cover" />
                  </div>
                )}
                {caseItem.aiDiagnosis && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mb-3">
                    <div className="text-xs font-semibold text-blue-700">AI Pre-Diagnosis</div>
                    <div className="text-sm text-blue-800 mt-1">{caseItem.aiDiagnosis}</div>
                  </div>
                )}
                {caseItem.officerResponse && (
                  <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                    <div className="text-xs font-semibold text-green-700">Officer Response</div>
                    <div className="text-sm text-green-800 mt-1">{caseItem.officerResponse}</div>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-3">{formatDateTime(caseItem.createdAt)}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
