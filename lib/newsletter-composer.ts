// Newsletter composer — sestaví draft z bloků.
//
// Vstup: campaign_type (weekly | deals | harvest | alert)
// Výstup: { subject, preheader, html_body, text_body, blocks } → uložit do DB
//
// Pro weekly: vyber data z block generators, vyrender React Email template
// → HTML, AI generuje subject + preheader + intro hook.

import { render } from '@react-email/render'
import { callClaude, extractText } from './anthropic'
import { supabaseAdmin } from './supabase'
import {
  pickOilOfTheWeek,
  pickDeals,
  pickNewArrival,
  pickFact,
  pickRecipe,
  getNewsletterStats,
  type OilCardData,
  type DealData,
  type FactData,
  type RecipeData,
} from './newsletter-blocks'
import { WeeklyEmail } from '../emails/weekly'
import React from 'react'

export interface ComposedDraft {
  subject: string
  preheader: string
  hook: string
  htmlBody: string
  textBody: string
  blocks: WeeklyBlocks
}

export interface WeeklyBlocks {
  oilOfWeek: OilCardData | null
  deals: DealData[]
  newArrival: OilCardData | null
  recipe: RecipeData | null
  fact: FactData | null
}

// ── Hook generation via Claude ─────────────────────────────────────────────
async function generateHook(stats: {
  recentDrops: number
  recentNew: number
  totalProducts: number
  oilOfWeekName: string | null
}): Promise<{ subject: string; preheader: string; hook: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback bez AI
    return {
      subject:
        stats.recentDrops > 0
          ? `📉 ${stats.recentDrops} olejů na minimu za 90 dní`
          : '🫒 Tento týden v Olivátoru',
      preheader: 'Olej týdne, slevy, recept, novinka',
      hook: stats.oilOfWeekName
        ? `Tento týden mě zaujal ${stats.oilOfWeekName}.`
        : 'Tento týden máme pár zajímavých novinek.',
    }
  }

  const prompt = `Jsi editor newsletteru Olivátor.cz pro fanoušky olivového oleje.
Napiš mi 3 věci pro tento týdenní email:

DATA TENTO TÝDEN:
- Detekováno ${stats.recentDrops} významných slev (10 %+ pokles)
- ${stats.recentNew} nových olejů v katalogu
- Celkem ${stats.totalProducts} olejů v katalogu
- Olej týdne: ${stats.oilOfWeekName ?? '—'}

VYTVOŘ:
1. SUBJECT (max 50 znaků, lákavý, konkrétní data hook, povolené emoji 1):
2. PREHEADER (max 90 znaků, doplnění subject, smysluplné):
3. HOOK (1-2 věty, italics styl, jako úvod článku, ne salesy):

Tón: chytrý kamarád sommelier (Wirecutter + Wine Folly). Žádné "objevte!", "neuvěříte!". Faktická, konkrétní, lehce literární čeština.

Vrať jako čistý JSON (žádný markdown):
{"subject": "...", "preheader": "...", "hook": "..."}`

  try {
    const response = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = extractText(response).trim()
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    const json = firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text
    const parsed = JSON.parse(json) as {
      subject?: string
      preheader?: string
      hook?: string
    }
    // Strip markdown markers (asterisks pro italic, underscores) — HeroHook
    // už aplikuje italic přes CSS, doublete je nežádoucí.
    const cleanHook = (parsed.hook ?? '')
      .replace(/^[*_\s]+|[*_\s]+$/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .trim()
    const cleanSubject = (parsed.subject ?? '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim()
    const cleanPreheader = (parsed.preheader ?? '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim()

    return {
      subject: cleanSubject.slice(0, 100) || `Olivový týden — ${new Date().toLocaleDateString('cs-CZ')}`,
      preheader: cleanPreheader.slice(0, 200) || 'Olej týdne, slevy, recept, novinka',
      hook: cleanHook.slice(0, 300) || 'Tento týden máme pár zajímavých novinek.',
    }
  } catch (err) {
    console.error('[composer] hook generation failed:', err)
    return {
      subject: `Olivový týden — ${new Date().toLocaleDateString('cs-CZ')}`,
      preheader: 'Olej týdne, slevy, recept, novinka',
      hook: 'Tento týden máme pár zajímavých novinek.',
    }
  }
}

// ── Weekly composer ────────────────────────────────────────────────────────

export async function composeWeeklyDraft(): Promise<ComposedDraft> {
  // 1. Stats pro hook
  const stats = await getNewsletterStats()

  // 2. Pick blocks (parallel)
  // Deals threshold 5 % — pro malou DB s krátkou price history. Až bude
  // dostatek dat, nastav vyšší (10-15 %) v admin/newsletter/settings.
  const [oilOfWeek, deals, newArrival, recipe, fact] = await Promise.all([
    pickOilOfTheWeek(),
    pickDeals(5, 5),
    pickNewArrival(),
    pickRecipe(),
    pickFact(),
  ])

  // Vyhneme se duplikaci: pokud oil of week má drop, neukazujeme ho znovu v deals
  const filteredDeals = oilOfWeek
    ? deals.filter((d) => d.productId !== oilOfWeek.productId)
    : deals

  const blocks: WeeklyBlocks = {
    oilOfWeek,
    deals: filteredDeals.slice(0, 5),
    newArrival: newArrival && newArrival.productId !== oilOfWeek?.productId ? newArrival : null,
    recipe,
    fact,
  }

  // 3. AI generuje subject + preheader + hook
  const { subject, preheader, hook } = await generateHook({
    recentDrops: stats.recentDrops,
    recentNew: stats.recentNew,
    totalProducts: stats.totalProducts,
    oilOfWeekName: oilOfWeek?.name ?? null,
  })

  // 4. Render React Email → HTML + plaintext
  const element = React.createElement(WeeklyEmail, {
    preheader,
    hook,
    blocks,
    unsubscribeUrl: '{{UNSUBSCRIBE_URL}}', // placeholder, nahrazuje se per recipient v sender
  })

  const htmlBody = await render(element)
  const textBody = await render(element, { plainText: true })

  return {
    subject,
    preheader,
    hook,
    htmlBody,
    textBody,
    blocks,
  }
}

// ── Save to DB jako pending draft ──────────────────────────────────────────

export async function saveDraftToDb(
  campaignType: 'weekly' | 'deals' | 'harvest' | 'alert',
  composed: ComposedDraft
): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from('newsletter_drafts')
    .insert({
      campaign_type: campaignType,
      subject: composed.subject,
      preheader: composed.preheader,
      html_body: composed.htmlBody,
      text_body: composed.textBody,
      blocks: composed.blocks as unknown,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: data.id as string }
}

// ── Convenience: generate + save weekly draft v jednom kroku ───────────────

export async function generateWeeklyDraft(): Promise<{
  id: string
  subject: string
}> {
  const composed = await composeWeeklyDraft()
  const { id } = await saveDraftToDb('weekly', composed)
  return { id, subject: composed.subject }
}
