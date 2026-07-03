import { randomUUID } from 'crypto'

import { supabase } from '../lib/supabase'
import { nombaRequest, SUB_ACCOUNT_ID } from '../lib/nomba'
import { AppError } from '../middleware/error.middleware'

import type { VendorVirtualAccount } from '../types'

interface NombaVirtualAccountResponse {
  code: string
  data: {
    bankAccountNumber: string  // field name per Nomba docs
    bankAccountName: string
    bankName: string
    accountRef: string
    accountName?: string
  }
}

async function createVirtualAccountForSeller(sellerId: string): Promise<VendorVirtualAccount> {
  const { data: user } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', sellerId)
    .single()

  // Nomba requires accountRef to be 16–64 chars. UUID v4 is 36 — safe.
  const accountRef = randomUUID()

  // Nomba requires accountName to be 8–64 chars. Pad short display names so the
  // API call doesn't fail purely on length.
  const rawName = user?.display_name?.trim() || 'Truvend Seller'
  const accountName = rawName.length >= 8 ? rawName : `${rawName} · Truvend`

  // Sub-account VAs use a distinct endpoint (subAccountId in the URL path).
  // If no sub-account is configured, fall back to the primary-account endpoint.
  const path = SUB_ACCOUNT_ID
    ? `/v1/accounts/virtual/${SUB_ACCOUNT_ID}`
    : '/v1/accounts/virtual'

  const nombaRes = await nombaRequest<NombaVirtualAccountResponse>(path, 'POST', {
    accountRef,
    accountName,
  })

  if (nombaRes.code !== '00' || !nombaRes.data?.bankAccountNumber) {
    console.error('[sellers] Nomba VA creation response:', nombaRes)
    throw new AppError(502, 'NOMBA_ERROR', 'Virtual account creation failed.')
  }

  const { data, error } = await supabase
    .from('vendor_virtual_accounts')
    .insert({
      seller_id: sellerId,
      nomba_account_ref: nombaRes.data.accountRef ?? accountRef,
      account_number: nombaRes.data.bankAccountNumber,
      bank_name: nombaRes.data.bankName,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[sellers] createVirtualAccount insert:', error)
    throw new AppError(500, 'DB_ERROR', 'Failed to save virtual account.')
  }

  return data as VendorVirtualAccount
}

export async function getOrCreateVirtualAccount(
  sellerId: string
): Promise<VendorVirtualAccount> {
  const { data, error } = await supabase
    .from('vendor_virtual_accounts')
    .select('*')
    .eq('seller_id', sellerId)
    .single()

  if (!error && data) return data as VendorVirtualAccount

  // No account yet — create one
  return createVirtualAccountForSeller(sellerId)
}
