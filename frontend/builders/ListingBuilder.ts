
import { Listing } from "@/types/listing";

export default class ListingBuilder {
  private listing: Partial<Listing> = {};

  setTitle(title: string) {
    this.listing.title = title;
    return this;
  }

  setDescription(description: string) {
    this.listing.description = description;
    return this;
  }

  setPrice(price: number) {
    this.listing.price = price;
    return this;
  }

  build(): Listing {
    return this.listing as Listing;
  }
}
