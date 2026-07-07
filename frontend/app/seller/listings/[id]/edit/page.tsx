"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Button from "@/components/common/Button";
import Loading from "@/components/common/Loading";
import RequireAuth from "@/components/auth/RequireAuth";
import ImageUpload from "@/components/listings/ImageUpload";
import { Input } from "@/components/ui/input";
import useListing from "@/hooks/useListing";
import ListingApi from "@/services/api/ListingApi";
import { ApiError } from "@/services/api/ApiClient";

const listingApi = new ListingApi();

interface Props {
  params: Promise<{ id: string }>;
}

function EditListingForm({ id }: { id: string }) {
  const router = useRouter();
  const { listing, loading, error } = useListing(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // A useListing tick before setState would clobber unsaved edits — guard so
  // we only seed the form once, when the listing first arrives.
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (listing && !seeded) {
      setTitle(listing.title);
      setDescription(listing.description);
      setPrice(String(listing.price));
      setPhotoUrl(listing.image || null);
      setSeeded(true);
    }
  }, [listing, seeded]);

  useEffect(() => {
    // Ownership is backend-enforced (403 on non-owner). Bounce cleanly rather
    // than showing a raw error blob if the API returned a 403 anyway.
    if (error && error.toLowerCase().includes("permission")) {
      router.replace("/seller/listings");
    }
  }, [error, router]);

  const canSubmit =
    seeded &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    price.trim().length > 0 &&
    photoUrl !== null &&
    !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await listingApi.updateListing(id, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        photoUrl,
      });
      router.push("/seller/listings");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/seller/listings");
        return;
      }
      setSubmitError(
        err instanceof ApiError ? err.message : "Could not update listing. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;

  if (error || !listing) {
    return (
      <main className="mx-auto max-w-2xl p-6 md:p-8">
        <h1 className="text-3xl font-bold text-teal-deep">Listing not found</h1>
        {error && <p className="mt-2 text-red-600">{error}</p>}
        <div className="mt-6">
          <Link href="/seller/listings" className="text-sm text-teal-mid hover:underline">
            Back to My Listings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-teal-deep">Edit Listing</h1>
        <Link href="/seller/listings" className="text-sm text-teal-mid hover:underline">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Photo</label>
          <ImageUpload
            onUploaded={setPhotoUrl}
            initialPhotoUrl={listing.image || null}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-mid"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price (NGN)
          </label>
          <Input
            id="price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        {submitError && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </main>
  );
}

export default function EditListingPage({ params }: Props) {
  const { id } = use(params);

  return (
    <RequireAuth>
      <EditListingForm id={id} />
    </RequireAuth>
  );
}
