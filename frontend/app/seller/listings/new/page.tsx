"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Button from "@/components/common/Button";
import RequireAuth from "@/components/auth/RequireAuth";
import ImageUpload from "@/components/listings/ImageUpload";
import RiskDisplay from "@/components/listings/RiskDisplay";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ListingApi from "@/services/api/ListingApi";
import { ApiError } from "@/services/api/ApiClient";
import { Listing } from "@/types/listing";

const listingApi = new ListingApi();

function CreateListingForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdListing, setCreatedListing] = useState<Listing | null>(null);

  // Submit stays disabled until the photo upload has completed and returned a
  // URL — otherwise a seller could submit while the upload is in flight and
  // land a listing with a missing photo. Also blocks on the required text
  // fields being present.
  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    price.trim().length > 0 &&
    photoUrl !== null &&
    !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const listing = await listingApi.createListing({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        photoUrl,
      });
      setCreatedListing(listing);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : "Could not create listing. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Post-create success view: sellers see their listing's Gemini risk result
  // right away — nothing about that data is buyer-only, and they should know
  // if their own listing is flagged before the buyer does.
  if (createdListing) {
    return (
      <main className="mx-auto max-w-2xl p-6 md:p-8">
        <h1 className="text-3xl font-bold text-teal-deep">Listing created</h1>
        <p className="mt-2 text-gray-600">Here's how the fraud engine scored it.</p>

        <Card className="mt-6 p-6">
          <RiskDisplay listing={createdListing} />
        </Card>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => router.push(`/listings/${createdListing.id}`)}>
            View listing
          </Button>
          <Button variant="neutral" onClick={() => router.push("/seller/listings")}>
            Go to My Listings
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-teal-deep">New Listing</h1>
        <Link href="/seller/listings" className="text-sm text-teal-mid hover:underline">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Photo</label>
          <ImageUpload onUploaded={setPhotoUrl} />
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Nike Air Max, size 43"
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
            placeholder="Condition, size, delivery notes..."
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
            placeholder="25000"
            required
          />
        </div>

        {errorMessage && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          {submitting ? "Creating..." : "Create listing"}
        </Button>

        {!photoUrl && (
          <p className="text-xs text-gray-500">
            Upload a photo before submitting.
          </p>
        )}
      </form>
    </main>
  );
}

export default function NewListingPage() {
  return (
    <RequireAuth>
      <CreateListingForm />
    </RequireAuth>
  );
}
