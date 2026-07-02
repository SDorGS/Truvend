

"use client";

import Button from "@/components/common/Button";
import { useCart } from "@/context/CartContext";
import { Listing } from "@/types/listing";

interface Props {
  listing: Listing;
}

export default function AddToCartButton({ listing }: Props) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(listing.id);

  return (
    <Button
      type="button"
      onClick={() => addItem(listing)}
      disabled={inCart}
      variant="neutral"
      className="w-full"
    >
      {inCart ? "In Cart" : "Add to Cart"}
    </Button>
  );
}
