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

export async function getWelcomeDeals(): Promise<{
  deals: WelcomeDeal[]
  topPickIndex: number
  topPickReason: string
}> {
  // Načti všechny aktuální in_stock nabídky
  const { data: offers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price, retailer_id')
    .eq('in_stock', true)

  if (!offers || offers.length === 0) return buildFallback()

  const productIds = Array.from(new Set(offers.map(o => o.product_id as string)))

  const [productsResult, retailersResult] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, slug, name, name_short, olivator_score, brand_slug')
      .in('id', productIds)
      .eq('status', 'active')
      .gte('olivator_score', 70)
      .not('olivator_score', 'is', null),
    supabaseAdmin.from('retailers').select('id, slug, name'),
  ])

  const productMap = new Map(
    (productsResult.data ?? []).map(p => [p.id as string, p])
  )
  const retailerMap = new Map(
    (retailersResult.data ?? []).map(r => [r.id as string, { slug: r.slug as string, name: r.name as string }])
  )

  // Nejlevnější nabídka per produkt (jen score >= 70, active)
  const cheapestByProduct = new Map<string, { price: number; retailerId: string }>()
  for (const o of offers) {
    const pid = o.product_id as string
    if (!productMap.has(pid)) continue
    const existing = cheapestByProduct.get(pid)
    if (!existing || (o.price as number) < existing.price) {
      cheapestByProduct.set(pid, { price: o.price as number, retailerId: o.retailer_id as string })
    }
  }

  // Pro každý produkt zjisti 30d max cenu
  interface Candidate {
    productId: string
    slug: string
    name: string
    brandSlug: string | null
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

    // Rank: deals prioritised, then pure score
    const rankScore = dropPct
      ? dropPct * 0.4 + score * 0.6
      : score * 0.6

    candidates.push({
      productId,
      slug: product.slug as string,
      name: (product.name_short as string | null) ?? (product.name as string),
      brandSlug: product.brand_slug as string | null,
      score,
      currentPrice: Math.round(offer.price),
      oldPrice,
      dropPct,
      retailerSlug: retailer.slug,
      retailerName: retailer.name,
      rankScore,
    })
  }

  // Seřadit — slevy >= 15% první (rankScore vyšší), pak fallback score
  const withDeals = candidates
    .filter(c => c.dropPct !== null)
    .sort((a, b) => b.rankScore - a.rankScore)

  // Max 1 per brand, limit 3
  const selected: Candidate[] = []
  const usedBrands = new Set<string>()

  for (const c of withDeals) {
    if (selected.length >= 3) break
    const brandKey = c.brandSlug ?? c.name
    if (usedBrands.has(brandKey)) continue
    usedBrands.add(brandKey)
    selected.push(c)
  }

  // Fallback: doplnit top-score produkty pokud méně než 3 slevy
  if (selected.length < 3) {
    const topScore = candidates
      .filter(c => !selected.find(s => s.productId === c.productId))
      .sort((a, b) => b.score - a.score)

    for (const c of topScore) {
      if (selected.length >= 3) break
      const brandKey = c.brandSlug ?? c.name
      if (usedBrands.has(brandKey)) continue
      usedBrands.add(brandKey)
      selected.push(c)
    }
  }

  if (selected.length === 0) return buildFallback()

  const deals: WelcomeDeal[] = selected.map(c => ({
    name: c.name,
    score: c.score,
    currentPrice: c.currentPrice,
    oldPrice: c.oldPrice,
    dropPct: c.dropPct,
    retailerName: c.retailerName,
    ctaUrl: buildAffiliateUrl(c.retailerSlug, c.slug),
    isFallback: c.dropPct === null,
  }))

  // Top pick = nejvyšší rankScore (první s dealem, nebo nejlepší score)
  const topPickIndex = 0
  const topPick = selected[0]
  let topPickReason: string

  if (topPick.dropPct) {
    topPickReason = `Score ${topPick.score} a teď ${topPick.dropPct} % pod měsíčním maximem — nejlepší kombinace kvality a ceny v katalogu právě teď.`
  } else {
    topPickReason = `Score ${topPick.score} — jeden z nejlépe hodnocených olejů v celém katalogu. Aktuálně za ${topPick.currentPrice} Kč.`
  }

  return { deals, topPickIndex, topPickReason }
}

async function buildFallback(): Promise<{ deals: WelcomeDeal[]; topPickIndex: number; topPickReason: string }> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, olivator_score, brand_slug')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .order('olivator_score', { ascending: false })
    .limit(30)

  const deals: WelcomeDeal[] = []
  const usedBrands = new Set<string>()

  for (const p of products ?? []) {
    if (deals.length >= 3) break
    const brandKey = (p.brand_slug as string | null) ?? (p.name_short as string | null) ?? (p.name as string)
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
    deals.push({
      name: (p.name_short as string | null) ?? (p.name as string),
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
