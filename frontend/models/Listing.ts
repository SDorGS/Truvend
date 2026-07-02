
import { Listing as ListingType } from "@/types/listing";

export default class Listing implements ListingType {
  id: string;
  sellerId: string;

  title: string;
  description: string;
  image: string;
  price: number;

  riskScore: number;
  riskLevel: ListingType["riskLevel"];
  riskExplanation: string;

  constructor(data: ListingType) {
    Object.assign(this, data);
  }

  clone(): Listing {
    return new Listing({
      ...this,
    });
  }
}
