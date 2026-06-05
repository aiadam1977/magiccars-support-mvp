/**
 * MagicCars — session auth helpers
 *
 * Uses HMAC-SHA256 signed tokens stored in an httpOnly cookie.
 * Works on both the Node.js (API routes) and Edge (middleware) runtimes
 * because it relies only on the Web Crypto API.
 *
 * Set these env vars in Vercel / .env.local to override the defaults:
 *   ADMIN_EMAIL     — dashboard login email
 *   ADMIN_PASSWORD  — dashboard login password
 *   SESSION_SECRET  — secret used to sign session tokens (change in production)
 */

const COOKIE_NAME = 'mc_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export { COOKIE_NAME }

// ─── Credentials ─────────────────────────────────────────────────────────────

/**
 * Master admin account — always available regardless of the users KV table.
 * Set ADMIN_EMAIL / ADMIN_PASSWORD env vars to override the defaults.
 */
export function getAdminCredentials() {
  return {
    email:    process.env.ADMIN_EMAIL    ?? 'info@mymagiccars.com',
    password: process.env.ADMIN_PASSWORD ?? 'Tuna2026',
    name:     'Admin',
    role:     'admin' as const,
  }
}

// ─── Token helpers ────────────────────────────────────────────────────────────

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET ?? 'mc-session-secret-change-in-production'
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function createSessionToken(email: string): Promise<string> {
  const payload = `${email}:${Date.now()}:${crypto.randomUUID()}`
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${btoa(payload)}.${toBase64(sig)}`
}

/**
 * Returns the email address if the token is valid and unexpired, otherwise null.
 */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const encodedPayload = token.slice(0, dot)
    const sig            = token.slice(dot + 1)

    const payload = atob(encodedPayload)
    const key     = await getKey()
    const expectedSig = await crypto.subtle.sign(
      'HMAC', key, new TextEncoder().encode(payload)
    )

    if (sig !== toBase64(expectedSig)) return null

    const [email, timestampStr] = payload.split(':')
    if (!email || !timestampStr) return null
    if (Date.now() - parseInt(timestampStr) > SESSION_TTL_MS) return null

    return email
  } catch {
    return null
  }
}
