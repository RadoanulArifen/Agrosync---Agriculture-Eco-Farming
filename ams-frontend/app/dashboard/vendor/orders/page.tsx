'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Phone, ShoppingCart, Truck } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  Card, EmptyState, PageHeader, SectionHeader, StatusBadge,
} from '@/components/dashboard/DashboardComponents';
import { useRoleUserContext } from '@/components/dashboard/useRoleUserContext';
import { VENDOR_FALLBACK_USER, VENDOR_NAV_ITEMS } from '@/components/dashboard/vendorConfig';
import { farmerService, orderService } from '@/services';
import type { Farmer, Order } from '@/types';
import { formatBDT, formatDate, formatDateTime } from '@/utils';

const VENDOR_ID = 'vnd_001';

const getVendorPaymentLabel = (order: Order) => {
  if (order.paymentGateway === 'cod') {
    return 'COD / collect on delivery';
  }

  if (order.paymentStatus === 'paid') {
    return `${order.paymentGateway.toUpperCase()} / paid`;
  }

  return `${order.paymentGateway.toUpperCase()} / ${order.paymentStatus}`;
};

const getVendorStatusNote = (order: Order) => {
  if (order.status === 'pending') {
    return 'New order waiting for vendor action.';
  }

  if (order.status === 'confirmed') {
    return 'Order accepted. Shipment preparation in progress.';
  }

  if (order.status === 'dispatched') {
    return 'Order shipped to farmer.';
  }

  if (order.status === 'delivered') {
    return 'Order delivered successfully.';
  }

  if (order.status === 'cancelled') {
    return 'Order rejected or cancelled.';
  }

  return '';
};

export default function VendorOrdersPage() {
  const { user } = useRoleUserContext({ role: 'vendor', fallbackUser: VENDOR_FALLBACK_USER });
  const [orders, setOrders] = useState<Order[]>([]);
  const [farmers, setFarmers] = useState<Record<string, Farmer>>({});
  const [message, setMessage] = useState('');

  const refreshOrders = async () => {
    const data = await orderService.getOrders();
    setOrders(data.filter((order) => order.vendorId === VENDOR_ID));
  };

  useEffect(() => {
    refreshOrders();
  }, []);

  useEffect(() => {
    const loadFarmers = async () => {
      const allFarmers = await farmerService.getFarmers();
      setFarmers(allFarmers.reduce<Record<string, Farmer>>((acc, farmer) => {
        acc[farmer.id] = farmer;
        return acc;
      }, {}));
    };

    loadFarmers();
  }, []);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === 'pending' || order.status === 'confirmed').length,
    [orders],
  );

  const handleOrderStatus = async (orderId: string, status: Order['status'], successText: string) => {
    await orderService.updateOrderStatus(orderId, status);
    setMessage(successText);
    refreshOrders();
  };

  return (
    <DashboardShell
      navItems={VENDOR_NAV_ITEMS}
      role="vendor"
      userName={user.companyName || user.name}
      userSubtitle={user.designation || 'Verified Vendor'}
      notificationCount={pendingCount}
    >
      <PageHeader title="Orders" subtitle="Accept or reject farmer orders, update shipping status, and view buyer information" />

      {message && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="text-sm text-green-700">{message}</div>
        </Card>
      )}

      <Card className="mb-6">
        <SectionHeader title="Order Summary" subtitle="Vendor order management overview" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-yellow-50 p-4">
            <div className="text-xs text-yellow-600">Pending</div>
            <div className="mt-1 text-2xl font-bold text-yellow-900">{orders.filter((order) => order.status === 'pending').length}</div>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="text-xs text-blue-600">Shipped</div>
            <div className="mt-1 text-2xl font-bold text-blue-900">{orders.filter((order) => order.status === 'dispatched').length}</div>
          </div>
          <div className="rounded-2xl bg-green-50 p-4">
            <div className="text-xs text-green-600">Delivered</div>
            <div className="mt-1 text-2xl font-bold text-green-900">{orders.filter((order) => order.status === 'delivered').length}</div>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Cancelled</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{orders.filter((order) => order.status === 'cancelled').length}</div>
          </div>
        </div>
      </Card>

      {orders.length === 0 ? (
        <Card>
          <EmptyState icon={ShoppingCart} title="No orders yet" description="Farmer orders will appear here as soon as they are placed." />
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const buyer = farmers[order.farmerId];

            return (
            <Card key={order.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{order.id}</h2>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Ordered on {formatDateTime(order.placedAt)} · Payment {getVendorPaymentLabel(order)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => handleOrderStatus(order.id, 'confirmed', 'Order accepted successfully.')} className="btn-primary px-4 py-2 text-sm">
                        Accept Order
                      </button>
                      <button type="button" onClick={() => handleOrderStatus(order.id, 'cancelled', 'Order rejected successfully.')} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                        Reject Order
                      </button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <button type="button" onClick={() => handleOrderStatus(order.id, 'dispatched', 'Order marked as shipped.')} className="btn-primary px-4 py-2 text-sm">
                      Mark Shipped
                    </button>
                  )}
                  {order.status === 'dispatched' && (
                    <button type="button" onClick={() => handleOrderStatus(order.id, 'delivered', 'Order marked as delivered.')} className="btn-primary px-4 py-2 text-sm">
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <div className="mb-3 text-sm font-semibold text-gray-800">Order Items</div>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-800">{item.productName}</div>
                          <div className="text-xs text-gray-400">Qty {item.quantity} · {item.unit}</div>
                        </div>
                        <div className="font-semibold text-gray-900">{formatBDT(item.price * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                    {getVendorStatusNote(order)}
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4">
                      <div className="mb-3 text-sm font-semibold text-gray-800">Buyer Info</div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="font-medium text-gray-900">{order.farmerName}</div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {buyer?.phone || 'Contact not available'}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {buyer ? `${buyer.upazila}, ${buyer.district}` : `Estimated delivery by ${formatDate(order.estimatedDelivery)}`}
                        </div>
                        {buyer?.email && <div className="text-xs text-gray-400">{buyer.email}</div>}
                      </div>
                    </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Truck className="h-4 w-4 text-forest" />
                      Order Progress
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { key: 'pending', label: 'Pending' },
                        { key: 'dispatched', label: 'Shipped' },
                        { key: 'delivered', label: 'Delivered' },
                      ].map((step) => {
                        const activeStates: Record<string, Order['status'][]> = {
                          pending: ['pending', 'confirmed', 'dispatched', 'delivered'],
                          dispatched: ['dispatched', 'delivered'],
                          delivered: ['delivered'],
                        };
                        const isActive = activeStates[step.key].includes(order.status);
                        return (
                          <div key={step.key} className={`rounded-xl border px-3 py-3 text-center font-semibold ${isActive ? 'border-forest/20 bg-forest/5 text-forest' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                            {step.label}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      Total payable: <span className="font-semibold text-gray-900">{formatBDT(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
