export type UserRole = 'buyer' | 'seller'
export type RiskLevel = 'clear' | 'caution' | 'suspicious' | 'high_risk'
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'in_escrow'
  | 'dispatched'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'cancelled'

export interface User {
  id: string
  role: UserRole
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface VendorVirtualAccount {
  id: string
  seller_id: string
  nomba_account_ref: string
  account_number: string
  bank_name: string
  created_at: string
}

export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  risk_score: number | null
  risk_level: RiskLevel | null
  risk_explanation: string | null
  is_active: boolean
  created_at: string
  photo_url: string | null

  seller?: { display_name: string; avatar_url: string | null }

}

export interface Order {
  id: string
  listing_id: string
  buyer_id: string
  status: OrderStatus
  nomba_order_ref: string | null
  checkout_link: string | null
  amount: number
  created_at: string
  updated_at: string
}

export interface GeminiRiskAnalysis {
  risk_score: number
  risk_level: RiskLevel
  risk_explanation: string
}
