
"use client";

import { useCallback, useEffect, useState } from "react";
import OrderApi from "@/services/api/OrderApi";
import { Order } from "@/types/order";
import { ApiError } from "@/services/api/ApiClient";

const orderApi = new OrderApi();

export default function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await orderApi.getOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { orders, loading, error, refetch };
}
