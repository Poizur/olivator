// Admin authentication helpers.
// Uses httpOnly cookie with HMAC signature. Uses Web Crypto API so the
// signing format is identical to what middleware.ts verifies on Edge.

import { cookies } from 'next/headers'

const COOKIE_NAME = 'olivator_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days, seconds

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_SECRET_KEY missing or too short (min 16 chars)')
  }
  return secret
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function createAdminSession() {
  const secret = getSecret()
  const issued = Date.now().toString()
  const signature = await hmacSign(issued, secret)
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

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const secret = getSecret()
    const store = await cookies()
    const cookie = store.get(COOKIE_NAME)
    if (!cookie) return false
    const [issued, signature] = cookie.value.split('.')
    if (!issued || !signature) return false
    const expected = await hmacSign(issued, secret)
    if (!safeEqual(signature, expected)) return false
    const age = Date.now() - Number(issued)
    if (isNaN(age) || age < 0 || age > COOKIE_MAX_AGE * 1000) return false
    return true
  } catch {
    return false
  }
}

export function verifyPassword(password: string): boolean {
  try {
    const secret = getSecret()
    return safeEqual(password, secret)
  } catch {
    return false
  }
}
