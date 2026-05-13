import { createClient } from '@supabase/supabase-js'

// Control chars 0x00–0x08, 0x0B, 0x0C, 0x0E–0x1F, 0x7F (excludes \t \n \r).
// PostgreSQL occasionally stores literal control bytes in text fields from scraped HTML.
// These make JSON.parse throw "Bad control character" during Next.js prerender,
// failing the entire build. Sanitize at HTTP response level before SDK parses JSON.
const CTRL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

async function sanitizingFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  // Only sanitize JSON responses from PostgREST (content-type: application/json)
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) return res
  const text = await res.text()
  const sanitized = CTRL_RE.test(text) ? text.replace(CTRL_RE, '') : text
  return new Response(sanitized, { status: res.status, statusText: res.statusText, headers: res.headers })
}

// Server-side singleton — used in API routes, scrapers, admin
// Uses SUPABASE_SERVICE_KEY which bypasses RLS
// NEVER import this from client components
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: sanitizingFetch },
  }
)

// Client-safe singleton — uses publishable (anon) key
// Respects RLS policies
// Safe to use in client components
let _browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowser() {
  if (!_browserClient) {
    _browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
      }
    )
  }
  return _browserClient
}
