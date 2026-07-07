const BASE_URL = process.env.NOMBA_BASE_URL?.replace(/\/$/, '') ?? 'https://api.nomba.com'
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID?.trim()

// Exported so individual services can place it in exactly the right field per endpoint.
// Checkout uses the parent or sub-account ID in the request body/headers depending on the flow.
// Virtual accounts may target a sub-account through a URL path rather than the shared header.
export const SUB_ACCOUNT_ID = process.env.NOMBA_SUB_ACCOUNT_ID?.trim() || ''
const CLIENT_ID = process.env.NOMBA_CLIENT_ID?.trim()
const CLIENT_SECRET = process.env.NOMBA_CLIENT_SECRET?.trim()

interface CachedToken {
  accessToken: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null

async function issueToken(): Promise<string> {
  const now = Date.now()

  // Re-use if the token has more than 60 s of life left
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken
  }

  if (!ACCOUNT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing Nomba credentials. Set NOMBA_ACCOUNT_ID, NOMBA_CLIENT_ID, and NOMBA_CLIENT_SECRET.')
  }

  const res = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accountId: ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      accountId: ACCOUNT_ID,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Nomba token issue failed (${res.status}): ${body}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await res.json()) as any
  const accessToken: string = json.data?.access_token ?? json.access_token
  const expiresIn: number = json.data?.expires_in ?? json.expires_in ?? 3600

  cachedToken = { accessToken, expiresAt: now + expiresIn * 1000 }
  return cachedToken.accessToken
}

export async function nombaRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const token = await issueToken()
  const payload = body

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  if (ACCOUNT_ID) {
    headers.accountId = ACCOUNT_ID
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Nomba API error ${res.status} on ${path}: ${text}`)
  }

  return res.json() as Promise<T>
}

// -----------------------------------------------------------------------------
// Shared transaction verification helper (audit finding #3 — standardize this)
// -----------------------------------------------------------------------------
// Used by both the webhook controller (post-signature defence-in-depth per audit
// finding #2) and reconcilePendingOrder in orders.service.ts.
//
// Contract:
//   - cleared:   Nomba explicitly confirms the payment succeeded.
//   - reachable: Nomba responded with a definitive answer (cleared OR failed).
//                false means "Nomba can't see this transaction" — either the
//                sub-account routing gap we've hit repeatedly, or the ref is
//                truly unknown. Callers decide whether to trust signature alone.
//   - transactionId: Nomba's transaction ID when available (SUCCESS path).
//
// Endpoint order:
//   1. GET /v1/transactions/accounts/single?orderReference=<ref>
//      Docs-recommended endpoint (per audit).
//   2. Fallback: GET /v1/checkout/order/<ref>
//      Non-primary, but the only path that reliably surfaces "already completed"
//      for archived checkout orders on hackathon sub-accounts.
// -----------------------------------------------------------------------------

export interface NombaTxVerification {
  cleared: boolean
  reachable: boolean
  transactionId: string | null
  reason: string
}

interface NombaVerifyResponseShape {
  code?: string
  description?: string
  data?: {
    id?: string
    transactionId?: string
    status?: string
    success?: boolean | string
    message?: string
  }
}

function isSuccessStatus(res: NombaVerifyResponseShape): boolean {
  if (res.code !== '00') return false
  const status = res.data?.status
  if (status && status.toUpperCase() === 'SUCCESS') return true
  if (res.data?.success === true) return true
  return false
}

function isExplicitFailure(res: NombaVerifyResponseShape): boolean {
  if (res.code !== '00') return false // non-00 codes are treated as unreachable, not "failure"
  const status = res.data?.status?.toUpperCase()
  if (status === 'FAILED' || status === 'FAILURE' || status === 'REJECTED') return true
  if (res.data?.success === false) return true
  return false
}

function extractTransactionId(res: NombaVerifyResponseShape): string | null {
  return res.data?.transactionId ?? res.data?.id ?? null
}

export async function verifyNombaTransaction(orderRef: string): Promise<NombaTxVerification> {
  // Primary — docs-recommended endpoint per audit finding #2
  try {
    const res = await nombaRequest<NombaVerifyResponseShape>(
      `/v1/transactions/accounts/single?orderReference=${encodeURIComponent(orderRef)}`,
      'GET'
    )

    if (isSuccessStatus(res)) {
      return {
        cleared: true,
        reachable: true,
        transactionId: extractTransactionId(res),
        reason: 'primary_success',
      }
    }
    if (isExplicitFailure(res)) {
      return { cleared: false, reachable: true, transactionId: null, reason: 'primary_failure' }
    }
    // Ambiguous — fall through to fallback endpoint
  } catch {
    // Fall through — Nomba often returns 404 on this endpoint for hackathon sub-accounts
  }

  // Fallback — /v1/checkout/order/<ref> (hackathon-friendlier for archived orders)
  try {
    const res = await nombaRequest<NombaVerifyResponseShape>(
      `/v1/checkout/order/${encodeURIComponent(orderRef)}`,
      'GET'
    )

    if (isSuccessStatus(res)) {
      return {
        cleared: true,
        reachable: true,
        transactionId: extractTransactionId(res),
        reason: 'fallback_success',
      }
    }
    if (isExplicitFailure(res)) {
      return { cleared: false, reachable: true, transactionId: null, reason: 'fallback_failure' }
    }
    return { cleared: false, reachable: false, transactionId: null, reason: `fallback_code=${res.code ?? 'unknown'}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // Nomba returns 400 "already completed" for archived successful transactions.
    // That's a positive signal for us — the payment succeeded, they just archived it.
    if (msg.includes('already completed')) {
      return { cleared: true, reachable: true, transactionId: null, reason: 'already_completed' }
    }

    return { cleared: false, reachable: false, transactionId: null, reason: msg.slice(0, 200) }
  }
}
