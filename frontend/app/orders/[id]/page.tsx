
"use client";

import { use, useState } from "react";
import Loading from "@/components/common/Loading";
import RequireAuth from "@/components/auth/RequireAuth";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import EscrowTimeline from "@/components/orders/EscrowTimeline";
import Button from "@/components/common/Button";
import ChatThread from "@/components/chat/ChatThread";
import useOrder from "@/hooks/useOrder";
import useAuth from "@/hooks/useAuth";
import OrderApi from "@/services/api/OrderApi";
import { ApiError } from "@/services/api/ApiClient";

interface Props {
  params: Promise<{ id: string }>;
}

const orderApi = new OrderApi();

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Order created, waiting for payment.",
  paid: "Payment received, seller will ship soon.",
  in_escrow: "Funds protected until delivery is confirmed.",
  dispatched: "Seller has shipped this order.",
  delivered: "Delivered — payment released to seller.",
  completed: "Order complete.",
  disputed: "Under review.",
  cancelled: "This order was cancelled.",
};

function OrderDetails({ id }: { id: string }) {
  const { order, loading, error, refetch } = useOrder(id);
  const { user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirmDelivery() {
    setActionError(null);
    setSubmitting(true);

    try {
      await orderApi.confirmDelivery(id);
      await refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not confirm delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispute() {
    setActionError(null);
    setSubmitting(true);

    try {
      await orderApi.dispute(id);
      await refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not raise dispute.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (error || !order) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold">Order Not Found</h1>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <p className="mt-4 text-gray-600">{STATUS_MESSAGES[order.status]}</p>

      <div className="mt-8">
        <EscrowTimeline status={order.status} />
      </div>

      {actionError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError}</p>
      )}

      {order.status === "dispatched" && (
        <div className="mt-8 flex gap-3">
          <Button onClick={handleConfirmDelivery} disabled={submitting}>
            {submitting ? "Confirming..." : "Confirm Delivery"}
          </Button>

          <Button onClick={handleDispute} disabled={submitting} variant = "danger">
            Raise Dispute
          </Button>
        </div>
      )}

      <div className="mt-10">
        <ChatThread
          orderId={id}
          counterpartyLabel={user?.id === order.buyerId ? "Seller" : "Buyer"}
        />
      </div>
    </main>
  );
}

export default function OrderPage({ params }: Props) {
  const { id } = use(params);

  return (
    <RequireAuth>
      <OrderDetails id={id} />
    </RequireAuth>
  );
}
