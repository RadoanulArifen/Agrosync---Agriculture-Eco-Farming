'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';
import { formatDateTime } from '@/utils';

export default function AdminAuditPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [logs, setLogs] = useState<Array<any>>([]);
  const [filters, setFilters] = useState({ query: '', action: '', date: '' });
  const [message, setMessage] = useState('');

  useEffect(() => { adminService.getAuditLogs().then(setLogs); }, []);

  const filtered = useMemo(() => logs.filter((log) => {
    const q = `${log.actor} ${log.entity} ${log.details}`.toLowerCase();
    return (!filters.query || q.includes(filters.query.toLowerCase()))
      && (!filters.action || log.action.toLowerCase().includes(filters.action.toLowerCase()))
      && (!filters.date || log.createdAt.slice(0, 10).includes(filters.date));
  }), [filters, logs]);

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
      <PageHeader title="Audit Logs" subtitle="Track who changed what, security monitoring, filter, and export" />
      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}

      <Card className="mb-6">
        <SectionHeader title="Filters" subtitle="User / action / date" />
        <div className="grid gap-4 md:grid-cols-4">
          <input className="input-field" placeholder="User or entity" value={filters.query} onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))} />
          <input className="input-field" placeholder="Action" value={filters.action} onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))} />
          <input className="input-field" placeholder="YYYY-MM-DD" value={filters.date} onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))} />
          <button type="button" className="btn-outline" onClick={() => setMessage('Audit log export prepared.')} >Export</button>
        </div>
      </Card>

      <div className="space-y-4">
        {filtered.map((log) => (
          <Card key={log.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{log.actor}</span>
                  <span className="badge bg-gray-100 text-gray-700">{log.entity}</span>
                  <span className="badge bg-blue-100 text-blue-700">{log.action}</span>
                </div>
                <div className="mt-2 text-sm text-gray-600">{log.details}</div>
              </div>
              <div className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
