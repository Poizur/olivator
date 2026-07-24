/**
 * BLOK 4: Otevření webu
 * - maintenance_mode → false
 * - emails_paused → false
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { error: e1 } = await supabase
    .from('app_settings')
    .update({ value: false, updated_at: new Date().toISOString() })
    .eq('key', 'maintenance_mode')

  const { error: e2 } = await supabase
    .from('app_settings')
    .update({ value: false, updated_at: new Date().toISOString() })
    .eq('key', 'emails_paused')

  if (e1) { console.error('maintenance_mode chyba:', e1.message); process.exit(1) }
  if (e2) { console.error('emails_paused chyba:', e2.message); process.exit(1) }

  console.log('✅ maintenance_mode = false')
  console.log('✅ emails_paused = false')
}

main().catch((e) => { console.error(e); process.exit(1) })
