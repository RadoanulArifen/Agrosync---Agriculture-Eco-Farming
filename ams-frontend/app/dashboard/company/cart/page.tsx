'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, ShoppingCart } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { COMPANY_FALLBACK_USER, COMPANY_NAV_ITEMS } from '@/components/dashboard/companyConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { cropService } from '@/services';
import type { CropDeal, PaymentGateway } from '@/types';
import { formatBDT, formatDateTime } from '@/utils';

export default function CompanyCartPage() {
  const { user, notificationCount } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [cartDeals, setCartDeals] = useState<CropDeal[]>([]);
  const [message, setMessage] = useState('');
  const [processingDealId, setProcessingDealId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { agreedPrice: number; quantityKg: number; paymentGateway: PaymentGateway }>>({});

  const refreshCart = async () => {
    try {
      const data = await cropService.getCompanyMatches(user.id);
      const nextCart = data.filter((deal) => ['confirmed', 'negotiating', 'locked'].includes(deal.status));
      setCartDeals(nextCart);
      setDrafts((prev) => {
        const next = { ...prev };
        nextCart.forEach((deal) => {
          const currentDraft = next[deal.id];
          if (!currentDraft) {
            next[deal.id] = {
              agreedPrice: deal.agreedPrice,
              quantityKg: deal.quantityKg,
              paymentGateway: deal.paymentGateway || 'bkash',
            };
            return;
          }

          const isEditableStage = deal.status === 'confirmed' || deal.status === 'negotiating';
          next[deal.id] = {
            agreedPrice: isEditableStage ? currentDraft.agreedPrice : deal.agreedPrice,
            quantityKg: isEditableStage ? currentDraft.quantityKg : deal.quantityKg,
            paymentGateway: currentDraft.paymentGateway || deal.paymentGateway || 'bkash',
          };
        });
        return next;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load cart right now.');
    }
  };

  useEffect(() => {
    void refreshCart();
  }, [user.id]);

  const updateStatus = async (
    dealId: string,
    status: CropDeal['status'],
    successText: string,
    payload?: { agreedPrice?: number; quantityKg?: number },
  ) => {
    const targetDeal = cartDeals.find((deal) => deal.id === dealId);
    if ((status === 'negotiating' || status === 'locked') && payload) {
      if (!Number.isFinite(payload.agreedPrice) || (payload.agreedPrice ?? 0) <= 0) {
        setMessage('Please enter a valid negotiation price.');
        return;
      }
      if (!Number.isFinite(payload.quantityKg) || (payload.quantityKg ?? 0) <= 0) {
        setMessage('Please enter a valid quantity.');
        return;
      }
    }

    setProcessingDealId(dealId);
    const result = await cropService.updateDealStatus(dealId, status, {
      actorRole: 'company',
      actorId: user.id,
      agreedPrice: payload?.agreedPrice,
      quantityKg: payload?.quantityKg,
      paymentGateway: drafts[dealId]?.paymentGateway,
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
      setMessage(result.message || 'Could not update cart item. Please try again.');
      return;
    }

    setMessage(successText);
    await refreshCart();
  };

  const handlePayNow = async (deal: CropDeal) => {
    setProcessingDealId(deal.id);

    const payment = await cropService.initiateDealPayment({
      dealId: deal.id,
      companyId: user.id,
      listingId: deal.listingId,
      paymentGateway: drafts[deal.id]?.paymentGateway || deal.paymentGateway || 'bkash',
    });

    setProcessingDealId(null);
    if (!payment.success) {
      setMessage(payment.message || 'Could not start payment. Please try again.');
      return;
    }

    if (payment.gatewayPageUrl) {
      window.open(payment.gatewayPageUrl, '_blank', 'noopener,noreferrer');
    }

    setMessage(payment.alreadyPaid
      ? 'Payment already completed. You can place order now.'
      : 'Payment started. Complete payment, then click Send Order.');
    await refreshCart();
  };

  const handlePlaceOrder = async (deal: CropDeal) => {
    if ((deal.paymentGateway || drafts[deal.id]?.paymentGateway || 'bkash') !== 'cod' && deal.paymentStatus !== 'paid') {
      setMessage('Please complete payment first, then send order to farmer.');
      return;
    }

    setProcessingDealId(deal.id);
    const result = await cropService.updateDealStatus(deal.id, 'order_placed', {
      actorRole: 'company',
      actorId: user.id,
      paymentGateway: drafts[deal.id]?.paymentGateway || deal.paymentGateway || 'bkash',
      paymentStatus: deal.paymentStatus,
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
      setMessage(result.message || 'Could not send order. Please try again.');
      return;
    }

    setMessage('Order sent to farmer successfully. Check My Orders for tracking.');
    await refreshCart();
  };

  return (
    <DashboardShell
      navItems={COMPANY_NAV_ITEMS}
      role="company"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Procurement Company'}
      notificationCount={notificationCount}
    >
      <PageHeader title="Cart" subtitle="Review selected farmer listings, complete payment, and send order to farmer" />

      {message && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      {cartDeals.length === 0 ? (
        <Card>
          <EmptyState icon={ShoppingCart} title="Cart is empty" description="Browse listings and add items to your company cart." />
        </Card>
      ) : (
        <div className="space-y-4">
          {cartDeals.map((deal) => (
            <Card key={deal.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{deal.farmerName}</h2>
                    <StatusBadge status={deal.status} />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Deal ID {deal.id} · Listing {deal.listingId}
                    {deal.confirmedAt ? ` · Added ${formatDateTime(deal.confirmedAt)}` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(deal.status === 'confirmed' || deal.status === 'negotiating') && (
                    <>
                      <button
                        type="button"
                        disabled={processingDealId === deal.id}
                        onClick={() => updateStatus(
                          deal.id,
                          'negotiating',
                          'Updated offer sent successfully.',
                          drafts[deal.id],
                        )}
                        className="btn-outline flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {processingDealId === deal.id ? 'Sending...' : 'Update Offer'}
                      </button>
                      <button
                        type="button"
                        disabled={processingDealId === deal.id}
                        onClick={() => updateStatus(deal.id, 'locked', 'Deal locked. You can pay and send order now.', drafts[deal.id])}
                        className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                      >
                        Lock Deal
                      </button>
                    </>
                  )}

                  {deal.status === 'locked' && (
                    <>
                      {((drafts[deal.id]?.paymentGateway || deal.paymentGateway || 'bkash') === 'cod' || deal.paymentStatus === 'paid') ? (
                        <button
                          type="button"
                          disabled={processingDealId === deal.id}
                          onClick={() => handlePlaceOrder(deal)}
                          className="btn-success px-4 py-2 text-sm disabled:opacity-60"
                        >
                          <ShoppingCart className="mr-2 inline h-4 w-4" />
                          {processingDealId === deal.id ? 'Processing...' : 'Send Order'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={processingDealId === deal.id}
                          onClick={() => handlePayNow(deal)}
                          className="btn-success px-4 py-2 text-sm disabled:opacity-60"
                        >
                          <ShoppingCart className="mr-2 inline h-4 w-4" />
                          {processingDealId === deal.id ? 'Processing...' : 'Pay Now'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={processingDealId === deal.id}
                        onClick={() => updateStatus(deal.id, 'cancelled', 'Item removed from cart.')}
                        className="btn-danger px-4 py-2 text-sm disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Price</div>
                  {(deal.status === 'confirmed' || deal.status === 'negotiating') ? (
                    <input
                      type="number"
                      min={1}
                      className="input-field mt-2"
                      value={drafts[deal.id]?.agreedPrice ?? deal.agreedPrice}
                      onChange={(event) => setDrafts((prev) => ({
                        ...prev,
                        [deal.id]: {
                          ...(prev[deal.id] || {
                            agreedPrice: deal.agreedPrice,
                            quantityKg: deal.quantityKg,
                            paymentGateway: deal.paymentGateway || 'bkash',
                          }),
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
                  {(deal.status === 'confirmed' || deal.status === 'negotiating') ? (
                    <input
                      type="number"
                      min={1}
                      className="input-field mt-2"
                      value={drafts[deal.id]?.quantityKg ?? deal.quantityKg}
                      onChange={(event) => setDrafts((prev) => ({
                        ...prev,
                        [deal.id]: {
                          ...(prev[deal.id] || {
                            agreedPrice: deal.agreedPrice,
                            quantityKg: deal.quantityKg,
                            paymentGateway: deal.paymentGateway || 'bkash',
                          }),
                          quantityKg: Number(event.target.value) || 0,
                        },
                      }))}
                    />
                  ) : (
                    <div className="mt-1 text-lg font-bold text-gray-900">{deal.quantityKg.toLocaleString('en-BD')} kg</div>
                  )}
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Payment</div>
                  <select
                    className="input-field mt-2"
                    value={drafts[deal.id]?.paymentGateway || deal.paymentGateway || 'bkash'}
                    onChange={(event) => setDrafts((prev) => ({
                      ...prev,
                      [deal.id]: {
                        agreedPrice: prev[deal.id]?.agreedPrice ?? deal.agreedPrice,
                        quantityKg: prev[deal.id]?.quantityKg ?? deal.quantityKg,
                        paymentGateway: event.target.value as PaymentGateway,
                      },
                    }))}
                  >
                    {(['bkash', 'nagad', 'cod', 'stripe'] as PaymentGateway[]).map((gateway) => (
                      <option key={gateway} value={gateway}>{gateway}</option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs text-gray-500">Status: <span className="font-medium capitalize">{deal.paymentStatus || 'pending'}</span></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
