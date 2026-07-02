
"use client";

import { useCallback, useEffect, useState } from "react";
import SellerApi from "@/services/api/SellerApi";
import { Order } from "@/types/order";
import { Payout, VirtualAccount } from "@/types/seller";
import { ApiError } from "@/services/api/ApiClient";

const sellerApi = new SellerApi();

// Orders/payouts/virtual-account are independent pieces of the dashboard —
// a seller with no virtual account yet (e.g. Nomba provisioning still
// pending) is a normal state, not a reason to hide everything else. Using
// allSettled means one failing endpoint can't blank out data the other two
// successfully returned.
export default function useSeller() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [virtualAccountError, setVirtualAccountError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);

    const [ordersResult, payoutsResult, vaResult] = await Promise.allSettled([
      sellerApi.getOrders(),
      sellerApi.getPayouts(),
      sellerApi.getVirtualAccount(),
    ]);

    if (ordersResult.status === "fulfilled") {
      setOrders(ordersResult.value);
      setOrdersError(null);
    } else {
      setOrdersError(
        ordersResult.reason instanceof ApiError
          ? ordersResult.reason.message
          : "Failed to load orders."
      );
    }

    if (payoutsResult.status === "fulfilled") {
      setPayouts(payoutsResult.value);
      setPayoutsError(null);
    } else {
      setPayoutsError(
        payoutsResult.reason instanceof ApiError
          ? payoutsResult.reason.message
          : "Failed to load payouts."
      );
    }

    if (vaResult.status === "fulfilled") {
      setVirtualAccount(vaResult.value);
      setVirtualAccountError(null);
    } else {
      setVirtualAccount(null);
      setVirtualAccountError(
        vaResult.reason instanceof ApiError
          ? vaResult.reason.message
          : "Virtual account not available yet."
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    orders,
    payouts,
    virtualAccount,
    loading,
    ordersError,
    payoutsError,
    virtualAccountError,
    refetch,
  };
}



