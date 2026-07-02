

"use client";

import Link from "next/link";
import Button from "@/components/common/Button";
import RiskBadge from "@/components/listings/RiskBadge";
import RequireAuth from "@/components/auth/RequireAuth";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/utils";

function CartContents() {
  const { items, removeItem, clearCart } = useCart();
  const total = items.reduce((sum, i) => sum + i.listing.price, 0);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="mb-4 text-4xl font-bold">Cart</h1>
        <p className="text-gray-500">Your cart is empty.</p>
        <Link href="/listings" className="mt-4 inline-block text-teal-mid hover:underline">
          Browse listings
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-4xl font-bold">Cart</h1>

      <div className="grid gap-4">
        {items.map(({ listing }) => (
          <div key={listing.id} className="flex items-center justify-between rounded-xl border bg-white p-5">
            <div>
              <Link href={`/listings/${listing.id}`} className="font-semibold hover:underline">
                {listing.title}
              </Link>
              <div className="mt-2 flex items-center gap-3">
                <RiskBadge level={listing.riskLevel} />
                <span className="text-gray-600">{formatCurrency(listing.price)}</span>
              </div>
            </div>

            <Button onClick={() => removeItem(listing.id)} variant="neutral">
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-xl bg-gray-100 p-5">
        <span className="text-xl font-semibold">Total</span>
        <span className="text-2xl font-bold">{formatCurrency(total)}</span>
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={clearCart} variant="neutral">
          Clear Cart
        </Button>

        <Link href="/checkout" className="flex-1">
          <Button className="w-full">Proceed to Checkout</Button>
        </Link>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Each item is paid for and escrowed as its own separate order — TRUVEND doesn&apos;t
        currently support combining multiple items into a single payment.
      </p>
    </main>
  );
}

export default function CartPage() {
  return (
    <RequireAuth>
      <CartContents />
    </RequireAuth>
  );
}
