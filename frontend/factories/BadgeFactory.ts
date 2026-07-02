
import { RiskLevel } from "@/types/listing";

export default class BadgeFactory {
  static create(level: RiskLevel) {
    switch (level) {
      case "clear":
        return "🟢";

      case "caution":
        return "🟡";

      case "suspicious":
        return "🟠";

      case "high_risk":
        return "🔴";

      default:
        return "⚪";
    }
  }
}
