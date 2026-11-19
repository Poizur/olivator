import { render } from '@react-email/render'
import React from 'react'
import { supabaseAdmin } from './supabase'
import { effectivePrice, warnIfCapped, formatDealDate } from './price'
import { sendTransactionalEmail } from './newsletter-sender'
import { Welcome2MethodologyEmail } from '@/emails/welcome-2-methodology'
import { Welcome3TopPicksEmail, type TopPickProduct } from '@/emails/welcome-3-top-picks'
import { type WelcomeDeal } from '@/emails/welcome-d0-deals'
import { getDisplayName } from './product-display'

const SITE = 'https://olivator.cz'

// UTM přidává šablona e-mailu (jinak by URL měla dva „?“).
function buildAffiliateUrl(retailerSlug: string, productSlug: string): string {
  return `${SITE}/go/${retailerSlug}/${productSlug}`
}

function truncateName(name: string, max = 50): string {
  if (name.length <= max) return name
  const cut = name.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…'
}

export async function getWelcomeDeals(): Promise<{
  deals: WelcomeDeal[]
  topPickIndex: number
  topPickReason: string
  mode: 'deals' | 'tips'
}> {
  // Stejný seznam a pořadí jako /slevy a homepage (getSlevyDeals: od nejnovějšího zlevnění), jen bez opakování značky.
  // Bez ověřené slevy → tipy z katalogu.
  const { deals: slevy } = await getSlevyDeals(20)
  const selected: SlevyDeal[] = []
  const brands = new Set<string>()
  for (const c of slevy) {
    if (selected.length >= 3) break
    const key = c.brandName ?? c.name
    if (brands.has(key)) continue
    brands.add(key)
    selected.push(c)
  }
  if (selected.length === 0) return buildFallback()

  const deals: WelcomeDeal[] = selected.map((c) => ({
    name: c.name,
    brandName: c.brandName,
    variantInfo: null,
    volumeMl: c.volumeMl,
    imageUrl: c.imageUrl,
    score: c.score,
    currentPrice: c.currentPrice,
    oldPrice: c.oldPrice,
    dropPct: c.dropPct,
    retailerName: c.retailerName,
    ctaUrl: buildAffiliateUrl(c.retailerSlug, c.slug),
    isFallback: false,
    since: c.since,
  }))
  const topPickIndex = selected.reduce((best, c, i) => (c.score > selected[best].score ? i : best), 0)
  const topPick = selected[topPickIndex]
  const tpRef = `${topPick.name}${topPick.brandName ? ` od ${topPick.brandName}` : ''}`
  return {
    deals,
    topPickIndex,
    topPickReason: `${selected.length === 1 ? 'Tady bych šel po' : selected.length === 2 ? 'Z těchto dvou bych šel po' : 'Z těchto tří bych šel po'} ${tpRef}. ${selected.length > 1 ? `Má nejvyšší Score (${topPick.score})` : `Score ${topPick.score}`} a od ${formatDealDate(topPick.since)} stojí o ${topPick.dropPct} % méně než nejnižší cena za 30 dní před zlevněním.`,
    mode: 'deals',
  }
}

async function flagGenericNames(items: { id: string; name_short: string | null }[]): Promise<void> {
  const GENERIC = /^(olivov[ýáé]|olej|extra|panenský|bio|organic)(\s+\S+){0,1}\s*$/i
  const toFlag = items.filter(i => i.name_short && GENERIC.test(i.name_short.trim()))
  if (toFlag.length === 0) return
  const { data: existing } = await supabaseAdmin
    .from('quality_issues')
    .select('product_id')
    .in('product_id', toFlag.map(i => i.id))
    .eq('rule_id', 'name_short_too_generic')
    .eq('status', 'open')
  const alreadyFlagged = new Set((existing ?? []).map(r => r.product_id as string))
  const toInsert = toFlag.filter(i => !alreadyFlagged.has(i.id))
  if (toInsert.length === 0) return
  await supabaseAdmin.from('quality_issues').insert(
    toInsert.map(i => ({
      product_id: i.id,
      rule_id: 'name_short_too_generic',
      severity: 'warning',
      message: `name_short "${i.name_short}" je příliš generické — přidej název značky nebo odrůdy`,
      details: { name_short: i.name_short },
      status: 'open',
    }))
  )
}

async function buildFallback(): Promise<{ deals: WelcomeDeal[]; topPickIndex: number; topPickReason: string; mode: 'deals' | 'tips' }> {
  const [productsResult, brandsResult] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, slug, name, name_short, olivator_score, brand_slug, image_url, volume_ml, origin_region')
      .eq('status', 'active')
      .not('olivator_score', 'is', null)
      .order('olivator_score', { ascending: false })
      .limit(30),
    supabaseAdmin.from('brands').select('slug, name'),
  ])

  const brandNameMap = new Map(
    (brandsResult.data ?? []).map(b => [b.slug as string, b.name as string])
  )

  const deals: WelcomeDeal[] = []
  const usedBrands = new Set<string>()

  for (const p of productsResult.data ?? []) {
    if (deals.length >= 3) break
    const brandSlug = p.brand_slug as string | null
    const brandKey = brandSlug ?? (p.name_short as string | null) ?? (p.name as string)
    if (usedBrands.has(brandKey)) continue

    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price, retailer_id, retailers!inner(slug, name, is_active)')
      .eq('retailers.is_active', true)
      .eq('product_id', p.id as string)
      .eq('in_stock', true)
      .order('price', { ascending: true })
      .limit(1)
    if (!offers || offers.length === 0) continue
    const o = offers[0] as unknown as { price: number; retailer_id: string; retailers: { slug: string; name: string } }

    usedBrands.add(brandKey)
    const rawName = getDisplayName(p as { name_short: string | null; name: string })
    deals.push({
      name: truncateName(rawName),
      brandName: brandSlug ? (brandNameMap.get(brandSlug) ?? null) : null,
      variantInfo: p.origin_region as string | null,
      volumeMl: p.volume_ml as number | null,
      imageUrl: p.image_url as string | null,
      score: p.olivator_score as number,
      currentPrice: Math.round(o.price),
      oldPrice: null,
      dropPct: null,
      retailerName: o.retailers.name,
      ctaUrl: buildAffiliateUrl(o.retailers.slug, p.slug as string),
      isFallback: true,
      since: null,
    })
  }

  const top = deals[0]
  return {
    deals,
    topPickIndex: 0,
    topPickReason: top
      ? `Z těchto tří bych šel po ${top.name}${top.brandName ? ` od ${top.brandName}` : ''}. Score ${top.score} je top v katalogu, cena dobrá.`
      : 'Nejlépe hodnocený olej v katalogu právě teď.',
    mode: 'tips',
  }
}

export interface SlevyDeal {
  productId: string
  slug: string
  name: string
  brandName: string | null
  originCountry: string | null
  imageUrl: string | null
  score: number
  currentPrice: number
  oldPrice: number
  dropPct: number
  volumeMl: number | null
  retailerSlug: string
  retailerName: string
  ctaUrl: string
  /** Kdy obchod zlevnil (začátek současné ceny v price_history). Seznam je řazený od nejnovějšího. */
  since: string
}

/** Akční cena z feedu obchodu, kterou naše historie cen zatím nepotvrdila jako pokles. Bez přeškrtnuté ceny a bez procent. */
export interface ActionPriceNotice {
  productId: string
  slug: string
  name: string
  brandName: string | null
  imageUrl: string | null
  score: number | null
  volumeMl: number | null
  currentPrice: number
  listPrice: number
  since: string
  retailerSlug: string
  retailerName: string
}

export interface SlevyPageData {
  deals: SlevyDeal[]
  stats: {
    totalDeals: number
    avgDropPct: number
    retailerCount: number
  }
}

interface ConfirmedDealRow {
  product_id: string
  retailer_id: string
  current_price: number
  reference_price: number
  drop_pct: number
  current_since: string
}

async function loadDealContext(productIds: string[]) {
  const [productsRes, retailersRes, brandsRes, imagesRes] = await Promise.all([
    supabaseAdmin.from('products').select('id, slug, name, name_short, olivator_score, brand_slug, image_url, volume_ml, origin_country').in('id', productIds).eq('status', 'active'),
    supabaseAdmin.from('retailers').select('id, slug, name').eq('is_active', true),
    supabaseAdmin.from('brands').select('slug, name'),
    supabaseAdmin.from('product_images').select('product_id, url').in('product_id', productIds).eq('is_primary', true),
  ])
  return {
    productMap: new Map((productsRes.data ?? []).map((p) => [p.id as string, p])),
    retailerMap: new Map((retailersRes.data ?? []).map((r) => [r.id as string, { slug: r.slug as string, name: r.name as string }])),
    brandNameMap: new Map((brandsRes.data ?? []).map((b) => [b.slug as string, b.name as string])),
    primaryImageMap: new Map((imagesRes.data ?? []).map((img) => [img.product_id as string, img.url as string])),
  }
}

/**
 * Skutečné slevy: SQL view confirmed_deals — cena, kterou zákazník zaplatí, je aspoň 5 % pod NEJNIŽŠÍ cenou
 * za 30 dní před začátkem současné ceny (price_history téhož obchodu) a zlevnění není starší než 90 dní.
 * Jeden seznam pro /slevy, homepage, uvítací e-mail i týdenní newsletter; řazení od nejnovějšího zlevnění.
 * Výpočet je v DB (žádné načítání tisíců řádků historie — PostgREST ořezává na 1 000).
 */
export async function getSlevyDeals(limit = 20): Promise<SlevyPageData> {
  const { data: rows, error } = await supabaseAdmin
    .from('confirmed_deals')
    .select('product_id, retailer_id, current_price, reference_price, drop_pct, current_since')
  if (error) {
    console.error('[slevy] confirmed_deals:', error.message)
    return { deals: [], stats: { totalDeals: 0, avgDropPct: 0, retailerCount: 0 } }
  }
  const confirmed = warnIfCapped(rows as ConfirmedDealRow[] | null, 'confirmed_deals')
  if (confirmed.length === 0) return { deals: [], stats: { totalDeals: 0, avgDropPct: 0, retailerCount: 0 } }

  const ctx = await loadDealContext([...new Set(confirmed.map((r) => r.product_id))])
  // Jeden produkt = jedna (nejlepší) sleva
  const bestByProduct = new Map<string, ConfirmedDealRow>()
  for (const r of confirmed) {
    const prev = bestByProduct.get(r.product_id)
    if (!prev || Number(r.drop_pct) > Number(prev.drop_pct)) bestByProduct.set(r.product_id, r)
  }

  const deals: SlevyDeal[] = []
  for (const r of bestByProduct.values()) {
    const product = ctx.productMap.get(r.product_id)
    const retailer = ctx.retailerMap.get(r.retailer_id)
    if (!product || !retailer) continue
    const score = product.olivator_score as number | null
    if (score == null) continue
    const brandSlug = product.brand_slug as string | null
    const dropPct = Number(r.drop_pct)
    deals.push({
      productId: r.product_id,
      slug: product.slug as string,
      name: truncateName(getDisplayName(product as { name_short: string | null; name: string })),
      brandName: brandSlug ? (ctx.brandNameMap.get(brandSlug) ?? null) : null,
      originCountry: product.origin_country as string | null,
      imageUrl: (product.image_url as string | null) ?? ctx.primaryImageMap.get(r.product_id) ?? null,
      score,
      currentPrice: Math.round(Number(r.current_price)),
      oldPrice: Math.round(Number(r.reference_price)),
      dropPct,
      volumeMl: product.volume_ml as number | null,
      retailerSlug: retailer.slug,
      retailerName: retailer.name,
      ctaUrl: `/go/${retailer.slug}/${product.slug as string}`,
      since: r.current_since,
    })
  }
  deals.sort((a, b) => b.since.localeCompare(a.since) || b.dropPct - a.dropPct)
  const topDeals = deals.slice(0, limit)
  const avgDropPct = topDeals.length > 0 ? Math.round(topDeals.reduce((s, d) => s + d.dropPct, 0) / topDeals.length) : 0
  return { deals: topDeals, stats: { totalDeals: deals.length, avgDropPct, retailerCount: new Set(topDeals.map((d) => d.retailerSlug)).size } }
}

/** Akční ceny z feedu, které historie nepotvrdila (SQL view action_price_notices). */
export async function getActionPriceNotices(): Promise<ActionPriceNotice[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('action_price_notices')
    .select('product_id, retailer_id, list_price, action_price, current_price, current_since')
  if (error) {
    console.error('[slevy] action_price_notices:', error.message)
    return []
  }
  const notices = rows ?? []
  if (notices.length === 0) return []
  const ctx = await loadDealContext([...new Set(notices.map((r) => r.product_id as string))])
  const out: ActionPriceNotice[] = []
  for (const r of notices) {
    const product = ctx.productMap.get(r.product_id as string)
    const retailer = ctx.retailerMap.get(r.retailer_id as string)
    if (!product || !retailer) continue
    const brandSlug = product.brand_slug as string | null
    out.push({
      productId: r.product_id as string,
      slug: product.slug as string,
      name: truncateName(getDisplayName(product as { name_short: string | null; name: string })),
      brandName: brandSlug ? (ctx.brandNameMap.get(brandSlug) ?? null) : null,
      imageUrl: (product.image_url as string | null) ?? ctx.primaryImageMap.get(r.product_id as string) ?? null,
      score: product.olivator_score as number | null,
      volumeMl: product.volume_ml as number | null,
      currentPrice: Math.round(Number(r.current_price)),
      listPrice: Math.round(Number(r.list_price)),
      since: r.current_since as string,
      retailerSlug: retailer.slug,
      retailerName: retailer.name,
    })
  }
  return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

export async function enqueueWelcomeSeries(subscriberId: string): Promise<void> {
  const now = new Date()
  await supabaseAdmin.from('welcome_series_queue').insert([
    {
      subscriber_id: subscriberId,
      email_number: 2,
      scheduled_for: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      subscriber_id: subscriberId,
      email_number: 3,
      scheduled_for: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ])
}

async function getTopPicks(): Promise<TopPickProduct[]> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, image_url, olivator_score, acidity, polyphenols, brand_slug')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .order('olivator_score', { ascending: false })
    .limit(50)

  if (!products) return []

  const { data: retailers } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name')
    .eq('is_active', true)

  const retailerMap = new Map((retailers ?? []).map(r => [r.id as string, { slug: r.slug as string, name: r.name as string }]))

  const result: TopPickProduct[] = []

  for (const p of products) {
    if (result.length >= 5) break

    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price, retailer_id')
      .eq('product_id', p.id)
      .in('retailer_id', [...retailerMap.keys()])
      .eq('in_stock', true)
      .lte('price', 400)
      .order('price', { ascending: true })
      .limit(1)

    if (!offers || offers.length === 0) continue

    const offer = offers[0]
    const retailer = retailerMap.get(offer.retailer_id as string)
    if (!retailer) continue

    result.push({
      slug: p.slug as string,
      name: p.name as string,
      brandName: p.name_short as string | null,
      imageUrl: p.image_url as string | null,
      score: p.olivator_score as number,
      acidity: p.acidity as number | null,
      polyphenols: p.polyphenols as number | null,
      price: Math.round(offer.price as number),
      retailerSlug: retailer.slug,
      retailerName: retailer.name,
      originCountry: null,
    })
  }

  return result
}

export async function dispatchWelcomeQueue(): Promise<{ sent: number; failed: number }> {
  const { data: pending } = await supabaseAdmin
    .from('welcome_series_queue')
    .select(`
      id, email_number, subscriber_id,
      newsletter_signups!inner(email, unsubscribe_token)
    `)
    .eq('sent', false)
    .lte('scheduled_for', new Date().toISOString())

  let sent = 0
  let failed = 0

  for (const item of pending ?? []) {
    const signup = (item as unknown as { newsletter_signups: { email: string; unsubscribe_token: string } }).newsletter_signups
    const unsubUrl = `https://olivator.cz/api/newsletter/unsubscribe?token=${signup.unsubscribe_token}`

    try {
      let subject: string
      let html: string
      let text: string

      if (item.email_number === 2) {
        subject = 'Jak vybíráme oleje (a proč nám můžeš věřit)'
        html = await render(React.createElement(Welcome2MethodologyEmail, { unsubscribeUrl: unsubUrl }))
        text = await render(React.createElement(Welcome2MethodologyEmail, { unsubscribeUrl: unsubUrl }), { plainText: true })
      } else {
        const products = await getTopPicks()
        subject = '5 olejů, které si teď zaslouží pozornost'
        html = await render(React.createElement(Welcome3TopPicksEmail, { unsubscribeUrl: unsubUrl, products }))
        text = await render(React.createElement(Welcome3TopPicksEmail, { unsubscribeUrl: unsubUrl, products }), { plainText: true })
      }

      const result = await sendTransactionalEmail({ to: signup.email, subject, html, text })
      if (!result.ok) throw new Error(result.error ?? 'send failed')

      await supabaseAdmin
        .from('welcome_series_queue')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', item.id)

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabaseAdmin
        .from('welcome_series_queue')
        .update({ error_message: msg.slice(0, 500) })
        .eq('id', item.id)
      failed++
      console.error(`[welcome-series] item ${item.id} failed:`, msg)
    }
  }

  return { sent, failed }
}
