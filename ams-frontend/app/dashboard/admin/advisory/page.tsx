'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';

export default function AdminAdvisoryPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [cases, setCases] = useState<Array<any>>([]);
  const [message, setMessage] = useState('');

  const refresh = async () => setCases(await adminService.getAdminCases());
  useEffect(() => { refresh(); }, []);

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'} notificationCount={cases.filter((item) => item.status === 'pending').length}>
      <PageHeader title="Advisory Cases" subtitle="All farmer problems, AI vs officer response, status tracking, reassign, override, and internal notes" />
      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}

      <div className="space-y-4">
        {cases.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{item.id}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-1 text-sm text-gray-500">{item.farmerName} · {item.cropType} · {item.farmerDistrict}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-outline px-4 py-2 text-sm">View Case</button>
                <button type="button" onClick={async () => { await adminService.updateCaseAdminState(item.id, { officerId: 'usr_off_001', officerName: 'Dr. Rahim Uddin', status: 'assigned' }); setMessage('Case assigned/reassigned successfully.'); refresh(); }} className="btn-info px-4 py-2 text-sm">Assign / Reassign</button>
                <button type="button" onClick={async () => { await adminService.updateCaseAdminState(item.id, { status: 'escalated' }); setMessage('Case escalated.'); refresh(); }} className="btn-warning px-4 py-2 text-sm">Escalate</button>
                <button type="button" onClick={async () => { await adminService.updateCaseAdminState(item.id, { status: 'closed' }); setMessage('Case marked resolved.'); refresh(); }} className="btn-success px-4 py-2 text-sm">Mark Resolved</button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-400">AI Diagnosis</div>
                <div className="mt-2 text-sm text-gray-700">{item.aiDiagnosis || 'Not available'}</div>
                <button type="button" onClick={async () => { await adminService.updateCaseAdminState(item.id, { overriddenDiagnosis: 'Admin Override: Immediate field visit recommended.' }); setMessage('AI diagnosis overridden.'); refresh(); }} className="mt-3 btn-outline px-4 py-2 text-sm">Override AI Diagnosis</button>
                {item.overriddenDiagnosis && <div className="mt-2 text-xs text-amber-700">{item.overriddenDiagnosis}</div>}
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-400">Officer Response</div>
                <div className="mt-2 text-sm text-gray-700">{item.officerResponse || 'No officer response yet.'}</div>
                <button type="button" onClick={async () => { await adminService.updateCaseAdminState(item.id, { internalNote: 'Admin note: follow up with district officer before noon.' }); setMessage('Internal note added for officer communication.'); refresh(); }} className="mt-3 btn-outline px-4 py-2 text-sm">Add Internal Note</button>
                {item.internalNote && <div className="mt-2 text-xs text-blue-700">{item.internalNote}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
