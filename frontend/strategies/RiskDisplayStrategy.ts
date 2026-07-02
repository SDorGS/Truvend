
import { RiskLevel } from "@/types/listing";

export interface RiskDisplayStrategy {
  getColor(level: RiskLevel): string;
}

export class DefaultRiskStrategy
  implements RiskDisplayStrategy
{
  getColor(level: RiskLevel) {
    switch (level) {
      case "clear":
        return "green";

      case "caution":
        return "yellow";

      case "suspicious":
        return "orange";

      case "high_risk":
        return "red";

      default:
        return "gray";
    }
  }
}
