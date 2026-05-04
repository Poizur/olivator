// Feed sync orchestrátor — z XML feedu retailera vytvoří/aktualizuje produkty
// a nabídky v naší DB. Volá se z admin UI (POST /api/admin/retailers/[id]/sync-feed)
// nebo z budoucího cron jobu.
//
// Strategie:
// - existing product (match na EAN) → upsert offer (cena, dostupnost), neměníme
//   produkt samotný (manuální edity přežijí)
// - nový EAN → vytvoříme draft product (status='draft') s minimal daty z XML
//   (EAN, name, slug, type, origin_country=GR, acidity, peroxide, volume_ml,
//   source_url, raw_description) + offer s cenou
// - draft user schválí v admin UI → status='active' → live na webu

import { supabaseAdmin } from './supabase'
import {
  fetchHeurekaFeed,
  isOliveOil,
  extractVolumeMl,
  extractAcidity,
  extractPeroxideValue,
  detectPackaging,
  detectType,
  isSuspectEan,
  normalizeEan,
  type HeurekaItem,
} from './heureka-feed-parser'
import { slugify } from './utils'
import { runRescrape } from './product-rescrape'
import { linkAndRecomputeForProduct } from './entity-aggregator'

// Default země původu per XML retailer. Bez tohoto by všechny XML produkty
// dostaly hardcode 'GR' (původně reckonasbavi-only). Italyshop má italský
// sortiment, takže italské oleje musí mít originCountry='IT'.
//
// Pro retailery které nejsou v mapě → null = origin se neuhádl, admin
// musí v draftu vyplnit ručně (rescrape Playwright pak často odhadne z webu).
const RETAILER_DEFAULT_ORIGIN: Record<string, string | null> = {
  reckonasbavi: 'GR',
  italyshop: 'IT',
  reckyeshop: 'GR',
}

export interface FeedSyncResult {
  total: number
  oilsInFeed: number
  productsCreated: number
  productsExisting: number  // matched přes EAN
  offersUpserted: number
  skipped: number
  autoRescraped: number     // kolik nových draftů úspěšně proběhlo plnou pipeline
  autoRescrapeFailed: number
  errors: { ean: string; name: string; reason: string }[]
  startedAt: string
  finishedAt: string
}

export async function syncRetailerFeed(retailerId: string): Promise<FeedSyncResult> {
  const startedAt = new Date().toISOString()

  const { data: retailer, error: rErr } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, default_commission_pct, xml_feed_url, xml_feed_format')
    .eq('id', retailerId)
    .maybeSingle()
  if (rErr) throw new Error(`Retailer query failed: ${rErr.message}`)
  if (!retailer) throw new Error(`Retailer ${retailerId} nenalezen`)
  if (!retailer.xml_feed_url) throw new Error('Retailer nemá nastavený XML feed URL')
  if (retailer.xml_feed_format !== 'heureka') {
    throw new Error(`Format "${retailer.xml_feed_format}" zatím není podporován (pouze heureka)`)
  }

  const items = await fetchHeurekaFeed(retailer.xml_feed_url as string)
  const oils = items.filter(isOliveOil)

  // Země původu pro tuto retailer cestu — použijeme do ensureProduct
  // (origin_country pro nový draft) a linkAndRecomputeForProduct (region_slug).
  const defaultOriginCountry = RETAILER_DEFAULT_ORIGIN[retailer.slug as string] ?? null

  const result: FeedSyncResult = {
    total: items.length,
    oilsInFeed: oils.length,
    productsCreated: 0,
    productsExisting: 0,
    offersUpserted: 0,
    skipped: 0,
    autoRescraped: 0,
    autoRescrapeFailed: 0,
    errors: [],
    startedAt,
    finishedAt: '',
  }

  // Sbíráme ID nově vytvořených produktů — po offer upsert spustíme plnou
  // rescrape pipeline (Playwright + AI fakta + flavor + lab scan + popisy +
  // Score). Cíl: drafty přicházejí na admin schválení KOMPLETNĚ vyplněné.
  const newDraftIds: string[] = []

  for (const item of oils) {
    // Cena je jediný hard requirement — bez ceny offer postrádá smysl.
    // EAN může chybět nebo být shop-internal (farmářské oleje typu Evoilino),
    // ensureProduct si poradí přes source_url fallback.
    if (item.priceVat <= 0) {
      result.errors.push({
        ean: item.ean || '(prázdný)',
        name: item.productName,
        reason: 'Neplatná cena',
      })
      result.skipped++
      continue
    }
    if (!item.url) {
      result.errors.push({
        ean: item.ean || '(prázdný)',
        name: item.productName,
        reason: 'Chybí product URL — nelze deduplikovat ani vytvořit offer',
      })
      result.skipped++
      continue
    }

    try {
      const { productId, created, excluded } = await ensureProduct(item, defaultOriginCountry)

      // Blocklist: admin tento produkt vyřadil → nedělej upsert offer ani
      // price_history. Záznam zůstává, ale sync ho neaktualizuje.
      if (excluded) {
        result.errors.push({
          ean: item.ean || '(prázdný)',
          name: item.productName,
          reason: 'Produkt na blocklistu (status=excluded)',
        })
        result.skipped++
        continue
      }

      if (created) {
        result.productsCreated++
        newDraftIds.push(productId)
      } else {
        result.productsExisting++
      }

      const inStock = item.deliveryDate === '0' || item.deliveryDate === ''
      const priceCzk = Math.round(item.priceVat * 100) / 100

      const { error: offerErr } = await supabaseAdmin
        .from('product_offers')
        .upsert(
          {
            product_id: productId,
            retailer_id: retailer.id,
            price: priceCzk,
            currency: 'CZK',
            in_stock: inStock,
            product_url: item.url,
            commission_pct: retailer.default_commission_pct,
            last_checked: new Date().toISOString(),
          },
          { onConflict: 'product_id,retailer_id' }
        )
      if (offerErr) throw new Error(`Offer upsert: ${offerErr.message}`)

      // Price history snapshot — pro Fáze 2 graf
      await supabaseAdmin.from('price_history').insert({
        product_id: productId,
        retailer_id: retailer.id,
        price: priceCzk,
        in_stock: inStock,
      })

      result.offersUpserted++
    } catch (err) {
      result.errors.push({
        ean: item.ean,
        name: item.productName,
        reason: err instanceof Error ? err.message : String(err),
      })
      result.skipped++
    }
  }

  // ── Auto-rescrape: pro každý nový draft pustíme plnou pipeline.
  // 30-90s per produkt. Pokud feed-sync má 5 nových, +5-8 min. Hard
  // timeout 15 min (cron killTimer) udělá průchod přes ~10 produktů.
  // Errory per produkt jsou izolované — best effort. Cena má prioritu
  // (offer už uložen výše); pokud rescrape failne, draft zůstává s
  // minimálními daty a admin ho může rescrapovat ručně.
  for (const newId of newDraftIds) {
    try {
      await runRescrape(newId)
      result.autoRescraped++
    } catch (err) {
      result.autoRescrapeFailed++
      console.warn(`[feed-sync] auto-rescrape failed for ${newId}:`, err)
    }
  }

  result.finishedAt = new Date().toISOString()

  await supabaseAdmin
    .from('retailers')
    .update({
      xml_feed_last_synced: result.finishedAt,
      xml_feed_last_result: result as unknown as Record<string, unknown>,
    })
    .eq('id', retailer.id)

  return result
}

async function ensureProduct(
  item: HeurekaItem,
  defaultOriginCountry: string | null
): Promise<{ productId: string; created: boolean; excluded?: boolean }> {
  // 1) Match přes EAN — jen když je validní GTIN-13 / UPC-A. Shop-internal
  //    placeholdery (7777770000xxx) ukládáme jako null, dedupujeme přes URL.
  const normalizedEan = normalizeEan(item.ean)
  const validEan = normalizedEan && !isSuspectEan(normalizedEan) ? normalizedEan : null

  if (validEan) {
    const { data: existing, error: queryErr } = await supabaseAdmin
      .from('products')
      .select('id, status')
      .eq('ean', validEan)
      .maybeSingle()
    if (queryErr) throw new Error(`Product query (EAN): ${queryErr.message}`)
    if (existing) {
      return {
        productId: existing.id as string,
        created: false,
        excluded: (existing.status as string) === 'excluded',
      }
    }
  }

  // 2) Fallback match přes source_url — funguje pro farmářské / shop-internal
  //    oleje bez validního EANu (Evoilino, atd.). Deep link na produkt v shopu
  //    je per-product unique.
  const { data: byUrl, error: urlErr } = await supabaseAdmin
    .from('products')
    .select('id, status')
    .eq('source_url', item.url)
    .maybeSingle()
  if (urlErr) throw new Error(`Product query (URL): ${urlErr.message}`)
  if (byUrl) {
    return {
      productId: byUrl.id as string,
      created: false,
      excluded: (byUrl.status as string) === 'excluded',
    }
  }

  // 3) Vytvoř nový draft produkt. EAN ukládáme jen pokud je validní —
  //    placeholder 7777xxx by mohl kolizovat napříč shopy.
  const baseSlug = slugify(item.productName)
  const slug = await uniqueSlug(baseSlug)

  const { data: newProduct, error: insertErr } = await supabaseAdmin
    .from('products')
    .insert({
      ean: validEan,  // null pro shop-internal/farmářské oleje
      name: item.productName,
      slug,
      type: detectType(item),
      origin_country: defaultOriginCountry,  // per retailer; null = admin doplní
      acidity: extractAcidity(item),
      peroxide_value: extractPeroxideValue(item),
      volume_ml: extractVolumeMl(item),
      packaging: detectPackaging(item),
      source_url: item.url,
      raw_description: item.description,
      status: 'draft',
    })
    .select('id')
    .single()
  if (insertErr) throw new Error(`Product insert: ${insertErr.message}`)

  const productId = newProduct.id as string

  // Auto-create brand stub + region/cultivar links pro nový produkt.
  // Bez tohoto by /admin/brands ukazovala jen značky vytvořené discovery
  // agentem (Playwright cesta) — XML produkty by chyběly.
  // Best effort — selhání nesmí shodit feed sync.
  try {
    await linkAndRecomputeForProduct(
      productId,
      item.productName,
      defaultOriginCountry,
      null,           // origin_region — XML feed obvykle nemá, scrape doplní
      item.description
    )
  } catch (err) {
    console.warn(`[feed-sync] entity linking failed for ${productId}:`, err)
  }

  return { productId, created: true, excluded: false }
}

async function uniqueSlug(baseSlug: string, attempt = 0): Promise<string> {
  const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
  const { data } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('slug', candidate)
    .maybeSingle()
  if (!data) return candidate
  if (attempt > 50) throw new Error(`Slug ${baseSlug} kolize >50 — fix manuálně`)
  return uniqueSlug(baseSlug, attempt + 1)
}
