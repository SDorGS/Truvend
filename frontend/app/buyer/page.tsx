

"use client";

import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";
import Loading from "@/components/common/Loading";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import RiskBadge from "@/components/listings/RiskBadge";
import StatCard from "@/components/seller/StatCard";
import useBuyerDashboard from "@/hooks/useBuyerDashboard";

function BuyerDashboard() {
  const { orders, riskNotifications, loading, error } = useBuyerDashboard();

  const activeEscrows = orders.filter((o) => o.status === "in_escrow");
  const purchases = orders.filter((o) => o.status === "completed" || o.status === "delivered");
  const recentOrders = [...orders].slice(0, 5);

  if (loading) {
    return <Loading />;
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-8 text-4xl font-bold">Buyer Dashboard</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Total Orders" value={orders.length} />
        <StatCard title="Active Escrows" value={activeEscrows.length} />
        <StatCard title="Completed Purchases" value={purchases.length} />
      </div>

      {riskNotifications.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-2xl font-semibold">Risk Notifications</h2>

          <div className="grid gap-3">
            {riskNotifications.map(({ order, listing }) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-signal-orange/40 bg-signal-orange/5 p-4 hover:bg-signal-orange/10"
              >
                <div>
                  <p className="font-semibold">{listing.title}</p>
                  <p className="text-sm text-gray-600">Order #{order.id}</p>
                </div>
                <RiskBadge level={listing.riskLevel} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold">Active Escrows</h2>

        {activeEscrows.length === 0 ? (
          <p className="text-gray-500">No orders currently in escrow.</p>
        ) : (
          <div className="grid gap-3">
            {activeEscrows.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border bg-white p-4 hover:shadow-md"
              >
                <span className="font-semibold">Order #{order.id}</span>
                <OrderStatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold">Recent Orders</h2>

        {recentOrders.length === 0 ? (
          <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
        ) : (
          <div className="grid gap-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border bg-white p-4 hover:shadow-md"
              >
                <span className="font-semibold">Order #{order.id}</span>
                <OrderStatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold">Purchases</h2>

        {purchases.length === 0 ? (
          <p className="text-gray-500">No completed purchases yet.</p>
        ) : (
          <div className="grid gap-3">
            {purchases.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border bg-white p-4 hover:shadow-md"
              >
                <span className="font-semibold">Order #{order.id}</span>
                <OrderStatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function BuyerPage() {
  return (
    <RequireAuth>
      <BuyerDashboard />
    </RequireAuth>
  );
}
