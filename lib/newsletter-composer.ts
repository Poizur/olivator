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
import { getSetting, setSetting } from './settings'
import {
  pickOilOfTheWeek,
  pickTipProduct,
  pickDeals,
  pickValuePicks,
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
  tipProduct: OilCardData | null
  deals: DealData[]
  valuePicks: OilCardData[]
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
    // Strip markdown + HTML markers — HeroHook už aplikuje italic přes CSS.
    // Claude občas vrací <i>...</i>, *...*, **...**, _..._ — všechno strippneme.
    const stripFormatting = (s: string): string =>
      s
        // HTML tagy (i, b, em, strong, span, p, br, etc.)
        .replace(/<\/?[a-zA-Z][^>]*>/g, '')
        // Markdown bold + italic + standalone
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/\*/g, '')
        .replace(/_(.+?)_/g, '$1')
        .trim()

    const cleanHook = stripFormatting(parsed.hook ?? '')
    const cleanSubject = stripFormatting(parsed.subject ?? '')
    const cleanPreheader = stripFormatting(parsed.preheader ?? '')

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

  // Pinned/tip produkty — admin může preferovat konkrétní produkty
  const [pinnedSlug, tipSlug, tipMessage] = await Promise.all([
    getSetting<string>('newsletter_pinned_product').catch(() => ''),
    getSetting<string>('newsletter_tip_product').catch(() => ''),
    getSetting<string>('newsletter_tip_message').catch(() => ''),
  ])

  // Produkty z posledních 8 draftů — vyloučit z Oleje týdne aby se neopakoval
  const { data: recentDrafts } = await supabaseAdmin
    .from('newsletter_drafts')
    .select('blocks, status')
    .in('status', ['sent', 'approved', 'draft', 'archived'])
    .order('created_at', { ascending: false })
    .limit(8)

  const recentlyFeaturedIds: string[] = (recentDrafts ?? []).flatMap((d) => {
    const b = (d.blocks ?? {}) as Record<string, unknown>
    return [
      (b.oilOfWeek as { productId?: string } | null)?.productId,
      (b.tipProduct as { productId?: string } | null)?.productId,
    ].filter(Boolean) as string[]
  })

  // T-18: Brand + cultivar LRU exclusion
  // Picual (a jiné odrůdy s 10+ variantami) by prošla productId exclusion, ale
  // brand/cultivar exclusion ji zachytí i u jiného balení či varianty.
  // "sent" i "archived" informují LRU — archivovaný draft byl vygenerován,
  // admin ho zahodil (duplicita/kvalita), ale obsah stále ukazuje co systém
  // nedávno nabídl. Bez toho by archivace shrinkovala LRU okno.
  const sentDrafts = (recentDrafts ?? [])
    .filter((d) => d.status === 'sent' || d.status === 'approved' || d.status === 'archived')
    .slice(0, 4)
  const sentOilIds = sentDrafts.flatMap((d) => {
    const b = (d.blocks ?? {}) as Record<string, unknown>
    const pid = (b.oilOfWeek as { productId?: string } | null)?.productId
    return pid ? [pid] : []
  })
  // Cultivar LRU pro deals zahrnuje i produkty z posledních deals bloků (3 drafty)
  const sentDealIds = sentDrafts.slice(0, 3).flatMap((d) => {
    const b = (d.blocks ?? {}) as Record<string, unknown>
    return ((b.deals ?? []) as Array<{ productId?: string }>)
      .map((deal) => deal.productId)
      .filter(Boolean) as string[]
  })

  let recentBrandSlugs: string[] = []
  let recentCultivarSlugs: string[] = []
  let dealCultivarSlugs: string[] = []
  if (sentOilIds.length > 0 || sentDealIds.length > 0) {
    const brandProductIds = sentOilIds.slice(0, 2)     // brand: posledních 2 oleje týdne
    const oilCultivarIds = sentOilIds.slice(0, 3)      // cultivar pro oil pick: posledních 3 oleje týdne
    const dealCultivarIds = [...new Set(sentDealIds)]  // cultivar pro deals: posledních 3 drafty × N deals
    const [brandRows, oilCultivarRows, dealCultivarRows] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select('brand_slug')
        .in('id', brandProductIds)
        .not('brand_slug', 'is', null),
      oilCultivarIds.length > 0
        ? supabaseAdmin.from('product_cultivars').select('cultivar_slug').in('product_id', oilCultivarIds)
        : Promise.resolve({ data: [] }),
      dealCultivarIds.length > 0
        ? supabaseAdmin.from('product_cultivars').select('cultivar_slug').in('product_id', dealCultivarIds)
        : Promise.resolve({ data: [] }),
    ])
    recentBrandSlugs = (brandRows.data ?? []).map((p) => p.brand_slug as string).filter(Boolean)
    recentCultivarSlugs = (oilCultivarRows.data ?? []).map((c) => c.cultivar_slug as string).filter(Boolean)
    dealCultivarSlugs = (dealCultivarRows.data ?? []).map((c) => c.cultivar_slug as string).filter(Boolean)
    const allExcluded = [...new Set([...recentCultivarSlugs, ...dealCultivarSlugs])]
    if (recentBrandSlugs.length > 0 || allExcluded.length > 0) {
      console.log(`[composer] T-18 LRU exclusion — brands: [${recentBrandSlugs.join(', ')}], oil_cultivars: [${recentCultivarSlugs.join(', ')}], deal_cultivars: [${dealCultivarSlugs.join(', ')}]`)
    }
  }

  // 2. Pick blocks (parallel)
  // Deals threshold 5 % — pro malou DB s krátkou price history. Až bude
  // dostatek dat, nastav vyšší (10-15 %) v admin/newsletter/settings.
  const dealExcludeCultivars = [...new Set([...recentCultivarSlugs, ...dealCultivarSlugs])]
  const [oilOfWeek, tipProduct, deals, newArrival, recipe, fact] = await Promise.all([
    pickOilOfTheWeek(recentlyFeaturedIds, pinnedSlug || undefined, recentBrandSlugs, recentCultivarSlugs),
    tipSlug ? pickTipProduct(tipSlug, tipMessage) : Promise.resolve(null),
    pickDeals(5, 5, [], recentBrandSlugs, dealExcludeCultivars),
    pickNewArrival(),
    pickRecipe(),
    pickFact(),
  ])

  // Vyhneme se duplikaci
  const excludeIds = [oilOfWeek?.productId, tipProduct?.productId].filter(Boolean) as string[]
  const filteredDeals = deals.filter((d) => !excludeIds.includes(d.productId))

  // Fallback tipy — zobrazí se jen když žádné reálné slevy nejsou
  const dealsFiltered = filteredDeals.slice(0, 5)
  const valuePicks = dealsFiltered.length === 0
    ? await pickValuePicks([...excludeIds, ...recentlyFeaturedIds], 3)
    : []

  const blocks: WeeklyBlocks = {
    oilOfWeek,
    tipProduct,
    deals: dealsFiltered,
    valuePicks,
    newArrival: newArrival && !excludeIds.includes(newArrival.productId) ? newArrival : null,
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
  pinnedProductUsed: string | null
}> {
  // Přečti před generací — composeWeeklyDraft je také přečte interně, ale
  // potřebujeme je tady pro auto-clear a notifikaci.
  const [pinnedSlug, tipSlug] = await Promise.all([
    getSetting<string>('newsletter_pinned_product').catch(() => ''),
    getSetting<string>('newsletter_tip_product').catch(() => ''),
  ])

  const composed = await composeWeeklyDraft()
  const { id } = await saveDraftToDb('weekly', composed)

  // Auto-clear pinned + tip produkty po úspěšném vygenerování draftu
  await Promise.all([
    pinnedSlug ? setSetting('newsletter_pinned_product', '').catch(() => null) : null,
    tipSlug ? setSetting('newsletter_tip_product', '').catch(() => null) : null,
    tipSlug ? setSetting('newsletter_tip_message', '').catch(() => null) : null,
  ])

  return { id, subject: composed.subject, pinnedProductUsed: pinnedSlug || null }
}
