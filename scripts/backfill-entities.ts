/**
 * Phase A.3 — Entity backfill
 *
 * 1. INSERT 5 brands, 4 regions, 5 cultivars (first wave) — skip if already exist.
 * 2. UPDATE products.brand_slug + products.region_slug for all active/draft products.
 * 3. INSERT product_cultivars rows based on cultivar detection.
 *
 * Run: node --env-file=.env.local --import tsx scripts/backfill-entities.ts
 */

import { supabaseAdmin } from '@/lib/supabase'
import { extractBrandSlug, extractRegionSlug, detectCultivars } from '@/lib/entity-extractor'

// ── Seed data ─────────────────────────────────────────────────────────────────

const REGIONS = [
  {
    slug: 'peloponnes',
    name: 'Peloponés',
    country_code: 'GR',
    meta_title: 'Olivový olej z Peloponésu | Olivator',
    meta_description: 'Peloponés — největší olivový region Řecka. Odrůdy Koroneiki a Manaki, DOP chráněné oblasti a stovky rodinných lisoven.',
  },
  {
    slug: 'kreta',
    name: 'Kréta',
    country_code: 'GR',
    meta_title: 'Olivový olej z Kréty | Olivator',
    meta_description: 'Kréta produkuje 35 % řeckého olivového oleje. Odrůda Koroneiki, DOP Sitia a Kolymvari, vysoké polyfenoly díky suchému klimatu.',
  },
  {
    slug: 'apulie',
    name: 'Apulie',
    country_code: 'IT',
    meta_title: 'Olivový olej z Apulie | Olivator',
    meta_description: 'Apulie (Puglia) — srdce italského olivového oleje. Odrůdy Coratina a Cima di Mola, intenzivní chuť s vysokými polyfenoly.',
  },
  {
    slug: 'korfu',
    name: 'Korfu',
    country_code: 'GR',
    meta_title: 'Olivový olej z Korfu | Olivator',
    meta_description: 'Korfu — ostrov s milionem olivovníků. Tradiční odrůda Lianolia, mild a ovocný profil, PGI chráněné označení.',
  },
]

const BRANDS = [
  {
    slug: 'intini',
    name: 'Intini',
    country_code: 'IT',
    meta_title: 'Intini olivový olej | Olivator',
    meta_description: 'Rodinná farma Intini z Apulie. Odrůdy Coratina a Cima di Mola, cold-press, vysoké polyfenoly — špička italského EVOO.',
  },
  {
    slug: 'corinto',
    name: 'Corinto',
    country_code: 'GR',
    meta_title: 'Corinto olivový olej z Peloponésu | Olivator',
    meta_description: 'Corinto — prémiové EVOO z Peloponésu. Odrůda Manaki a Koroneiki, rodinná produkce v olivovém srdci Řecka.',
  },
  {
    slug: 'evoilino',
    name: 'Evoilino',
    country_code: 'GR',
    meta_title: 'Evoilino olivový olej z Korfu | Olivator',
    meta_description: 'Evoilino — tradiční EVOO z Korfu. Odrůda Lianolia, mild profil, PGI Korfu — autentický ostrovní olivový olej.',
  },
  {
    slug: 'orino',
    name: 'Orino',
    country_code: 'GR',
    meta_title: 'Orino olivový olej | Olivator',
    meta_description: 'Orino — řecké horské EVOO z výšin Peloponésu. Odrůda Koroneiki ze stromů na svazích nad 400 m n.m.',
  },
  {
    slug: 'sitia-kreta',
    name: 'Sitia Kréta',
    country_code: 'GR',
    meta_title: 'Sitia Kréta olivový olej | Olivator',
    meta_description: 'Sitia Kréta — DOP chráněné EVOO z východní Kréty. Oblast Sitia, odrůda Koroneiki, intenzivní polyfenolový profil.',
  },
]

const CULTIVARS = [
  {
    slug: 'koroneiki',
    name: 'Koroneiki',
    meta_title: 'Odrůda Koroneiki — olivový olej | Olivator',
    meta_description: 'Koroneiki — nejrozšířenější řecká odrůda. Malé olivy s vysokými polyfenoly, intenzivní a hořká chuť, skvělá pro zdraví.',
  },
  {
    slug: 'manaki',
    name: 'Manaki',
    meta_title: 'Odrůda Manaki — olivový olej | Olivator',
    meta_description: 'Manaki — peloponéská odrůda s jemnější chutí. Nižší hořkost, ovocné tóny, ideální pro ty kdo mají rádi mild EVOO.',
  },
  {
    slug: 'kalamata',
    name: 'Kalamata',
    meta_title: 'Odrůda Kalamata — olivový olej | Olivator',
    meta_description: 'Kalamata — slavná řecká odrůda. Primárně stolní olivy, ale vynikající EVOO s ovocenatou chutí z Messénie a Laconií.',
  },
  {
    slug: 'coratina',
    name: 'Coratina',
    meta_title: 'Odrůda Coratina — olivový olej | Olivator',
    meta_description: 'Coratina — královna apulských odrůd. Velmi vysoké polyfenoly, intenzivní hořkost a štiplavost, zdravotně nejhodnotnější EVOO.',
  },
  {
    slug: 'cima-di-mola',
    name: 'Cima di Mola',
    meta_title: 'Odrůda Cima di Mola — olivový olej | Olivator',
    meta_description: 'Cima di Mola — vzácná apulská odrůda z okolí Bari. Ovocná, elegantní, se středně vysokými polyfenoly — gastronomická specialita.',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(msg + '\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedEntities() {
  log('\n=== 1/3 Seeding regions ===')
  for (const region of REGIONS) {
    const { error } = await supabaseAdmin
      .from('regions')
      .upsert(region, { onConflict: 'slug', ignoreDuplicates: false })
    if (error) log(`  ✗ region ${region.slug}: ${error.message}`)
    else log(`  ✓ region ${region.slug}`)
  }

  log('\n=== 2/3 Seeding brands ===')
  for (const brand of BRANDS) {
    const { error } = await supabaseAdmin
      .from('brands')
      .upsert(brand, { onConflict: 'slug', ignoreDuplicates: false })
    if (error) log(`  ✗ brand ${brand.slug}: ${error.message}`)
    else log(`  ✓ brand ${brand.slug}`)
  }

  log('\n=== 3/3 Seeding cultivars ===')
  for (const cultivar of CULTIVARS) {
    const { error } = await supabaseAdmin
      .from('cultivars')
      .upsert(cultivar, { onConflict: 'slug', ignoreDuplicates: false })
    if (error) log(`  ✗ cultivar ${cultivar.slug}: ${error.message}`)
    else log(`  ✓ cultivar ${cultivar.slug}`)
  }
}

async function backfillProducts() {
  log('\n=== Fetching products ===')
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, origin_country, origin_region, description_long')
    .in('status', ['active', 'draft'])

  if (error) throw new Error('Failed to fetch products: ' + error.message)
  log(`  Fetched ${products.length} products`)

  let brandUpdated = 0
  let regionUpdated = 0
  let cultivarInserted = 0
  let cultivarErrors = 0

  for (const p of products) {
    const brandSlug = extractBrandSlug(p.name)
    const regionSlug = extractRegionSlug(p.origin_country ?? '', p.origin_region ?? '')
    const cultivars = detectCultivars(p.name, p.description_long)

    // Update brand_slug + region_slug in one call
    if (brandSlug || regionSlug) {
      const patch: Record<string, string> = {}
      if (brandSlug) patch.brand_slug = brandSlug
      if (regionSlug) patch.region_slug = regionSlug

      const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update(patch)
        .eq('id', p.id)

      if (updateErr) {
        log(`  ✗ ${p.slug} update: ${updateErr.message}`)
      } else {
        if (brandSlug) brandUpdated++
        if (regionSlug) regionUpdated++
      }
    }

    // Insert cultivar associations
    for (const c of cultivars) {
      const { error: cErr } = await supabaseAdmin
        .from('product_cultivars')
        .upsert(
          { product_id: p.id, cultivar_slug: c.slug },
          { onConflict: 'product_id,cultivar_slug', ignoreDuplicates: true },
        )
      if (cErr) {
        log(`  ✗ cultivar ${c.slug} for ${p.slug}: ${cErr.message}`)
        cultivarErrors++
      } else {
        cultivarInserted++
      }
    }
  }

  log(`\n  brand_slug set:      ${brandUpdated}/${products.length}`)
  log(`  region_slug set:     ${regionUpdated}/${products.length}`)
  log(`  cultivar rows added: ${cultivarInserted} (${cultivarErrors} errors)`)
}

async function main() {
  try {
    await seedEntities()
    await backfillProducts()
    log('\n✅ Backfill complete')
  } catch (err) {
    log('\n❌ ' + String(err))
    process.exit(1)
  }
}

main()
