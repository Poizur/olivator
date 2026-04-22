import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'olivator_admin'
const COOKIE_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

function isValidSession(cookieValue: string | undefined, secret: string): boolean {
  if (!cookieValue) return false
  const [issued, signature] = cookieValue.split('.')
  if (!issued || !signature) return false
  const expected = createHmac('sha256', secret).update(issued).digest('base64url')
  if (!safeEqual(signature, expected)) return false
  const age = Date.now() - Number(issued)
  return !isNaN(age) && age >= 0 && age <= COOKIE_MAX_AGE_MS
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only gate /admin/* — but NOT /admin/login or /api/admin/login
  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next()
  }

  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) {
    return new NextResponse('ADMIN_SECRET_KEY not configured', { status: 500 })
  }

  const cookie = request.cookies.get(COOKIE_NAME)
  if (!isValidSession(cookie?.value, secret)) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
