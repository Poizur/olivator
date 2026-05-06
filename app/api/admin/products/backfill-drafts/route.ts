// Bulk backfill draftů — dohraje to co automatizace neudělala / co bylo
// chybí ve starší verzi feed-sync (pred fix image_url + region fuzzy match).
//
// Pro každý draft:
//   1. image_url: pokud chybí, zkus og:image z source_url
//   2. meta_description: pokud chybí, Haiku auto-generate
//   3. brand_slug + region_slug: re-run linkAndRecomputeForProduct s novou
//      fuzzy logikou (extractRegionFromText)
//
// Sekvenčně, ne paralelně — Anthropic má rate limit + Supabase connection
// pool. 33 draftů × ~3s = ~1.5 min.
//
// POST /api/admin/products/backfill-drafts
// Volitelný query param: ?limit=10 (default 50)

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateMetaDescription } from '@/lib/content-agent'
import { linkAndRecomputeForProduct } from '@/lib/entity-aggregator'
import { load } from 'cheerio'

export const maxDuration = 800
export const dynamic = 'force-dynamic'

interface DraftRow {
  id: string
  name: string
  slug: string
  ean: string | null
  image_url: string | null
  source_url: string | null
  meta_description: string | null
  description_short: string | null
  origin_country: string | null
  origin_region: string | null
  acidity: number | null
  polyphenols: number | null
  certifications: string[] | null
  olivator_score: number | null
  brand_slug: string | null
  region_slug: string | null
  raw_description: string | null
}

const FETCH_TIMEOUT_MS = 8000

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'OlivatorBot/1.0 (+https://olivator.cz)',
        Accept: 'text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html')) return null
    const html = await res.text()
    const $ = load(html)
    // Pořadí: og:image > twitter:image > <link rel="image_src"> > první <img> v article/main
    const og = $('meta[property="og:image"]').attr('content')
    if (og) return new URL(og, url).toString()
    const tw = $('meta[name="twitter:image"]').attr('content')
    if (tw) return new URL(tw, url).toString()
    const linkSrc = $('link[rel="image_src"]').attr('href')
    if (linkSrc) return new URL(linkSrc, url).toString()
    // Fallback: large <img> v product-detail oblasti
    const productImg = $('article img, main img, .product-image img, .product-detail img')
      .filter((_, el) => {
        const w = Number($(el).attr('width'))
        return isNaN(w) || w > 200
      })
      .first()
      .attr('src')
    if (productImg) return new URL(productImg, url).toString()
    return null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '50')

  const { data: drafts, error } = await supabaseAdmin
    .from('products')
    .select(
      'id, name, slug, ean, image_url, source_url, meta_description, description_short, origin_country, origin_region, acidity, polyphenols, certifications, olivator_score, brand_slug, region_slug, raw_description'
    )
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{
    slug: string
    image: 'added' | 'skipped' | 'failed' | 'existed'
    meta: 'added' | 'skipped' | 'failed' | 'existed'
    region: 'added' | 'unchanged' | 'failed'
    error?: string
  }> = []

  for (const d of (drafts ?? []) as DraftRow[]) {
    const r: (typeof results)[number] = {
      slug: d.slug,
      image: 'skipped',
      meta: 'skipped',
      region: 'unchanged',
    }

    try {
      // 1. Image — pokud chybí, fetch og:image
      if (!d.image_url) {
        if (d.source_url) {
          const og = await fetchOgImage(d.source_url)
          if (og) {
            await supabaseAdmin
              .from('products')
              .update({ image_url: og, image_source: 'og_backfill', updated_at: new Date().toISOString() })
              .eq('id', d.id)
            r.image = 'added'
          } else {
            r.image = 'failed'
          }
        }
      } else {
        r.image = 'existed'
      }

      // 2. Meta description — pokud chybí, Claude Haiku
      if (!d.meta_description) {
        try {
          const meta = await generateMetaDescription({
            name: d.name,
            shortDescription: d.description_short ?? null,
            originCountry: d.origin_country ?? null,
            originRegion: d.origin_region ?? null,
            acidity: d.acidity ?? null,
            polyphenols: d.polyphenols ?? null,
            certifications: d.certifications ?? [],
            olivatorScore: d.olivator_score ?? null,
          })
          const trimmed = meta.length <= 160 ? meta : meta.slice(0, 160).replace(/\s+\S*$/, '') || meta.slice(0, 160)
          if (trimmed.length >= 50) {
            await supabaseAdmin
              .from('products')
              .update({ meta_description: trimmed })
              .eq('id', d.id)
            r.meta = 'added'
          } else {
            r.meta = 'failed'
          }
        } catch (err) {
          r.meta = 'failed'
          console.warn(`[backfill] meta gen failed for ${d.slug}:`, err instanceof Error ? err.message : err)
        }
      } else {
        r.meta = 'existed'
      }

      // 3. Region + brand re-detection (new fuzzy logic)
      try {
        await linkAndRecomputeForProduct(
          d.id,
          d.name,
          d.origin_country,
          d.origin_region,
          d.raw_description
        )
        // Re-fetch to see if region_slug got populated
        const { data: after } = await supabaseAdmin
          .from('products')
          .select('region_slug')
          .eq('id', d.id)
          .maybeSingle()
        if (after?.region_slug && after.region_slug !== d.region_slug) {
          r.region = 'added'
        }
      } catch (err) {
        r.region = 'failed'
        console.warn(`[backfill] entity link failed for ${d.slug}:`, err instanceof Error ? err.message : err)
      }
    } catch (err) {
      r.error = err instanceof Error ? err.message : 'unknown'
    }

    results.push(r)
  }

  const summary = {
    total: results.length,
    images: {
      added: results.filter((r) => r.image === 'added').length,
      existed: results.filter((r) => r.image === 'existed').length,
      failed: results.filter((r) => r.image === 'failed').length,
    },
    meta: {
      added: results.filter((r) => r.meta === 'added').length,
      existed: results.filter((r) => r.meta === 'existed').length,
      failed: results.filter((r) => r.meta === 'failed').length,
    },
    region: {
      added: results.filter((r) => r.region === 'added').length,
      failed: results.filter((r) => r.region === 'failed').length,
    },
  }

  return NextResponse.json({ ok: true, summary, results })
}
