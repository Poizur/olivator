// Template variable resolver — nahradí {{var.name}} v textech live hodnotami z DB.
// Použití: server-side preprocesing před render.
//
// Tokeny:
//   {{products.count}}            → 60 (active products)
//   {{products.totalCount}}       → 65 (vč. drafts)
//   {{retailers.count}}           → 18
//   {{retailers.activeCount}}     → 15
//   {{regions.count}}             → 12
//   {{cultivars.count}}           → 10
//   {{brands.count}}              → 8
//   {{date.year}}                 → 2026
//
// Link tokeny:
//   {{link:srovnavac|srovnávač}}             → <a href="/srovnavac">srovnávač</a>
//   {{link:oblast/apulie|Apulie}}            → <a href="/oblast/apulie">Apulie</a>
//   {{link:olej/some-slug|tento olej}}       → <a href="/olej/...">tento olej</a>
//
// Produktové karty:
//   {{product:picual-5-l-extra-panensky-...}} → ArticleProductCard s živými daty
//   Resolver sáhne do DB, vrátí ArticleProductData; renderer vykreslí kartu.
//   Neexistující slug → console.warn + prázdný řádek (uživatel nevidí chybu).
//   Validátor (lib/article-validator.ts) kontroluje existenci tokenu při publish.
//
// Pro markdown rendering: link tokeny se nahrazují za markdown link [text](path)
// Pro HTML rendering: za <a href="path">text</a>

import { supabaseAdmin } from './supabase'

// ── Produktové karty ──────────────────────────────────────────────────────────

export interface ArticleProductData {
  slug: string
  name: string
  nameShort: string | null
  olivatorScore: number | null
  acidity: number | null
  polyphenols: number | null
  originCountry: string | null
  volumeMl: number | null
  imageUrl: string | null
  cheapestPrice: number | null
  retailerSlug: string | null  // pro /go/retailer-slug/product-slug
}

// Interní marker — ArticleBody ho rozpozná jako product-card blok.
// Nesmí obsahovat znaky běžné v markdownu (*, #, [], atd.).
export const PRODUCT_CARD_MARKER = '__PC:'
export const PRODUCT_MISSING_MARKER = '__PM:'

// Lead magnet CTA marker — {{leadmagnet}} → __LM__ → <LeadMagnetCta compact />
export const LEAD_MAGNET_MARKER = '__LM__'

/** Najde všechny {{product:slug}} tokeny, fetchne z DB a vrátí:
 *  - processedBody: body s markery namísto tokenů
 *  - productMap: slug → data pro ArticleBody renderer
 *
 *  Neexistující slug → PRODUCT_MISSING_MARKER + console.warn (uživatel
 *  nevidí chybu, validátor to zachytí při publish). */
export async function resolveProductTokens(body: string): Promise<{
  processedBody: string
  productMap: Map<string, ArticleProductData>
}> {
  const productMap = new Map<string, ArticleProductData>()

  // Lead magnet CTA token
  const bodyWithLm = body.replace(/\{\{leadmagnet\}\}/g, LEAD_MAGNET_MARKER)

  if (!bodyWithLm.includes('{{product:')) {
    return { processedBody: bodyWithLm, productMap }
  }

  // Collect unique slugs
  const slugSet = new Set<string>()
  const tokenRe = /\{\{product:([\w-]+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(bodyWithLm)) !== null) {
    slugSet.add(m[1])
  }
  const slugs = [...slugSet]

  // Fetch products
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, olivator_score, acidity, polyphenols, origin_country, volume_ml, image_url')
    .in('slug', slugs)
    .eq('status', 'active')

  if (products && products.length > 0) {
    const idToSlug = new Map<string, string>()
    const idToData = new Map<string, ArticleProductData>()

    for (const p of products as any[]) {
      const d: ArticleProductData = {
        slug: p.slug,
        name: p.name,
        nameShort: p.name_short ?? null,
        olivatorScore: p.olivator_score ?? null,
        acidity: p.acidity ?? null,
        polyphenols: p.polyphenols ?? null,
        originCountry: p.origin_country ?? null,
        volumeMl: p.volume_ml ?? null,
        imageUrl: p.image_url ?? null,
        cheapestPrice: null,
        retailerSlug: null,
      }
      productMap.set(p.slug, d)
      idToSlug.set(p.id, p.slug)
      idToData.set(p.id, d)
    }

    // Fetch cheapest in-stock offer + retailer slug (single query, cheapest first)
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('product_id, price, retailer:retailers(slug)')
      .in('product_id', [...idToSlug.keys()])
      .eq('in_stock', true)
      .not('retailer_id', 'is', null)
      .order('price', { ascending: true })

    const seen = new Set<string>()
    for (const o of (offers ?? []) as any[]) {
      if (seen.has(o.product_id)) continue
      seen.add(o.product_id)
      const d = idToData.get(o.product_id)
      if (!d) continue
      d.cheapestPrice = Number(o.price)
      const rSlug = (o.retailer as any)?.slug ?? null
      if (!rSlug) {
        console.error(`[article-token] product_offers row bez retailer slug, product_id=${o.product_id}`)
      }
      d.retailerSlug = rSlug
    }
  }

  // Replace tokens with markers
  const processedBody = bodyWithLm.replace(/\{\{product:([\w-]+)\}\}/g, (_, slug) => {
    if (productMap.has(slug)) {
      return `${PRODUCT_CARD_MARKER}${slug}__`
    }
    console.warn(`[article-token] {{product:${slug}}} — slug nenalezen v DB`)
    return `${PRODUCT_MISSING_MARKER}${slug}__`
  })

  return { processedBody, productMap }
}

interface SiteStats {
  productsCount: number
  productsTotal: number
  retailersCount: number
  retailersActive: number
  regionsCount: number
  cultivarsCount: number
  brandsCount: number
  year: number
}

let cachedStats: { stats: SiteStats; expiresAt: number } | null = null
const CACHE_MS = 60_000 // 1 min — dost na to aby sites stats nebyly out-of-date

async function getSiteStats(): Promise<SiteStats> {
  const now = Date.now()
  if (cachedStats && cachedStats.expiresAt > now) return cachedStats.stats

  // Inline queries — typed access without wrapper helper
  const queries = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('retailers').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('retailers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('regions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('cultivars').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('brands').select('*', { count: 'exact', head: true }),
  ])

  const [productsActive, productsTotal, retailersTotal, retailersActive, regions, cultivars, brands] =
    queries.map((q) => q.count ?? 0)

  const stats: SiteStats = {
    productsCount: productsActive,
    productsTotal,
    retailersCount: retailersTotal,
    retailersActive,
    regionsCount: regions,
    cultivarsCount: cultivars,
    brandsCount: brands,
    year: new Date().getFullYear(),
  }

  cachedStats = { stats, expiresAt: now + CACHE_MS }
  return stats
}

const VAR_PATTERN = /\{\{([a-zA-Z]+)\.([a-zA-Z]+)\}\}/g
// Format: {{link:path|label}} OR {{link:path}} (label = path tail)
const LINK_PATTERN = /\{\{link:([^|}]+)(?:\|([^}]+))?\}\}/g

export type RenderMode = 'markdown' | 'html'

/**
 * Resolves all template tokens in text. Default mode: markdown (link as `[text](url)`).
 * HTML mode wraps with `<a href="...">...</a>`.
 */
export async function resolveTemplateVars(
  text: string | null | undefined,
  mode: RenderMode = 'markdown'
): Promise<string> {
  if (!text) return ''
  if (!text.includes('{{')) return text  // fast path — no tokens

  const stats = await getSiteStats()

  // Step 1 — replace var tokens
  let out = text.replace(VAR_PATTERN, (_match, group, key) => {
    const lookup: Record<string, Record<string, number | string>> = {
      products: {
        count: stats.productsCount,
        totalCount: stats.productsTotal,
        activeCount: stats.productsCount,
      },
      retailers: {
        count: stats.retailersCount,
        activeCount: stats.retailersActive,
      },
      regions: { count: stats.regionsCount },
      cultivars: { count: stats.cultivarsCount },
      brands: { count: stats.brandsCount },
      date: { year: stats.year },
    }
    const value = lookup[group]?.[key]
    if (value == null) return `{{${group}.${key}}}` // unknown — leave intact
    return String(value)
  })

  // Step 2 — replace link tokens
  out = out.replace(LINK_PATTERN, (_match, path, label) => {
    const cleanPath = path.trim().replace(/^\/+/, '')
    const url = `/${cleanPath}`
    const text = (label ?? cleanPath.split('/').pop() ?? '').trim()
    if (mode === 'html') {
      return `<a href="${url}" class="text-olive border-b border-olive-border hover:border-olive">${text}</a>`
    }
    return `[${text}](${url})`
  })

  return out
}

/** Synchronní variant pokud máš stats už v ruce (např. server component je předal). */
export function resolveTemplateVarsSync(
  text: string,
  stats: SiteStats,
  mode: RenderMode = 'markdown'
): string {
  if (!text.includes('{{')) return text

  let out = text.replace(VAR_PATTERN, (_match, group, key) => {
    const lookup: Record<string, Record<string, number | string>> = {
      products: { count: stats.productsCount, totalCount: stats.productsTotal, activeCount: stats.productsCount },
      retailers: { count: stats.retailersCount, activeCount: stats.retailersActive },
      regions: { count: stats.regionsCount },
      cultivars: { count: stats.cultivarsCount },
      brands: { count: stats.brandsCount },
      date: { year: stats.year },
    }
    const value = lookup[group]?.[key]
    return value != null ? String(value) : `{{${group}.${key}}}`
  })

  out = out.replace(LINK_PATTERN, (_match, path, label) => {
    const cleanPath = path.trim().replace(/^\/+/, '')
    const url = `/${cleanPath}`
    const text = (label ?? cleanPath.split('/').pop() ?? '').trim()
    return mode === 'html'
      ? `<a href="${url}" class="text-olive border-b border-olive-border hover:border-olive">${text}</a>`
      : `[${text}](${url})`
  })

  return out
}
