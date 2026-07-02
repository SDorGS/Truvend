import Link from "next/link";
import { Package } from "lucide-react";

import RiskBadge from "@/components/listings/RiskBadge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Listing } from "@/types/listing";

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <Card className="overflow-hidden rounded-xl bg-white p-0 ring-1 ring-black/5 transition hover:shadow-lg">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
          {listing.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.image}
              alt={listing.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <Package className="h-10 w-10 text-gray-400" aria-hidden="true" />
            </div>
          )}

          <div className="absolute right-2 top-2">
            <RiskBadge level={listing.riskLevel} />
          </div>
        </div>

        <div className="p-4">
          <h2 className="truncate text-sm font-medium text-teal-deep">
            {listing.title}
          </h2>
          <p className="mt-2 text-lg font-bold text-teal-deep">
            {formatCurrency(listing.price)}
          </p>
          {listing.seller && (
            <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">
                {listing.seller.displayName ? listing.seller.displayName.charAt(0).toUpperCase() : "U"}
              </div>
              <div>{listing.seller.displayName}</div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
