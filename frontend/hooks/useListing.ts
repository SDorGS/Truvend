
"use client";

import { useCallback, useEffect, useState } from "react";
import ListingApi from "@/services/api/ListingApi";
import { Listing } from "@/types/listing";
import { ApiError } from "@/services/api/ApiClient";

const listingApi = new ListingApi();

export default function useListing(id: string) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
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
