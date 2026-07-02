

"use client";

import { useState } from "react";
import Button from "@/components/common/Button";
import RiskModal from "@/components/listings/RiskModal";
import RiskBadge from "@/components/listings/RiskBadge";
import OrderApi from "@/services/api/OrderApi";
import { ApiError } from "@/services/api/ApiClient";
import { Listing } from "@/types/listing";
import { formatCurrency } from "@/lib/utils";

interface Props {
  listing: Listing;
  onCheckedOut: (listingId: string) => void;
}

const orderApi = new OrderApi();

// Same hard rule as BuyButton: a high_risk item must show the warning modal
// before checkout opens, even when purchased from the cart flow.
export default function CartCheckoutItem({ listing, onCheckedOut }: Props) {
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function startCheckout() {
    setError(null);
    setSubmitting(true);

    try {
      const { checkoutLink } = await orderApi.checkout(listing.id);
      window.open(checkoutLink, "_blank", "noopener,noreferrer");
      setDone(true);
      onCheckedOut(listing.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClick() {
    if (listing.riskLevel === "high_risk") {
      setShowRiskModal(true);
      return;
    }

    startCheckout();
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{listing.title}</h3>
          <div className="mt-2 flex items-center gap-3">
            <RiskBadge level={listing.riskLevel} />
            <span className="text-gray-600">{formatCurrency(listing.price)}</span>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {done ? (
        <p className="mt-3 text-sm font-medium text-green-600">
          Checkout opened in a new tab.
        </p>
      ) : (
        <Button onClick={handleClick} disabled={submitting} variant="cta" className="mt-3">
          {submitting ? "Starting checkout..." : "Pay Now"}
        </Button>
      )}

      <RiskModal
        open={showRiskModal}
        riskLevel={listing.riskLevel}
        riskExplanation={listing.riskExplanation}
        onClose={() => setShowRiskModal(false)}
        onReport={() => {
          setShowRiskModal(false);
          alert("Report submitted. Our team will review this listing.");
        }}
        onProceed={() => {
          setShowRiskModal(false);
          startCheckout();
        }}
      />
    </div>
  );
}
