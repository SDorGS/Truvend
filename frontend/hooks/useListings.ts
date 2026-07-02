
"use client";

import { useCallback, useEffect, useState } from "react";
import ListingApi from "@/services/api/ListingApi";
import { Listing } from "@/types/listing";
import { ApiError } from "@/services/api/ApiClient";

const listingApi = new ListingApi();

export default function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listingApi.getListings();
      setListings(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listings, loading, error, refetch };
}
