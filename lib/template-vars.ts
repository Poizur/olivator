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
// Pro markdown rendering: link tokeny se nahrazují za markdown link [text](path)
// Pro HTML rendering: za <a href="path">text</a>

import { supabaseAdmin } from './supabase'

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
