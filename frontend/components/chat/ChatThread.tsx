"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Button from "@/components/common/Button";
import useAuth from "@/hooks/useAuth";
import useMessages from "@/hooks/useMessages";

interface Props {
  orderId: string;
  counterpartyLabel: string;
}

export default function ChatThread({ orderId, counterpartyLabel }: Props) {
  const { user } = useAuth();
  const { messages, loading, error, sending, send } = useMessages(orderId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever the message list grows
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft.trim() || sending) return;

    try {
      await send(draft);
      setDraft("");
    } catch {
      // hook already stored the error
    }
  }

  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
        <MessageCircle className="h-5 w-5 text-teal-mid" aria-hidden="true" />
        <h2 className="text-base font-semibold text-teal-deep">
          Chat with {counterpartyLabel}
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="flex h-72 flex-col gap-2 overflow-y-auto bg-gray-50 px-5 py-4"
      >
        {loading && messages.length === 0 && (
          <p className="text-center text-xs text-gray-400">Loading messages…</p>
        )}

        {!loading && messages.length === 0 && (
          <p className="my-auto text-center text-xs text-gray-400">
            No messages yet — start the conversation.
          </p>
        )}

        {messages.map((msg) => {
          const mine = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {!mine && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">
                    {msg.sender?.displayName ? msg.sender.displayName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "rounded-br-sm bg-teal-mid text-white"
                      : "rounded-bl-sm bg-white text-teal-deep ring-1 ring-black/5"
                  }`}
                >
                  {msg.body}
                </div>
              </div>
              <span className="mt-0.5 text-[10px] text-gray-400">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-100 p-3">
        <Input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          disabled={sending}
        />
        <Button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
          className="!px-3"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </Card>
  );
}
