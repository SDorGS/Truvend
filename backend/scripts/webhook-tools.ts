/// <reference types="node" />
import 'dotenv/config'

import { nombaRequest } from '../src/lib/nomba'

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
