// Fáze 4 master-foundation plánu (2026-05): Entities Expansion.
//
// Po Fázi 3 mají produkty vyplněno origin_region (78 %) + variety (52 %).
// Mnoho hodnot však neexistuje jako entita v `regions` / `cultivars` tabulkách.
// Tento script vytvoří chybějící entity jako `draft` — admin pak schválí přes
// /admin/regions a /admin/cultivars. Content (description, terroir) zatím
// neřešíme — to dělá existující generate-entity-content.ts.
//
// Pravidla:
//   - Regions: vytvoř jen ty s count >= MIN_REGION_USAGE produktů
//   - Cultivars: vytvoř jen ty s count >= MIN_CULTIVAR_USAGE produktů
//   - Filter compound/dup names (např. "Jaén, Andalusie" — skip; má-li produkt
//     compound region, lze ho v admin UI ručně přemapovat)
//   - Country code: REGION_TO_COUNTRY override (master plán), pak fallback z DB

import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

const MIN_REGION_USAGE = 2
const MIN_CULTIVAR_USAGE = 2

// Master plán REGION_TO_COUNTRY mapování — pro případ že DB neuvedlo country
const REGION_TO_COUNTRY: Record<string, string> = {
  'kréta': 'GR', 'peloponés': 'GR', 'lesbos': 'GR', 'kalamata': 'GR',
  'kalamatá': 'GR', 'korfu': 'GR', 'mesinia': 'GR', 'sitia': 'GR',
  'chania': 'GR', 'mani': 'GR', 'lakónie': 'GR', 'koroni': 'GR',
  'zakynthos': 'GR', 'korinthie': 'GR', 'messara': 'GR', 'kolymvari': 'GR',
  'kolymbari': 'GR', 'messinia': 'GR', 'chalkidiki': 'GR', 'arcadia': 'GR',
  'lakonia': 'GR', 'olympia': 'GR', 'plakias': 'GR', 'lakonium': 'GR',
  'festos': 'GR', 'boiótie': 'GR', 'petrousa': 'GR',
  'toskánsko': 'IT', 'sicílie': 'IT', 'apulie': 'IT', 'umbrie': 'IT',
  'kalábrie': 'IT', 'garda': 'IT', 'liguria': 'IT', 'lazio': 'IT',
  'sardinie': 'IT', 'kampánie': 'IT', 'molise': 'IT', 'alberobello': 'IT',
  'lombardie': 'IT', 'trentino': 'IT', 'bari': 'IT',
  'andalusie': 'ES', 'jaén': 'ES', 'jaen': 'ES', 'katalánsko': 'ES',
  'aragon': 'ES', 'extremadura': 'ES', 'mallorca': 'ES', 'toledo': 'ES',
  'kastilie-la mancha': 'ES', 'cordoba': 'ES', 'granada': 'ES',
  'castilla-la mancha': 'ES', 'terra alta': 'ES', 'les garrigues': 'ES',
  'istrie': 'HR', 'dalmácie': 'HR', 'brač': 'HR', 'hvar': 'HR', 'istra': 'HR',
  'alentejo': 'PT', 'douro': 'PT', 'trás-os-montes': 'PT',
  'ayvalik': 'TR', 'memecik': 'TR', 'edremit': 'TR',
}

function inferCountry(region: string, fromDb: string | null): string | null {
  const key = region.toLowerCase().trim()
  return REGION_TO_COUNTRY[key] ?? fromDb ?? null
}

/** Zda název je compound (víc regionů oddělených čárkou) nebo má závorky.
 *  Skip — admin musí ručně rozhodnout, ke kterému kanonickému regionu produkt
 *  patří. */
function isCompoundName(name: string): boolean {
  if (name.includes(',')) return true
  if (name.includes('(')) return true
  // Strip "X – Y", "X / Y"
  if (/[–\/]/.test(name)) return true
  return false
}

async function expandRegions(): Promise<{ created: number; skipped: string[] }> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('origin_region, origin_country')
    .eq('status', 'active')
    .not('origin_region', 'is', null)

  const usage = new Map<string, { country: string | null; count: number }>()
  for (const p of products ?? []) {
    const name = (p.origin_region as string).trim()
    if (!name || isCompoundName(name)) continue
    const cur = usage.get(name)
    if (cur) cur.count++
    else usage.set(name, { country: p.origin_country as string | null, count: 1 })
  }

  // Sloučit case-insensitive duplikáty (ponech variantu s nejvíc produkty)
  const canonical = new Map<string, { name: string; country: string | null; count: number }>()
  for (const [name, info] of usage) {
    const key = name.toLowerCase()
    const existing = canonical.get(key)
    if (!existing || info.count > existing.count) {
      canonical.set(key, { name, country: info.country, count: info.count })
    } else if (existing && existing.count === info.count) {
      // tied — keep alphabetically first
      if (name.localeCompare(existing.name) < 0) {
        canonical.set(key, { name, country: info.country, count: info.count })
      }
    }
  }

  // Existující regions (na lowercase comparison)
  const { data: existing } = await supabaseAdmin.from('regions').select('name')
  const existingLower = new Set((existing ?? []).map(r => (r.name as string).toLowerCase()))

  const toCreate: Array<{ slug: string; name: string; country_code: string | null; count: number }> = []
  const skipped: string[] = []
  for (const [key, info] of canonical) {
    if (info.count < MIN_REGION_USAGE) continue
    if (existingLower.has(key)) {
      skipped.push(`already exists: ${info.name}`)
      continue
    }
    toCreate.push({
      slug: slugify(info.name),
      name: info.name,
      country_code: inferCountry(info.name, info.country),
      count: info.count,
    })
  }

  console.log(`\n─── Regions to create (count >= ${MIN_REGION_USAGE}) ───`)
  let created = 0
  for (const r of toCreate.sort((a, b) => b.count - a.count)) {
    const { error } = await supabaseAdmin.from('regions').insert({
      slug: r.slug,
      name: r.name,
      country_code: r.country_code,
      status: 'draft',
    })
    if (error) {
      console.log(`  ✗ ${r.name.padEnd(30)} ${error.message.slice(0, 60)}`)
      skipped.push(`${r.name}: ${error.message.slice(0, 50)}`)
    } else {
      console.log(`  ✓ ${r.name.padEnd(30)} country=${r.country_code ?? '?'}  products=${r.count}`)
      created++
    }
  }
  return { created, skipped }
}

async function expandCultivars(): Promise<{ created: number; skipped: string[] }> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('variety, origin_country')
    .eq('status', 'active')
    .not('variety', 'is', null)

  const usage = new Map<string, { country: string | null; count: number }>()
  for (const p of products ?? []) {
    // CSV split — Arbequina, Picual → 2 entries
    const parts = (p.variety as string).split(/[,;\/]/).map(s => s.trim()).filter(s => s.length > 1)
    for (const v of parts) {
      // Skip if has uppercase suspect ("Premium", "Bio") or numeric junk
      if (/\d/.test(v)) continue
      if (v.length > 50) continue
      const cur = usage.get(v)
      if (cur) cur.count++
      else usage.set(v, { country: p.origin_country as string | null, count: 1 })
    }
  }

  // Sloučit case-insensitive duplikáty
  const canonical = new Map<string, { name: string; country: string | null; count: number }>()
  for (const [name, info] of usage) {
    const key = name.toLowerCase()
    const existing = canonical.get(key)
    if (!existing || info.count > existing.count) {
      canonical.set(key, { name, country: info.country, count: info.count })
    }
  }

  const { data: existing } = await supabaseAdmin.from('cultivars').select('name')
  const existingLower = new Set((existing ?? []).map(r => (r.name as string).toLowerCase()))

  const toCreate: Array<{ slug: string; name: string; country: string | null; count: number }> = []
  for (const [key, info] of canonical) {
    if (info.count < MIN_CULTIVAR_USAGE) continue
    if (existingLower.has(key)) continue
    toCreate.push({
      slug: slugify(info.name),
      name: info.name,
      country: info.country,
      count: info.count,
    })
  }

  console.log(`\n─── Cultivars to create (count >= ${MIN_CULTIVAR_USAGE}) ───`)
  let created = 0
  const skipped: string[] = []
  for (const c of toCreate.sort((a, b) => b.count - a.count)) {
    const { error } = await supabaseAdmin.from('cultivars').insert({
      slug: c.slug,
      name: c.name,
      origin_country: c.country,
      status: 'draft',
    })
    if (error) {
      console.log(`  ✗ ${c.name.padEnd(30)} ${error.message.slice(0, 60)}`)
      skipped.push(`${c.name}: ${error.message.slice(0, 50)}`)
    } else {
      console.log(`  ✓ ${c.name.padEnd(30)} country=${c.country ?? '?'}  products=${c.count}`)
      created++
    }
  }
  return { created, skipped }
}

async function main() {
  const startedAt = Date.now()
  console.log('═══ Fáze 4 — Entities Expansion ═══')

  const { count: regBefore } = await supabaseAdmin.from('regions').select('*', { count: 'exact', head: true })
  const { count: culBefore } = await supabaseAdmin.from('cultivars').select('*', { count: 'exact', head: true })
  console.log(`\nBefore: ${regBefore} regions, ${culBefore} cultivars`)

  const regResult = await expandRegions()
  const culResult = await expandCultivars()

  const { count: regAfter } = await supabaseAdmin.from('regions').select('*', { count: 'exact', head: true })
  const { count: culAfter } = await supabaseAdmin.from('cultivars').select('*', { count: 'exact', head: true })

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\n═══ Shrnutí ═══`)
  console.log(`Regions:   ${regBefore} → ${regAfter}  (+${regResult.created} created, ${regResult.skipped.length} skipped)`)
  console.log(`Cultivars: ${culBefore} → ${culAfter}  (+${culResult.created} created, ${culResult.skipped.length} skipped)`)
  console.log(`Čas: ${elapsed}s — žádné Claude volání, cena $0.00`)
  console.log()
  console.log('Další krok: admin schválí entity v /admin/regions a /admin/cultivars.')
  console.log('Pro generování content + tldr použij /api/admin/generate-entity-content (existující endpoint).')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
