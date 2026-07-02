

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import RiskModal from "@/components/listings/RiskModal";
import OrderApi from "@/services/api/OrderApi";
import { ApiError } from "@/services/api/ApiClient";
import { Listing } from "@/types/listing";
import useAuth from "@/hooks/useAuth";

interface Props {
  listing: Listing;
}

const orderApi = new OrderApi();

// HARD RULE (backend guide section 05): for high_risk listings, checkout must
// never open until the buyer has seen and dismissed the warning modal. This
// component is the single place "Buy Now" lives, so that rule can't be
// bypassed by another entry point into checkout.
export default function BuyButton({ listing }: Props) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const { checkoutLink } = await orderApi.checkout(listing.id);
      window.location.href = checkoutLink;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout.");
      setSubmitting(false);
    }
  }

  function handleBuyClick() {
    if (listing.riskLevel === "high_risk") {
      setShowRiskModal(true);
      return;
    }

    startCheckout();
  }

  return (
    <>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <Button onClick={handleBuyClick} disabled={submitting} variant="cta" className="w-full">
        {submitting ? "Starting checkout..." : "Buy Now"}
      </Button>

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
    </>
  );
}
