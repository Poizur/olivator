// Aktivace weekly digest + ověření stavu

import { supabaseAdmin } from '@/lib/supabase'
import { setSetting, getSetting } from '@/lib/settings'

async function main() {
  console.log('=== Aktivace newsletter ===\n')

  // 1) Zapni weekly digest
  await setSetting('newsletter_weekly_enabled', true)
  const enabled = await getSetting<boolean>('newsletter_weekly_enabled')
  console.log(`newsletter_weekly_enabled: ${enabled ? '✓ true' : '✗ false'}`)

  // 2) Ověř stav subscribers
  const { data: subs, count } = await supabaseAdmin
    .from('newsletter_signups')
    .select('email, preferences, created_at', { count: 'exact' })
    .eq('confirmed', true)
    .eq('unsubscribed', false)
  console.log(`\nAktivní subscribers: ${count ?? 0}`)
  if (subs) {
    for (const s of subs) {
      console.log(`  ${s.email} — prefs: ${JSON.stringify(s.preferences)}`)
    }
  }

  // 3) Ověř stav drafts
  const { data: drafts } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('id, subject, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3)
  console.log('\nPosledních 3 drafty:')
  for (const d of drafts ?? []) {
    console.log(`  [${d.status}] ${d.subject}`)
  }

  // 4) Ověř welcome_series_queue
  const { data: wq, count: wqCount } = await supabaseAdmin
    .from('welcome_series_queue')
    .select('*', { count: 'exact' })
    .eq('sent', false)
  console.log(`\nWelcome queue (pending): ${wqCount ?? 0}`)

  // 5) Ověř seasonal_emails seed
  const { data: seasonal, count: seasonalCount } = await supabaseAdmin
    .from('seasonal_emails')
    .select('email_key, send_month, send_day, is_active', { count: 'exact' })
  console.log(`Sezónní emaily (seed): ${seasonalCount ?? 0}`)
  for (const s of seasonal ?? []) {
    console.log(`  ${s.email_key} — ${s.send_day}.${s.send_month} [${s.is_active ? 'active' : 'disabled'}]`)
  }

  console.log('\n✓ Aktivace dokončena')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
