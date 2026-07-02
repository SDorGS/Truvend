import { supabase } from '../lib/supabase'
import { AppError } from '../middleware/error.middleware'
import { analyseListing } from './gemini.service'

import type { Listing } from '../types'

interface CreateListingInput {
  title: string
  description: string
  price: number
}

interface UpdateListingInput {
  title?: string
  description?: string
  price?: number
}

export async function getActiveListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:users!listings_seller_id_fkey(display_name, avatar_url)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[listings] getActiveListings:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch listings.')
  }
  return (data ?? []) as Listing[]
}

export async function getListing(id: string): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:users!listings_seller_id_fkey(display_name, avatar_url)')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !data) throw new AppError(404, 'NOT_FOUND', 'Listing not found.')
  return data as Listing
}

export async function createListing(
  sellerId: string,
  input: CreateListingInput
): Promise<Listing> {
  // Scoring is synchronous — response waits for Gemini before returning.
  // This keeps the create response self-contained for the hackathon demo scope.
  // Revisit async scoring if listing volume grows.
  const risk = await analyseListing(input.title, input.description, input.price)

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: input.title,
      description: input.description,
      price: input.price,
      risk_score: risk.risk_score,
      risk_level: risk.risk_level,
      risk_explanation: risk.risk_explanation,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[listings] createListing:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to create listing.')
  }
  return data as Listing
}

export async function updateListing(
  id: string,
  sellerId: string,
  input: UpdateListingInput
): Promise<Listing> {
  const existing = await getListing(id)

  if (existing.seller_id !== sellerId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this listing.')
  }

  const { data, error } = await supabase
    .from('listings')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new AppError(500, 'DB_ERROR', 'Failed to update listing.')
  return data as Listing
}

export async function deleteListing(id: string, sellerId: string): Promise<void> {
  const existing = await getListing(id)

  if (existing.seller_id !== sellerId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this listing.')
  }

  // Soft delete — preserves the row for order references
  const { error } = await supabase
    .from('listings')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to delete listing.')
}
