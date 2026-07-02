
import ApiClient from "./ApiClient";
import { Listing } from "@/types/listing";
import { normalizeListing, normalizeListings } from "@/lib/normalize";

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

  createListing(data: Partial<Listing>) {
    return this.api.post<Listing>("/api/listings", data);
  }

  updateListing(id: string, data: Partial<Listing>) {
    return this.api.put<Listing>(`/api/listings/${id}`, data);
  }

  deleteListing(id: string) {
    return this.api.delete<void>(`/api/listings/${id}`);
  }
}
