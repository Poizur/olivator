// Import Unsplash fotek pro entity stránky (regiony, značky, odrůdy).
// Ukládá do entity_images tabulky. Duplikáty přeskakuje (source_id UNIQUE check).

import { supabaseAdmin } from './supabase'
import { searchUnsplash } from './unsplash'

// Topic-specific Unsplash queries per entity slug. BUG-vzor 6 prevence.
const REGION_QUERIES: Record<string, string[]> = {
  peloponnes: [
    'peloponnese greece olive groves landscape',
    'kalamata greece countryside',
    'nemea peloponnese vineyard landscape',
  ],
  kreta: [
    'crete greece olive trees hillside',
    'heraklion crete mediterranean landscape',
    'crete greece village traditional',
  ],
  apulie: [
    'puglia apulia olive trees trulli',
    'apulia italy countryside landscape',
    'bari puglia italy architecture',
  ],
  korfu: [
    'corfu greece island olive groves',
    'kerkyra corfu mediterranean',
    'corfu greece nature landscape',
  ],
}

const BRAND_QUERIES: Record<string, string> = {
  intini:      'artisan olive oil bottle italy dark',
  corinto:     'greek extra virgin olive oil bottle',
  evoilino:    'corfu greece olive oil premium',
  orino:       'mountain greece olive oil artisan',
  'sitia-kreta': 'crete premium olive oil bottle',
}

const CULTIVAR_QUERIES: Record<string, string> = {
  koroneiki:      'koroneiki small olives greece harvest',
  manaki:         'greek olives harvest peloponnese',
  kalamata:       'kalamata olives dark purple greek',
  coratina:       'coratina olives puglia italy harvest',
  'cima-di-mola': 'apulia olive harvest artisan italy',
}

interface InsertResult {
  slug: string
  inserted: number
  skipped: number
  error?: string
}

async function getEntityId(entityType: 'region' | 'brand' | 'cultivar', slug: string): Promise<string | null> {
  const table = entityType === 'region' ? 'regions' : entityType === 'brand' ? 'brands' : 'cultivars'
  const { data } = await supabaseAdmin.from(table).select('id').eq('slug', slug).single()
  return data?.id ?? null
}

async function importPhotosForEntity(
  entityType: 'region' | 'brand' | 'cultivar',
  slug: string,
  queries: string[],
  photoCount: number,
): Promise<InsertResult> {
  const entityId = await getEntityId(entityType, slug)
  if (!entityId) return { slug, inserted: 0, skipped: 0, error: `${entityType} ${slug} not found in DB` }

  // Check existing source_ids to skip duplicates
  const { data: existing } = await supabaseAdmin
    .from('entity_images')
    .select('source_id')
    .eq('entity_id', entityId)
  const existingIds = new Set((existing ?? []).map((r: { source_id: string }) => r.source_id))

  let inserted = 0
  let skipped = 0

  for (let qi = 0; qi < queries.length && inserted < photoCount; qi++) {
    const photos = await searchUnsplash(queries[qi], photoCount)
    for (const photo of photos) {
      if (inserted >= photoCount) break
      if (existingIds.has(photo.sourceId)) { skipped++; continue }

      const { error } = await supabaseAdmin.from('entity_images').insert({
        entity_type: entityType,
        entity_id: entityId,
        url: photo.url,
        alt_text: photo.altText,
        caption: `Foto: ${photo.attribution} / Unsplash`,
        source: 'unsplash',
        source_id: photo.sourceId,
        source_attribution: photo.attribution,
        source_url: photo.sourceUrl,
        is_primary: inserted === 0,   // první fotka = primary
        sort_order: inserted,
        width: photo.width,
        height: photo.height,
        status: 'active',
      })

      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          skipped++
        } else {
          return { slug, inserted, skipped, error: error.message }
        }
      } else {
        existingIds.add(photo.sourceId)
        inserted++
      }
    }
  }

  return { slug, inserted, skipped }
}

export interface EntityPhotosResult {
  results: InsertResult[]
  totalInserted: number
  totalErrors: number
}

export async function importRegionPhotos(slugFilter?: string): Promise<EntityPhotosResult> {
  const results: InsertResult[] = []
  const slugs = slugFilter ? [slugFilter] : Object.keys(REGION_QUERIES)

  for (const slug of slugs) {
    const queries = REGION_QUERIES[slug] ?? [`${slug} olive oil landscape`]
    const r = await importPhotosForEntity('region', slug, queries, 3)
    results.push(r)
  }

  return {
    results,
    totalInserted: results.reduce((s, r) => s + r.inserted, 0),
    totalErrors: results.filter((r) => r.error).length,
  }
}

export async function importBrandPhotos(slugFilter?: string): Promise<EntityPhotosResult> {
  const results: InsertResult[] = []
  const slugs = slugFilter ? [slugFilter] : Object.keys(BRAND_QUERIES)

  for (const slug of slugs) {
    const query = BRAND_QUERIES[slug] ?? 'artisan olive oil bottle'
    const r = await importPhotosForEntity('brand', slug, [query], 1)
    results.push(r)
  }

  return {
    results,
    totalInserted: results.reduce((s, r) => s + r.inserted, 0),
    totalErrors: results.filter((r) => r.error).length,
  }
}

export async function importCultivarPhotos(slugFilter?: string): Promise<EntityPhotosResult> {
  const results: InsertResult[] = []
  const slugs = slugFilter ? [slugFilter] : Object.keys(CULTIVAR_QUERIES)

  for (const slug of slugs) {
    const query = CULTIVAR_QUERIES[slug] ?? 'olive cultivar harvest'
    const r = await importPhotosForEntity('cultivar', slug, [query], 1)
    results.push(r)
  }

  return {
    results,
    totalInserted: results.reduce((s, r) => s + r.inserted, 0),
    totalErrors: results.filter((r) => r.error).length,
  }
}
