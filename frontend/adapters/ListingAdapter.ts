
import Listing from "@/models/Listing";
import { Listing as ListingType } from "@/types/listing";

export default class ListingAdapter {
  static adapt(data: ListingType): Listing {
    return new Listing({
      ...data,
      title: data.title.trim(),
      description: data.description.trim(),
    });
  }

  static adaptMany(data: ListingType[]): Listing[] {
    return data.map((item) => this.adapt(item));
  }
}
