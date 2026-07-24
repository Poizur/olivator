import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'olivator_admin'
const COOKIE_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000

// ── MAINTENANCE MODE ───────────────────────────────────────────────────────
// Nastavit MAINTENANCE_MODE=true na Railway → 503 pro všechny stránky kromě
// /admin/* a /api/health. Reverze: nastavit na false nebo smazat proměnnou.

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Olivátor — plánovaná údržba</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f5f5f7;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f;padding:24px;text-align:center}
.card{background:#fff;border-radius:16px;padding:48px 40px;max-width:460px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.logo{font-size:22px;font-weight:700;color:#2d6a4f;letter-spacing:-.02em;margin-bottom:32px}
.icon{font-size:48px;margin-bottom:20px}
h1{font-size:22px;font-weight:600;line-height:1.3;margin-bottom:12px;color:#1d1d1f}
p{font-size:15px;color:#6e6e73;line-height:1.6;margin-bottom:8px}
.contact{margin-top:28px;padding-top:24px;border-top:1px solid #e8e8ed;font-size:13px;color:#aeaeb2}
.contact a{color:#2d6a4f;text-decoration:none}
.contact a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="card">
  <div class="logo">olivátor.cz</div>
  <div class="icon">🔧</div>
  <h1>Probíhá plánovaná údržba</h1>
  <p>Vrátíme se co nejdřív — obvykle do několika hodin.</p>
  <p>Děkujeme za trpělivost.</p>
  <div class="contact">
    Dotazy: <a href="mailto:info@makyoutdoors.com">info@makyoutdoors.com</a>
  </div>
</div>
</body>
</html>`

function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/api/health' ||
    pathname.startsWith('/api/admin')
  )
}

// Module-level cache — persists across requests on Railway's Node.js server.
// Edge Runtime isolation note: on Railway (persistent server, not serverless),
// module state IS shared between requests, so 30s TTL works as intended.
let _maintenanceCache: { value: boolean; ts: number } | null = null

async function isMaintenanceActive(): Promise<boolean> {
  // env var override always wins (Railway-level emergency lockdown)
  if (process.env.MAINTENANCE_MODE === 'true') return true

  const now = Date.now()
  if (_maintenanceCache && now - _maintenanceCache.ts < 30_000) {
    return _maintenanceCache.value
  }

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/app_settings?key=eq.maintenance_mode&select=value`
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY ?? ''}`,
      },
      cache: 'no-store',
    })
    const rows = (await res.json()) as Array<{ value: unknown }>
    const value = rows?.[0]?.value === true
    _maintenanceCache = { value, ts: now }
    return value
  } catch {
    // If DB unreachable, default to NOT maintenance (fail open for availability)
    _maintenanceCache = { value: false, ts: now }
    return false
  }
}

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

  // Maintenance mode — env var NEBO DB flag → 503 pro veřejnost
  if (!isMaintenanceExempt(pathname) && await isMaintenanceActive()) {
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '86400',
        'Cache-Control': 'no-store',
      },
    })
  }

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

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // No-cache pro /admin a /api/admin — admin data se mění rychle (drafty,
  // discovery, learnings, retailery), browser cache způsobuje rozdíl mezi
  // zařízeními. force-dynamic na server zaručí čerstvý server response,
  // ale browser/CDN by stále cache hold. Tyhle headers to vypnou.
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

export const config = {
  // Match all pages except static assets — middleware sets x-pathname header
  // so AdminBar (rendered in root layout) can know which page we're on.
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.(?:webp|jpg|jpeg|png|svg|ico|json|js|css)$).*)'],
}
