'use client';

import { useEffect, useState } from 'react';
import { Plus, Upload, Wheat, X } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { cropService } from '@/services';
import type { CropListing } from '@/types';

const DEFAULT_LISTING_PHOTO = 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&q=80';

const INITIAL_FORM = {
  productCategory: 'Fresh Vegetables' as NonNullable<CropListing['productCategory']>,
  cropType: '',
  variety: '',
  quantityKg: '',
  askingPrice: '',
  harvestDate: '',
  qualityGrade: 'A' as CropListing['qualityGrade'],
};

export default function FarmerCropListingsPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [listings, setListings] = useState<CropListing[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [photoPreview, setPhotoPreview] = useState('');
  const [message, setMessage] = useState('');

  const refreshListings = () => {
    if (!farmer) return;
    cropService.getCropListings(farmer.id).then(setListings);
  };

  useEffect(() => {
    refreshListings();
  }, [farmer]);

  const setFormField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose a valid product image.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(typeof reader.result === 'string' ? reader.result : '');
      setMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleCreateListing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!farmer) return;

    const result = await cropService.createCropListing({
      farmerId: farmer.id,
      farmerName: farmer.name,
      farmerDistrict: farmer.district,
      productCategory: form.productCategory,
      cropType: form.cropType,
      variety: form.variety,
      quantityKg: Number(form.quantityKg),
      askingPrice: Number(form.askingPrice),
      harvestDate: form.harvestDate,
      qualityGrade: form.qualityGrade,
      district: farmer.district,
      upazila: farmer.upazila,
      photos: [photoPreview || DEFAULT_LISTING_PHOTO],
      status: 'active',
    });

    if (result.success) {
      setForm(INITIAL_FORM);
      setPhotoPreview('');
      setMessage('Product listing uploaded successfully. It will now appear on the public product page and company listing page.');
      refreshListings();
    }
  };

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading crop listings..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="My Crop Listings" subtitle="Upload products for sale and track buyer matching status" />

      {message && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      <Card className="mb-6">
        <SectionHeader title="Upload Product for Sale" subtitle="These farmer products will appear on the public product page for company buyers" />
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleCreateListing}>
          <select className="input-field" value={form.productCategory} onChange={(event) => setFormField('productCategory', event.target.value)}>
            {['Fresh Vegetables', 'Organic', 'Dairy'].map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <input className="input-field" placeholder="Product name, e.g. Fresh Tomato" value={form.cropType} onChange={(event) => setFormField('cropType', event.target.value)} required />
          <input className="input-field" placeholder="Variety / details" value={form.variety} onChange={(event) => setFormField('variety', event.target.value)} required />
          <select className="input-field" value={form.qualityGrade} onChange={(event) => setFormField('qualityGrade', event.target.value)}>
            {['A', 'B', 'C'].map((grade) => (
              <option key={grade} value={grade}>Grade {grade}</option>
            ))}
          </select>
          <input className="input-field" type="number" min="1" placeholder="Quantity (kg)" value={form.quantityKg} onChange={(event) => setFormField('quantityKg', event.target.value)} required />
          <input className="input-field" type="number" min="1" placeholder="Asking price per kg" value={form.askingPrice} onChange={(event) => setFormField('askingPrice', event.target.value)} required />
          <input className="input-field" type="date" value={form.harvestDate} onChange={(event) => setFormField('harvestDate', event.target.value)} required />

          <div className="lg:col-span-2">
            <label className="input-field flex cursor-pointer items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                  <Upload className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-base text-gray-700">{photoPreview ? 'Product image selected' : 'Choose product image'}</span>
                  <span className="block text-sm text-gray-400">This image will show on public product cards.</span>
                </span>
              </span>
              <span className="text-sm font-medium text-forest">Browse</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>

            {photoPreview && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <img src={photoPreview} alt="Product preview" className="h-14 w-14 rounded-xl border border-gray-200 object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-700">Preview ready</div>
                  <div className="text-sm text-gray-400">This photo will be used for the public listing.</div>
                </div>
                <button type="button" onClick={() => setPhotoPreview('')} className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                  <X className="h-4 w-4" />
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <button type="submit" className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Upload Product
            </button>
          </div>
        </form>
      </Card>

      {listings.length === 0 ? (
        <Card>
          <EmptyState icon={Wheat} title="No crop listings yet" description="When you create crop listings, they will appear here." />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-mono text-xs text-gray-400">{listing.id}</div>
                  <h3 className="font-bold text-gray-800">{listing.cropType}</h3>
                </div>
                <StatusBadge status={listing.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-xs text-gray-400">Variety</div>
                  <div className="font-semibold">{listing.variety}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-xs text-gray-400">Quantity</div>
                  <div className="font-semibold">{listing.quantityKg} kg</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-xs text-gray-400">Location</div>
                  <div className="font-semibold">{listing.upazila}, {listing.district}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-xs text-gray-400">Grade</div>
                  <div className="font-semibold">{listing.qualityGrade}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
