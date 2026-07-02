
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Listing } from "@/types/listing";

export interface CartItem {
  listing: Listing;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (listing: Listing) => void;
  removeItem: (listingId: string) => void;
  clearCart: () => void;
  isInCart: (listingId: string) => boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// No cart endpoint exists on the backend yet (checkout only takes a single
// listingId per order — see backend guide section 06). This cart is
// client-side only, persisted to localStorage so it survives a refresh,
// and each item still gets checked out as its own separate escrowed order.
const STORAGE_KEY = "truvend_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupted or inaccessible storage — start with an empty cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full or unavailable — cart just won't persist this session
    }
  }, [items, hydrated]);

  function addItem(listing: Listing) {
    setItems((prev) =>
      prev.some((i) => i.listing.id === listing.id) ? prev : [...prev, { listing }]
    );
  }

  function removeItem(listingId: string) {
    setItems((prev) => prev.filter((i) => i.listing.id !== listingId));
  }

  function clearCart() {
    setItems([]);
  }

  function isInCart(listingId: string) {
    return items.some((i) => i.listing.id === listingId);
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return ctx;
}
