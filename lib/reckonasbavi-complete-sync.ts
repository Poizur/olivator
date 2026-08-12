// Reckonasbavi Complete export sync.
//
// Fetches the full product catalog from the partner-authenticated Complete XML feed
// and updates product_offers with real warehouse stock and effective prices.
//
// Advantages over Heureka feed:
//   - STOCK/AMOUNT = real warehouse count (0 = truly sold out, >0 = truly available)
//   - ACTION_PRICE captures promotional prices not visible in Heureka
//   - AVAILABILITY_OUT_OF_STOCK gives human-readable restock ETAs ("Na cestě z Řecka…")
//
// Feed URL (with partner hash) lives ONLY in env — never in git.
// Env var: RECKONASBAVI_COMPLETE_FEED_URL
//
// Matching strategy:
//   1. Official EAN (non-suspect) → products.ean lookup
//   2. Shop-internal EANs (7777xxxxx) are skipped — covered by Heureka URL match
//
// This sync ONLY updates offers, never creates products (that's Heureka + discovery).
// Runs as PASS 6 in feed-sync-runner after the Heureka feed pass, so Complete
// data always wins (authoritative warehouse state > Heureka delivery-date heuristic).

import { supabaseAdmin } from './supabase'

export interface CompleteSyncResult {
  feedItems: number           // total items in Complete XML
  oilsFound: number           // items matching olive oil filter
  offersUpdated: number       // product_offers rows updated
  overridesCleared: number    // manual_override=true cleared because AMOUNT > 0
  noMatch: number             // EANs from feed not found in our DB
  errors: string[]
  startedAt: string
  finishedAt: string
}

interface CompleteItem {
  ean: string
  name: string
  amount: number
  priceVat: number
  standardPrice: number
  actionPrice: number | null
  effectivePrice: number
  availabilityNote: string | null  // AVAILABILITY_OUT_OF_STOCK text (null if in stock)
  inStock: boolean
}

// ─── XML parser ─────────────────────────────────────────────────────────────

function getXmlField(text: string, field: string): string {
  const m = text.match(new RegExp(`<${field}>([\\s\\S]*?)<\\/${field}>`))
  return m ? m[1].trim() : ''
}

function getNestedField(text: string, outer: string, inner: string): string {
  const m = text.match(new RegExp(`<${outer}>([\\s\\S]*?)<\\/${outer}>`))
  if (!m) return ''
  return getXmlField(m[1], inner)
}

function parseCompleteXml(xml: string): CompleteItem[] {
  const items: CompleteItem[] = []
  const itemRe = /<SHOPITEM id="\d+">([\s\S]*?)<\/SHOPITEM>/g
  let m: RegExpExecArray | null

  while ((m = itemRe.exec(xml)) !== null) {
    const body = m[1]
    const ean = getXmlField(body, 'EAN')
    const name = getXmlField(body, 'NAME')

    // Filter: only olive oil items (skip cosmetics, food, etc.)
    const nameLower = name.toLowerCase()
    if (!nameLower.includes('olivov') && !nameLower.includes('olive oil')) continue
    if (!nameLower.includes('5 l') && !nameLower.includes('5l') && !nameLower.includes('5000')) continue

    // Skip shop-internal EANs (7777xxxxx) — URL-matched via Heureka feed
    if (!ean || ean.startsWith('7777')) continue

    const amountStr = getNestedField(body, 'STOCK', 'AMOUNT')
    const amount = parseInt(amountStr || '0', 10) || 0
    const priceVat = parseFloat(getXmlField(body, 'PRICE_VAT') || '0') || 0
    const standardPrice = parseFloat(getXmlField(body, 'STANDARD_PRICE') || '0') || 0
    const actionPriceStr = getXmlField(body, 'ACTION_PRICE')
    const actionPrice = actionPriceStr ? parseFloat(actionPriceStr) : null
    const inStock = amount > 0

    const rawNote = getXmlField(body, 'AVAILABILITY_OUT_OF_STOCK')
    // Only store note when out of stock and there's useful info (not just "Vyprodáno")
    const availabilityNote = (!inStock && rawNote && rawNote !== 'Vyprodáno') ? rawNote : null

    items.push({
      ean,
      name,
      amount,
      priceVat,
      standardPrice,
      actionPrice,
      effectivePrice: actionPrice ?? priceVat,
      availabilityNote,
      inStock,
    })
  }

  return items
}

// ─── Main sync ───────────────────────────────────────────────────────────────

export async function syncReckonasbavyComplete(): Promise<CompleteSyncResult | null> {
  const feedUrl = process.env.RECKONASBAVI_COMPLETE_FEED_URL
  if (!feedUrl) {
    console.log('[complete-sync] RECKONASBAVI_COMPLETE_FEED_URL not set — skipping')
    return null
  }

  const startedAt = new Date().toISOString()
  const errors: string[] = []

  // 1. Fetch XML
  let xml: string
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'OlivatorBot/1.0 (+https://olivator.cz)' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    xml = await res.text()
  } catch (err) {
    return {
      feedItems: 0, oilsFound: 0, offersUpdated: 0, overridesCleared: 0, noMatch: 0,
      errors: [`Feed fetch failed: ${err instanceof Error ? err.message : String(err)}`],
      startedAt, finishedAt: new Date().toISOString(),
    }
  }

  // 2. Parse
  const items = parseCompleteXml(xml)
  // Count total SHOPITEM tags for reporting
  const totalItems = (xml.match(/<SHOPITEM /g) ?? []).length

  // 3. Look up the reckonasbavi retailer
  const { data: retailer } = await supabaseAdmin
    .from('retailers')
    .select('id')
    .eq('slug', 'reckonasbavi')
    .maybeSingle()

  if (!retailer) {
    return {
      feedItems: totalItems, oilsFound: items.length, offersUpdated: 0, overridesCleared: 0,
      noMatch: items.length,
      errors: ['Retailer "reckonasbavi" not found in DB'],
      startedAt, finishedAt: new Date().toISOString(),
    }
  }

  const retailerId = retailer.id as string

  // 4. Build EAN → product_id map (non-null EANs in our DB)
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, ean')
    .not('ean', 'is', null)
    .in('status', ['active', 'draft', 'inactive'])

  const eanToProductId = new Map<string, string>()
  for (const p of products ?? []) {
    if (p.ean) eanToProductId.set(p.ean as string, p.id as string)
  }

  // 5. Fetch existing reckonasbavi offers (to check manual_override)
  const { data: existingOffers } = await supabaseAdmin
    .from('product_offers')
    .select('id, product_id, in_stock, manual_override, price')
    .eq('retailer_id', retailerId)

  const offerByProductId = new Map<string, { id: string; manual_override: boolean; price: number }>()
  for (const o of existingOffers ?? []) {
    offerByProductId.set(o.product_id as string, {
      id: o.id as string,
      manual_override: (o.manual_override as boolean) ?? false,
      price: (o.price as number) ?? 0,
    })
  }

  // 6. Update offers
  let offersUpdated = 0
  let overridesCleared = 0
  let noMatch = 0

  for (const item of items) {
    const productId = eanToProductId.get(item.ean)
    if (!productId) {
      noMatch++
      continue
    }

    const existing = offerByProductId.get(productId)

    // If AMOUNT > 0 and there's an active manual_override → clear it (Complete is authoritative)
    const clearOverride = item.inStock && existing?.manual_override === true
    if (clearOverride) overridesCleared++

    const updatePayload: Record<string, unknown> = {
      in_stock: item.inStock,
      // priceVat = regular selling price (reference); action_price = promotional price.
      // effectivePrice is only used internally for price_history logging — not stored as price.
      price: item.priceVat,
      last_checked: new Date().toISOString(),
      availability_note: item.availabilityNote,
      action_price: item.actionPrice,
      ...(item.actionPrice != null ? { action_price_start: new Date().toISOString().split('T')[0] } : {}),
    }

    if (clearOverride) {
      updatePayload.manual_override = false
      updatePayload.override_note = null
    }

    // Manual override that should stay (AMOUNT=0): don't clear, just update stock+price.
    // in_stock=false is consistent with manual_override=true (both say unavailable).

    if (existing) {
      const { error } = await supabaseAdmin
        .from('product_offers')
        .update(updatePayload)
        .eq('id', existing.id)
      if (error) {
        errors.push(`Update offer (EAN ${item.ean}): ${error.message}`)
      } else {
        offersUpdated++
        // Log to price_history on every price change (powers /slevy 30d baseline)
        const priceChanged = Math.abs(existing.price - item.effectivePrice) > 0.01
        if (priceChanged || clearOverride) {
          await supabaseAdmin.from('price_history').insert({
            product_id: productId,
            retailer_id: retailerId,
            price: item.effectivePrice,
            in_stock: item.inStock,
          })
        }
      }
    }
    // No offer at all: Complete sync doesn't create new offers (Heureka handles that)
  }

  console.log(
    `[complete-sync] ${items.length} 5L oils found | ${offersUpdated} offers updated | ` +
    `${overridesCleared} overrides cleared | ${noMatch} EANs not in DB`
  )

  return {
    feedItems: totalItems,
    oilsFound: items.length,
    offersUpdated,
    overridesCleared,
    noMatch,
    errors,
    startedAt,
    finishedAt: new Date().toISOString(),
  }
}
