import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/data'
import { getArticles, getRankings } from '@/lib/static-content'
import { supabaseAdmin } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://olivator.cz'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/srovnavac`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/porovnani`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/zebricek`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/pruvodce`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/recept`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/metodika`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const [products, regions, brands, cultivars] = await Promise.all([
    getProducts(),
    supabaseAdmin.from('regions').select('slug').then((r) => r.data ?? []),
    supabaseAdmin.from('brands').select('slug').then((r) => r.data ?? []),
    supabaseAdmin.from('cultivars').select('slug').then((r) => r.data ?? []),
  ])

  const productPages: MetadataRoute.Sitemap = products.map(p => ({
    url: `${baseUrl}/olej/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const rankingPages: MetadataRoute.Sitemap = getRankings().map(r => ({
    url: `${baseUrl}/zebricek/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const articlePages: MetadataRoute.Sitemap = getArticles().map(a => ({
    url: `${baseUrl}/${a.category === 'recept' ? 'recept' : 'pruvodce'}/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const regionPages: MetadataRoute.Sitemap = (regions as { slug: string }[]).map(r => ({
    url: `${baseUrl}/oblast/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))

  const brandPages: MetadataRoute.Sitemap = (brands as { slug: string }[]).map(b => ({
    url: `${baseUrl}/znacka/${b.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const cultivarPages: MetadataRoute.Sitemap = (cultivars as { slug: string }[]).map(c => ({
    url: `${baseUrl}/odruda/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...productPages, ...rankingPages, ...articlePages, ...regionPages, ...brandPages, ...cultivarPages]
}
