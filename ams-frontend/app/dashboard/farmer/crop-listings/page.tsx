'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Save, Trash2, Upload, Wheat, X } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { cropService } from '@/services';
import type { CropListing } from '@/types';
import { formatBDT } from '@/utils';

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
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteListingId, setPendingDeleteListingId] = useState<string | null>(null);

  const refreshListings = async () => {
    if (!farmer) return;
    const data = await cropService.getCropListings(farmer.id);
    setListings(data);
  };

  useEffect(() => {
    refreshListings();
  }, [farmer]);

  const setFormField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setPhotoPreview('');
    setEditingListingId(null);
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

  const handleSubmitListing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!farmer || submitting) return;

    setSubmitting(true);
    const wasEditing = Boolean(editingListingId);

    const listingPayload: Partial<CropListing> = {
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
    };

    const result = wasEditing && editingListingId
      ? await cropService.updateCropListing(editingListingId, listingPayload)
      : await cropService.createCropListing({
        ...listingPayload,
        farmerId: farmer.id,
        farmerName: farmer.name,
        farmerDistrict: farmer.district,
        status: 'active',
      });

    setSubmitting(false);

    if (!result.success) {
      setMessage(wasEditing ? 'Product update failed. Please try again.' : 'Product upload failed. Please try again.');
      return;
    }

    resetForm();
    setMessage(
      wasEditing
        ? 'Product listing updated successfully.'
        : 'Product listing uploaded successfully. It will now appear on the public product page and company listing page.',
    );
    await refreshListings();
  };

  const handleEditListing = (listing: CropListing) => {
    setEditingListingId(listing.id);
    setForm({
      productCategory: (listing.productCategory || 'Fresh Vegetables') as NonNullable<CropListing['productCategory']>,
      cropType: listing.cropType || '',
      variety: listing.variety || '',
      quantityKg: String(listing.quantityKg || ''),
      askingPrice: String(listing.askingPrice || ''),
      harvestDate: listing.harvestDate || '',
      qualityGrade: listing.qualityGrade || 'A',
    });
    setPhotoPreview(listing.photos?.[0] || '');
    setMessage('');
  };

  const handleDeleteListing = async (listingId: string) => {
    const result = await cropService.deleteCropListing(listingId);

    if (!result.success) {
      setMessage('Product delete failed. Please try again.');
      return;
    }

    if (editingListingId === listingId) {
      resetForm();
    }

    setMessage('Product listing deleted successfully.');
    await refreshListings();
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
        <SectionHeader
          title={editingListingId ? 'Edit Product Listing' : 'Upload Product for Sale'}
          subtitle="These farmer products will appear on the public product page for company buyers"
        />
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmitListing}>
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
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
                {editingListingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {submitting ? (editingListingId ? 'Updating...' : 'Uploading...') : (editingListingId ? 'Update Product' : 'Upload Product')}
              </button>
              {editingListingId && (
                <button type="button" className="btn-outline" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
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
              <img
                src={listing.photos?.[0] || DEFAULT_LISTING_PHOTO}
                alt={listing.cropType}
                className="mb-4 h-40 w-full rounded-xl border border-gray-100 object-cover"
              />
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-mono text-xs text-gray-400">{listing.id}</div>
                  <h3 className="font-bold text-gray-800">{listing.cropType}</h3>
                </div>
                <StatusBadge status={listing.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-600">Variety</div>
                  <div className="font-semibold text-emerald-900">{listing.variety}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-600">Quantity</div>
                  <div className="font-semibold text-emerald-900">{listing.quantityKg} kg</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-600">Location</div>
                  <div className="font-semibold text-emerald-900">{listing.upazila}, {listing.district}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-600">Grade</div>
                  <div className="font-semibold text-emerald-900">{listing.qualityGrade}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-600">Price</div>
                  <div className="font-semibold text-emerald-900">{formatBDT(listing.askingPrice)}/kg</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => handleEditListing(listing)} className="btn-outline px-4 py-2 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </span>
                </button>
                <button type="button" onClick={() => setPendingDeleteListingId(listing.id)} className="btn-danger px-4 py-2 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pendingDeleteListingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Delete Product Listing?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn-outline px-4 py-2 text-sm"
                onClick={() => setPendingDeleteListingId(null)}
              >
                No
              </button>
              <button
                type="button"
                className="btn-danger px-4 py-2 text-sm"
                onClick={async () => {
                  const targetId = pendingDeleteListingId;
                  setPendingDeleteListingId(null);
                  if (!targetId) return;
                  await handleDeleteListing(targetId);
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
