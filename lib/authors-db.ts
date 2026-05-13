import { supabaseAdmin } from './supabase'

export interface Author {
  id: string
  slug: string
  name: string
  bioShort: string | null
  bioFull: string | null
  voiceGuidelines: string | null
  imageUrl: string | null
  email: string | null
  schemaMetadata: Record<string, unknown> | null
  createdAt: string
}

interface AuthorRow {
  id: string
  slug: string
  name: string
  bio_short: string | null
  bio_full: string | null
  voice_guidelines: string | null
  image_url: string | null
  email: string | null
  schema_metadata: Record<string, unknown> | null
  created_at: string
}

function rowToAuthor(r: AuthorRow): Author {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    bioShort: r.bio_short,
    bioFull: r.bio_full,
    voiceGuidelines: r.voice_guidelines,
    imageUrl: r.image_url,
    email: r.email,
    schemaMetadata: r.schema_metadata,
    createdAt: r.created_at,
  }
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  try {
    const { data } = await supabaseAdmin
      .from('authors')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return null
    return rowToAuthor(data as AuthorRow)
  } catch {
    return null
  }
}

export interface AuthorArticle {
  slug: string
  title: string
  excerpt: string | null
  emoji: string | null
  readTime: string | null
  heroImageUrl: string | null
  category: string
  publishedAt: string | null
}

export async function getArticlesByAuthor(
  authorSlug: string,
  opts: { limit?: number } = {}
): Promise<AuthorArticle[]> {
  const limit = opts.limit ?? 12
  try {
    // Join přes author_id (vyžaduje migration 20260512_olik_sprint_den1.sql)
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select(
        'slug, title, excerpt, emoji, read_time, hero_image_url, category, published_at, authors!inner(slug)'
      )
      .eq('status', 'active')
      .eq('authors.slug', authorSlug)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) {
      // Fallback: author_id column ještě neexistuje → vrátit všechny aktivní články
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('author')
      ) {
        return getArticlesAllActive(limit)
      }
      throw error
    }
    return (data ?? []).map((r) => ({
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string | null,
      emoji: r.emoji as string | null,
      readTime: r.read_time as string | null,
      heroImageUrl: r.hero_image_url as string | null,
      category: r.category as string,
      publishedAt: r.published_at as string | null,
    }))
  } catch {
    return getArticlesAllActive(limit)
  }
}

async function getArticlesAllActive(limit: number): Promise<AuthorArticle[]> {
  try {
    const { data } = await supabaseAdmin
      .from('articles')
      .select('slug, title, excerpt, emoji, read_time, hero_image_url, category, published_at')
      .eq('status', 'active')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)
    return (data ?? []).map((r) => ({
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string | null,
      emoji: r.emoji as string | null,
      readTime: r.read_time as string | null,
      heroImageUrl: r.hero_image_url as string | null,
      category: r.category as string,
      publishedAt: r.published_at as string | null,
    }))
  } catch {
    return []
  }
}
