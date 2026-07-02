
"use client";

import { useCallback, useEffect, useState } from "react";
import OrderApi from "@/services/api/OrderApi";
import ListingApi from "@/services/api/ListingApi";
import { Order } from "@/types/order";
import { Listing } from "@/types/listing";
import { ApiError } from "@/services/api/ApiClient";

const orderApi = new OrderApi();
const listingApi = new ListingApi();

export interface RiskNotification {
  order: Order;
  listing: Listing;
}

const ACTIVE_STATUSES = ["pending", "paid", "in_escrow", "dispatched"];

// There's no dedicated notifications endpoint on the backend yet. Risk
// notifications here are derived client-side by cross-referencing the
// buyer's active orders against their listings' existing riskLevel field
// (which the backend already attaches) — no new backend work required,
// but it does mean one extra fetch per active order.
export default function useBuyerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [riskNotifications, setRiskNotifications] = useState<RiskNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const orderData = await orderApi.getOrders();
      setOrders(orderData);

      // Filter out orders missing a listingId — otherwise the map below
      // would fire GET /api/listings/undefined against the backend.
      const activeOrders = orderData.filter(
        (o) => ACTIVE_STATUSES.includes(o.status) && !!o.listingId
      );

      const listingResults = await Promise.allSettled(
        activeOrders.map((order) => listingApi.getListing(order.listingId))
      );

      const notifications: RiskNotification[] = [];

      listingResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const listing = result.value;

          if (listing.riskLevel === "suspicious" || listing.riskLevel === "high_risk") {
            notifications.push({ order: activeOrders[index], listing });
          }
        }
      });

      setRiskNotifications(notifications);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { orders, riskNotifications, loading, error, refetch };
}
