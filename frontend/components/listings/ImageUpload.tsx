"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import Button from "@/components/common/Button";
import ListingApi from "@/services/api/ListingApi";
import { ApiError } from "@/services/api/ApiClient";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";
const listingApi = new ListingApi();

interface Props {
  /**
   * Called once the file has been uploaded and the backend returned a public
   * URL. Parent forms use this to gate their submit button — a submit before
   * this fires would post a listing with no photo.
   */
  onUploaded: (photoUrl: string) => void;
  /**
   * Initial preview (e.g. an existing listing's `photo_url` in the edit form).
   * The seller can still replace it by picking a new file.
   */
  initialPhotoUrl?: string | null;
}

type Status = "idle" | "uploading" | "uploaded" | "error";

export default function ImageUpload({ onUploaded, initialPhotoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPhotoUrl ?? null);
  const [status, setStatus] = useState<Status>(initialPhotoUrl ? "uploaded" : "idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Track locally-created object URLs so we can revoke them — leaving them
  // around leaks memory in long-lived tabs (edit page + retries).
  const localObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
      }
    };
  }, []);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    localObjectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setErrorMessage(null);
    setStatus("uploading");

    try {
      const { photoUrl } = await listingApi.uploadPhoto(file);
      setStatus("uploaded");
      // Swap the local blob preview out for the real hosted URL now that the
      // upload landed — keeps the preview stable if the tab is left open long
      // enough for the object URL to be revoked on unmount.
      setPreviewUrl(photoUrl);
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
        localObjectUrlRef.current = null;
      }
      onUploaded(photoUrl);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof ApiError ? err.message : "Could not upload photo. Please try again."
      );
    }
  }

  function handleClear() {
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setStatus("idle");
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Listing photo"
      />

      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected listing photo"
            className={`w-full max-h-80 rounded-lg object-cover ring-1 ring-black/5 ${
              status === "uploading" ? "opacity-60" : ""
            }`}
          />
          {status === "uploading" && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 text-sm font-medium text-white"
              aria-live="polite"
            >
              Uploading...
            </div>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-700 shadow ring-1 ring-black/10 transition hover:bg-white"
            aria-label="Remove photo"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 transition hover:border-teal-mid hover:bg-teal-mid/5"
        >
          <ImagePlus className="h-8 w-8" aria-hidden="true" />
          <span>Click to add a photo</span>
          <span className="text-xs text-gray-400">JPEG, PNG, or WebP (max 5 MB)</span>
        </button>
      )}

      {previewUrl && (
        <Button
          type="button"
          variant="neutral"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="w-fit"
        >
          Replace photo
        </Button>
      )}

      {errorMessage && (
        <p className="text-sm text-alert-red" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
