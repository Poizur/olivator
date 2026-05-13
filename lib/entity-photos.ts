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
  // ── Added batch 2026-05-13 ─────────────────────────────────────────
  alberobello: [
    'alberobello trulli puglia italy',
    'puglia countryside trullo stone',
    'apulia olive trees hills italy',
  ],
  alentejo: [
    'alentejo portugal landscape plains',
    'alentejo portugal olive trees field',
    'portugal countryside rolling hills',
  ],
  andalusie: [
    'andalusia spain olive groves aerial',
    'jaen spain olive trees landscape',
    'andalucia spain countryside landscape',
  ],
  arcadia: [
    'arcadia peloponnese greece mountains',
    'greece mountains landscape countryside',
    'peloponnese greece nature landscape',
  ],
  'castilla-la-mancha': [
    'castilla la mancha spain landscape',
    'toledo spain countryside plains',
    'spain olive trees field summer',
  ],
  chalkidiki: [
    'halkidiki greece peninsula sea',
    'halkidiki greece nature landscape',
    'greece peninsula coastline olive trees',
  ],
  douro: [
    'douro valley portugal terraces landscape',
    'douro portugal river valley vineyard',
    'portugal valley landscape hills',
  ],
  festos: [
    'phaistos crete greece ancient landscape',
    'messara plain crete greece landscape',
    'crete greece rural landscape south',
  ],
  istrie: [
    'istria croatia olive groves landscape',
    'istria croatia countryside rolling hills',
    'croatia adriatic coast landscape',
  ],
  jaen: [
    'jaen spain olive trees aerial view',
    'jaen province spain landscape',
    'spain southern olive groves fields',
  ],
  kalamata: [
    'kalamata greece city port landscape',
    'messenia greece olive trees',
    'greece peloponnese southern landscape',
  ],
  'kastilie-la-mancha': [
    'castilla la mancha spain windmills landscape',
    'spain central plateau countryside',
    'castile spain rural landscape',
  ],
  kolymbari: [
    'chania crete greece landscape',
    'western crete greece olive trees',
    'crete greece countryside northwest',
  ],
  kolymvari: [
    'chania crete greece peninsula',
    'crete greece sea olive groves',
    'western crete landscape mediterranean',
  ],
  korinthie: [
    'corinthia greece landscape',
    'corinth greece countryside',
    'peloponnese greece northeast landscape',
  ],
  lakonia: [
    'laconia sparta greece landscape mountains',
    'lakonia greece olive trees countryside',
    'sparta greece valley mountains landscape',
  ],
  lesbos: [
    'lesbos greece island olive trees',
    'mytilene lesbos greece landscape',
    'lesbos island aegean sea greece',
  ],
  messara: [
    'messara plain crete greece landscape',
    'crete greece central valley agricultural',
    'heraklion crete landscape rural',
  ],
  messinia: [
    'messinia greece landscape countryside',
    'kalamata messenia greece landscape',
    'southwest peloponnese greece olive trees',
  ],
  molise: [
    'molise italy countryside landscape',
    'molise italy hills rural landscape',
    'italy southern countryside molise',
  ],
  sicilie: [
    'sicily italy countryside landscape hills',
    'sicily island italy landscape aerial',
    'sicilia italy olive groves landscape',
  ],
  sitia: [
    'sitia crete eastern greece landscape',
    'lasithi crete greece landscape',
    'eastern crete greece countryside',
  ],
  skillountia: [
    'elis peloponnese greece landscape',
    'northwest peloponnese greece countryside',
    'greece ancient landscape rural',
  ],
  'terra-alta': [
    'terra alta tarragona spain landscape',
    'tarragona catalonia spain countryside',
    'catalonia spain rural landscape hills',
  ],
  toskansko: [
    'tuscany italy cypress trees landscape',
    'tuscany italy rolling hills olive groves',
    'toscana italy countryside landscape',
  ],
  umbrie: [
    'umbria italy countryside landscape',
    'perugia umbria italy landscape',
    'umbria italy hills olive groves',
  ],
  zakynthos: [
    'zakynthos greece island landscape',
    'zante zakynthos greece nature',
    'zakynthos greece coastline landscape',
  ],
}

const BRAND_QUERIES: Record<string, string> = {
  intini:      'olive oil bottle dark glass premium',
  corinto:     'olive oil bottle greek',
  evoilino:    'olive oil bottle greece',
  orino:       'olive oil bottle artisan',
  'sitia-kreta': 'olive oil bottle crete greek',
  alfa:        'olive oil bottle premium',
}

// Niche cultivar names ("koroneiki", "cima-di-mola") na Unsplash nemají hity.
// Použij geographically-anchored queries — Unsplash má hodně fotek z Greece/Italy
// olive groves obecně, což je pro illustration vizuálně dostatečné.
const CULTIVAR_QUERIES: Record<string, string> = {
  koroneiki:             'olive grove greece harvest',
  manaki:                'olive grove peloponnese greece',
  kalamata:              'olive trees greek countryside',
  coratina:              'olive grove puglia italy',
  'cima-di-mola':        'olive grove apulia italy',
  frantoio:              'tuscany olive grove italy',
  leccino:               'tuscany olive grove italy autumn',
  olivastra:             'tuscany olive trees italy',
  // ── Added batch 2026-05-13 ──────────────────────────────────────
  arbequina:             'catalonia spain olive grove harvest',
  picual:                'jaen spain olive trees aerial',
  manzanilla:            'andalusia spain olive trees',
  'manzanilla-cacerena': 'extremadura spain olive grove landscape',
  cornicabra:            'castilla spain olive grove rolling',
  empeltre:              'aragon spain olive trees landscape',
  athinoelia:            'attica greece olive trees',
  athinolia:             'greece olive trees hillside',
  chalkidiki:            'halkidiki greece peninsula landscape',
  'chondroelia-chalkidiki': 'halkidiki greece olive grove',
  andamatiani:           'greece island olive trees coastal',
  lianolia:              'epirus greece mountains olive',
  megaritiki:            'attica greece countryside landscape',
  tsounati:              'crete greece olive trees',
  kolovi:                'lesbos greece olive grove',
  kalamon:               'peloponnese greece olive grove',
  biancollila:           'sicily italy olive grove landscape',
  cerasuola:             'sicily italy countryside landscape',
  'nocellara-del-belice': 'trapani sicily valley landscape',
  nociara:               'puglia italy olive grove',
  peranzana:             'foggia puglia italy olive grove',
  pesciolen:             'tuscany italy olive grove hills',
  picholine:             'provence france olive grove',
  'cima-di-melfi':       'basilicata italy countryside olive',
  cobrancosa:            'alentejo portugal olive trees',
  cordovil:              'alentejo portugal landscape',
  galega:                'alentejo portugal olive grove',
  simone:                'italy countryside olive trees',
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
    let photos: Awaited<ReturnType<typeof searchUnsplash>>
    try {
      photos = await searchUnsplash(queries[qi], photoCount)
    } catch (e) {
      const msg = (e as Error).message
      // 403 = rate limit — nezabíjet celý běh, vrátit jako error pro tuto entitu
      if (msg.includes('403')) return { slug, inserted, skipped, error: 'rate_limit' }
      return { slug, inserted, skipped, error: msg.slice(0, 100) }
    }
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

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]
    if (i > 0) await new Promise(r => setTimeout(r, IMPORT_DELAY_MS))
    const queries = REGION_QUERIES[slug] ?? [`${slug} olive oil landscape`]
    const r = await importPhotosForEntity('region', slug, queries, 3)
    results.push(r)
    if (r.error === 'rate_limit') break
  }

  return {
    results,
    totalInserted: results.reduce((s, r) => s + r.inserted, 0),
    totalErrors: results.filter((r) => r.error).length,
  }
}

/**
 * VAROVÁNÍ: Brand fotky z Unsplash NEPOUŽÍVAT.
 * Unsplash vrací konkrétní lahve cizích značek (Etolea, Deeliver atd.) —
 * matoucí. Brand identity musí dodat admin (logo nebo skutečná lahev).
 *
 * Funkce zůstává pro CLI flexibility (force run pro region/cultivar testing),
 * ale defaultně NEPROVÁDÍ nic — vyžaduje explicit `--force` opt-in.
 */
export async function importBrandPhotos(
  slugFilter?: string,
  options?: { allDbBrands?: boolean; force?: boolean }
): Promise<EntityPhotosResult> {
  if (!options?.force) {
    console.warn('[entity-photos] importBrandPhotos disabled (Unsplash returns wrong brand bottles). Use --force to override.')
    return { results: [], totalInserted: 0, totalErrors: 0 }
  }
  const results: InsertResult[] = []
  let slugs: string[]
  if (slugFilter) {
    slugs = [slugFilter]
  } else if (options?.allDbBrands) {
    // Fetch všechny brand slugy z DB (i drafty bez queries v BRAND_QUERIES).
    // Fallback query je "artisan olive oil bottle" — generic ale topical.
    const { data } = await supabaseAdmin.from('brands').select('slug')
    slugs = ((data ?? []) as { slug: string }[]).map((r) => r.slug)
  } else {
    slugs = Object.keys(BRAND_QUERIES)
  }

  for (const slug of slugs) {
    // Multiple fallback queries — Unsplash má širší match pro "olive oil"
    // než pro "artisan ... premium". Vyzkoušíme postupně.
    const queries = BRAND_QUERIES[slug]
      ? [BRAND_QUERIES[slug]]
      : ['olive oil bottle', 'extra virgin olive oil', 'olive oil mediterranean']
    const r = await importPhotosForEntity('brand', slug, queries, 1)
    results.push(r)
  }

  return {
    results,
    totalInserted: results.reduce((s, r) => s + r.inserted, 0),
    totalErrors: results.filter((r) => r.error).length,
  }
}

const IMPORT_DELAY_MS = 1500  // ~40 req/min = bezpečně pod 50/hod limitem

export async function importCultivarPhotos(slugFilter?: string): Promise<EntityPhotosResult> {
  const results: InsertResult[] = []
  const slugs = slugFilter ? [slugFilter] : Object.keys(CULTIVAR_QUERIES)

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]
    if (i > 0) await new Promise(r => setTimeout(r, IMPORT_DELAY_MS))
    const query = CULTIVAR_QUERIES[slug] ?? 'olive cultivar harvest'
    const r = await importPhotosForEntity('cultivar', slug, [query], 1)
    results.push(r)
    // Přeruš při rate limitu — neztrácet čas čekáním na zbylé
    if (r.error === 'rate_limit') break
  }

  return {
    results,
    totalInserted: results.reduce((s, r) => s + r.inserted, 0),
    totalErrors: results.filter((r) => r.error).length,
  }
}
