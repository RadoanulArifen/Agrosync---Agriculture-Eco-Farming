'use client';

import { useEffect, useState } from 'react';
import { HandshakeIcon, MessageSquare, ShoppingCart } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { COMPANY_FALLBACK_USER, COMPANY_NAV_ITEMS } from '@/components/dashboard/companyConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { cropService } from '@/services';
import type { CropDeal } from '@/types';
import { formatBDT, formatDateTime } from '@/utils';

export default function CompanyMatchesPage() {
  const { user } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [matches, setMatches] = useState<CropDeal[]>([]);
  const [message, setMessage] = useState('');

  const refreshMatches = async () => {
    const data = await cropService.getCompanyMatches(user.id);
    setMatches(data);
  };

  useEffect(() => {
    refreshMatches();
  }, [user.id]);

  const updateStatus = async (dealId: string, status: CropDeal['status'], successText: string) => {
    await cropService.updateDealStatus(dealId, status);
    setMessage(successText);
    refreshMatches();
  };

  return (
    <DashboardShell
      navItems={COMPANY_NAV_ITEMS}
      role="company"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Procurement Company'}
      notificationCount={matches.length}
    >
      <PageHeader title="Matched Farmers" subtitle="List of matched farmers, negotiation support, and order initiation actions" />

      {message && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      {matches.length === 0 ? (
        <Card>
          <EmptyState icon={HandshakeIcon} title="No matched farmers yet" description="Use Browse Listings and express interest to start connecting with farmers." />
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card key={match.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{match.farmerName}</h2>
                    <StatusBadge status={match.status} />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Deal ID {match.id} · Listing {match.listingId}
                    {match.confirmedAt ? ` · Updated ${formatDateTime(match.confirmedAt)}` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-outline flex items-center gap-2 px-4 py-2 text-sm">
                    <MessageSquare className="h-4 w-4" />
                    Chat / Offer
                  </button>
                  <button type="button" onClick={() => updateStatus(match.id, 'confirmed', 'Negotiation moved to confirmed stage.')} className="btn-primary px-4 py-2 text-sm">
                    Confirm Deal
                  </button>
                  <button type="button" onClick={() => updateStatus(match.id, 'completed', 'Order initiated successfully.')} className="btn-success px-4 py-2 text-sm">
                    <ShoppingCart className="mr-2 inline h-4 w-4" />
                    Place Order
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Negotiation Price</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{formatBDT(match.agreedPrice)}/kg</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Quantity</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{match.quantityKg.toLocaleString('en-BD')} kg</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Commission</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{match.commissionPct}%</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs text-gray-400">Commission Amount</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{formatBDT(match.commissionAmt)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
