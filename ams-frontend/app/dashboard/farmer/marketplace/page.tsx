'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Star, Trash2, Wallet } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, SectionHeader } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { cartService, orderService, productService } from '@/services';
import type { Product } from '@/types';
import { formatBDT } from '@/utils';

type PaymentGateway = 'bkash' | 'nagad' | 'cod' | 'stripe';

export default function FarmerMarketplacePage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>('bkash');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCart = async (farmerId: string) => {
    const cart = await cartService.getCart(farmerId);
    setCartItems(cart);
  };

  useEffect(() => {
    productService.getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    if (!farmer) return;
    loadCart(farmer.id);
  }, [farmer]);

  const filteredProducts = useMemo(() => (
    selectedCategory === 'All'
      ? products
      : products.filter((product) => product.category === selectedCategory)
  ), [products, selectedCategory]);

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const activeVendor = cartItems[0]?.product.vendorName;

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading marketplace..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  const handleAddToCart = async (productId: string) => {
    setError('');
    setMessage('');
    const result = await cartService.addToCart(farmer.id, productId, 1);
    if (!result.success) {
      setError(result.message || 'Failed to add product to cart.');
      return;
    }
    await loadCart(farmer.id);
    setMessage('Product added to cart.');
  };

  const handleQuantityChange = async (productId: string, quantity: number) => {
    await cartService.updateCartItem(farmer.id, productId, quantity);
    await loadCart(farmer.id);
  };

  const handleRemove = async (productId: string) => {
    await cartService.removeCartItem(farmer.id, productId);
    await loadCart(farmer.id);
  };

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    setError('');
    setMessage('');
    const result = await orderService.placeOrder({
      farmerId: farmer.id,
      items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      paymentGateway,
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Order placement failed.');
      return;
    }

    await loadCart(farmer.id);
    setMessage(`Order placed successfully. Order ID: ${result.orderId}`);
  };

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="Marketplace" subtitle="Add to cart, place orders, and complete payment from one place" />

      <div className="grid xl:grid-cols-[1.4fr_0.8fr] gap-6">
        <div>
          <Card className="mb-6">
            <SectionHeader title="Categories" subtitle="Filter marketplace products" />
            <div className="flex gap-2 flex-wrap">
              {['All', 'Fertilizer', 'Pesticide', 'Seed', 'Medicine', 'Equipment', 'Organic', 'Fresh Vegetables', 'Dairy'].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full border text-sm ${selectedCategory === category ? 'bg-forest text-white border-forest' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </Card>

          {filteredProducts.length === 0 ? (
            <Card>
              <EmptyState icon={Star} title="No products found" description="Marketplace items will appear here." />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} padding={false} className="overflow-hidden">
                  <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${product.photos[0]})` }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{product.nameEn}</div>
                        <div className="text-xs text-gray-400">{product.vendorName}</div>
                      </div>
                      <div className="text-sm font-semibold text-forest">{formatBDT(product.price)}</div>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">{product.unit} · {product.category}</div>
                    <p className="text-sm text-gray-500 mb-4">{product.description}</p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Star className="w-4 h-4 text-harvest fill-harvest" />
                        {product.rating} ({product.reviewCount} reviews)
                      </div>
                      <button type="button" onClick={() => handleAddToCart(product.id)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Add to cart
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <SectionHeader title="Cart Summary" subtitle={activeVendor ? `Vendor: ${activeVendor}` : 'No items added yet'} />

            {message && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
            {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            {cartItems.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="Cart is empty" description="Add products from the marketplace to place an order." />
            ) : (
              <div className="space-y-4">
                {cartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{product.nameEn}</div>
                        <div className="text-xs text-gray-400 mt-1">{product.vendorName}</div>
                      </div>
                      <button type="button" onClick={() => handleRemove(product.id)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button type="button" className="w-8 h-8 rounded-lg border border-gray-200" onClick={() => handleQuantityChange(product.id, quantity - 1)}>-</button>
                        <span className="w-8 text-center font-semibold">{quantity}</span>
                        <button type="button" className="w-8 h-8 rounded-lg border border-gray-200" onClick={() => handleQuantityChange(product.id, quantity + 1)}>+</button>
                      </div>
                      <div className="text-sm font-semibold text-forest">{formatBDT(product.price * quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader title="Order Place" subtitle="Choose payment gateway and place order" />
            <div className="space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-400">Delivery Address</div>
                <div className="font-semibold text-gray-800 mt-1">{farmer.upazila}, {farmer.district}, {farmer.division}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Payment</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['bkash', 'nagad', 'cod', 'stripe'] as PaymentGateway[]).map((gateway) => (
                    <button
                      key={gateway}
                      type="button"
                      onClick={() => setPaymentGateway(gateway)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize ${paymentGateway === gateway ? 'border-forest bg-forest/5 text-forest' : 'border-gray-200 text-gray-600'}`}
                    >
                      {gateway}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Items</span>
                  <span className="font-semibold">{cartItems.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Payment Gateway</span>
                  <span className="font-semibold uppercase">{paymentGateway}</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="font-bold text-forest">{formatBDT(cartTotal)}</span>
                </div>
              </div>

              <button type="button" disabled={cartItems.length === 0 || submitting} onClick={handlePlaceOrder} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                <Wallet className="w-4 h-4" />
                {submitting ? 'Placing Order...' : 'Order place'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
