
import ApiClient from "./ApiClient";
import { Listing } from "@/types/listing";
import { normalizeListing, normalizeListings } from "@/lib/normalize";

// Phase 10 write payload — camelCase on the frontend, snake_case on the wire.
// Keeping the translation at the API boundary means callers don't need to
// think about how the backend spells the field.
export interface ListingWritePayload {
  title?: string;
  description?: string;
  price?: number;
  photoUrl?: string | null;
}

export default class ListingApi {
  private api = ApiClient.getInstance();

  async getListings(): Promise<Listing[]> {
    const raw = await this.api.get<unknown>("/api/listings");
    return normalizeListings(raw);
  }

  async getListing(id: string): Promise<Listing> {
    const raw = await this.api.get<Record<string, unknown>>(`/api/listings/${id}`);
    return normalizeListing(raw);
  }

  async getSellerListings(): Promise<Listing[]> {
    const raw = await this.api.get<unknown>("/api/seller/listings");
    return normalizeListings(raw);
  }

  async createListing(data: ListingWritePayload): Promise<Listing> {
    const raw = await this.api.post<Record<string, unknown>>("/api/listings", {
      title: data.title,
      description: data.description,
      price: data.price,
      photo_url: data.photoUrl,
    });
    return normalizeListing(raw);
  }

  async updateListing(id: string, data: ListingWritePayload): Promise<Listing> {
    const raw = await this.api.put<Record<string, unknown>>(`/api/listings/${id}`, {
      title: data.title,
      description: data.description,
      price: data.price,
      photo_url: data.photoUrl,
    });
    return normalizeListing(raw);
  }

  deleteListing(id: string) {
    return this.api.delete<void>(`/api/listings/${id}`);
  }

  async uploadPhoto(file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append("photo", file);

    const raw = await this.api.post<Record<string, unknown>>(
      "/api/listings/photo",
      formData
    );

    const photoUrl = String(raw.photo_url ?? raw.photoUrl ?? "");
    return { photoUrl };
  }
}
