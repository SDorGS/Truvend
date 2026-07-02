
"use client";

import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";
import CartCheckoutItem from "@/components/cart/CartCheckoutItem";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/utils";

function CheckoutContents() {
  const { items, removeItem } = useCart();
  const total = items.reduce((sum, i) => sum + i.listing.price, 0);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="mb-4 text-4xl font-bold">Checkout</h1>
        <p className="text-gray-500">Your cart is empty.</p>
        <Link href="/listings" className="mt-4 inline-block text-teal-mid hover:underline">
          Browse listings
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-2 text-4xl font-bold">Checkout</h1>
      <p className="mb-8 text-gray-600">
        Each item below is its own escrow-protected order. Paying opens Nomba&apos;s secure
        checkout page in a new tab.
      </p>

      <div className="grid gap-4">
        {items.map(({ listing }) => (
          <CartCheckoutItem
            key={listing.id}
            listing={listing}
            onCheckedOut={() => removeItem(listing.id)}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-xl bg-gray-100 p-5">
        <span className="text-xl font-semibold">Total</span>
        <span className="text-2xl font-bold">{formatCurrency(total)}</span>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContents />
    </RequireAuth>
  );
}
