'use client';

import { useEffect, useMemo, useState } from 'react';
import { advisoryService } from '@/services';
import { Card, SectionHeader, StatusBadge } from '@/components/dashboard/DashboardComponents';
import type { AdvisoryCase, DashboardRoleUser } from '@/types';
import { formatDateTime } from '@/utils';

interface OfficerCaseBoardProps {
  user: DashboardRoleUser;
  compact?: boolean;
  listOnly?: boolean;
  onCountsChange?: (counts: { pending: number; responded: number }) => void;
}

export default function OfficerCaseBoard({
  user,
  compact = false,
  listOnly = false,
  onCountsChange,
}: OfficerCaseBoardProps) {
  const [cases, setCases] = useState<AdvisoryCase[]>([]);
  const [activeCase, setActiveCase] = useState<AdvisoryCase | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  const loadCases = async () => {
    const nextCases = await advisoryService.getOfficerCases(user.officerId || user.id);
    setCases(nextCases);
    if (!activeCase && nextCases[0]) {
      setActiveCase(nextCases[0]);
    }
  };

  useEffect(() => {
    loadCases();
  }, [user.id, user.officerId]);

  const pending = useMemo(
    () => cases.filter((c) => c.status === 'pending' || c.status === 'assigned' || c.status === 'ai_analyzed'),
    [cases],
  );
  const responded = useMemo(() => cases.filter((c) => c.status === 'responded'), [cases]);

  useEffect(() => {
    onCountsChange?.({ pending: pending.length, responded: responded.length + respondedIds.size });
  }, [onCountsChange, pending.length, responded.length, respondedIds.size]);

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    setSubmitting(true);
    setMessage('');
    await advisoryService.respondToCase(activeCase.id, response, user.id);
    setSubmitting(false);
    setRespondedIds((prev) => new Set([...Array.from(prev), activeCase.id]));
    setResponse('');
    setMessage(`Response sent for ${activeCase.id}`);
    await loadCases();
    setActiveCase(null);
  };

  return (
    <div className={`grid ${listOnly ? 'grid-cols-1' : compact ? 'xl:grid-cols-[1.1fr_0.9fr]' : 'lg:grid-cols-2'} gap-6`}>
      <Card>
        <SectionHeader title="Pending Advisory Cases" subtitle={`${pending.length} cases waiting`} />
        <div className={`${compact ? 'max-h-[520px]' : 'max-h-[620px]'} overflow-y-auto space-y-3`}>
          {pending.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">No pending cases right now.</div>
          )}
          {pending.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${activeCase?.id === c.id ? 'border-forest bg-forest/5' : 'border-gray-100 hover:border-forest/30 hover:bg-gray-50'}`}
              onClick={() => setActiveCase(c)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-mono text-xs text-gray-400">{c.id}</span>
                  <h3 className="font-bold text-gray-800 text-sm">{c.farmerName} · {c.farmerDistrict}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{c.cropType}</p>
                </div>
                <StatusBadge status={respondedIds.has(c.id) ? 'responded' : c.status} />
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>
              {c.aiDiagnosis && (
                <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-blue-600 font-semibold">AI: </span>
                  <span className="text-xs text-blue-700">{c.aiDiagnosis} ({c.aiConfidence}%)</span>
                </div>
              )}
              <div className="text-[10px] text-gray-400 mt-2">{formatDateTime(c.createdAt)}</div>
            </div>
          ))}
        </div>
      </Card>

      {!listOnly && (
        <div className="space-y-4">
          {message && (
            <Card>
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
            </Card>
          )}

          {activeCase ? (
            <Card>
              <SectionHeader title="Respond to Case" subtitle={activeCase.id} />
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-400">Farmer</div><div className="font-semibold">{activeCase.farmerName}</div></div>
                  <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-400">Crop</div><div className="font-semibold">{activeCase.cropType}</div></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Farmer's Description</div>
                  <p className="text-sm text-gray-700">{activeCase.description}</p>
                </div>
                {activeCase.aiDiagnosis && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <div className="text-xs font-semibold text-blue-700 mb-1">AI Pre-Diagnosis ({activeCase.aiConfidence}% confidence)</div>
                    <p className="text-sm text-blue-800 font-medium">{activeCase.aiDiagnosis}</p>
                    <p className="text-xs text-blue-500 mt-1">Professional review required before response.</p>
                  </div>
                )}
              </div>
              <form onSubmit={handleRespond} className="space-y-3">
                <textarea
                  className="input-field resize-none text-sm"
                  rows={compact ? 4 : 6}
                  placeholder="Write your expert advisory response here. Include diagnosis, treatment steps, product recommendations, and preventive measures..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  required
                />
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="btn-secondary flex-1 text-sm disabled:opacity-60">
                    {submitting ? 'Sending...' : '📤 Send Response via SMS + App'}
                  </button>
                  <button type="button" onClick={() => setActiveCase(null)} className="btn-outline text-sm px-4 py-2">Cancel</button>
                </div>
              </form>
            </Card>
          ) : (
            <Card>
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🌾</div>
                <h3 className="font-bold text-gray-700 mb-2">Select a Case</h3>
                <p className="text-sm text-gray-400">Click a pending case to review and respond.</p>
              </div>
            </Card>
          )}

          <Card>
            <h3 className="font-bold text-gray-800 mb-3 text-sm">My Coverage</h3>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-400 mb-1">Specialties</div>
                <div className="flex flex-wrap gap-1.5">
                  {(user.specialtyTags || []).map((t) => (
                    <span key={t} className="text-xs bg-forest/10 text-forest px-2.5 py-1 rounded-full font-medium">{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 mt-2">Districts</div>
                <div className="flex flex-wrap gap-1.5">
                  {(user.regionDistricts || []).map((d) => (
                    <span key={d} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
