import { createClient } from '@supabase/supabase-js'

// Server-side singleton — used in API routes, scrapers, admin
// Uses SUPABASE_SERVICE_KEY which bypasses RLS
// NEVER import this from client components
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
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
