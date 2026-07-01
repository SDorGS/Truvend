const BASE_URL = process.env.NOMBA_BASE_URL!
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID!

// Exported so individual services can place it in exactly the right field per endpoint.
// Checkout: inside order.accountId. VA (sub-account path): URL param. Don't inject globally.
export const SUB_ACCOUNT_ID = process.env.NOMBA_SUB_ACCOUNT_ID!
const CLIENT_ID = process.env.NOMBA_CLIENT_ID!
const CLIENT_SECRET = process.env.NOMBA_CLIENT_SECRET!

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

  const res = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    accountId: ACCOUNT_ID,          // ← add this
  },
  body: JSON.stringify({
    grantType: 'client_credentials',
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
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

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      accountId: ACCOUNT_ID,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Nomba API error ${res.status} on ${path}: ${text}`)
  }

  return res.json() as Promise<T>
}
