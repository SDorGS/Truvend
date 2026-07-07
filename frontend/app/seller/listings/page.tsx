"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";

import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import RequireAuth from "@/components/auth/RequireAuth";
import RiskBadge from "@/components/listings/RiskBadge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ListingApi from "@/services/api/ListingApi";
import { ApiError } from "@/services/api/ApiClient";
import { formatCurrency } from "@/lib/utils";
import type { Listing } from "@/types/listing";

const listingApi = new ListingApi();

function MyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listingApi.getSellerListings();
      setListings(rows);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load your listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await listingApi.deleteListing(pendingDelete.id);
      // Optimistic local update — the backend soft-deletes (is_active = false),
      // so flip the flag in place rather than refetching the whole table.
      setListings((current) =>
        current.map((l) => (l.id === pendingDelete.id ? { ...l, isActive: false } : l))
      );
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Could not delete listing.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-teal-deep md:text-4xl">My Listings</h1>
        <Link href="/seller/listings/new">
          <Button className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Listing
          </Button>
        </Link>
      </div>

      {loadError && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{loadError}</p>
      )}

      {listings.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          You haven't created any listings yet.{" "}
          <Link href="/seller/listings/new" className="text-teal-mid hover:underline">
            Create your first one
          </Link>
          .
        </Card>
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              onDeleteClick={() => setPendingDelete(listing)}
            />
          ))}
        </ul>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this listing?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.title} will be removed from the marketplace. Buyers won't be able
              to see it, but existing orders remain untouched.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">
              {deleteError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="neutral"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ListingRow({
  listing,
  onDeleteClick,
}: {
  listing: Listing;
  onDeleteClick: () => void;
}) {
  const removed = !listing.isActive;

  return (
    <li>
      <Card
        className={`flex flex-col gap-4 p-4 md:flex-row md:items-center ${
          removed ? "opacity-60" : ""
        }`}
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
          {listing.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.image}
              alt={listing.title}
              className={`h-full w-full object-cover ${removed ? "grayscale" : ""}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-teal-deep">{listing.title}</h2>
            {removed && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-gray-600">
                Removed
              </span>
            )}
          </div>
          <p className="mt-1 text-lg font-bold text-teal-deep">
            {formatCurrency(listing.price)}
          </p>
          <div className="mt-2">
            <RiskBadge level={listing.riskLevel} />
          </div>
        </div>

        <div className="flex gap-2 md:flex-col md:items-stretch">
          <Link href={`/seller/listings/${listing.id}/edit`} className="inline-flex">
            <Button variant="neutral" className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            onClick={onDeleteClick}
            disabled={removed}
            className="inline-flex items-center gap-2"
            aria-disabled={removed}
            title={removed ? "This listing is already removed." : undefined}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </Card>
    </li>
  );
}

export default function MyListingsPage() {
  return (
    <RequireAuth>
      <MyListings />
    </RequireAuth>
  );
}
