
import Listing from "@/models/Listing";
import { Listing as ListingType } from "@/types/listing";

export default class ListingFactory {
  static create(data: ListingType) {
    return new Listing(data);
  }
}
