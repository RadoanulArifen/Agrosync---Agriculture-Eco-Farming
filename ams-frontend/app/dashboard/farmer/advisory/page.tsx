'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { advisoryService } from '@/services';
import type { AdvisoryCase } from '@/types';
import { formatDateTime } from '@/utils';

export default function FarmerAdvisoryPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [cases, setCases] = useState<AdvisoryCase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ cropType: '', description: '' });

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
      description: form.description,
      photos: [],
    });
    setSubmitting(false);

    if (response.success) {
      setSuccessMessage(`Advisory submitted successfully. Case ID: ${response.caseId}`);
      const latestCases = await advisoryService.getAdvisoryCases(farmer.id);
      setCases(latestCases);
      setForm({ cropType: '', description: '' });
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
              <textarea
                className="input-field resize-none"
                rows={5}
                placeholder="Describe symptoms, affected area, and duration..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
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
                  <StatusBadge status={caseItem.status} />
                </div>
                <p className="text-sm text-gray-500 mb-3">{caseItem.description}</p>
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
