
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OrderApi from "@/services/api/OrderApi";
import { Order } from "@/types/order";
import { ApiError } from "@/services/api/ApiClient";

const orderApi = new OrderApi();

// Statuses that can still change on their own (via webhook), so we poll while in these states.
const POLLABLE_STATUSES = ["pending", "paid", "in_escrow", "dispatched"];
const POLL_INTERVAL_MS = 5000;

export default function useOrder(id: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await orderApi.getOrder(id);
      setOrder(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load order.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const data = await fetchOrder();

      if (cancelled) return;

      if (data && POLLABLE_STATUSES.includes(data.status)) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchOrder]);

  return { order, loading, error, refetch: fetchOrder };
}
