// E2E test welcome série: signup → welcome 1 → +2d → welcome 2 → +5d → welcome 3 → cleanup
// Spuštění: npx tsx --env-file=.env.local scripts/test-welcome-e2e.ts

import { supabaseAdmin } from '@/lib/supabase'
import { enqueueWelcomeSeries } from '@/lib/welcome-series'
import { dispatchWelcomeQueue } from '@/lib/welcome-series'
import { sendTestEmail } from '@/lib/newsletter-sender'
import { render } from '@react-email/render'
import React from 'react'
import { Welcome2MethodologyEmail } from '@/emails/welcome-2-methodology'
import crypto from 'crypto'

const TEST_EMAIL = 'test-welcome@olivator.cz'

async function cleanup() {
  const { data: sub } = await supabaseAdmin
    .from('newsletter_signups')
    .select('id')
    .eq('email', TEST_EMAIL)
    .maybeSingle()

  if (sub?.id) {
    await supabaseAdmin.from('welcome_series_queue').delete().eq('subscriber_id', sub.id)
    await supabaseAdmin.from('newsletter_signups').delete().eq('id', sub.id)
    console.log('  cleanup: subscriber + queue smazány')
  }
}

async function main() {
  console.log('=== Welcome série E2E test ===\n')

  // 0. Cleanup předchozích testů
  await cleanup()

  // 1. Signup (welcome 1 — okamžitý email)
  console.log('Krok 1: Signup + welcome 1')
  const unsubToken = crypto.randomUUID()
  const { data: sub, error: insertErr } = await supabaseAdmin
    .from('newsletter_signups')
    .insert({
      email: TEST_EMAIL,
      source: 'test',
      confirmed: true,
      unsubscribed: false,
      unsubscribe_token: unsubToken,
      preferences: { weekly: true, deals: true, harvest: false, alerts: false },
    })
    .select('id')
    .single()

  if (insertErr || !sub) {
    console.error('  FAIL: insert subscriber:', insertErr?.message ?? 'no data')
    process.exit(1)
  }
  console.log(`  subscriber ID: ${sub.id}`)

  // Pošli welcome 1 přímo
  const unsubUrl = `https://olivator.cz/api/newsletter/unsubscribe?token=${unsubToken}`
  const html1 = await render(React.createElement(Welcome2MethodologyEmail, { unsubscribeUrl: unsubUrl }))
  const text1 = await render(React.createElement(Welcome2MethodologyEmail, { unsubscribeUrl: unsubUrl }), { plainText: true })
  const r1 = await sendTestEmail({ to: TEST_EMAIL, subject: '[TEST] Vítej v Olivatoru!', html: html1, text: text1 })
  console.log(`  welcome 1 send: ${r1.ok ? '✓ odesláno' : `✗ ${r1.error}`}`)

  // 2. Enqueue welcome 2 a 3
  await enqueueWelcomeSeries(sub.id)
  console.log('  welcome 2 a 3 zařazeny do fronty')

  // 3. Welcome 2 — posuň scheduled_for do minulosti
  console.log('\nKrok 2: Welcome 2 (posunuto do minulosti)')
  await supabaseAdmin
    .from('welcome_series_queue')
    .update({ scheduled_for: new Date(Date.now() - 1000).toISOString() })
    .eq('subscriber_id', sub.id)
    .eq('email_number', 2)

  const r2 = await dispatchWelcomeQueue()
  console.log(`  dispatcher: sent=${r2.sent}, failed=${r2.failed}`)
  if (r2.sent === 0) console.warn('  ⚠ welcome 2 nebyl odeslán — zkontroluj logy výše')

  // 4. Welcome 3 — posuň scheduled_for do minulosti
  console.log('\nKrok 3: Welcome 3 (posunuto do minulosti)')
  await supabaseAdmin
    .from('welcome_series_queue')
    .update({ scheduled_for: new Date(Date.now() - 1000).toISOString() })
    .eq('subscriber_id', sub.id)
    .eq('email_number', 3)

  const r3 = await dispatchWelcomeQueue()
  console.log(`  dispatcher: sent=${r3.sent}, failed=${r3.failed}`)
  if (r3.sent === 0) console.warn('  ⚠ welcome 3 nebyl odeslán — zkontroluj logy výše')

  // 5. Cleanup
  console.log('\nKrok 4: Cleanup')
  await cleanup()

  console.log('\n✓ E2E test hotov')
  console.log('  Zkontroluj schránku test-welcome@olivator.cz na 3 emaily.')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
