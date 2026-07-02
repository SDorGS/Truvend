
"use client";

import { useState } from "react";
import StatCard from "@/components/seller/StatCard";
import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import RequireAuth from "@/components/auth/RequireAuth";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import useSeller from "@/hooks/useSeller";
import SellerApi from "@/services/api/SellerApi";
import { ApiError } from "@/services/api/ApiClient";
import { formatCurrency } from "@/lib/utils";

const sellerApi = new SellerApi();

function SellerDashboard() {
  const {
    orders,
    payouts,
    virtualAccount,
    loading,
    ordersError,
    payoutsError,
    virtualAccountError,
    refetch,
  } = useSeller();

  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalRevenue = payouts.reduce((sum, p) => sum + p.amount, 0);

  async function handleDispatch(orderId: string) {
    const tracking = window.prompt("Tracking number (optional):") || undefined;

    setActionError(null);
    setDispatchingId(orderId);

    try {
      await sellerApi.dispatchOrder(orderId, tracking);
      await refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not mark as dispatched.");
    } finally {
      setDispatchingId(null);
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="mb-8 text-4xl font-bold">Seller Dashboard</h1>

      {ordersError && <p className="mb-4 text-red-600">Orders: {ordersError}</p>}
      {payoutsError && <p className="mb-4 text-red-600">Payouts: {payoutsError}</p>}

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Total Orders" value={orders.length} />
        <StatCard title="Completed Sales" value={completedOrders.length} />
        <StatCard title="Revenue" value={formatCurrency(totalRevenue)} />
      </div>

      <div className="mt-10 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-xl font-semibold">Virtual Account</h2>

        {virtualAccount ? (
          <>
            <p className="text-gray-600">{virtualAccount.bankName}</p>
            <p className="text-lg font-medium">{virtualAccount.accountNumber}</p>
            <p className="text-gray-600">{virtualAccount.accountName}</p>
          </>
        ) : (
          <p className="text-gray-500">
            {virtualAccountError || "No virtual account set up yet."}
          </p>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-semibold">Orders</h2>
      </div>

      {actionError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError}</p>
      )}

      <div className="mt-6 grid gap-5">
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between rounded-xl border bg-white p-5">
            <div>
              <h3 className="font-semibold">Order #{order.id}</h3>
              <div className="mt-2">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>

            {(order.status === "paid" || order.status === "in_escrow") && (
              <Button onClick={() => handleDispatch(order.id)} disabled={dispatchingId === order.id}>
                {dispatchingId === order.id ? "Marking..." : "Mark Dispatched"}
              </Button>
            )}
          </div>
        ))}

        {orders.length === 0 && !ordersError && <p className="text-gray-500">No orders yet.</p>}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold">Payout History</h2>

        <div className="grid gap-3">
          {payouts.map((payout) => (
            <div key={payout.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
              <span className="text-gray-600">{new Date(payout.createdAt).toLocaleDateString()}</span>
              <span className="capitalize text-gray-600">{payout.status}</span>
              <span className="font-semibold">{formatCurrency(payout.amount)}</span>
            </div>
          ))}

          {payouts.length === 0 && !payoutsError && <p className="text-gray-500">No payouts yet.</p>}
        </div>
      </div>
    </main>
  );
}

export default function SellerPage() {
  return (
    <RequireAuth>
      <SellerDashboard />
    </RequireAuth>
  );
}

