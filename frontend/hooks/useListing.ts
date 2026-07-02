
"use client";

import { useCallback, useEffect, useState } from "react";
import ListingApi from "@/services/api/ListingApi";
import { Listing } from "@/types/listing";
import { ApiError } from "@/services/api/ApiClient";

const listingApi = new ListingApi();

export default function useListing(id: string | undefined) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    // Guard: don't fetch until the route param has resolved to a real value.
    // Without this, a stray `undefined` / empty string / stringified-undefined
    // would produce GET /api/listings/undefined against the backend.
    if (!id || id === "undefined" || id === "null") {
      setLoading(false);
      setError("Missing listing id.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listingApi.getListing(id);
      setListing(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load listing.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listing, loading, error, refetch };
}
