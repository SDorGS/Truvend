
export type RiskLevel =
  | "clear"
  | "caution"
  | "suspicious"
  | "high_risk";

export interface Listing {
  id: string;

  sellerId: string;

  seller?: { displayName: string; avatarUrl: string | null };

  title: string;

  description: string;

  image: string;

  price: number;

  riskScore: number;

  riskLevel: RiskLevel;

  riskExplanation: string;
}
