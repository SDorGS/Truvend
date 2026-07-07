
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

  // Phase 10: "My Listings" needs to distinguish soft-deleted rows from active
  // ones. The public browse endpoint filters these out, so this stays optional
  // for older normalizations that never surfaced it.
  isActive: boolean;
}
