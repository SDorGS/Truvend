
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/listings/SearchBar";
import ListingsGrid from "@/components/listings/ListingsGrid";
import Loading from "@/components/common/Loading";
import useListings from "@/hooks/useListings";
import { DefaultSearchStrategy } from "@/strategies/SearchStrategy";

const searchStrategy = new DefaultSearchStrategy();

function SearchContents() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const { listings, loading, error } = useListings();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  function handleSearch(value: string) {
    setQuery(value);

    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }

    router.replace(`/search?${params.toString()}`);
  }

  const results = query ? searchStrategy.search(listings, query) : listings;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-8 text-4xl font-bold">Search</h1>

      <SearchBar onSearch={handleSearch} defaultValue={initialQuery} />

      {loading && <Loading />}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <p className="mb-4 text-gray-500">
            {results.length} result{results.length === 1 ? "" : "s"}
            {query && ` for "${query}"`}
          </p>
          <ListingsGrid listings={results} />
        </>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SearchContents />
    </Suspense>
  );
}
