#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)

interface Product {
  id: string
  slug: string
  name: string
  name_short: string | null
  olivator_score: number | null
  type: string | null
  processing: string | null
  origin_country: string | null
  acidity: number | null
  polyphenols: number | null
  certifications: string[]
  packaging: string | null
  volume_ml: number | null
}

interface Offer {
  product_id: string
  price: number
  retailer_name: string
}

// ---- HELPERS ----

function fmtProductLine(i: number, p: Product, offers: Map<string, Offer>): string {
  const name = p.name_short || p.name
  const scorePart = p.olivator_score != null ? `Score ${p.olivator_score}` : null
  const offer = offers.get(p.id)
  const pricePart = offer ? `${Math.round(offer.price)} Kč u ${offer.retailer_name}` : null
  const details = [scorePart, pricePart].filter(Boolean).join(', ')
  return `${i + 1}. **[${name}](/olej/${p.slug})**${details ? ` — ${details}` : ''}`
}

function buildBlock(heading: string, products: Product[], offers: Map<string, Offer>): string {
  const lines = [`## ${heading}`, '']
  products.forEach((p, i) => lines.push(fmtProductLine(i, p, offers)))
  return lines.join('\n')
}

function injectAfterFirstH2(body: string, block: string): string {
  const h2Regex = /^## .+$/gm
  const matches = [...body.matchAll(h2Regex)]

  if (matches.length === 0) {
    return block + '\n\n' + body
  }
  if (matches.length === 1) {
    return body.trimEnd() + '\n\n' + block
  }
  // Insert before second H2 (= end of first section)
  const secondH2Pos = matches[1].index!
  return body.slice(0, secondH2Pos).trimEnd() + '\n\n' + block + '\n\n' + body.slice(secondH2Pos)
}

async function queryProducts(params: {
  minScore?: number
  minPolyphenols?: number
  acidityMax?: number
  type?: string
  processingLike?: string
  originCountry?: string
  packagingIn?: string[]
  volumeMax?: number
  certContains?: string[]
  limit: number
  multiplier?: number  // fetch N×limit for post-filtering
}): Promise<Product[]> {
  const fetchLimit = (params.multiplier ?? 1) * params.limit

  let q = supabase
    .from('products')
    .select('id, slug, name, name_short, olivator_score, type, processing, origin_country, acidity, polyphenols, certifications, packaging, volume_ml')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .order('olivator_score', { ascending: false })
    .limit(fetchLimit)

  if (params.minScore != null) q = q.gte('olivator_score', params.minScore)
  if (params.minPolyphenols != null) q = q.gte('polyphenols', params.minPolyphenols)
  if (params.acidityMax != null) q = q.lte('acidity', params.acidityMax)
  if (params.type) {
    const t = params.type === 'extra_virgin' ? 'evoo' : params.type
    q = q.eq('type', t)
  }
  if (params.processingLike) q = q.ilike('processing', `%${params.processingLike}%`)
  if (params.originCountry) q = q.eq('origin_country', params.originCountry)
  if (params.packagingIn?.length) q = q.in('packaging', params.packagingIn)
  if (params.volumeMax != null) q = q.lte('volume_ml', params.volumeMax)
  if (params.certContains?.length) q = q.contains('certifications', params.certContains)

  const { data, error } = await q
  if (error) { console.error('  Query error:', error.message); return [] }
  return (data ?? []) as Product[]
}

async function getOffers(productIds: string[]): Promise<Map<string, Offer>> {
  if (!productIds.length) return new Map()
  const { data } = await supabase
    .from('product_offers')
    .select('product_id, price, retailers(name)')
    .in('product_id', productIds)
    .eq('in_stock', true)
    .order('price', { ascending: true })

  const map = new Map<string, Offer>()
  for (const row of (data ?? []) as any[]) {
    if (!map.has(row.product_id)) {
      map.set(row.product_id, {
        product_id: row.product_id,
        price: row.price,
        retailer_name: row.retailers?.name ?? 'prodejce',
      })
    }
  }
  return map
}

// ---- ARTICLE → PRODUCTS LOGIC ----

interface Combo { products: Product[]; heading: string }

async function getCombos(slug: string): Promise<Combo[]> {
  switch (slug) {
    // CENOVÉ — price filter requires post-query
    case 'olivovy-olej-do-200-kc': {
      const candidates = await queryProducts({ minScore: 70, limit: 5, multiplier: 20 })
      const ofrs = await getOffers(candidates.map(p => p.id))
      const filtered = candidates.filter(p => { const o = ofrs.get(p.id); return o && o.price <= 200 }).slice(0, 5)
      return [{ products: filtered, heading: 'Top olivové oleje do 200 Kč' }]
    }
    case 'premium-olivovy-olej-ma-smysl': {
      const candidates = await queryProducts({ minScore: 85, limit: 4, multiplier: 10 })
      const ofrs = await getOffers(candidates.map(p => p.id))
      const filtered = candidates.filter(p => { const o = ofrs.get(p.id); return o && o.price >= 500 }).slice(0, 4)
      return [{ products: filtered, heading: 'Prémiové oleje s nejvyšším Score' }]
    }

    // POUŽITÍ
    case 'olivovy-olej-do-salatu-vs-na-vareni': {
      const [saladP, cookP] = await Promise.all([
        queryProducts({ processingLike: 'cold_pressed', limit: 3 }),
        queryProducts({ type: 'refined', limit: 3 }),
      ])
      return [
        { products: saladP.slice(0, 3), heading: 'Top oleje na saláty (za studena lisované)' },
        { products: cookP.slice(0, 3), heading: 'Top oleje na vaření a tepelnou úpravu' },
      ]
    }
    case 'olivovy-olej-na-smazeni-bod-zakoureni': {
      // type='refined' OR processing='refined'
      const [byType, byProc] = await Promise.all([
        queryProducts({ type: 'refined', limit: 4 }),
        queryProducts({ processingLike: 'refined', limit: 4 }),
      ])
      const seen = new Set<string>(); const merged: Product[] = []
      for (const p of [...byType, ...byProc]) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p) }
        if (merged.length >= 4) break
      }
      return [{ products: merged.slice(0, 4), heading: 'Oleje vhodné pro smažení a vaření na vysoké teplotě' }]
    }
    case 'darkove-baleni-olivovy-olej': {
      const prods = await queryProducts({ minScore: 80, packagingIn: ['glass', 'dark_glass', 'tin'], limit: 5 })
      return [{ products: prods, heading: 'Nejlepší olivové oleje jako dárek' }]
    }

    // REGION
    case 'recky-vs-italsky': {
      const [gr, it] = await Promise.all([
        queryProducts({ originCountry: 'GR', limit: 3 }),
        queryProducts({ originCountry: 'IT', limit: 3 }),
      ])
      return [
        { products: gr.slice(0, 3), heading: 'Top řecké olivové oleje' },
        { products: it.slice(0, 3), heading: 'Top italské olivové oleje' },
      ]
    }
    case 'stredomorska-strava-olivovy-olej': {
      const candidates = await queryProducts({ minScore: 80, limit: 30 })
      const med = candidates.filter(p => ['GR', 'IT', 'ES', 'PT', 'HR'].includes(p.origin_country ?? '')).slice(0, 5)
      return [{ products: med, heading: 'Středomořské oleje s nejvyšším Olivator Score' }]
    }

    // CERTIFIKACE — certy jsou lowercase v DB
    case 'dop-pgi-bio-certifikace': {
      const prods = await queryProducts({ certContains: ['dop'], limit: 5 })
      const fallback = prods.length < 2 ? await queryProducts({ certContains: ['bio'], limit: 5 }) : []
      const all = prods.length >= 2 ? prods : fallback
      return [{ products: all.slice(0, 5), heading: 'Certifikované olivové oleje (DOP/BIO)' }]
    }
    case 'falesny-olivovy-olej-jak-rozeznat': {
      const prods = await queryProducts({ certContains: ['dop'], limit: 5 })
      const fallback = prods.length < 2 ? await queryProducts({ minScore: 80, limit: 5 }) : []
      const all = prods.length >= 2 ? prods : fallback
      return [{ products: all.slice(0, 5), heading: 'Ověřené oleje s certifikací DOP — zárukou pravosti' }]
    }
    case 'olivovy-olej-pro-deti': {
      let prods = await queryProducts({ certContains: ['bio'], acidityMax: 0.3, limit: 4 })
      if (prods.length < 2) prods = await queryProducts({ certContains: ['bio'], limit: 4 })
      if (prods.length < 2) prods = await queryProducts({ acidityMax: 0.3, limit: 4 })
      return [{ products: prods.slice(0, 4), heading: 'Oleje vhodné pro děti (BIO, nízká kyselost)' }]
    }

    // POLYFENOLY / ZDRAVÍ
    case 'polyfenoly-kolik-je-dost': {
      const prods = await queryProducts({ minPolyphenols: 500, limit: 5 })
      const fallback = prods.length < 2 ? await queryProducts({ minPolyphenols: 300, limit: 5 }) : []
      return [{ products: (prods.length >= 2 ? prods : fallback).slice(0, 5), heading: 'Oleje s nejvyšším obsahem polyfenolů' }]
    }
    case 'polyfenoly-proc-na-nich-zalezi': {
      const prods = await queryProducts({ minPolyphenols: 600, limit: 4 })
      const fallback = prods.length < 2 ? await queryProducts({ minPolyphenols: 400, limit: 4 }) : []
      return [{ products: (prods.length >= 2 ? prods : fallback).slice(0, 4), heading: 'Oleje s extrémně vysokým obsahem polyfenolů' }]
    }
    case 'olivovy-olej-a-zdravi-veda-2026': {
      // EU Health Claim = 250+ mg/kg polyphenols; also check for evoo_eu_health_claim cert
      const prods = await queryProducts({ minPolyphenols: 250, limit: 5 })
      const bycert = prods.length < 2
        ? await queryProducts({ certContains: ['evoo_eu_health_claim'], limit: 5 })
        : []
      const all = prods.length >= 2 ? prods : bycert
      return [{ products: all.slice(0, 5), heading: 'Oleje splňující EU Health Claim (250+ mg/kg polyfenolů)' }]
    }
    case 'extra-panensky-vs-panensky-vs-rafinovany': {
      const prods = await queryProducts({ type: 'extra_virgin', minScore: 80, limit: 5 })
      return [{ products: prods, heading: 'Nejlepší extra panenské olivové oleje' }]
    }

    // PROCESSING
    case 'sklizen-oliv-early-vs-late-harvest': {
      const prods = await queryProducts({ processingLike: 'early_harvest', limit: 5 })
      return [{ products: prods, heading: 'Nejlepší early harvest olivové oleje' }]
    }
    case 'filtrovany-vs-nefiltrovany-olivovy-olej': {
      // 'unfiltered' matches 'cold_pressed, unfiltered', 'unfiltered', 'early_harvest, unfiltered'
      const prods = await queryProducts({ processingLike: 'unfiltered', limit: 4 })
      return [{ products: prods, heading: 'Nejlepší nefiltrované olivové oleje' }]
    }

    // PRŮVODCE (broad)
    case 'jak-vybrat-olivovy-olej': {
      const prods = await queryProducts({ minScore: 85, limit: 5 })
      return [{ products: prods, heading: 'Olivátor doporučuje: oleje se Score 85+' }]
    }
    case 'jak-cist-etiketu-olivoveho-oleje': {
      const prods = await queryProducts({ minScore: 85, limit: 4 })
      return [{ products: prods, heading: 'Oleje s výbornou etiketou a Score 85+' }]
    }
    case 'jak-skladovat-olivovy-olej-doma': {
      const prods = await queryProducts({ packagingIn: ['dark_glass', 'glass', 'tin'], limit: 4 })
      return [{ products: prods, heading: 'Oleje ve správném obalu pro dlouhé skladování' }]
    }
    case 'otevrena-lahev-jak-rychle-spotrebovat': {
      const prods = await queryProducts({ volumeMax: 500, limit: 4 })
      return [{ products: prods, heading: 'Olivové oleje v malém balení (do 500 ml)' }]
    }
    case 'degustace-olivoveho-oleje-doma': {
      const prods = await queryProducts({ minPolyphenols: 400, limit: 5 })
      const fallback = prods.length < 2 ? await queryProducts({ minPolyphenols: 200, limit: 5 }) : []
      return [{ products: (prods.length >= 2 ? prods : fallback).slice(0, 5), heading: 'Oleje ideální pro domácí degustaci (400+ mg/kg)' }]
    }
    case 'kde-koupit-olivovy-olej-cr': {
      const prods = await queryProducts({ minScore: 80, limit: 5 })
      return [{ products: prods, heading: 'Top olivové oleje dostupné v ČR' }]
    }

    // ŽEBŘÍČEK
    case 'nejlepsi-olivovy-olej-2026': {
      const prods = await queryProducts({ minScore: 90, limit: 10 })
      const fallback = prods.length < 2 ? await queryProducts({ minScore: 80, limit: 10 }) : []
      return [{ products: (prods.length >= 2 ? prods : fallback).slice(0, 10), heading: 'Nejlepší olivové oleje 2026 podle Olivator Score' }]
    }

    default:
      return []
  }
}

// ---- MAIN ----
async function main() {
  console.log('=== Úkol 3: Internal product links ===\n')

  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, slug, body_markdown')
    .eq('status', 'active')

  if (articlesError) { console.error('Fetch articles failed:', articlesError.message); process.exit(1) }

  type Result = { slug: string; status: 'updated' | 'skipped' | 'failed'; reason?: string; linkCount?: number }
  const results: Result[] = []

  for (const article of (articles ?? [])) {
    const slug = article.slug as string
    const body = (article.body_markdown as string) || ''

    // Idempotent check
    if (body.includes('/olej/')) {
      results.push({ slug, status: 'skipped', reason: 'already has /olej/ links' })
      continue
    }

    const combos = await getCombos(slug)

    if (combos.length === 0) {
      results.push({ slug, status: 'skipped', reason: 'no logic defined' })
      continue
    }

    const validCombos = combos.filter(c => c.products.length >= 2)
    if (validCombos.length === 0) {
      const total = combos.reduce((s, c) => s + c.products.length, 0)
      results.push({ slug, status: 'skipped', reason: `insufficient products (found ${total}, need ≥2)` })
      continue
    }

    // Fetch offers for all valid products
    const allIds = [...new Set(validCombos.flatMap(c => c.products.map(p => p.id)))]
    const offers = await getOffers(allIds)

    // Build block(s)
    const blocks = validCombos.map(c => buildBlock(c.heading, c.products, offers))
    const block = blocks.join('\n\n')
    const totalLinks = validCombos.reduce((s, c) => s + c.products.length, 0)

    const newBody = injectAfterFirstH2(body, block)

    const { error: updateErr } = await supabase
      .from('articles')
      .update({ body_markdown: newBody, updated_at: new Date().toISOString() })
      .eq('id', article.id)

    if (updateErr) {
      results.push({ slug, status: 'failed', reason: updateErr.message })
      console.error(`❌ ${slug}: ${updateErr.message}`)
    } else {
      results.push({ slug, status: 'updated', linkCount: totalLinks })
      console.log(`✅ ${slug} — ${totalLinks} linků`)
    }
  }

  // Summary
  const updated = results.filter(r => r.status === 'updated')
  const skipped = results.filter(r => r.status === 'skipped')
  const failed = results.filter(r => r.status === 'failed')

  console.log(`\n${'='.repeat(50)}`)
  console.log(`UPDATED  (${updated.length}): ${updated.map(r => `${r.slug} [${r.linkCount}]`).join(', ')}`)
  console.log(`SKIPPED  (${skipped.length}):`)
  skipped.forEach(r => console.log(`  ⏭️  ${r.slug} — ${r.reason}`))
  if (failed.length) {
    console.log(`FAILED   (${failed.length}):`)
    failed.forEach(r => console.log(`  ❌ ${r.slug} — ${r.reason}`))
  }
}

main().catch(console.error)
