// Newsletter-specifický AI reviewer.
// Volá base runner (lib/ai-reviewer.ts) s promptem obsahujícím 5 pravidel.
//
// Pravidla (Fáze 1):
//   TOP_PRODUCT_REPEAT — stejný slug jako olej týdne v 2+ z posledních 4
//   CULTIVAR_REPEAT    — stejná odrůda jako olej týdne v 3+ z posledních 4
//   SUBJECT_FORMULA    — subject zapadá do formule 3+ z posledních 5
//   DEALS_REPEAT       — stejný produkt v deals 2+ z posledních 5
//   DEALS_EMPTY        — deals blok prázdný (0 produktů) → INFO

import { supabaseAdmin } from './supabase'
import { runReview, type ReviewResult } from './ai-reviewer'

interface DraftRow {
  id: string
  subject: string
  generated_at: string
  blocks: Record<string, unknown>
}

interface DraftMeta {
  subject: string
  date: string
  oilName: string
  oilSlug: string
  dealNames: string[]
}

function extractMeta(draft: DraftRow): DraftMeta {
  const b = (draft.blocks ?? {}) as Record<string, unknown>
  const oil = (b.oilOfWeek ?? null) as { name?: string; slug?: string } | null
  const deals = ((b.deals ?? []) as Array<{ name?: string }>)
  return {
    subject: draft.subject ?? '',
    date: (draft.generated_at ?? '').slice(0, 10),
    oilName: oil?.name ?? '—',
    oilSlug: oil?.slug ?? '—',
    dealNames: deals.map(d => d.name ?? '').filter(Boolean),
  }
}

function buildPrompt(current: DraftMeta, history: DraftMeta[]): string {
  const histLines = history
    .map((h, i) => [
      `Vydání −${i + 1} (${h.date}):`,
      `  Předmět: "${h.subject}"`,
      `  Olej týdne: ${h.oilName} (slug: ${h.oilSlug})`,
      `  Deals: ${h.dealNames.length > 0 ? h.dealNames.join(', ') : '(prázdné)'}`,
    ].join('\n'))
    .join('\n\n')

  return `Jsi AI reviewer obsahu newsletteru Olivátor.cz (olivové oleje, ČR).
Zkontroluj nový draft newsletteru a odhal nežádoucí opakování nebo vzorce.

NOVÝ DRAFT (${current.date}):
  Předmět: "${current.subject}"
  Olej týdne: ${current.oilName} (slug: ${current.oilSlug})
  Deals: ${current.dealNames.length > 0 ? current.dealNames.join(', ') : '(prázdné)'}

POSLEDNÍCH ${history.length} VYDÁNÍ (od nejnovějšího k nejstaršímu):
${histLines}

PRAVIDLA — zkontroluj všechna, reportuj pouze ta která jsou porušena:

1. TOP_PRODUCT_REPEAT: stejný produkt (slug nebo velmi podobný název) jako olej týdne v 2 nebo více z posledních 4 vydání → severity: "warn"
2. CULTIVAR_REPEAT: stejná odrůda olivy (Picual, Koroneiki, Arbequina, Coratina, Manaki, atd.) jako olej týdne v 3 nebo více z posledních 4 vydání. Odrůdu detekuj ze slug nebo názvu → severity: "warn"
3. SUBJECT_FORMULA: předmět nového draftu zapadá do stejné textové formule jako 3 nebo více z posledních 5 vydání (typicky "[číslo] nových olejů." nebo "Picual [cokoliv]") → severity: "warn"
4. DEALS_REPEAT: stejný produkt (jméno nebo slug) v deals jako v 2 nebo více z posledních 5 vydání → severity: "warn"
5. DEALS_EMPTY: deals blok nového draftu je prázdný (0 produktů) → severity: "info"

Pokud pravidlo NENÍ porušeno, NEPŘIDÁVEJ ho do issues.
Pokud je vše v pořádku, vrať verdict: "ok" a issues: [].
verdict musí být "warn" pokud existuje alespoň 1 warn issue, jinak "ok" (nebo "info" není platný verdict — použij "ok").

Vrať POUZE čistý JSON (bez markdown kódu, bez komentářů):
{
  "verdict": "ok" | "warn",
  "issues": [
    { "rule": "CULTIVAR_REPEAT", "severity": "warn", "detail": "Picual jako olej týdne v 4 z posledních 4 vydání (06-10, 06-17, 06-24, 07-01)" }
  ],
  "summary": "1–2 věty česky pro admin email — co reviewer zjistil a co doporučuje zkontrolovat"
}`
}

export async function runNewsletterReview(draftId: string): Promise<ReviewResult> {
  // Fetch current draft + posledních 8 (celkem max 9)
  const { data: allDrafts } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('id, subject, generated_at, blocks')
    .in('status', ['sent', 'approved', 'draft'])
    .order('generated_at', { ascending: false })
    .limit(9)

  if (!allDrafts || allDrafts.length === 0) {
    return { verdict: 'ok', issues: [], summary: 'Žádná historická data k porovnání.' }
  }

  const currentRow = allDrafts.find(d => d.id === draftId) ?? allDrafts[0]
  const historyRows = allDrafts.filter(d => d.id !== draftId).slice(0, 8)

  const current = extractMeta(currentRow as DraftRow)
  const history = historyRows.map(d => extractMeta(d as DraftRow))

  const prompt = buildPrompt(current, history)
  return runReview({ agentName: 'newsletter-reviewer', prompt })
}

export async function patchDraftReviewerNotes(draftId: string, review: ReviewResult): Promise<void> {
  const { error } = await supabaseAdmin
    .from('newsletter_drafts')
    .update({
      reviewer_notes: review as unknown,
      reviewer_severity: review.verdict,
    })
    .eq('id', draftId)
  if (error) console.warn('[newsletter-reviewer] patchDraftReviewerNotes failed:', error)
}
