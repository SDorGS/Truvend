
"use client";

import ListingsGrid from "@/components/listings/ListingsGrid";
import Loading from "@/components/common/Loading";
import useListings from "@/hooks/useListings";

export default function Home() {
  const { listings, loading, error } = useListings();

  return (
    <main className="mx-auto max-w-6xl p-8">
      <section>
        <h1 className="mb-2 text-4xl font-bold">TRUVEND Marketplace</h1>

        <p className="mb-8 text-gray-600">
          Buy and sell with AI-powered fraud detection and secure escrow.
        </p>

        {loading && <Loading />}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && <ListingsGrid listings={listings.slice(0, 6)} />}
      </section>
    </main>
  );
}
