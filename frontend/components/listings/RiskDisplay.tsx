

"use client";

import { useState } from "react";
import { Listing } from "@/types/listing";
import RiskBadge from "@/components/listings/RiskBadge";

interface Props {
  listing: Listing;
}

// Handles the page-level (non-blocking) risk presentation rules from the
// backend guide section 05. The checkout-blocking modal for high_risk lives
// separately in BuyButton, since that one gates an action, not just display.
export default function RiskDisplay({ listing }: Props) {
  const [showPopover, setShowPopover] = useState(false);

  if (listing.riskLevel === "clear") {
    return <RiskBadge level={listing.riskLevel} />;
  }

  if (listing.riskLevel === "caution") {
    return (
      <div className="relative inline-block">
        <button onClick={() => setShowPopover((v) => !v)} type="button">
          <RiskBadge level={listing.riskLevel} />
        </button>

        {showPopover && (
          <div className="absolute z-10 mt-2 w-64 rounded-lg border border-caution-yellow/40 bg-white p-3 text-sm text-gray-700 shadow-lg">
            {listing.riskExplanation}
          </div>
        )}
      </div>
    );
  }

  // suspicious and high_risk: always-visible banner, never hidden behind a tap
  const bannerStyles =
    listing.riskLevel === "high_risk"
      ? "bg-alert-red/10 border-alert-red text-alert-red"
      : "bg-signal-orange/10 border-signal-orange text-signal-orange";

  return (
    <div className={`rounded-lg border p-4 ${bannerStyles}`}>
      <div className="mb-1">
        <RiskBadge level={listing.riskLevel} />
      </div>
      <p className="text-sm">{listing.riskExplanation}</p>
    </div>
  );
}
