

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const router = useRouter();
  const { isLoggedIn, user, logout, loading } = useAuth();
  const { items } = useCart();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between bg-teal-deep px-8 py-4 text-white">
      <Link href={ROUTES.HOME} className="text-2xl font-bold">
        {APP_NAME}
      </Link>

      <div className="flex items-center gap-6">
        <Link href={ROUTES.LISTINGS} className="hover:text-teal-mid">Listings</Link>
        <Link href={ROUTES.SEARCH} className="hover:text-teal-mid">Search</Link>
        <Link href={ROUTES.BUYER} className="hover:text-teal-mid">Buyer</Link>
        <Link href={ROUTES.SELLER} className="hover:text-teal-mid">Seller</Link>
        <Link href={ROUTES.ORDERS} className="hover:text-teal-mid">Orders</Link>

        <Link href={ROUTES.CART} className="relative hover:text-teal-mid">
          Cart
          {items.length > 0 && (
            <span className="absolute -right-3 -top-2 rounded-full bg-signal-orange px-1.5 text-xs text-white">
              {items.length}
            </span>
          )}
        </Link>

        {loading ? null : isLoggedIn ? (
          <>
            <span className="text-sm text-white/70">{user?.email}</span>
            <button onClick={handleLogout} className="text-sm hover:underline">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href={ROUTES.LOGIN} className="hover:text-teal-mid">Login</Link>
            <Link href={ROUTES.SIGNUP} className="hover:text-teal-mid">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
