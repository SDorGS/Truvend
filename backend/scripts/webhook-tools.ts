/// <reference types="node" />
import 'dotenv/config'

import { nombaRequest, SUB_ACCOUNT_ID } from '../src/lib/nomba'
import { supabase } from '../src/lib/supabase'

// Nomba's filter-transactions response — best-effort typing since the docs
// don't publish the exact shape. `data` might be an array directly or wrapped
// in a `list` field. Both branches are handled in extractTxId below.
interface NombaFilterTxResponse {
  code?: string
  data?:
    | Array<Record<string, unknown>>
    | {
        list?: Array<Record<string, unknown>>
        content?: Array<Record<string, unknown>>
        results?: Array<Record<string, unknown>>
      }
}

// Common candidate keys — Nomba uses `id` in some responses and `transactionId` in others.
function extractTxId(item: Record<string, unknown>): string | null {
  const candidates = ['transactionId', 'id', 'transaction_id', 'txnId']
  for (const key of candidates) {
    const v = item[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

function extractItems(res: NombaFilterTxResponse): Array<Record<string, unknown>> {
  if (Array.isArray(res.data)) return res.data
  return res.data?.results ?? res.data?.list ?? res.data?.content ?? []
}

async function lookupTxIdForOrderRef(orderRef: string): Promise<{
  ok: boolean
  transactionId: string | null
  raw: NombaFilterTxResponse
}> {
  if (!SUB_ACCOUNT_ID) {
    throw new Error('NOMBA_SUB_ACCOUNT_ID is not set in the environment.')
  }

  const path = `/v1/transactions/accounts/${encodeURIComponent(SUB_ACCOUNT_ID)}`
  const res = await nombaRequest<NombaFilterTxResponse>(path, 'POST', { orderReference: orderRef })

  const items = extractItems(res)
  if (items.length === 0) return { ok: false, transactionId: null, raw: res }

  // Prefer an exact orderReference match if the field is present, otherwise take the first.
  const match =
    items.find(
      (it) =>
        typeof it.orderReference === 'string' &&
        (it.orderReference as string) === orderRef
    ) ?? items[0]

  return { ok: true, transactionId: extractTxId(match), raw: res }
}

// Reuses the same nombaRequest helper the server uses — no need to hand-extract
// bearer tokens or accountIds. Auth + parent accountId header are handled for you.
//
// Usage:
//   npx tsx scripts/webhook-tools.ts me
//   npx tsx scripts/webhook-tools.ts events <coreUserId> [limit]
//   npx tsx scripts/webhook-tools.ts repush <hooksRequestId>
//   npx tsx scripts/webhook-tools.ts repush-bulk <id1> <id2> <id3> ...
//
// Run `me` first — it fetches your parent account details and prints the
// accountHolderId, which is the value to pass as coreUserId to the other commands.

function usage(): never {
  console.error(
    [
      '',
      'Usage:',
      '  npx tsx scripts/webhook-tools.ts verify <nomba_order_ref>',
      '  npx tsx scripts/webhook-tools.ts find-tx-id <nomba_order_ref>',
      '  npx tsx scripts/webhook-tools.ts backfill-tx-ids',
      '  npx tsx scripts/webhook-tools.ts me',
      '  npx tsx scripts/webhook-tools.ts token',
      '  npx tsx scripts/webhook-tools.ts events <coreUserId> [limit]',
      '  npx tsx scripts/webhook-tools.ts repush <hooksRequestId>',
      '  npx tsx scripts/webhook-tools.ts repush-bulk <id1> <id2> <id3> ...',
      '',
    ].join('\n')
  )
  process.exit(1)
}

// Nomba access tokens are JWTs. Their payload usually carries the merchant userId
// as `sub` or `userId`. Decode by hand instead of pulling a jwt package in.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

async function fetchTokenRaw(): Promise<{ raw: Record<string, unknown>; accessToken: string }> {
  const baseUrl = process.env.NOMBA_BASE_URL?.replace(/\/$/, '') ?? 'https://api.nomba.com'
  const accountId = process.env.NOMBA_ACCOUNT_ID?.trim() ?? ''
  const clientId = process.env.NOMBA_CLIENT_ID?.trim() ?? ''
  const clientSecret = process.env.NOMBA_CLIENT_SECRET?.trim() ?? ''

  const res = await fetch(`${baseUrl}/v1/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      accountId,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token issue failed (${res.status}): ${body}`)
  }

  const raw = (await res.json()) as Record<string, unknown>
  const data = (raw.data as Record<string, unknown> | undefined) ?? {}
  const accessToken = String(data.access_token ?? raw.access_token ?? '')
  return { raw, accessToken }
}

interface ParentAccountResponse {
  code?: string
  description?: string
  data?: {
    accountId?: string
    accountHolderId?: string
    accountName?: string
    status?: string
  }
}

const cmd = process.argv[2]

void (async () => {
  try {
    if (cmd === 'find-tx-id') {
      const orderRef = process.argv[3]
      if (!orderRef) {
        console.error('Usage: npx tsx scripts/webhook-tools.ts find-tx-id <nomba_order_ref>')
        process.exit(1)
      }
      const { ok, transactionId, raw } = await lookupTxIdForOrderRef(orderRef)
      console.log('Raw Nomba response:', JSON.stringify(raw, null, 2))
      if (ok && transactionId) {
        console.log('')
        console.log(`transactionId for orderReference ${orderRef}: ${transactionId}`)
      } else if (ok) {
        console.log('')
        console.log('Nomba returned matches but the transactionId field was missing. Inspect raw response above.')
      } else {
        console.log('')
        console.log('Nomba returned no matching transactions for that orderReference.')
      }
      return
    }

    if (cmd === 'backfill-tx-ids') {
      // Find all orders that flipped past pending but never got a transactionId.
      // We deliberately skip 'pending' rows — those either haven't cleared yet
      // or will be reconciled on next fetch via the auto-reconcile path.
      const { data, error } = await supabase
        .from('orders')
        .select('id, nomba_order_ref, status')
        .is('nomba_transaction_id', null)
        .not('nomba_order_ref', 'is', null)
        .not('status', 'in', '(pending,cancelled)')

      if (error) throw error
      const rows = data ?? []

      console.log(`Found ${rows.length} order(s) missing a transactionId. Looking them up now…`)
      console.log('')

      let updated = 0
      let notFound = 0
      let errored = 0

      for (const row of rows) {
        const ref = row.nomba_order_ref as string
        try {
          const { ok, transactionId } = await lookupTxIdForOrderRef(ref)
          if (!ok || !transactionId) {
            console.log(`  ✗ order=${row.id} ref=${ref} — Nomba had no matching tx`)
            notFound++
            continue
          }

          const { error: updateError } = await supabase
            .from('orders')
            .update({ nomba_transaction_id: transactionId, updated_at: new Date().toISOString() })
            .eq('id', row.id)

          if (updateError) {
            console.log(`  ! order=${row.id} ref=${ref} — DB update failed: ${updateError.message}`)
            errored++
            continue
          }

          console.log(`  ✓ order=${row.id} ref=${ref} → ${transactionId}`)
          updated++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.log(`  ! order=${row.id} ref=${ref} — Nomba lookup failed: ${msg.slice(0, 160)}`)
          errored++
        }
      }

      console.log('')
      console.log(`Done. updated=${updated} notFound=${notFound} errored=${errored}`)
      return
    }

    if (cmd === 'verify') {
      const orderReference = process.argv[3]
      if (!orderReference) {
        console.error('Usage: npx tsx scripts/webhook-tools.ts verify <nomba_order_ref>')
        process.exit(1)
      }
      // Hackathon accounts can't repush via API — use this to confirm a payment
      // landed on Nomba's side, then manually flip the order in Supabase.
      const res = await nombaRequest<unknown>(
        `/v1/checkout/order/${encodeURIComponent(orderReference)}`,
        'GET'
      )
      console.log(JSON.stringify(res, null, 2))
      return
    }

    if (cmd === 'me') {
      const res = await nombaRequest<ParentAccountResponse>('/v1/accounts/parent', 'GET')
      console.log(JSON.stringify(res, null, 2))
      const holderId = res.data?.accountHolderId
      if (holderId) {
        console.log('')
        console.log(`Use this as coreUserId: ${holderId}`)
      }
      return
    }

    if (cmd === 'token') {
      const { raw, accessToken } = await fetchTokenRaw()
      console.log('--- Raw token issue response ---')
      console.log(JSON.stringify(raw, null, 2))

      const jwt = decodeJwtPayload(accessToken)
      if (jwt) {
        console.log('')
        console.log('--- Decoded JWT payload ---')
        console.log(JSON.stringify(jwt, null, 2))

        const candidateKeys = ['userId', 'user_id', 'sub', 'coreUserId', 'merchantUserId']
        for (const key of candidateKeys) {
          const value = jwt[key]
          if (typeof value === 'string' && value.length > 0) {
            console.log('')
            console.log(`Likely coreUserId (from JWT.${key}): ${value}`)
            return
          }
        }
      } else {
        console.log('')
        console.log('Access token is not a JWT — falling back to raw response only.')
      }
      return
    }

    if (cmd === 'events') {
      const coreUserId = process.argv[3]
      const limit = Number(process.argv[4] ?? 20)
      if (!coreUserId) usage()

      const res = await nombaRequest<unknown>('/v1/webhooks/events', 'POST', {
        coreUserId,
        limit,
      })
      console.log(JSON.stringify(res, null, 2))
      return
    }

    if (cmd === 'repush') {
      const hooksRequestId = process.argv[3]
      if (!hooksRequestId) usage()

      const res = await nombaRequest<unknown>('/v1/webhooks/re-push', 'POST', {
        hooksRequestId,
      })
      console.log(JSON.stringify(res, null, 2))
      return
    }

    if (cmd === 'repush-bulk') {
      const ids = process.argv.slice(3)
      if (ids.length === 0) usage()

      const res = await nombaRequest<unknown>('/v1/webhooks/bulk-re-push', 'POST', {
        hooksRequestIds: ids,
      })
      console.log(JSON.stringify(res, null, 2))
      return
    }

    usage()
  } catch (err) {
    console.error('Request failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
})()
