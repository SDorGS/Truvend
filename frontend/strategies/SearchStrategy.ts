
import { Listing } from "@/types/listing";

export interface SearchStrategy {
  search(
    listings: Listing[],
    query: string
  ): Listing[];
}

export class DefaultSearchStrategy
  implements SearchStrategy
{
  search(
    listings: Listing[],
    query: string
  ) {
    return listings.filter((listing) =>
      listing.title
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }
}



