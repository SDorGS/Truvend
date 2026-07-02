
"use client";

import { useState } from "react";
import ListingsGrid from "@/components/listings/ListingsGrid";
import SearchBar from "@/components/listings/SearchBar";
import Loading from "@/components/common/Loading";
import useListings from "@/hooks/useListings";
import { DefaultSearchStrategy } from "@/strategies/SearchStrategy";

const searchStrategy = new DefaultSearchStrategy();

export default function ListingsPage() {
  const { listings, loading, error } = useListings();
  const [query, setQuery] = useState("");

  const filtered = query ? searchStrategy.search(listings, query) : listings;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-8 text-4xl font-bold">Marketplace Listings</h1>

      <SearchBar onSearch={setQuery} />

      {loading && <Loading />}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && <ListingsGrid listings={filtered} />}
    </main>
  );
}
