"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  Check,
  CheckCircle2,
  Copy,
  Package,
  Store,
  Wallet,
} from "lucide-react";

import StatCard from "@/components/seller/StatCard";
import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import RequireAuth from "@/components/auth/RequireAuth";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import useSeller from "@/hooks/useSeller";
import SellerApi from "@/services/api/SellerApi";
import OrderApi from "@/services/api/OrderApi";
import { ApiError } from "@/services/api/ApiClient";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types/order";
import type { Payout, VirtualAccount } from "@/types/seller";

const sellerApi = new SellerApi();
const orderApi = new OrderApi();

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
      setActionError(
        err instanceof ApiError ? err.message : "Could not mark as dispatched."
      );
    } finally {
      setDispatchingId(null);
    }
  }

  if (loading) return <Loading />;

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-teal-deep md:text-4xl">
          Seller Dashboard
        </h1>
        <Link href="/seller/listings">
          <Button variant="neutral" className="inline-flex items-center gap-2">
            <Store className="h-4 w-4" aria-hidden="true" />
            My Listings
          </Button>
        </Link>
      </div>

      {ordersError && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          Orders: {ordersError}
        </p>
      )}
      {payoutsError && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          Payouts: {payoutsError}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Total Orders"
          value={orders.length}
          icon={Package}
          accent="teal"
        />
        <StatCard
          title="Completed Sales"
          value={completedOrders.length}
          icon={CheckCircle2}
          accent="green"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(totalRevenue)}
          icon={BadgeDollarSign}
          accent="orange"
        />
      </div>

      <div className="mt-10">
        <VirtualAccountCard
          virtualAccount={virtualAccount}
          error={virtualAccountError}
        />
      </div>

      {actionError && (
        <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {actionError}
        </p>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold text-teal-deep">Orders</h2>
        <OrdersTable
          orders={orders}
          dispatchingId={dispatchingId}
          onDispatch={handleDispatch}
          onOrderChanged={refetch}
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold text-teal-deep">
          Payout History
        </h2>
        <PayoutsTable payouts={payouts} />
      </div>
    </main>
  );
}

// -----------------------------------------------------------------------------

function VirtualAccountCard({
  virtualAccount,
  error,
}: {
  virtualAccount: VirtualAccount | null;
  error: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — silently ignore
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-teal-mid" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-teal-deep">
          Virtual Account
        </h2>
      </div>

      {virtualAccount ? (
        <>
          <p className="text-sm text-gray-500">{virtualAccount.bankName}</p>

          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-3xl font-bold tracking-wide text-teal-deep">
              {virtualAccount.accountNumber}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(virtualAccount.accountNumber)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-teal-deep transition hover:bg-gray-50"
              aria-label="Copy account number"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy
                </>
              )}
            </button>
          </div>

          {virtualAccount.accountName && (
            <p className="mt-2 text-sm text-gray-700">
              {virtualAccount.accountName}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500">
          {error || "No virtual account set up yet."}
        </p>
      )}
    </Card>
  );
}

// -----------------------------------------------------------------------------

function OrdersTable({
  orders,
  dispatchingId,
  onDispatch,
  onOrderChanged,
}: {
  orders: Order[];
  dispatchingId: string | null;
  onDispatch: (id: string) => void;
  onOrderChanged: () => Promise<void> | void;
}) {
  if (orders.length === 0) {
    return (
      <Card className="p-6 text-sm text-gray-500">No orders yet.</Card>
    );
  }

  return (
    <Card className="p-0">
      {/* Header — desktop only */}
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
        <span>Order ID</span>
        <span>Status</span>
        <span>Amount</span>
        <span>Date</span>
        <span>Action</span>
      </div>

      <Separator className="hidden md:block" />

      <ul>
        {orders.map((order, i) => {
          const canDispatch =
            order.status === "paid" || order.status === "in_escrow";
          const isDispatching = dispatchingId === order.id;

          return (
            <li
              key={order.id}
              className={`grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center md:gap-4 ${
                i !== orders.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <div>
                <span className="text-[10px] uppercase text-gray-400 md:hidden">
                  Order ID
                </span>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm text-teal-deep">
                    {order.id.slice(0, 8)}…
                  </div>
                  <div className="hidden items-center gap-2 md:flex">
                    {order.buyer?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={order.buyer.avatarUrl}
                        alt={order.buyer.displayName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">
                        {((order.buyer?.displayName ?? order.buyerId) || "").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-sm text-gray-700">
                      {order.buyer?.displayName ?? order.buyerId}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-gray-400 md:hidden">
                  Status
                </span>
                <div>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-gray-400 md:hidden">
                  Amount
                </span>
                <div className="text-sm font-medium text-teal-deep">
                  {order.amount !== undefined ? formatCurrency(order.amount) : "—"}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-gray-400 md:hidden">
                  Date
                </span>
                <div className="text-sm text-gray-600">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : "—"}
                </div>
              </div>

              <div className="md:text-right">
                {canDispatch ? (
                  <Button
                    onClick={() => onDispatch(order.id)}
                    disabled={isDispatching}
                    className="w-full md:w-auto"
                  >
                    {isDispatching ? "Marking..." : "Dispatch"}
                  </Button>
                ) : order.status === "dispatched" ? (
                  <ReleaseEscrowControl orderId={order.id} onReleased={onOrderChanged} />
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// -----------------------------------------------------------------------------

function ReleaseEscrowControl({
  orderId,
  onReleased,
}: {
  orderId: string;
  onReleased: () => Promise<void> | void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 423 LOCKED collapses this control into a static support message — a fresh
  // input after lockout invites the seller to keep guessing, which is exactly
  // what the lockout is preventing.
  const [locked, setLocked] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || locked) return;

    setErrorMessage(null);
    setSubmitting(true);

    try {
      await orderApi.releaseEscrow(orderId, code);
      await onReleased();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          setLocked(true);
        }
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Could not release escrow.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (locked) {
    return (
      <p className="text-xs text-alert-red md:text-right">
        Locked. Contact support to resolve this order.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-stretch gap-2 md:items-end">
      <div className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="6-digit code"
          className="w-32 text-center font-mono tracking-widest"
          aria-label="Delivery code"
        />
        <Button type="submit" disabled={submitting || code.length !== 6}>
          {submitting ? "Releasing..." : "Release"}
        </Button>
      </div>
      {errorMessage && (
        <p className="text-xs text-alert-red md:text-right">{errorMessage}</p>
      )}
    </form>
  );
}

// -----------------------------------------------------------------------------

function PayoutsTable({ payouts }: { payouts: Payout[] }) {
  if (payouts.length === 0) {
    return (
      <Card className="p-6 text-sm text-gray-500">No payouts yet.</Card>
    );
  }

  return (
    <Card className="p-0">
      <div className="hidden grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
        <span>Date</span>
        <span>Status</span>
        <span className="text-right">Amount</span>
      </div>

      <Separator className="hidden md:block" />

      <ul>
        {payouts.map((payout, i) => (
          <li
            key={payout.id}
            className={`grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-[1fr_1fr_1fr] md:items-center md:gap-4 ${
              i !== payouts.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <div>
              <span className="text-[10px] uppercase text-gray-400 md:hidden">
                Date
              </span>
              <div className="text-sm text-gray-600">
                {new Date(payout.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-gray-400 md:hidden">
                Status
              </span>
              <div className="text-sm capitalize text-gray-700">
                {payout.status}
              </div>
            </div>

            <div className="md:text-right">
              <span className="text-[10px] uppercase text-gray-400 md:hidden">
                Amount
              </span>
              <div className="text-sm font-semibold text-teal-deep">
                {formatCurrency(payout.amount)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// -----------------------------------------------------------------------------

export default function SellerPage() {
  return (
    <RequireAuth>
      <SellerDashboard />
    </RequireAuth>
  );
}
