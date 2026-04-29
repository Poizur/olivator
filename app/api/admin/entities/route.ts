// Generic PATCH endpoint pro entity (regions / brands / cultivars)
// Body: { entityType: 'region'|'brand'|'cultivar', slug: string, data: {...} }

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

const TABLE: Record<string, string> = {
  region: 'regions',
  brand: 'brands',
  cultivar: 'cultivars',
}

// Per-entity field whitelist — schema differs.
// Po migraci 20260429_entity_redesign rozšířeno o nová pole pro 8-blokovou
// kostru (terroir, timeline, flavor_profile, pairing, ...).
const COMMON_FIELDS = ['name', 'description_long', 'description_short', 'meta_title', 'meta_description', 'focus_keyword', 'status', 'tldr']

const ALLOWED_FIELDS_BY_TYPE: Record<string, Set<string>> = {
  region: new Set([...COMMON_FIELDS, 'country_code', 'terroir', 'map_image_url']),
  brand: new Set([
    ...COMMON_FIELDS,
    'country_code',
    'story',
    'philosophy',
    'website_url',
    'founded_year',
    'generation',
    'hectares',
    'headquarters',
    'timeline',
  ]),
  cultivar: new Set([
    ...COMMON_FIELDS,
    'nickname',
    'intensity_score',
    'primary_use',
    'pairing_pros',
    'pairing_cons',
    // flavor_profile mění admin přes svůj override — zachováme možnost,
    // ale auto_filled_at se vyčistí v nastavení (NULL = admin zapsal ručně)
    'flavor_profile',
    'auto_filled_at',
  ]),
}

export async function PATCH(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { entityType, slug, data } = body as {
    entityType: string
    slug: string
    data: Record<string, unknown>
  }

  const table = TABLE[entityType]
  if (!table) return NextResponse.json({ error: `Unknown entityType: ${entityType}` }, { status: 400 })
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // Whitelist fields per entity type
  const allowed = ALLOWED_FIELDS_BY_TYPE[entityType]
  if (!allowed) return NextResponse.json({ error: `Unknown entityType: ${entityType}` }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(data ?? {})) {
    if (allowed.has(k)) patch[k] = v
  }

  const { error } = await supabaseAdmin.from(table).update(patch).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
