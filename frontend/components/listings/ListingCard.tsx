

import Link from "next/link";

import RiskBadge from "@/components/listings/RiskBadge";
import { formatCurrency } from "@/lib/utils";
import { Listing } from "@/types/listing";

interface Props {
  listing: Listing;
}

export default function ListingCard({
  listing,
}: Props) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="cursor-pointer rounded-xl border p-5 shadow-sm transition hover:border-teal-mid hover:shadow-md">
        <h2 className="text-xl font-semibold">
          {listing.title}
        </h2>

        <p className="mt-2 text-gray-600">
          {listing.description}
        </p>

        <p className="mt-4 text-2xl font-bold">
          {formatCurrency(listing.price)}
        </p>

        <div className="mt-4">
          <RiskBadge level={listing.riskLevel} />
        </div>
      </div>
    </Link>
  );
}
