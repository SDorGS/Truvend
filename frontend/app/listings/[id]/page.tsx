
"use client";

import { use } from "react";
import Loading from "@/components/common/Loading";
import RiskDisplay from "@/components/listings/RiskDisplay";
import BuyButton from "@/components/checkout/BuyButton";
import AddToCartButton from "@/components/cart/AddToCartButton";
import useListing from "@/hooks/useListing";
import { formatCurrency } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ListingDetailsPage({ params }: Props) {
  const { id } = use(params);
  const { listing, loading, error } = useListing(id);

  if (loading) {
    return <Loading />;
  }

  if (error || !listing) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-bold">Listing Not Found</h1>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-4xl font-bold">{listing.title}</h1>

      <p className="mt-3 text-gray-600">{listing.description}</p>

      <p className="mt-6 text-3xl font-bold">{formatCurrency(listing.price)}</p>

      <div className="mt-4">
        <RiskDisplay listing={listing} />
      </div>

      <div className="mt-6 grid max-w-xs gap-3">
        <BuyButton listing={listing} />
        <AddToCartButton listing={listing} />
      </div>

      <div className="mt-6 rounded-lg bg-gray-100 p-4">
        <h2 className="font-semibold">AI Fraud Analysis</h2>
        <p className="mt-2">{listing.riskExplanation}</p>
        <p className="mt-2 font-medium">Risk Score: {listing.riskScore}/100</p>
      </div>
    </main>
  );
}
