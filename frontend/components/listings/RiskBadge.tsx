

import { RiskLevel } from "@/types/listing";

interface Props {
  level: RiskLevel;
}

// "clear" stays a plain green — the brand token set (§10) deliberately has
// no hex for it, so a neutral universal-safe green is used rather than
// pulling in a brand color that means something else.
export default function RiskBadge({ level }: Props) {
  const styles = {
    clear: "bg-green-100 text-green-700",
    caution: "bg-caution-yellow/20 text-yellow-800",
    suspicious: "bg-signal-orange/15 text-signal-orange",
    high_risk: "bg-alert-red/15 text-alert-red",
  };

  const labels = {
    clear: "Clear",
    caution: "Caution",
    suspicious: "Suspicious",
    high_risk: "High Risk",
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}
