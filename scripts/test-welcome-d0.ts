/**
 * Test welcome D0 email
 * Run: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/test-welcome-d0.ts
 */
import { render } from '@react-email/render'
import React from 'react'
import { getWelcomeDeals } from '@/lib/welcome-series'
import { WelcomeD0DealsEmail } from '@/emails/welcome-d0-deals'

const TEST_EMAIL = 'italienasbavi@gmail.com'

async function main() {
  console.log('Fetching welcome deals...')
  const { deals, topPickIndex, topPickReason, mode } = await getWelcomeDeals()
  console.log(`Found ${deals.length} deals, top pick index: ${topPickIndex}`)
  deals.forEach((d, i) =>
    console.log(`  [${i}] ${d.name} — ${d.currentPrice} Kč ${d.dropPct ? '-' + d.dropPct + '%' : '(no deal)'} @ ${d.retailerName}`)
  )
  console.log('Top pick reason:', topPickReason)

  const props = {
    unsubscribeUrl: 'https://olivator.cz/api/newsletter/unsubscribe?token=test',
    deals,
    topPickIndex,
    topPickReason,
    mode,
  }
  const html = await render(React.createElement(WelcomeD0DealsEmail, props))
  const text = await render(React.createElement(WelcomeD0DealsEmail, props), { plainText: true })

  const productionSubject = mode === 'deals'
    ? 'Olíkův první pozdrav — a co se zrovna slevuje'
    : 'Olíkův první pozdrav — tři tipy z katalogu'

  const RESEND_API_KEY = process.env.RESEND_API_KEY!
  console.log(`\nSending to ${TEST_EMAIL} (mode=${mode})...`)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'olivátor <info@redakce.olivator.cz>',
      to: [TEST_EMAIL],
      subject: `[TEST] ${productionSubject}`,
      html,
      text,
    }),
  })

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
  if (res.ok) {
    console.log('✓ Odesláno! Message ID:', data.id)
  } else {
    console.error('✗ Failed:', data)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
