'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Wheat } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { COMPANY_FALLBACK_USER, COMPANY_NAV_ITEMS } from '@/components/dashboard/companyConfig';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { cropService } from '@/services';
import type { CropDeal, CropListing } from '@/types';

export default function CompanyListingsPage() {
  const router = useRouter();
  const { user, notificationCount } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [listings, setListings] = useState<CropListing[]>([]);
  const [matches, setMatches] = useState<CropDeal[]>([]);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [message, setMessage] = useState('');
  const [processingListingId, setProcessingListingId] = useState<string | null>(null);
  const [justInterestedListingId, setJustInterestedListingId] = useState<string | null>(null);

  const refreshData = async () => {
    const [allListings, companyMatches] = await Promise.all([
      cropService.getCropListings(),
      cropService.getCompanyMatches(user.id),
    ]);
    setListings(allListings);
    setMatches(companyMatches);
  };

  useEffect(() => {
    refreshData();
  }, [user.id]);

  const filteredListings = useMemo(() => listings.filter((listing) => {
    const matchesSearch = !search || `${listing.cropType} ${listing.variety} ${listing.farmerName}`.toLowerCase().includes(search.toLowerCase());
    const matchesDistrict = !districtFilter || listing.district.toLowerCase().includes(districtFilter.toLowerCase());
    return matchesSearch && matchesDistrict;
  }), [districtFilter, listings, search]);

  const matchedListingIds = new Set(
    matches
      .filter((match) => match.status !== 'cancelled')
      .map((match) => match.listingId),
  );

  const handleInterest = async (listing: CropListing) => {
    setProcessingListingId(listing.id);
    setJustInterestedListingId(null);
    const result = await cropService.expressInterest({
      listingId: listing.id,
      companyId: user.id,
      companyName: user.companyName || user.name,
      quantityKg: listing.quantityKg,
      listing,
      allowRepeat: false,
    });
    setProcessingListingId(null);

    if (!result.success) {
      setMessage(result.message || 'Could not send interest. Please try again.');
      return;
    }

    setJustInterestedListingId(listing.id);
    setMessage(result.message || 'Interest sent successfully. Match request moved to deal stage.');
    setListings((prev) => prev.map((item) => (
      item.id === listing.id
        ? { ...item, status: 'matched', matchedCompanyId: user.id }
        : item
    )));
    setMatches((prev) => (
      prev.some((item) => item.listingId === listing.id && item.status !== 'cancelled')
        ? prev
        : [
          {
            id: result.matchId || `deal_local_${listing.id}`,
            listingId: listing.id,
            companyId: user.id,
            companyName: user.companyName || user.name,
            farmerId: listing.farmerId,
            farmerName: listing.farmerName,
            agreedPrice: listing.askingPrice,
            quantityKg: listing.quantityKg,
            commissionPct: 3,
            commissionAmt: Math.round(listing.askingPrice * listing.quantityKg * 0.03),
            status: 'confirmed',
            paymentGateway: 'bkash',
            paymentStatus: 'pending',
            confirmedAt: new Date().toISOString(),
          },
          ...prev,
        ]
    ));
    await refreshData();
    router.push('/dashboard/company/cart');
  };

  return (
    <DashboardShell
      navItems={COMPANY_NAV_ITEMS}
      role="company"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Procurement Company'}
      notificationCount={notificationCount}
    >
      <PageHeader title="Browse Listings" subtitle="See farmer crop lists, add selected listings to cart, then pay and place order" />

      {message && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      <Card className="mb-6">
        <SectionHeader title="Search & Filter" subtitle="Find the right farmer crop listing" />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs text-gray-400">Search crop / farmer</span>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-9" placeholder="Rice, mango, farmer name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">District filter</span>
            <input className="input-field mt-2" placeholder="Dhaka, Rajshahi..." value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} />
          </label>
        </div>
      </Card>

      {filteredListings.length === 0 ? (
        <Card>
          <EmptyState icon={Wheat} title="No listings found" description="Try changing the crop or district filter." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((listing) => {
            const isMatched = listing.status === 'matched' || matchedListingIds.has(listing.id);
            const isProcessing = processingListingId === listing.id;
            const justInterested = justInterestedListingId === listing.id;
            return (
              <Card key={listing.id} className={`${isMatched ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                <div className="h-36 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${listing.photos[0]})` }} />
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{listing.cropType}</h3>
                    <div className="text-sm text-gray-500">{listing.variety}</div>
                  </div>
                  <StatusBadge status={isMatched ? 'matched' : listing.status} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  {listing.district}, {listing.upazila}
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div>Farmer: <span className="font-medium text-gray-900">{listing.farmerName}</span></div>
                  <div>Available Quantity: <span className="font-medium text-gray-900">{listing.quantityKg.toLocaleString('en-BD')} kg</span></div>
                  <div>Price: <span className="font-medium text-gray-900">৳{listing.askingPrice}/kg</span></div>
                  <div>Quality: <span className="font-medium text-gray-900">Grade {listing.qualityGrade}</span></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => handleInterest(listing)} disabled={isProcessing} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60">
                    {isProcessing ? 'Adding...' : 'Add to Cart'}
                  </button>
                </div>
                {justInterested && (
                  <div className="mt-2 text-xs font-medium text-green-700">
                    Added to cart successfully.
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
