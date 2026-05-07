/**
 * Stáhne Unsplash fotky pro entity (regiony, brandy, cultivary).
 * Region = 3 fotky/region, Brand+Cultivar = 1 fotka/entitu. Idempotentní —
 * source_id UNIQUE check vyhne duplicitám při re-runu.
 *
 * Spuštění:
 *   unset ANTHROPIC_API_KEY UNSPLASH_ACCESS_KEY  # shell má prázdné, --env-file je respect-existing
 *   npx tsx --env-file=.env.local scripts/import-entity-photos.ts
 *
 * Flagy:
 *   --type=region|brand|cultivar  (default: all)
 *   --slug=peloponnes              (one entity)
 */

import {
  importRegionPhotos,
  importBrandPhotos,
  importCultivarPhotos,
  type EntityPhotosResult,
} from '@/lib/entity-photos'

const TYPE = process.argv.find(a => a.startsWith('--type='))?.split('=')[1]
const SLUG = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1]
// --all-db: u brandů iteruj všechny slug z DB (jinak jen ty s explicit query v BRAND_QUERIES)
const ALL_DB = process.argv.includes('--all-db')

function printResult(label: string, r: EntityPhotosResult) {
  console.log(`\n${label}: ${r.totalInserted} inserted, ${r.totalErrors} errors`)
  for (const item of r.results) {
    const status = item.error ? `❌ ${item.error.slice(0, 60)}` : `✓ +${item.inserted} (${item.skipped} skip)`
    console.log(`  ${item.slug.padEnd(20)} ${status}`)
  }
}

async function main() {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.error('❌ UNSPLASH_ACCESS_KEY missing in env')
    process.exit(1)
  }

  if (!TYPE || TYPE === 'region') {
    const r = await importRegionPhotos(SLUG)
    printResult('REGIONS', r)
  }
  if (!TYPE || TYPE === 'brand') {
    const r = await importBrandPhotos(SLUG, { allDbBrands: ALL_DB })
    printResult('BRANDS', r)
  }
  if (!TYPE || TYPE === 'cultivar') {
    const r = await importCultivarPhotos(SLUG)
    printResult('CULTIVARS', r)
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
