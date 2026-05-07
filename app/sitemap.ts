import type { MetadataRoute } from 'next'
import { getArticles, getRankings } from '@/lib/static-content'
import { supabaseAdmin } from '@/lib/supabase'

// Sitemap default = dynamic (každý bot request → fetchne ze Supabase).
// Google + Bing + OpenAI/Anthropic crawlers chodí denně → 4× fetch products
// + 3× entity tables. 6h cache je dostatečná: nové produkty se v sitemapě
// objeví max 6h zpožděně, což nevadí.
export const revalidate = 21600

/** Reálný updated_at z DB řekne Googlu kdy se stránka skutečně změnila.
 *  `new Date()` na všem = každý fetch sitemapy = "vše se změnilo dnes" =
 *  Google ignoruje crawl budget, refetchuje stránky které se nezměnily. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://olivator.cz'
  const buildTime = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: buildTime, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/srovnavac`, lastModified: buildTime, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/porovnani`, lastModified: buildTime, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/zebricek`, lastModified: buildTime, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/pruvodce`, lastModified: buildTime, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/recept`, lastModified: buildTime, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/novinky`, lastModified: buildTime, changeFrequency: 'hourly', priority: 0.6 },
    { url: `${baseUrl}/metodika`, lastModified: buildTime, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const [productsRes, regions, brands, cultivars] = await Promise.all([
    supabaseAdmin.from('products').select('slug, updated_at').eq('status', 'active'),
    supabaseAdmin.from('regions').select('slug, updated_at').eq('status', 'active'),
    supabaseAdmin.from('brands').select('slug, updated_at').eq('status', 'active'),
    supabaseAdmin.from('cultivars').select('slug, updated_at').eq('status', 'active'),
  ])

  const products = (productsRes.data ?? []) as { slug: string; updated_at: string | null }[]

  function dt(iso: string | null | undefined): Date {
    if (!iso) return buildTime
    const d = new Date(iso)
    return isNaN(d.getTime()) ? buildTime : d
  }

  const productPages: MetadataRoute.Sitemap = products.map(p => ({
    url: `${baseUrl}/olej/${p.slug}`,
    lastModified: dt(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Rankings jsou statický seznam v lib/static-content.ts — bez updated_at.
  // Použij buildTime (refresh při deployi nového rankingu).
  const rankingPages: MetadataRoute.Sitemap = getRankings().map(r => ({
    url: `${baseUrl}/zebricek/${r.slug}`,
    lastModified: buildTime,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Static articles z lib/static-content.ts nemají published_at v DB →
  // použij buildTime. Až budeme mít plný DB-driven content systém s
  // articles + recipes tabulkami, vyměníme za reálné published_at.
  const articlePages: MetadataRoute.Sitemap = getArticles().map(a => ({
    url: `${baseUrl}/${a.category === 'recept' ? 'recept' : 'pruvodce'}/${a.slug}`,
    lastModified: buildTime,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const regionPages: MetadataRoute.Sitemap = (regions.data ?? []).map((r: { slug: string; updated_at: string | null }) => ({
    url: `${baseUrl}/oblast/${r.slug}`,
    lastModified: dt(r.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))

  const brandPages: MetadataRoute.Sitemap = (brands.data ?? []).map((b: { slug: string; updated_at: string | null }) => ({
    url: `${baseUrl}/znacka/${b.slug}`,
    lastModified: dt(b.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const cultivarPages: MetadataRoute.Sitemap = (cultivars.data ?? []).map((c: { slug: string; updated_at: string | null }) => ({
    url: `${baseUrl}/odruda/${c.slug}`,
    lastModified: dt(c.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...productPages, ...rankingPages, ...articlePages, ...regionPages, ...brandPages, ...cultivarPages]
}
