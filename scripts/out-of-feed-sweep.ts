/**
 * Okamžitý out-of-feed sweep — retroaktivní oprava stale in_stock.
 *
 * Pro každého feedového retailera: nabídky, jejichž last_checked je starší
 * než dnešní feed-sync run (04:00 UTC), nastav product_offers.in_stock=false.
 * Produkt se vrátí do webu jako dostupný až feed-sync příště upsertne nabídku.
 *
 * Run: npx tsx --env-file=.env.local scripts/out-of-feed-sweep.ts
 * Dry run: npx tsx --env-file=.env.local scripts/out-of-feed-sweep.ts --dry-run
 */
import { supabaseAdmin } from '@/lib/supabase'

const isDryRun = process.argv.includes('--dry-run')

// Cutoff: dnešní feed-sync proběhl v 04:00 UTC. Nabídky starší = nezasažené feedem dnes.
const todayRun = new Date()
todayRun.setUTCHours(4, 0, 0, 0)
// Pokud je teď před 04:00 UTC, posun na včerejší 04:00
if (new Date() < todayRun) todayRun.setUTCDate(todayRun.getUTCDate() - 1)
const cutoff = todayRun.toISOString()

console.log(`[sweep] cutoff: ${cutoff} (nabídky starší → potenciálně out-of-feed)`)
console.log(`[sweep] dry-run: ${isDryRun}`)

async function main() {
  // 1. Načti feedové retailery (mají xml_feed_url)
  const { data: retailers, error: rErr } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, xml_feed_url')
    .eq('is_active', true)
    .not('xml_feed_url', 'is', null)

  if (rErr) { console.error('[sweep] retailers query failed:', rErr.message); process.exit(1) }
  console.log(`[sweep] feedoví retaileři: ${retailers?.length ?? 0}`)

  let totalMarked = 0
  const markedProducts: Array<{ retailer: string; slug: string; price: number }> = []

  for (const retailer of retailers ?? []) {
    // 2. Nabídky tohoto retailera se stale last_checked (= nebyly v dnešním feedu)
    const { data: staleOffers, error: oErr } = await supabaseAdmin
      .from('product_offers')
      .select('id, product_id, price, in_stock, products!inner(slug)')
      .eq('retailer_id', retailer.id)
      .eq('in_stock', true)
      .lt('last_checked', cutoff)

    if (oErr) {
      console.warn(`[sweep] ${retailer.slug}: offers query failed:`, oErr.message)
      continue
    }

    const stale = (staleOffers ?? []) as Array<{
      id: string; product_id: string; price: number; in_stock: boolean;
      products: { slug: string } | null
    }>

    if (stale.length === 0) {
      console.log(`[sweep] ${retailer.slug}: 0 stale offers ✓`)
      continue
    }

    console.log(`[sweep] ${retailer.slug}: ${stale.length} stale in_stock offers`)
    for (const o of stale) {
      const slug = (o.products as { slug: string } | null)?.slug ?? o.product_id
      markedProducts.push({ retailer: retailer.slug, slug, price: o.price })
      console.log(`  → ${slug} (${o.price} Kč) → in_stock=false`)
    }

    if (!isDryRun) {
      const ids = stale.map(o => o.product_id)
      const { error: updErr } = await supabaseAdmin
        .from('product_offers')
        .update({ in_stock: false })
        .eq('retailer_id', retailer.id)
        .in('product_id', ids)

      if (updErr) {
        console.error(`[sweep] ${retailer.slug}: UPDATE failed:`, updErr.message)
      } else {
        totalMarked += stale.length
      }
    } else {
      totalMarked += stale.length
    }
  }

  console.log('\n[sweep] ══════════════════════════════')
  console.log(`[sweep] VÝSLEDEK${isDryRun ? ' (DRY RUN)' : ''}`)
  console.log(`  Celkem přepnuto: ${totalMarked} offers → in_stock=false`)
  if (markedProducts.length > 0) {
    console.log('\n  Produkty:')
    for (const p of markedProducts) {
      console.log(`  ${p.retailer}: ${p.slug} (${p.price} Kč)`)
    }
  }
  console.log('[sweep] ══════════════════════════════')

  process.exit(0)
}

main().catch(err => {
  console.error('[sweep] FATAL:', err)
  process.exit(1)
})
