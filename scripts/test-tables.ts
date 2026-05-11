import { supabaseAdmin } from '@/lib/supabase'
async function main() {
  for (const t of ['authors', 'glossary_terms']) {
    const r = await supabaseAdmin.from(t).select('*').limit(1)
    console.log(t, '— error:', r.error?.message ?? 'none', '— data:', r.data)
  }
}
main().catch(console.error)
