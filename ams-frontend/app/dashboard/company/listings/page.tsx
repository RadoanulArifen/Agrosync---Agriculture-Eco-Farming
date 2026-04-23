'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const { user } = useRoleUserContext({ role: 'company', fallbackUser: COMPANY_FALLBACK_USER });
  const [listings, setListings] = useState<CropListing[]>([]);
  const [matches, setMatches] = useState<CropDeal[]>([]);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [message, setMessage] = useState('');

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

  const matchedListingIds = new Set(matches.map((match) => match.listingId));

  const handleInterest = async (listing: CropListing) => {
    const result = await cropService.expressInterest({
      listingId: listing.id,
      companyId: user.id,
      companyName: user.companyName || user.name,
    });
    setMessage(result.message || 'Interest sent successfully. Match request moved to deal stage.');
    refreshData();
  };

  return (
    <DashboardShell
      navItems={COMPANY_NAV_ITEMS}
      role="company"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Procurement Company'}
      notificationCount={matches.length}
    >
      <PageHeader title="Browse Listings" subtitle="See farmer crop lists, search/filter them, and express company interest" />

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
            const isMatched = matchedListingIds.has(listing.id);
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
                  <div>Quantity: <span className="font-medium text-gray-900">{listing.quantityKg.toLocaleString('en-BD')} kg</span></div>
                  <div>Price: <span className="font-medium text-gray-900">৳{listing.askingPrice}/kg</span></div>
                  <div>Quality: <span className="font-medium text-gray-900">Grade {listing.qualityGrade}</span></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => handleInterest(listing)} disabled={isMatched} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60">
                    {isMatched ? 'Already Matched' : 'Express Interest'}
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Real meaning: company says "আমি এই crop কিনতে interested" and a match request is created.
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
