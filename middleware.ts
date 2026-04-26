import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'olivator_admin'
const COOKIE_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000

// Constant-time string compare (Web-Crypto compatible)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// HMAC-SHA256 using Web Crypto API → base64url
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
  // base64url encode
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function isValidSession(cookieValue: string | undefined, secret: string): Promise<boolean> {
  if (!cookieValue) return false
  const [issued, signature] = cookieValue.split('.')
  if (!issued || !signature) return false
  const expected = await hmacSign(issued, secret)
  if (!safeEqual(signature, expected)) return false
  const age = Date.now() - Number(issued)
  return !isNaN(age) && age >= 0 && age <= COOKIE_MAX_AGE_MS
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass pathname through a header so server components (incl. AdminBar in
  // root layout) can read it without prop drilling. Set on every request.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Admin route protection
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !pathname.startsWith('/api/admin/login')) {
    const secret = process.env.ADMIN_SECRET_KEY
    if (!secret) {
      return new NextResponse('ADMIN_SECRET_KEY not configured', { status: 500 })
    }
    const cookie = request.cookies.get(COOKIE_NAME)
    const valid = await isValidSession(cookie?.value, secret)
    if (!valid) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  // Match all pages except static assets — middleware sets x-pathname header
  // so AdminBar (rendered in root layout) can know which page we're on.
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.(?:webp|jpg|jpeg|png|svg|ico|json|js|css)$).*)'],
}
