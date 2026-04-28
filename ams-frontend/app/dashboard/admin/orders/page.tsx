'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Package, ShieldCheck } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { ADMIN_FALLBACK_USER, ADMIN_NAV_ITEMS } from '@/components/dashboard/adminConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { adminService } from '@/services';
import type { Order } from '@/types';
import { formatBDT, formatDate, formatDateTime } from '@/utils';

type SettlementFilter = 'all' | 'held' | 'ready_for_release' | 'released';

export default function AdminOrdersPage() {
  const { user } = useRoleUserContext({ role: 'admin', fallbackUser: ADMIN_FALLBACK_USER });
  const [orders, setOrders] = useState<Order[]>([]);
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const loadOrders = async (filter: SettlementFilter = settlementFilter) => {
    const data = await adminService.getAdminOrders(
      filter === 'all' ? undefined : { settlementStatus: filter },
    );
    setOrders(data);
  };

  useEffect(() => {
    void loadOrders('all');
  }, []);

  useEffect(() => {
    void loadOrders(settlementFilter);
  }, [settlementFilter]);

  const summary = useMemo(() => ({
    total: orders.length,
    held: orders.filter((order) => order.settlementStatus === 'held').length,
    ready: orders.filter((order) => order.settlementStatus === 'ready_for_release').length,
    released: orders.filter((order) => order.settlementStatus === 'released').length,
  }), [orders]);

  const handleRelease = async (orderId: string) => {
    setMessage('');
    setError('');
    setProcessingOrderId(orderId);
    const result = await adminService.updateOrderSettlement(orderId, 'release');
    setProcessingOrderId(null);
    if (!result.success) {
      setError(result.message || 'Failed to release settlement.');
      return;
    }
    setMessage(`Settlement released for order ${orderId}.`);
    await loadOrders(settlementFilter);
  };

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} role="admin" userName={user.name} userSubtitle={user.designation || 'Platform Administrator'}>
      <PageHeader title="Order Control" subtitle="Track every order and release vendor settlement only after farmer delivery confirmation." />

      {message && <Card className="mb-6 border-green-200 bg-green-50"><div className="text-sm text-green-700">{message}</div></Card>}
      {error && <Card className="mb-6 border-red-200 bg-red-50"><div className="text-sm text-red-700">{error}</div></Card>}

      <Card className="mb-6">
        <SectionHeader title="Settlement Summary" subtitle="Admin-controlled payout gateway for vendors" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4"><div className="text-xs text-gray-500">Total Orders</div><div className="mt-1 text-2xl font-bold text-gray-900">{summary.total}</div></div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><div className="text-xs text-amber-700">Held</div><div className="mt-1 text-2xl font-bold text-amber-900">{summary.held}</div></div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="text-xs text-blue-700">Ready for Release</div><div className="mt-1 text-2xl font-bold text-blue-900">{summary.ready}</div></div>
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4"><div className="text-xs text-green-700">Released</div><div className="mt-1 text-2xl font-bold text-green-900">{summary.released}</div></div>
        </div>
      </Card>

      <Card className="mb-6">
        <SectionHeader title="Filter Orders" subtitle="Choose settlement state to monitor and process quickly" />
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: 'All' },
            { key: 'held', label: 'Held' },
            { key: 'ready_for_release', label: 'Ready for Release' },
            { key: 'released', label: 'Released' },
          ] as Array<{ key: SettlementFilter; label: string }>).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSettlementFilter(item.key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${settlementFilter === item.key ? 'border-forest bg-forest text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {orders.length === 0 ? (
        <Card>
          <EmptyState icon={Package} title="No orders found" description="Orders will appear here when users place them." />
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const releaseAllowed = ['delivered', 'completed'].includes(order.status) && order.paymentStatus === 'paid' && order.settlementStatus !== 'released';

            return (
              <Card key={order.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{order.id}</h3>
                      <StatusBadge status={order.status} />
                      <StatusBadge status={order.settlementStatus || 'held'} />
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Farmer {order.farmerName} · Vendor {order.vendorName}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Placed {formatDateTime(order.placedAt)} · Expected {formatDate(order.estimatedDelivery)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRelease(order.id)}
                      disabled={!releaseAllowed || processingOrderId === order.id}
                      className="btn-success px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingOrderId === order.id ? 'Releasing...' : 'Release Vendor Payment'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Order Amount</div><div className="mt-1 font-semibold text-gray-900">{formatBDT(order.totalAmount)}</div></div>
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Payment</div><div className="mt-1 font-semibold uppercase text-gray-900">{order.paymentGateway} / {order.paymentStatus}</div></div>
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Settlement</div><div className="mt-1 font-semibold capitalize text-gray-900">{(order.settlementStatus || 'held').replace(/_/g, ' ')}</div></div>
                  <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-400">Released At</div><div className="mt-1 font-semibold text-gray-900">{order.settlementReleasedAt ? formatDateTime(order.settlementReleasedAt) : 'Not released'}</div></div>
                </div>

                {releaseAllowed ? (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <ShieldCheck className="mr-2 inline h-4 w-4" />
                    Delivery is confirmed and payment is paid. Admin can release vendor payout now.
                  </div>
                ) : order.settlementStatus === 'released' ? (
                  <div className="mt-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    Settlement already released by admin.
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Payment is held by admin until farmer confirms delivery and payment status becomes paid.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

