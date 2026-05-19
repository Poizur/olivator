/**
 * Fetch brand logos from brand websites (og:image / apple-touch-icon / favicon).
 * Targets brands that have website_url set but no entity_images yet.
 *
 * Run: node --env-file=.env.local --import tsx scripts/fetch-brand-logos.ts
 *
 * Strategy per brand:
 *   1. GET homepage HTML
 *   2. Extract: og:image → twitter:image → apple-touch-icon → og:logo
 *   3. Resolve relative URLs to absolute
 *   4. Insert into entity_images with image_role='logo', source='auto_research'
 *
 * Idempotent — skips brands that already have entity_images.
 */

import { supabaseAdmin } from '@/lib/supabase'

const REQUEST_TIMEOUT_MS = 15_000
const POLITE_DELAY_MS = 1_200

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; OlivatorBot/1.0; +https://olivator.cz/bot)',
  Accept: 'text/html,application/xhtml+xml',
}

interface BrandRow {
  id: string
  slug: string
  name: string
  website_url: string
  country_code: string
}

interface LogoFetchResult {
  slug: string
  name: string
  imageUrl: string | null
  method: string
  inserted: boolean
  error?: string
}

/** Extract best logo URL from HTML string. Returns { url, method } or null. */
function extractLogoUrl(html: string, baseUrl: string): { url: string; method: string } | null {
  const candidates: { pattern: RegExp; method: string }[] = [
    // og:image — most brands have this, often high-quality
    { pattern: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i, method: 'og:image' },
    { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i, method: 'og:image' },
    // twitter:image
    { pattern: /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i, method: 'twitter:image' },
    { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i, method: 'twitter:image' },
    // apple-touch-icon (square, works well as logo)
    { pattern: /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i, method: 'apple-touch-icon' },
    { pattern: /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i, method: 'apple-touch-icon' },
    // og:logo (less common)
    { pattern: /<meta[^>]+property=["']og:logo["'][^>]+content=["']([^"']+)["']/i, method: 'og:logo' },
  ]

  const base = new URL(baseUrl)

  for (const { pattern, method } of candidates) {
    const match = html.match(pattern)
    if (!match) continue
    const raw = match[1].trim()
    if (!raw || raw.startsWith('data:')) continue

    // Resolve relative URLs
    try {
      const resolved = new URL(raw, base.origin).href
      // Skip placeholder/default social images — too generic
      if (resolved.includes('default') && method === 'og:image') continue
      return { url: resolved, method }
    } catch {
      // Invalid URL — skip
    }
  }
  return null
}

async function fetchLogoForBrand(brand: BrandRow): Promise<LogoFetchResult> {
  const result: LogoFetchResult = {
    slug: brand.slug,
    name: brand.name,
    imageUrl: null,
    method: 'none',
    inserted: false,
  }

  let html: string
  try {
    const res = await fetch(brand.website_url, {
      headers: FETCH_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      result.error = `HTTP ${res.status}`
      return result
    }
    html = await res.text()
  } catch (err) {
    result.error = `network: ${(err as Error).message.slice(0, 80)}`
    return result
  }

  const found = extractLogoUrl(html, brand.website_url)
  if (!found) {
    result.error = 'no image found in HTML'
    return result
  }

  result.imageUrl = found.url
  result.method = found.method

  // Insert into entity_images
  const sourceId = `auto_${brand.slug}_${found.method}`
  const { error: insertErr } = await supabaseAdmin.from('entity_images').insert({
    entity_type: 'brand',
    entity_id: brand.id,
    url: found.url,
    alt_text: `${brand.name} logo`,
    source: 'auto_research',
    source_id: sourceId,
    source_url: brand.website_url,
    image_role: 'logo',
    is_primary: true,
    sort_order: 0,
    status: 'active',
  })

  if (insertErr) {
    if (insertErr.message.includes('unique') || insertErr.message.includes('duplicate')) {
      result.inserted = false
      result.error = 'duplicate (already exists)'
    } else {
      result.error = insertErr.message
    }
    return result
  }

  result.inserted = true
  return result
}

async function main() {
  // Find brands with website_url but no entity_images
  const { data: brands, error } = await supabaseAdmin
    .from('brands')
    .select('id, slug, name, website_url, country_code')
    .not('website_url', 'is', null)
    .order('name')

  if (error) {
    console.error('Failed to load brands:', error.message)
    process.exit(1)
  }

  const brandsWithWebsite = (brands ?? []) as BrandRow[]

  // Filter: skip brands that already have entity_images
  const { data: existingImages } = await supabaseAdmin
    .from('entity_images')
    .select('entity_id')
    .eq('entity_type', 'brand')
  const coveredIds = new Set((existingImages ?? []).map((r: { entity_id: string }) => r.entity_id))

  const targets = brandsWithWebsite.filter((b) => !coveredIds.has(b.id))
  console.log(`\n🔍 Brands with website_url: ${brandsWithWebsite.length}`)
  console.log(`📭 Already have images: ${coveredIds.size}`)
  console.log(`🎯 Targets to process: ${targets.length}\n`)

  if (targets.length === 0) {
    console.log('✅ All brands already have images — nothing to do.')
    return
  }

  const results: LogoFetchResult[] = []

  for (let i = 0; i < targets.length; i++) {
    const brand = targets[i]
    process.stdout.write(`[${i + 1}/${targets.length}] ${brand.name} (${brand.website_url}) ... `)

    const r = await fetchLogoForBrand(brand)
    results.push(r)

    if (r.inserted) {
      console.log(`✅  ${r.method} → ${r.imageUrl?.slice(0, 70)}`)
    } else {
      console.log(`⚠️  ${r.error ?? 'no image'}`)
    }

    if (i < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, POLITE_DELAY_MS))
    }
  }

  // Summary
  const inserted = results.filter((r) => r.inserted).length
  const failed = results.filter((r) => !r.inserted).length
  console.log(`\n── Summary ──────────────────────────────`)
  console.log(`✅  Inserted: ${inserted}`)
  console.log(`⚠️  Skipped / failed: ${failed}`)

  if (failed > 0) {
    console.log('\nFailed brands:')
    results
      .filter((r) => !r.inserted)
      .forEach((r) => console.log(`  ${r.slug}: ${r.error}`))
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
