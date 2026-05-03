// DB-backed article loader (pruvodce/zebricek/srovnani/vzdelavani).
// Public stránky používají tyto funkce, fallback na static pro recepty
// a stará data ze static-content.ts.

import { supabaseAdmin } from './supabase'

export interface ArticleFull {
  id: string
  slug: string
  title: string
  excerpt: string | null
  emoji: string | null
  readTime: string | null
  heroImageUrl: string | null
  category: string
  bodyMarkdown: string | null
  metaTitle: string | null
  metaDescription: string | null
  status: string
  source: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ArticleSummary {
  slug: string
  title: string
  excerpt: string | null
  emoji: string | null
  readTime: string | null
  heroImageUrl: string | null
  category: string
  publishedAt: string | null
}

interface Row {
  id: string
  slug: string
  title: string
  excerpt: string | null
  emoji: string | null
  read_time: string | null
  hero_image_url: string | null
  category: string
  body_markdown: string | null
  meta_title: string | null
  meta_description: string | null
  status: string
  source: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

function rowToFull(r: Row): ArticleFull {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    emoji: r.emoji,
    readTime: r.read_time,
    heroImageUrl: r.hero_image_url,
    category: r.category,
    bodyMarkdown: r.body_markdown,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    status: r.status,
    source: r.source,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function rowToSummary(r: Row): ArticleSummary {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    emoji: r.emoji,
    readTime: r.read_time,
    heroImageUrl: r.hero_image_url,
    category: r.category,
    publishedAt: r.published_at,
  }
}

export async function getActiveArticles(category?: string): Promise<ArticleSummary[]> {
  try {
    let q = supabaseAdmin
      .from('articles')
      .select(
        'slug, title, excerpt, emoji, read_time, hero_image_url, category, published_at'
      )
      .eq('status', 'active')
    if (category) q = q.eq('category', category)
    const { data, error } = await q.order('published_at', {
      ascending: false,
      nullsFirst: false,
    })
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return []
      throw error
    }
    return (data ?? []).map((r) => rowToSummary(r as Row))
  } catch {
    return []
  }
}

export async function getAllArticles(): Promise<ArticleFull[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return []
      throw error
    }
    return (data ?? []).map((r) => rowToFull(r as Row))
  } catch {
    return []
  }
}

export async function getArticleBySlug(slug: string): Promise<ArticleFull | null> {
  try {
    const { data } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return null
    return rowToFull(data as Row)
  } catch {
    return null
  }
}
