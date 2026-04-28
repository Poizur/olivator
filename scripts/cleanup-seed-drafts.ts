/**
 * Smaže 7 seed placeholder produktů (bez source_url, byly v RANKINGS jako
 * dummy data). Po commitu, který nahradil RANKINGS slugy reálnými produkty,
 * tyto seed záznamy ztrácejí důvod existence.
 *
 * Run: node --env-file=.env.local --import tsx scripts/cleanup-seed-drafts.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

const SEED_SLUGS = [
  'escelsior-bio-siciliano',
  'aglandau-premium-evoo',
  'ybarra-premium-evoo',
  'frantoio-franci-igp',
  'terra-creta-estate-evoo',
  'olival-selection-premium',
  'gaea-fresh-extra-virgin',
  'carbonell-extra-virgin',
]

async function main() {
  // Safety: only delete if status='draft' AND source_url IS NULL
  const { data: candidates, error } = await supabaseAdmin
    .from('products')
    .select('id, slug, status, source_url')
    .in('slug', SEED_SLUGS)
  if (error) {
    console.error(error)
    process.exit(1)
  }
  console.log(`Found ${candidates?.length ?? 0} matching slugs in DB`)

  const safeToDelete = (candidates ?? []).filter(
    (p) => p.status === 'draft' && !p.source_url
  )
  console.log(`Safe to delete (status=draft AND no source_url): ${safeToDelete.length}`)

  if (safeToDelete.length === 0) {
    console.log('Nothing to do.')
    return
  }

  for (const p of safeToDelete) {
    // Cascade delete prerequisites — offers, images, clicks
    await supabaseAdmin.from('product_offers').delete().eq('product_id', p.id)
    await supabaseAdmin.from('product_images').delete().eq('product_id', p.id)
    await supabaseAdmin.from('affiliate_clicks').delete().eq('product_id', p.id)
    const { error: delErr } = await supabaseAdmin.from('products').delete().eq('id', p.id)
    if (delErr) {
      console.warn(`  ✗ ${p.slug}: ${delErr.message}`)
    } else {
      console.log(`  ✓ ${p.slug} smazán`)
    }
  }
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
