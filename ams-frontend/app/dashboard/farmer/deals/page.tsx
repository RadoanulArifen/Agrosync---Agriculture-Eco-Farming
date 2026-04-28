'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Handshake, XCircle } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { cropService } from '@/services';
import type { CropDeal } from '@/types';
import { formatBDT, formatDateTime } from '@/utils';

export default function FarmerDealsPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [deals, setDeals] = useState<CropDeal[]>([]);
  const [message, setMessage] = useState('');
  const [processingDealId, setProcessingDealId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { agreedPrice: number; quantityKg: number }>>({});

  const refreshDeals = async () => {
    if (!farmer) return;
    try {
      const data = await cropService.getFarmerDeals(farmer.id);
      const actionableDeals = data.filter((deal) => ['pending', 'negotiating', 'order_placed', 'accepted'].includes(deal.status));
      setDeals(actionableDeals);
      setDrafts((prev) => {
        const next = { ...prev };
        actionableDeals.forEach((deal) => {
          if (!next[deal.id]) {
            next[deal.id] = { agreedPrice: deal.agreedPrice, quantityKg: deal.quantityKg };
          }
        });
        return next;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load deals right now.');
    }
  };

  useEffect(() => {
    if (!farmer) return undefined;

    let active = true;

    const loadDeals = async () => {
      if (!farmer || !active) return;
      await refreshDeals();
    };

    void loadDeals();

    const handleRefresh = () => {
      void loadDeals();
    };

    const intervalId = window.setInterval(handleRefresh, 5000);
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('ams:notifications-updated', handleRefresh);
    window.addEventListener('ams:user-session-updated', handleRefresh);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('ams:notifications-updated', handleRefresh);
      window.removeEventListener('ams:user-session-updated', handleRefresh);
    };
  }, [farmer?.id]);

  const handleDealAction = async (
    dealId: string,
    status: CropDeal['status'],
    successMessage: string,
    payload?: { agreedPrice?: number; quantityKg?: number },
  ) => {
    if (!farmer) return;
    const targetDeal = deals.find((deal) => deal.id === dealId);
    setProcessingDealId(dealId);
    const result = await cropService.updateDealStatus(dealId, status, {
      actorRole: 'farmer',
      actorId: farmer.id,
      agreedPrice: payload?.agreedPrice,
      quantityKg: payload?.quantityKg,
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
      setMessage(result.message || 'Could not update the deal status. Please try again.');
      return;
    }

    setMessage(successMessage);
    refreshDeals();
  };

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading deals..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="Deals" subtitle="Review company interest offers and accept or reject them" />

      {message && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      {deals.length === 0 ? (
        <Card>
          <EmptyState icon={Handshake} title="No active deals" description="When companies place or update offers on your listings, active deal actions will appear here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => {
            const isPending = deal.status === 'pending';
            const isNegotiating = deal.status === 'negotiating';
            const isOrderPlaced = deal.status === 'order_placed';
            const isAccepted = deal.status === 'accepted';
            const isBusy = processingDealId === deal.id;

            return (
              <Card key={deal.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">{deal.companyName}</h2>
                      <StatusBadge status={deal.status} />
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Deal ID {deal.id} · Listing {deal.listingId}
                      {deal.confirmedAt ? ` · Updated ${formatDateTime(deal.confirmedAt)}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isPending && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDealAction(
                          deal.id,
                          'confirmed',
                          'Offer accepted. Company can now start negotiation or lock the deal.',
                        )}
                        className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="mr-2 inline h-4 w-4" />
                        {isBusy ? 'Updating...' : 'Accept'}
                      </button>
                    )}
                    {isNegotiating && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDealAction(
                            deal.id,
                            'negotiating',
                            'Final offer sent to company. Waiting for company lock.',
                            drafts[deal.id],
                          )}
                          className="btn-outline px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isBusy ? 'Updating...' : 'Send Final Offer'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDealAction(
                            deal.id,
                            'locked',
                            'Offer accepted and deal locked. Company can place order now.',
                          )}
                          className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="mr-2 inline h-4 w-4" />
                          {isBusy ? 'Updating...' : 'Accept Offer'}
                        </button>
                      </>
                    )}
                    {isOrderPlaced && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDealAction(
                            deal.id,
                            'accepted',
                            'Order accepted. Company has been notified.',
                          )}
                          className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="mr-2 inline h-4 w-4" />
                          {isBusy ? 'Updating...' : 'Accept Order'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDealAction(
                            deal.id,
                            'cancelled',
                            'Order rejected. Company has been notified.',
                          )}
                          className="btn-danger px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <XCircle className="mr-2 inline h-4 w-4" />
                          {isBusy ? 'Updating...' : 'Reject Order'}
                        </button>
                      </>
                    )}
                    {isAccepted && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDealAction(
                          deal.id,
                          'delivered',
                          'Delivery marked complete. Company will now finish payment flow.',
                        )}
                        className="btn-success px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="mr-2 inline h-4 w-4" />
                        {isBusy ? 'Updating...' : 'Mark Delivered'}
                      </button>
                    )}
                    {(isPending || isNegotiating) && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDealAction(
                          deal.id,
                          'cancelled',
                          'Offer rejected. Company has been notified.',
                        )}
                        className="btn-danger px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle className="mr-2 inline h-4 w-4" />
                        {isBusy ? 'Updating...' : 'Reject'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-400">Offered Price</div>
                    {isNegotiating ? (
                      <input
                        type="number"
                        min={1}
                        className="input-field mt-2"
                        value={drafts[deal.id]?.agreedPrice ?? deal.agreedPrice}
                        onChange={(event) => setDrafts((prev) => ({
                          ...prev,
                          [deal.id]: {
                            ...(prev[deal.id] || { agreedPrice: deal.agreedPrice, quantityKg: deal.quantityKg }),
                            agreedPrice: Number(event.target.value) || 0,
                          },
                        }))}
                      />
                    ) : (
                      <div className="mt-1 text-lg font-bold text-gray-900">{formatBDT(deal.agreedPrice)}/kg</div>
                    )}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-400">Quantity</div>
                    {isNegotiating ? (
                      <input
                        type="number"
                        min={1}
                        className="input-field mt-2"
                        value={drafts[deal.id]?.quantityKg ?? deal.quantityKg}
                        onChange={(event) => setDrafts((prev) => ({
                          ...prev,
                          [deal.id]: {
                            ...(prev[deal.id] || { agreedPrice: deal.agreedPrice, quantityKg: deal.quantityKg }),
                            quantityKg: Number(event.target.value) || 0,
                          },
                        }))}
                      />
                    ) : (
                      <div className="mt-1 text-lg font-bold text-gray-900">{deal.quantityKg.toLocaleString('en-BD')} kg</div>
                    )}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-400">Commission Rate</div>
                    <div className="mt-1 text-lg font-bold text-gray-900">{deal.commissionPct}%</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
