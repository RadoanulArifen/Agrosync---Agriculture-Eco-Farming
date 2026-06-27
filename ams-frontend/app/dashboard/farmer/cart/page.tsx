'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader,
} from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { cartService, orderService } from '@/services';
import type { Product } from '@/types';
import { formatBDT } from '@/utils';

type PaymentGateway = 'bkash' | 'nagad' | 'cod' | 'stripe';

export default function FarmerCartPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [cartItems, setCartItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>('bkash');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCart = async (farmerId: string) => {
    const cart = await cartService.getCart(farmerId);
    setCartItems(cart);
  };

  useEffect(() => {
    if (!farmer) return;
    void loadCart(farmer.id);
  }, [farmer]);

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading cart..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const activeVendor = cartItems[0]?.product.vendorName;

  const handleQuantityChange = async (productId: string, quantity: number) => {
    setError('');
    setMessage('');
    await cartService.updateCartItem(farmer.id, productId, quantity);
    await loadCart(farmer.id);
  };

  const handleRemove = async (productId: string) => {
    setError('');
    setMessage('');
    await cartService.removeCartItem(farmer.id, productId);
    await loadCart(farmer.id);
  };

  const handleClearCart = async () => {
    setError('');
    setMessage('');
    await cartService.clearCart(farmer.id);
    await loadCart(farmer.id);
    setMessage('Cart cleared.');
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

    if (paymentGateway === 'stripe' && result.orderId) {
      const payment = await orderService.initiateOrderStripePayment({
        orderId: result.orderId,
        farmerId: farmer.id,
      });

      if (!payment.success) {
        setError(payment.message || `Order ${result.orderId} placed, but Stripe checkout could not be started.`);
        await loadCart(farmer.id);
        return;
      }

      if (payment.gatewayPageUrl) {
        window.open(payment.gatewayPageUrl, '_blank', 'noopener,noreferrer');
      }

      await loadCart(farmer.id);
      setMessage(`Order ${result.orderId} created. Complete Stripe sandbox payment in the opened window.`);
      return;
    }

    await loadCart(farmer.id);
    setMessage(`Order placed successfully. Order ID: ${result.orderId}`);
  };

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="Cart" subtitle="Review products, update quantities, and place your marketplace order" />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeader title="Cart Items" subtitle={activeVendor ? `Vendor: ${activeVendor}` : 'No vendor selected yet'} />
            <Link href="/dashboard/farmer/marketplace" className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm">
              <ArrowLeft className="h-4 w-4" />
              Marketplace
            </Link>
          </div>

          {message && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {cartItems.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Cart is empty" description="Add products from the marketplace to place an order." />
          ) : (
            <div className="space-y-4">
              {cartItems.map(({ product, quantity }) => (
                <div key={product.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div
                        className="h-20 w-20 flex-shrink-0 rounded-xl bg-gray-100 bg-cover bg-center"
                        style={{ backgroundImage: `url(${product.photos[0]})` }}
                      />
                      <div className="min-w-0">
                        <h2 className="font-semibold text-gray-900">{product.nameEn}</h2>
                        <div className="mt-1 text-sm text-gray-500">{product.vendorName}</div>
                        <div className="mt-1 text-xs text-gray-400">{product.unit} · {product.category}</div>
                      </div>
                    </div>

                    <button type="button" onClick={() => handleRemove(product.id)} className="inline-flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 p-1">
                      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100" onClick={() => handleQuantityChange(product.id, quantity - 1)}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-semibold">{quantity}</span>
                      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100" onClick={() => handleQuantityChange(product.id, quantity + 1)}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-lg font-bold text-forest">{formatBDT(product.price * quantity)}</div>
                  </div>
                </div>
              ))}

              <button type="button" onClick={handleClearCart} className="btn-outline px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                Clear Cart
              </button>
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Checkout" subtitle="Choose payment gateway and place order" />

          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="text-xs text-gray-400">Delivery Address</div>
              <div className="mt-1 font-semibold text-gray-800">{farmer.upazila}, {farmer.district}, {farmer.division}</div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-gray-700">Payment</div>
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

            <button type="button" disabled={cartItems.length === 0 || submitting} onClick={handlePlaceOrder} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60">
              <Wallet className="h-4 w-4" />
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
