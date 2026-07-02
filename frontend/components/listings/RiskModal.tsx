

"use client";

import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";

interface Props {
  open: boolean;
  riskLevel: string;
  riskExplanation: string;
  onClose: () => void;
  onProceed?: () => void;
  onReport?: () => void;
}

export default function RiskModal({
  open,
  riskLevel,
  riskExplanation,
  onClose,
  onProceed,
  onReport,
}: Props) {
  // Guard against any missing/undefined data from the API — this component's
  // JSX gets evaluated by React even while `open` is false (Modal only
  // decides whether to render *after* this runs), so an undefined riskLevel
  // must never throw here.
  if (!open) {
    return null;
  }

  const safeRiskLevel = riskLevel || "high_risk";
  const safeExplanation = riskExplanation || "This listing has been flagged for review.";

  return (
    <Modal open={open}>
      <div className="max-w-lg">
        <h2 className="text-2xl font-bold text-alert-red">High Risk Listing</h2>

        <p className="mt-4">
          Risk Level:
          <span className="ml-2 font-semibold capitalize">
            {safeRiskLevel.replace("_", " ")}
          </span>
        </p>

        <p className="mt-4 text-gray-600">{safeExplanation}</p>

        <div className="mt-8 flex justify-end gap-3">
          {onReport && (
            <Button onClick={onReport} variant="danger">
              Report
            </Button>
          )}

          <Button onClick={onClose} variant="neutral">
            Go Back
          </Button>

          {onProceed && (
            <Button onClick={onProceed} variant="cta">
              Proceed Anyway
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
