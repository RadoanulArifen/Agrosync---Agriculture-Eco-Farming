'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Package, XCircle } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, StatusBadge } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { cropService } from '@/services';
import type { CropDeal } from '@/types';
import { formatBDT } from '@/utils';

export default function FarmerSalesOrdersPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [dealOrders, setDealOrders] = useState<CropDeal[]>([]);
  const [message, setMessage] = useState('');
  const [processingDealId, setProcessingDealId] = useState<string | null>(null);

  useEffect(() => {
    if (!farmer) return undefined;

    let active = true;

    const loadSalesOrders = async () => {
      const nextDeals = await cropService.getFarmerDeals(farmer.id);
      if (active) {
        setDealOrders(nextDeals.filter((deal) => ['order_placed', 'accepted', 'delivered', 'completed'].includes(deal.status)));
      }
    };

    void loadSalesOrders();

    const handleRefresh = () => {
      void loadSalesOrders();
    };

    const intervalId = window.setInterval(handleRefresh, 5000);
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('ams:user-session-updated', handleRefresh);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('ams:user-session-updated', handleRefresh);
    };
  }, [farmer]);

  const updateDealOrder = async (dealId: string, status: CropDeal['status'], successText: string) => {
    if (!farmer) return;
    const targetDeal = dealOrders.find((deal) => deal.id === dealId);
    setProcessingDealId(dealId);
    const result = await cropService.updateDealStatus(dealId, status, {
      actorRole: 'farmer',
      actorId: farmer.id,
      dealContext: targetDeal ? {
        companyId: targetDeal.companyId,
        companyName: targetDeal.companyName,
        farmerId: targetDeal.farmerId,
        farmerName: targetDeal.farmerName,
        listingId: targetDeal.listingId,
      } : undefined,
    });
    setProcessingDealId(null);

    if (!result.success) {
      setMessage('Could not update sales order status. Please try again.');
      return;
    }

    setMessage(successText);
    const refreshed = await cropService.getFarmerDeals(farmer.id);
    setDealOrders(refreshed.filter((deal) => ['order_placed', 'accepted', 'delivered', 'completed'].includes(deal.status)));
  };

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading sales orders..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="Sales Orders" subtitle="Review organized company purchase orders for your crop listings" />

      {message && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      {dealOrders.length === 0 ? (
        <Card>
          <EmptyState icon={Package} title="No sales orders yet" description="Company purchase orders from your listings will appear here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {dealOrders.map((deal) => {
            const isBusy = processingDealId === deal.id;
            return (
              <Card key={deal.id} className="border-forest/20 bg-forest/5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">Company Order · {deal.companyName}</div>
                    <div className="text-xs text-gray-500 mt-1">{deal.id} · Listing {deal.listingId}</div>
                  </div>
                  <StatusBadge status={deal.status} />
                </div>

                <div className="grid gap-3 mt-4 md:grid-cols-4">
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-gray-400">Crop Price</div>
                    <div className="font-semibold">{formatBDT(deal.agreedPrice)}/kg</div>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-gray-400">Quantity</div>
                    <div className="font-semibold">{deal.quantityKg.toLocaleString('en-BD')} kg</div>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-gray-400">Commission</div>
                    <div className="font-semibold">{deal.commissionPct}%</div>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-gray-400">Estimated Value</div>
                    <div className="font-semibold">{formatBDT(deal.agreedPrice * deal.quantityKg)}</div>
                  </div>
                </div>

                <div className="grid gap-3 mt-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-gray-400">Payment Gateway</div>
                    <div className="font-semibold capitalize">{deal.paymentGateway || 'Not selected'}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-xs text-gray-400">Payment Status</div>
                    <div className="font-semibold capitalize">{deal.paymentStatus || 'pending'}</div>
                  </div>
                </div>

                {deal.status === 'order_placed' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => updateDealOrder(deal.id, 'accepted', 'Sales order accepted. Next step: mark delivered.')}
                      className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                    >
                      <CheckCircle2 className="mr-2 inline h-4 w-4" />
                      {isBusy ? 'Updating...' : 'Accept Order'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => updateDealOrder(deal.id, 'cancelled', 'Sales order rejected. Company has been notified.')}
                      className="btn-danger px-4 py-2 text-sm disabled:opacity-60"
                    >
                      <XCircle className="mr-2 inline h-4 w-4" />
                      {isBusy ? 'Updating...' : 'Reject Order'}
                    </button>
                  </div>
                )}

                {deal.status === 'accepted' && (
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => updateDealOrder(deal.id, 'delivered', 'Marked as delivered. Waiting for company payment.')}
                      className="btn-success px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {isBusy ? 'Updating...' : 'Mark as Delivered'}
                    </button>
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
