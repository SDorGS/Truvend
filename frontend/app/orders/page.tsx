
"use client";

import OrderCard from "@/components/orders/OrderCard";
import Loading from "@/components/common/Loading";
import RequireAuth from "@/components/auth/RequireAuth";
import useOrders from "@/hooks/useOrders";

function OrdersList() {
  const { orders, loading, error } = useOrders();

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-8 text-4xl font-bold">Orders</h1>

      {loading && <Loading />}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <p className="text-gray-500">You have no orders yet.</p>
      )}

      <div className="grid gap-5">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  );
}
