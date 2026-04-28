'use client';

import { useEffect, useState } from 'react';
import { MapPin, Package, Truck } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { Card, EmptyState, PageHeader, StatusBadge } from '@/components/dashboard/DashboardComponents';
import { FARMER_NAV_ITEMS, useFarmerContext } from '@/components/dashboard/useFarmerContext';
import { orderService } from '@/services';
import type { Order } from '@/types';
import { formatBDT, formatDate } from '@/utils';

const TRACKING_STEPS: Order['status'][] = ['pending', 'confirmed', 'dispatched', 'delivered'];

const getFarmerOrderStatusLabel = (order: Order) => {
  if (order.status !== 'pending') {
    return order.status;
  }

  if (order.paymentGateway === 'cod') {
    return 'waiting vendor approval';
  }

  return 'payment received';
};

const getFarmerOrderStatusNote = (order: Order) => {
  if (order.status === 'pending') {
    return order.paymentGateway === 'cod'
      ? 'Cash on delivery order placed. Vendor approval is still pending.'
      : 'Payment received successfully. Vendor approval is still pending.';
  }

  if (order.status === 'confirmed') {
    return 'Vendor accepted your order and is preparing the shipment.';
  }

  if (order.status === 'dispatched') {
    return 'Vendor has shipped your parcel.';
  }

  if (order.status === 'delivered') {
    return 'Order delivered successfully.';
  }

  if (order.status === 'cancelled') {
    return 'This order was cancelled.';
  }

  return '';
};

const getPaymentLabel = (order: Order) => {
  if (order.paymentGateway === 'cod') {
    return 'Cash on delivery';
  }

  if (order.paymentStatus === 'paid') {
    return `${order.paymentGateway.toUpperCase()} paid`;
  }

  return `${order.paymentGateway.toUpperCase()} ${order.paymentStatus}`;
};

export default function FarmerOrdersPage() {
  const { farmer, unreadNotifications, loading } = useFarmerContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!farmer) return undefined;

    let active = true;

    const loadOrders = async () => {
      const nextOrders = await orderService.getOrders(farmer.id);
      if (active) {
        setOrders(nextOrders);
      }
    };

    void loadOrders();

    const handleRefresh = () => {
      void loadOrders();
    };

    const intervalId = window.setInterval(handleRefresh, 5000);
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [farmer]);

  const handleConfirmDelivery = async (orderId: string) => {
    if (!farmer) return;
    setProcessingOrderId(orderId);
    const result = await orderService.updateOrderStatus(orderId, 'delivered');
    setProcessingOrderId(null);

    if (!result.success) {
      setMessage('Could not update delivery status. Please try again.');
      return;
    }

    setMessage('Delivery status updated successfully.');
    const nextOrders = await orderService.getOrders(farmer.id);
    setOrders(nextOrders);
  };

  useEffect(() => {
    const handleOrderRefresh = () => {
      if (!farmer) return;
      orderService.getOrders(farmer.id).then(setOrders);
    };

    window.addEventListener('storage', handleOrderRefresh);
    window.addEventListener('ams:user-session-updated', handleOrderRefresh);

    return () => {
      window.removeEventListener('storage', handleOrderRefresh);
      window.removeEventListener('ams:user-session-updated', handleOrderRefresh);
    };
  }, [farmer]);

  if (loading || !farmer) {
    return (
      <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName="Farmer" userSubtitle="Loading profile..." notificationCount={0}>
        <PageHeader title="Loading orders..." subtitle="Preparing your account" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={FARMER_NAV_ITEMS} role="farmer" userName={farmer.name} userSubtitle={`FID: ${farmer.fid}`} notificationCount={unreadNotifications}>
      <PageHeader title="My Orders Tracking" subtitle="Review marketplace order items, payment details, and delivery tracking" />

      {message && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      {orders.length === 0 ? (
        <Card>
          <EmptyState icon={Package} title="No marketplace orders yet" description="Orders from the marketplace will appear here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const activeStep = Math.max(TRACKING_STEPS.indexOf(order.status), 0);

            return (
              <Card key={order.id}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="font-semibold text-gray-800">{order.vendorName}</div>
                    <div className="text-xs text-gray-400 mt-1">{order.id} · Placed {formatDate(order.placedAt)}</div>
                  </div>
                  <StatusBadge status={getFarmerOrderStatusLabel(order)} />
                </div>

                <div className="grid md:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-xs text-gray-400">Amount</div>
                    <div className="font-semibold">{formatBDT(order.totalAmount)}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-xs text-gray-400">Payment</div>
                    <div className="font-semibold capitalize">{getPaymentLabel(order)}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-xs text-gray-400">Estimated Delivery</div>
                    <div className="font-semibold">{order.estimatedDelivery}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-100 p-4">
                  <div className="text-sm font-semibold text-gray-800 mb-3">Ordered Items</div>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{item.productName}</div>
                          <div className="text-xs text-gray-400 mt-1">Qty {item.quantity} · {item.unit}</div>
                        </div>
                        <div className="text-sm font-semibold text-forest">{formatBDT(item.price * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-4 h-4 text-forest" />
                    <div className="text-sm font-semibold text-gray-800">Delivery Tracking</div>
                  </div>

                  <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {getFarmerOrderStatusNote(order)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TRACKING_STEPS.map((step, index) => {
                      const isComplete = activeStep >= index;
                      return (
                        <div key={step} className={`rounded-xl border p-3 ${isComplete ? 'border-forest/20 bg-forest/5' : 'border-gray-100 bg-gray-50'}`}>
                          <div className={`text-xs font-semibold uppercase ${isComplete ? 'text-forest' : 'text-gray-400'}`}>{step.replace('_', ' ')}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {step === 'pending' && 'Order placed'}
                            {step === 'confirmed' && 'Vendor accepted order'}
                            {step === 'dispatched' && 'Vendor sent parcel'}
                            {step === 'delivered' && 'Delivered to you'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Delivery location: {farmer.upazila}, {farmer.district}
                    </div>
                    {order.deliveredAt && (
                      <div>Delivered on {formatDate(order.deliveredAt)}</div>
                    )}
                  </div>

                  {order.status === 'dispatched' && (
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={processingOrderId === order.id}
                        onClick={() => handleConfirmDelivery(order.id)}
                        className="btn-success px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingOrderId === order.id ? 'Updating...' : 'Confirm Delivered'}
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
