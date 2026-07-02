
import ListingCard from "@/components/listings/ListingCard";
import { Listing } from "@/types/listing";

interface ListingsGridProps {
  listings: Listing[];
}

export default function ListingsGrid({
  listings,
}: ListingsGridProps) {
  if (listings.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold">
          No Listings Found
        </h2>

        <p className="mt-2 text-gray-500">
          There are currently no listings available.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
        />
      ))}
    </div>
  );
}
