'use client';

import { useEffect, useState } from 'react';
import { Download, Package } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { COMPANY_FALLBACK_USER, COMPANY_NAV_ITEMS } from '@/components/dashboard/companyConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { cropService } from '@/services';
import type { CropDeal } from '@/types';
import { formatBDT, formatDateTime } from '@/utils';

export default function CompanyMyOrdersPage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [orders, setOrders] = useState<CropDeal[]>([]);
  const [message, setMessage] = useState('');
  const [processingDealId, setProcessingDealId] = useState<string | null>(null);

  const refreshOrders = async () => {
    try {
      const data = await cropService.getCompanyMatches(user.id);
      setOrders(data.filter((deal) => ['order_placed', 'accepted', 'delivered', 'completed'].includes(deal.status)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load orders right now.');
    }
  };

  useEffect(() => {
    void refreshOrders();
  }, [user.id]);

  const handleComplete = async (deal: CropDeal) => {
    setProcessingDealId(deal.id);
    const result = await cropService.updateDealStatus(deal.id, 'completed', {
      actorRole: 'company',
      actorId: user.id,
      dealContext: {
        companyId: deal.companyId,
        companyName: deal.companyName,
        farmerId: deal.farmerId,
        farmerName: deal.farmerName,
        listingId: deal.listingId,
      },
    });
    setProcessingDealId(null);

    if (!result.success) {
      setMessage(result.message || 'Could not complete order.');
      return;
    }

    setMessage('Order completed successfully.');
    await refreshOrders();
  };

  const downloadPaymentReceipt = (deal: CropDeal) => {
    const gateway = deal.paymentGateway || 'bkash';
    const totalAmount = Math.round(deal.quantityKg * deal.agreedPrice);
    const issuedAt = new Date().toISOString();

    const receipt = [
      'AgriCultMS - Company Order Receipt',
      '----------------------------------------',
      `Issued At: ${issuedAt}`,
      `Company: ${user.companyName || user.name}`,
      `Farmer: ${deal.farmerName}`,
      `Deal ID: ${deal.id}`,
      `Listing ID: ${deal.listingId}`,
      `Price: BDT ${deal.agreedPrice}/kg`,
      `Quantity: ${deal.quantityKg} kg`,
      `Total: BDT ${totalAmount}`,
      `Payment Gateway: ${gateway}`,
      `Payment Status: ${deal.paymentStatus || 'pending'}`,
      '----------------------------------------',
    ].join('\n');

    const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `company-order-${deal.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardShell
      navItems={COMPANY_NAV_ITEMS}
      role="company"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Procurement Company'}
      notificationCount={notificationCount}
    >
      <PageHeader title="My Orders" subtitle="Track orders sent to farmers and monitor their latest status" />

      {message && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      {orders.length === 0 ? (
        <Card>
          <EmptyState icon={Package} title="No orders yet" description="Orders sent from your cart will appear here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((deal) => (
            <Card key={deal.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{deal.farmerName}</h2>
                    <StatusBadge status={deal.status} />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Deal ID {deal.id} · Listing {deal.listingId}
                    {deal.confirmedAt ? ` · Updated ${formatDateTime(deal.confirmedAt)}` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {deal.status === 'delivered' && (
                    <button
                      type="button"
                      disabled={processingDealId === deal.id}
                      onClick={() => handleComplete(deal)}
                      className="btn-success px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {processingDealId === deal.id ? 'Processing...' : 'Complete Order'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadPaymentReceipt(deal)}
                    className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Receipt
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Price</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{formatBDT(deal.agreedPrice)}/kg</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Quantity</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{deal.quantityKg.toLocaleString('en-BD')} kg</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Total</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{formatBDT(deal.quantityKg * deal.agreedPrice)}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Payment</div>
                  <div className="mt-1 text-lg font-bold capitalize text-gray-900">{deal.paymentGateway || 'bkash'} / {deal.paymentStatus || 'pending'}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
