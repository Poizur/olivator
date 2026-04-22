// Admin authentication helpers.
// Uses httpOnly cookie with HMAC signature to avoid needing a session store.

import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'olivator_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_SECRET_KEY missing or too short (min 16 chars)')
  }
  return secret
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/** Called after successful login — mints a signed cookie. */
export async function createAdminSession() {
  const secret = getSecret()
  const issued = Date.now().toString()
  const signature = sign(issued, secret)
  const value = `${issued}.${signature}`

  const store = await cookies()
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function clearAdminSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** Returns true if the request has a valid admin cookie. */
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const secret = getSecret()
    const store = await cookies()
    const cookie = store.get(COOKIE_NAME)
    if (!cookie) return false
    const [issued, signature] = cookie.value.split('.')
    if (!issued || !signature) return false
    const expected = sign(issued, secret)
    if (!safeEqual(signature, expected)) return false
    const age = Date.now() - Number(issued)
    if (isNaN(age) || age < 0 || age > COOKIE_MAX_AGE * 1000) return false
    return true
  } catch {
    return false
  }
}

/** Check credentials: password from form vs ADMIN_SECRET_KEY. */
export function verifyPassword(password: string): boolean {
  try {
    const secret = getSecret()
    if (password.length !== secret.length) return false
    return timingSafeEqual(Buffer.from(password), Buffer.from(secret))
  } catch {
    return false
  }
}
