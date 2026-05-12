// Cron: denně 9:00 UTC — kontroluje seasonal_emails kde send_month+send_day = dnes.
// Pošle na subscribers s odpovídající preferencí, update last_sent_year.
// AI intro generuje Claude Haiku + validateCzechStyle (retry 2×).

import { render } from '@react-email/render'
import React from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { sendDraft } from '@/lib/newsletter-sender'
import { saveDraftToDb } from '@/lib/newsletter-composer'
import { SeasonalEmail, SEASONAL_CONTENT } from '@/emails/seasonal-template'
import { validateCzechStyle } from '@/lib/czech-style'
import { callClaude, extractText } from '@/lib/anthropic'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 300

async function generateIntro(emailKey: string, subject: string): Promise<string> {
  const prompt = `Napiš 2 věty úvodu pro newsletter email olivator.cz.
Téma: "${subject}"
Email ID: ${emailKey}

Požadavky:
- Perspektiva redakce (my, nás) — NE "já bych"
- Faktické, žádné chvalozpěvy ("prémiový", "výjimečný")
- Přirozená čeština, aktivní hlas
- Max 60 slov celkem
Vrať jen ty 2 věty, žádný markdown.`

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callClaude({ model: MODEL, max_tokens: MAX_TOKENS, messages: [{ role: 'user', content: prompt }] })
    const text = extractText(res).trim()
    const issues = validateCzechStyle(text)
    const critical = issues.filter(i => i.severity === 'error')
    if (critical.length === 0) return text
    console.warn(`[seasonal] intro attempt ${attempt + 1} had ${critical.length} style issues, retrying`)
  }

  // Fallback po 2 neúspěšných pokusech
  console.error(`[seasonal] intro generation failed for ${emailKey} — using fallback`)
  return 'Tento týden přinášíme pravidelný sezónní přehled z olivátoru. Přejeme příjemné čtení.'
}

async function main() {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()

  console.log(`[seasonal-dispatcher] ${now.toISOString()} — hledám emaily pro ${day}.${month}.`)

  const { data: scheduled } = await supabaseAdmin
    .from('seasonal_emails')
    .select('*')
    .eq('send_month', month)
    .eq('send_day', day)
    .eq('is_active', true)

  if (!scheduled || scheduled.length === 0) {
    console.log('[seasonal-dispatcher] žádné emaily dnes')
    return
  }

  for (const email of scheduled) {
    if ((email.last_sent_year as number | null) === year) {
      console.log(`[seasonal-dispatcher] ${email.email_key} — přeskočeno (letos již odesláno)`)
      continue
    }

    const content = SEASONAL_CONTENT[email.template_name as string]
    if (!content) {
      console.error(`[seasonal-dispatcher] neznámý template: ${email.template_name}`)
      continue
    }

    console.log(`[seasonal-dispatcher] generuji intro pro ${email.email_key}…`)
    const intro = await generateIntro(email.email_key as string, email.subject_template as string)

    // Načti subscribers s odpovídající preferencí
    let subscriberQuery = supabaseAdmin
      .from('newsletter_signups')
      .select('email, unsubscribe_token')
      .eq('confirmed', true)
      .eq('unsubscribed', false)

    const requiredPref = email.required_preference as string | null
    if (requiredPref) {
      subscriberQuery = subscriberQuery.filter(`preferences->>${requiredPref}`, 'eq', 'true')
    }

    const { data: subscribers } = await subscriberQuery

    if (!subscribers || subscribers.length === 0) {
      console.log(`[seasonal-dispatcher] ${email.email_key} — žádní subscribers`)
      continue
    }

    // Vykreslení HTML (jedno pro všechny — unsubToken je per-subscriber, ale
    // pro sezónní email použijeme placeholder a nahradíme per send)
    const draftHtml = await render(
      React.createElement(SeasonalEmail, {
        unsubscribeUrl: '{{UNSUBSCRIBE_URL}}',
        subject: email.subject_template as string,
        preheader: content.preheader,
        intro,
        sections: content.sections,
        footerNote: content.footerNote,
      })
    )
    const draftText = await render(
      React.createElement(SeasonalEmail, {
        unsubscribeUrl: '{{UNSUBSCRIBE_URL}}',
        subject: email.subject_template as string,
        preheader: content.preheader,
        intro,
        sections: content.sections,
        footerNote: content.footerNote,
      }),
      { plainText: true }
    )

    // Ulož draft do DB a pošli
    const { id: draftId } = await saveDraftToDb('seasonal', {
      subject: email.subject_template as string,
      preheader: content.preheader,
      hook: intro,
      html: draftHtml,
      text: draftText,
      blocks: {},
    })

    const result = await sendDraft(draftId)
    if (result.ok) {
      console.log(`[seasonal-dispatcher] ${email.email_key} — odesláno ${result.sentCount} subscribers`)
      await supabaseAdmin
        .from('seasonal_emails')
        .update({ last_sent_year: year })
        .eq('id', email.id)
    } else {
      console.error(`[seasonal-dispatcher] ${email.email_key} — send failed: ${result.error}`)
    }
  }

  console.log('[seasonal-dispatcher] done')
}

main().catch(err => {
  console.error('[seasonal-dispatcher] FATAL:', err)
  process.exit(1)
})
