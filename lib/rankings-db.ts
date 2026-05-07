// Rankings z DB tabulky rankings (od 2026-05-07).
// Static fallback v lib/static-content.ts zůstává pro backwards compat,
// ale DB je primary zdroj.

import { supabaseAdmin } from './supabase'

export interface RankingFromDb {
  slug: string
  title: string
  description: string | null
  emoji: string | null
  category: string
  productSlugs: string[]
  metaTitle: string | null
  metaDescription: string | null
  heroImageUrl: string | null
  position: number
}

interface RankingRow {
  slug: string
  title: string
  description: string | null
  emoji: string | null
  category: string
  product_slugs: string[]
  meta_title: string | null
  meta_description: string | null
  hero_image_url: string | null
  position: number
  status: string
}

function mapRow(r: RankingRow): RankingFromDb {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    emoji: r.emoji,
    category: r.category,
    productSlugs: r.product_slugs ?? [],
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    heroImageUrl: r.hero_image_url,
    position: r.position,
  }
}

export async function getActiveRankings(): Promise<RankingFromDb[]> {
  const { data, error } = await supabaseAdmin
    .from('rankings')
    .select('slug, title, description, emoji, category, product_slugs, meta_title, meta_description, hero_image_url, position, status')
    .eq('status', 'active')
    .order('position', { ascending: true })

  if (error) {
    console.error('[rankings-db] getActiveRankings failed:', error.message)
    return []
  }
  return ((data ?? []) as RankingRow[]).map(mapRow)
}

export async function getRankingBySlug(slug: string): Promise<RankingFromDb | null> {
  const { data, error } = await supabaseAdmin
    .from('rankings')
    .select('slug, title, description, emoji, category, product_slugs, meta_title, meta_description, hero_image_url, position, status')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return mapRow(data as RankingRow)
}
