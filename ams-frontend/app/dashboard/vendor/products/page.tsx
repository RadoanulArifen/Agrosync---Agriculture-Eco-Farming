'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Edit3, Package, Plus, Save, Trash2, Upload, X,
} from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader,
} from '@/components/dashboard/DashboardComponents';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { VENDOR_FALLBACK_USER, VENDOR_NAV_ITEMS } from '@/components/dashboard/vendorConfig';
import { productService } from '@/services';
import type { Product, ProductCategory } from '@/types';
import { formatBDT } from '@/utils';

const INITIAL_FORM = {
  nameEn: '',
  nameBn: '',
  category: 'Fertilizer' as ProductCategory,
  price: '',
  unit: '',
  stockQty: '',
  manufacturer: '',
  estimatedDeliveryDays: '3',
  description: '',
};

const DEFAULT_PRODUCT_PHOTO = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80';

export default function VendorProductsPage() {
  const { user } = useRoleUserContext({ role: 'vendor', fallbackUser: VENDOR_FALLBACK_USER });
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  const refreshProducts = async () => {
    const data = await productService.getProducts(undefined, 'vnd_001');
    setProducts(data);
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const submitLabel = editingId ? 'Update Product' : 'Add Product';
  const lowStockProducts = useMemo(() => products.filter((product) => product.stockQty <= 50), [products]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setPhotoPreview('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose a valid image file for the product.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      setPhotoPreview(imageUrl);
      setMessage('');
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoPreview('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      vendorId: 'vnd_001',
      vendorName: user.companyName || user.name,
      nameEn: form.nameEn,
      nameBn: form.nameBn,
      category: form.category,
      price: Number(form.price),
      unit: form.unit,
      stockQty: Number(form.stockQty),
      description: form.description,
      manufacturer: form.manufacturer,
      photos: [photoPreview || DEFAULT_PRODUCT_PHOTO],
      deliveryDistricts: user.deliveryDistricts || ['Dhaka'],
      estimatedDeliveryDays: Number(form.estimatedDeliveryDays),
      isRecommended: false,
    };

    if (editingId) {
      await productService.updateProduct(editingId, payload);
      setMessage('Product updated successfully.');
    } else {
      await productService.createProduct(payload);
      setMessage('New product added successfully.');
    }

    resetForm();
    refreshProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      nameEn: product.nameEn,
      nameBn: product.nameBn,
      category: product.category,
      price: String(product.price),
      unit: product.unit,
      stockQty: String(product.stockQty),
      manufacturer: product.manufacturer,
      estimatedDeliveryDays: String(product.estimatedDeliveryDays),
      description: product.description,
    });
    setPhotoPreview(product.photos[0] || '');
    setMessage('');
  };

  const handleDelete = async (productId: string) => {
    await productService.deleteProduct(productId);
    if (editingId === productId) resetForm();
    setMessage('Product deleted successfully.');
    refreshProducts();
  };

  const handleStockUpdate = async (productId: string, stockQty: number) => {
    await productService.updateStock(productId, stockQty);
    setMessage('Stock updated successfully.');
    refreshProducts();
  };

  return (
    <DashboardShell
      navItems={VENDOR_NAV_ITEMS}
      role="vendor"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Verified Vendor'}
      notificationCount={lowStockProducts.length}
    >
      <PageHeader title="My Products" subtitle="Add, edit, delete, and update product stock for your vendor shop" />

      {message && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        <Card>
          <SectionHeader title={editingId ? 'Edit Product' : 'Add New Product'} subtitle="Vendor main action panel" />
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input className="input-field" placeholder="Product Name (English)" value={form.nameEn} onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))} required />
            <input className="input-field" placeholder="Product Name (Bangla)" value={form.nameBn} onChange={(e) => setForm((prev) => ({ ...prev, nameBn: e.target.value }))} required />
            <select className="input-field" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as ProductCategory }))}>
              {['Fertilizer', 'Pesticide', 'Seed', 'Medicine', 'Equipment', 'Organic', 'Fresh Vegetables', 'Dairy'].map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" type="number" placeholder="Price" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} required />
              <input className="input-field" type="number" placeholder="Stock" value={form.stockQty} onChange={(e) => setForm((prev) => ({ ...prev, stockQty: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" placeholder="Unit" value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} required />
              <input className="input-field" type="number" placeholder="Delivery Days" value={form.estimatedDeliveryDays} onChange={(e) => setForm((prev) => ({ ...prev, estimatedDeliveryDays: e.target.value }))} required />
            </div>
            <input className="input-field" placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))} required />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Product Image</label>
              <label className="input-field flex cursor-pointer items-center justify-between gap-3">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                    <Upload className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base text-gray-700">
                      {photoPreview ? 'Product image selected' : 'Choose product image'}
                    </span>
                    <span className="block text-sm text-gray-400">This photo will appear in the listing card.</span>
                  </span>
                </span>
                <span className="text-sm font-medium text-forest whitespace-nowrap">Browse</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>

              {photoPreview && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <img src={photoPreview} alt="Product preview" className="h-14 w-14 rounded-xl object-cover border border-gray-200" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-700">Preview ready</div>
                    <div className="text-sm text-gray-400">This image will be shown in marketplace and vendor listings.</div>
                  </div>
                  <button type="button" onClick={clearPhoto} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              )}
            </div>
            <textarea className="input-field min-h-28 resize-none" placeholder="Product description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} required />
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary flex items-center gap-2">
                {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {submitLabel}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn-outline">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card>
          <SectionHeader title="Product List" subtitle={`${products.length} total listed products`} />
          {products.length === 0 ? (
            <EmptyState icon={Package} title="No products added yet" description="Create your first product listing from the form." />
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="h-16 w-16 rounded-2xl bg-cover bg-center"
                        style={{ backgroundImage: `url(${product.photos[0]})` }}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900">{product.nameEn}</h3>
                          <span className={`badge ${product.stockQty <= 50 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                            {product.stockQty <= 50 ? 'Low stock' : 'Active'}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">{product.nameBn}</div>
                        <div className="mt-2 text-sm text-gray-600">
                          {product.category} · {formatBDT(product.price)} / {product.unit}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Manufacturer: {product.manufacturer} · Delivery in {product.estimatedDeliveryDays} day(s)
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleEdit(product)} className="btn-outline flex items-center gap-2 px-4 py-2 text-sm">
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(product.id)} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                        <Trash2 className="mr-2 inline h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-gray-600">{product.description}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 px-4 py-3">
                      <div className="text-xs text-gray-400">Current Stock</div>
                      <div className="mt-1 text-lg font-bold text-gray-900">{product.stockQty}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3">
                      <div className="text-xs text-gray-400">Reviews</div>
                      <div className="mt-1 text-lg font-bold text-gray-900">{product.reviewCount}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3">
                      <div className="text-xs text-gray-400">Quick Stock Update</div>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => handleStockUpdate(product.id, product.stockQty + 10)} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200">
                          +10
                        </button>
                        <button type="button" onClick={() => handleStockUpdate(product.id, Math.max(product.stockQty - 10, 0))} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200">
                          -10
                        </button>
                        <button type="button" onClick={() => handleStockUpdate(product.id, 100)} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200">
                          Set 100
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
