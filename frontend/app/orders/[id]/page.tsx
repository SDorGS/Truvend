
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
import { Card } from "@/components/ui/card";

interface Props {
  params: Promise<{ id: string }>;
}

const orderApi = new OrderApi();

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Order created, waiting for payment.",
  paid: "Payment received, seller will ship soon.",
  in_escrow: "Funds protected until you release payment on delivery.",
  dispatched: "Seller has shipped this order. Share your delivery code on receipt to release payment.",
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

  async function handleRequestRefund() {
    setActionError(null);
    setSubmitting(true);

    try {
      await orderApi.requestRefund(id);
      await refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not request refund.");
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

      <div className="mt-6 flex items-center gap-8">
        <div className="flex items-center gap-3">
          {order.seller?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.seller.avatarUrl}
              alt={order.seller.displayName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white">
              {((order.seller?.displayName ?? order.sellerId) || "").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-teal-deep">
              {order.seller?.displayName ?? order.sellerId}
            </div>
            <div className="text-xs text-gray-500">Seller</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {order.buyer?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.buyer.avatarUrl}
              alt={order.buyer.displayName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white">
              {((order.buyer?.displayName ?? order.buyerId) || "").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-teal-deep">
              {order.buyer?.displayName ?? order.buyerId}
            </div>
            <div className="text-xs text-gray-500">Buyer</div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <EscrowTimeline status={order.status} />
      </div>

      {actionError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError}</p>
      )}

      {order.status === "dispatched" && order.deliveryCode && (
        <Card className="mt-8 border-teal-mid/40 bg-teal-mid/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-deep">
            Delivery Code
          </p>
          <p className="mt-3 font-mono text-4xl font-bold tracking-[0.4em] text-teal-deep md:text-5xl">
            {order.deliveryCode}
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Give this code to the seller when your item is delivered — this releases payment to them.
          </p>
        </Card>
      )}

      {(order.status === "dispatched" || order.status === "in_escrow" || order.status === "paid") && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={handleRequestRefund} disabled={submitting} variant="danger">
            {submitting ? "Requesting..." : "Request Refund"}
          </Button>

          <Button onClick={handleDispute} disabled={submitting} variant="danger">
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
