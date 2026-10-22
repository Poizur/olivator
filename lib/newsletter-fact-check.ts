// Deterministický fact-check draftu newsletteru. Automatické odeslání projde jen s prázdným seznamem problémů.

import { supabaseAdmin } from './supabase'
import { findQuarantinedRetailerLinks } from './newsletter-reviewer'
import { draftProductIds, familiesOf, recentlySentFamilies } from './newsletter-dedupe'

export interface FactCheckDraft {
  id: string
  html_body: string | null
  text_body: string | null
  blocks: Record<string, unknown> | null
}

const REQUIRED_FOOTER = ['Maky Outdoors s.r.o.', 'Brno', 'info@makyoutdoors.com']

function plainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

export async function factCheckDraft(draft: FactCheckDraft): Promise<string[]> {
  const issues: string[] = []
  const html = draft.html_body ?? ''
  const body = `${html}\n${draft.text_body ?? ''}`
  const text = plainText(html)

  const quarantined = await findQuarantinedRetailerLinks({ blocks: draft.blocks, body })
  if (quarantined.length > 0) issues.push(`odkazy na obchody mimo spolupráci: ${quarantined.join(', ')}`)

  if (/\/admin\b/.test(body)) issues.push('odkaz do /admin (odběratel ho nesmí dostat)')
  for (const part of REQUIRED_FOOTER) {
    if (!text.includes(part)) issues.push(`patička: chybí „${part}“`)
  }
  if (/Praha/.test(text)) issues.push('patička/text: „Praha“ (sídlo je Brno)')

  const { count: activeRetailers } = await supabaseAdmin
    .from('retailers')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
  for (const m of text.matchAll(/(\d+)\s+(prodejc\w*|obchod\w*)/gi)) {
    if (Number(m[1]) !== activeRetailers) issues.push(`počet: „${m[0]}“, v DB je ${activeRetailers ?? '?'} aktivních obchodů`)
  }
  const deals = ((draft.blocks?.deals ?? []) as unknown[]).length
  for (const m of text.matchAll(/(\d+)\s+olej\w*\s+s\s+(?:reálným|ověřeným)\s+poklesem/gi)) {
    if (Number(m[1]) !== deals) issues.push(`počet: „${m[0]}“, v draftu je ${deals} slev`)
  }

  const families = await familiesOf(draftProductIds(draft.blocks))
  const recent = await recentlySentFamilies(draft.id)
  const repeated = [...families.values()].filter((f) => recent.has(f))
  if (repeated.length > 0) issues.push(`stejný olej odeslán v posledních 30 dnech: ${[...new Set(repeated)].join('; ')}`)

  return issues
}
