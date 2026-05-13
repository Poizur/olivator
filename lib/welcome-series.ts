import { render } from '@react-email/render'
import React from 'react'
import { supabaseAdmin } from './supabase'
import { sendTransactionalEmail } from './newsletter-sender'
import { Welcome2MethodologyEmail } from '@/emails/welcome-2-methodology'
import { Welcome3TopPicksEmail, type TopPickProduct } from '@/emails/welcome-3-top-picks'
import { type WelcomeDeal } from '@/emails/welcome-d0-deals'

const SITE = 'https://olivator.cz'

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
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price, retailer_id')
    .eq('in_stock', true)

  if (!offers || offers.length === 0) return buildFallback()

  const productIds = Array.from(new Set(offers.map(o => o.product_id as string)))

  const [productsResult, retailersResult, brandsResult] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, slug, name, name_short, olivator_score, brand_slug, image_url, volume_ml, origin_region')
      .in('id', productIds)
      .eq('status', 'active')
      .gte('olivator_score', 70)
      .not('olivator_score', 'is', null),
    supabaseAdmin.from('retailers').select('id, slug, name'),
    supabaseAdmin.from('brands').select('slug, name'),
  ])

  const productMap = new Map(
    (productsResult.data ?? []).map(p => [p.id as string, p])
  )
  const retailerMap = new Map(
    (retailersResult.data ?? []).map(r => [r.id as string, { slug: r.slug as string, name: r.name as string }])
  )
  const brandNameMap = new Map(
    (brandsResult.data ?? []).map(b => [b.slug as string, b.name as string])
  )

  const cheapestByProduct = new Map<string, { price: number; retailerId: string }>()
  for (const o of offers) {
    const pid = o.product_id as string
    if (!productMap.has(pid)) continue
    const existing = cheapestByProduct.get(pid)
    if (!existing || (o.price as number) < existing.price) {
      cheapestByProduct.set(pid, { price: o.price as number, retailerId: o.retailer_id as string })
    }
  }

  interface Candidate {
    productId: string
    slug: string
    name: string
    brandSlug: string | null
    brandName: string | null
    variantInfo: string | null
    volumeMl: number | null
    imageUrl: string | null
    score: number
    currentPrice: number
    oldPrice: number | null
    dropPct: number | null
    retailerSlug: string
    retailerName: string
    rankScore: number
  }

  const candidates: Candidate[] = []

  for (const [productId, offer] of cheapestByProduct.entries()) {
    const product = productMap.get(productId)
    if (!product) continue
    const retailer = retailerMap.get(offer.retailerId)
    if (!retailer) continue

    const { data: history } = await supabaseAdmin
      .from('price_history')
      .select('price')
      .eq('product_id', productId)
      .gte('recorded_at', new Date(Date.now() - 30 * 86400_000).toISOString())
      .order('price', { ascending: false })
      .limit(1)

    const maxPrice = (history?.[0]?.price as number | undefined) ?? null
    const score = product.olivator_score as number
    let dropPct: number | null = null
    let oldPrice: number | null = null

    if (maxPrice && maxPrice > offer.price) {
      dropPct = Math.round(((maxPrice - offer.price) / maxPrice) * 100)
      if (dropPct >= 15) oldPrice = Math.round(maxPrice)
      else dropPct = null
    }

    const brandSlug = product.brand_slug as string | null
    const brandName = brandSlug ? (brandNameMap.get(brandSlug) ?? null) : null
    const rawName = (product.name_short as string | null) ?? (product.name as string)

    candidates.push({
      productId,
      slug: product.slug as string,
      name: truncateName(rawName),
      brandSlug,
      brandName,
      variantInfo: (product.origin_region as string | null),
      volumeMl: (product.volume_ml as number | null),
      imageUrl: (product.image_url as string | null),
      score,
      currentPrice: Math.round(offer.price),
      oldPrice,
      dropPct,
      retailerSlug: retailer.slug,
      retailerName: retailer.name,
      rankScore: dropPct ? dropPct * 0.4 + score * 0.6 : score * 0.6,
    })
  }

  const withDeals = candidates
    .filter(c => c.dropPct !== null)
    .sort((a, b) => b.rankScore - a.rankScore)

  // Volume filter — 3 passes: retail (250-1000ml) → wide (≤2000ml) → any
  function selectWithVolumeFilter(
    pool: Candidate[],
    volFilter: ((v: number | null) => boolean) | null,
    existing: Candidate[],
    existingBrands: Set<string>,
  ): Candidate[] {
    const result = [...existing]
    const brands = new Set(existingBrands)
    const filtered = volFilter ? pool.filter(c => volFilter(c.volumeMl)) : pool
    for (const c of filtered) {
      if (result.length >= 3) break
      const brandKey = c.brandSlug ?? c.name
      if (brands.has(brandKey)) continue
      brands.add(brandKey)
      result.push(c)
    }
    return result
  }

  let selected: Candidate[] = []
  const usedBrands = new Set<string>()

  // Pass 1: deals, retail size 250-1000ml
  selected = selectWithVolumeFilter(withDeals, v => v !== null && v >= 250 && v <= 1000, [], usedBrands)
  // Pass 2: deals, wider ≤2000ml
  if (selected.length < 3) selected = selectWithVolumeFilter(withDeals, v => v !== null && v <= 2000, selected, new Set(selected.map(c => c.brandSlug ?? c.name)))
  // Pass 3: deals, any size
  if (selected.length < 3) selected = selectWithVolumeFilter(withDeals, null, selected, new Set(selected.map(c => c.brandSlug ?? c.name)))

  // Same 3-pass fallback with top-score (no deals)
  if (selected.length < 3) {
    const topScore = candidates
      .filter(c => c.dropPct === null && !selected.find(s => s.productId === c.productId))
      .sort((a, b) => b.score - a.score)
    const selectedBrands = new Set(selected.map(c => c.brandSlug ?? c.name))
    selected = selectWithVolumeFilter(topScore, v => v !== null && v >= 250 && v <= 1000, selected, selectedBrands)
    if (selected.length < 3) selected = selectWithVolumeFilter(topScore, v => v !== null && v <= 2000, selected, new Set(selected.map(c => c.brandSlug ?? c.name)))
    if (selected.length < 3) selected = selectWithVolumeFilter(topScore, null, selected, new Set(selected.map(c => c.brandSlug ?? c.name)))
  }

  if (selected.length === 0) return buildFallback()

  const hasTrueDeals = selected.some(c => c.dropPct !== null)
  const mode: 'deals' | 'tips' = hasTrueDeals ? 'deals' : 'tips'

  const deals: WelcomeDeal[] = selected.map(c => ({
    name: c.name,
    brandName: c.brandName,
    variantInfo: c.variantInfo,
    volumeMl: c.volumeMl,
    imageUrl: c.imageUrl,
    score: c.score,
    currentPrice: c.currentPrice,
    oldPrice: c.oldPrice,
    dropPct: c.dropPct,
    retailerName: c.retailerName,
    ctaUrl: buildAffiliateUrl(c.retailerSlug, c.slug),
    isFallback: c.dropPct === null,
  }))

  const topPick = selected[0]
  const topPickReason = topPick.dropPct
    ? `Score ${topPick.score} a teď ${topPick.dropPct} % pod měsíčním maximem — nejlepší kombinace kvality a ceny v katalogu právě teď.`
    : `Score ${topPick.score} — jeden z nejlépe hodnocených olejů v celém katalogu. Aktuálně za ${topPick.currentPrice} Kč.`

  flagGenericNames(selected.map(c => ({ id: c.productId, name_short: c.brandSlug ? null : c.name }))).catch(() => null)

  return { deals, topPickIndex: 0, topPickReason, mode }
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
      .select('price, retailer_id, retailers!inner(slug, name)')
      .eq('product_id', p.id as string)
      .eq('in_stock', true)
      .order('price', { ascending: true })
      .limit(1)
    if (!offers || offers.length === 0) continue
    const o = offers[0] as unknown as { price: number; retailer_id: string; retailers: { slug: string; name: string } }

    usedBrands.add(brandKey)
    const rawName = (p.name_short as string | null) ?? (p.name as string)
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
    })
  }

  const top = deals[0]
  return {
    deals,
    topPickIndex: 0,
    topPickReason: top
      ? `Score ${top.score} — jeden z nejlépe hodnocených olejů v katalogu. Aktuálně za ${top.currentPrice} Kč.`
      : 'Nejlépe hodnocený olej v katalogu právě teď.',
    mode: 'tips',
  }
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

  const retailerMap = new Map((retailers ?? []).map(r => [r.id as string, { slug: r.slug as string, name: r.name as string }]))

  const result: TopPickProduct[] = []

  for (const p of products) {
    if (result.length >= 5) break

    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price, retailer_id')
      .eq('product_id', p.id)
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
