"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import MessageApi from "@/services/api/MessageApi";
import { ApiError } from "@/services/api/ApiClient";
import { Message } from "@/types/message";

const messageApi = new MessageApi();

const POLL_INTERVAL_MS = 3000;

export default function useMessages(orderId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const data = await messageApi.getForOrder(orderId);
      if (!mounted.current) return;
      setMessages(data);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof ApiError ? err.message : "Failed to load messages.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    mounted.current = true;
    refetch();
    const timer = setInterval(refetch, POLL_INTERVAL_MS);

    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refetch]);

  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      setSending(true);
      try {
        const created = await messageApi.send(orderId, trimmed);
        setMessages((prev) => [...prev, created]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to send message.");
        throw err;
      } finally {
        setSending(false);
      }
    },
    [orderId]
  );

  return { messages, loading, error, sending, send, refetch };
}
