import { Listing as ListingType } from "@/types/listing";

export default class Listing implements ListingType {
  id!: string;

  sellerId!: string;

  seller?: {
    displayName: string;
    avatarUrl: string | null;
  };

  title!: string;

  description!: string;

  image!: string;

  price!: number;

  riskScore!: number;

  riskLevel!: ListingType["riskLevel"];

  riskExplanation!: string;

  isActive!: boolean;

  constructor(data: ListingType) {
    Object.assign(this, data);
  }

  clone(): Listing {
    return new Listing({
      ...this,
    });
  }
}
