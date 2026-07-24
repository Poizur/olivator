// Karanténa nesmluvních retailerů — 2026-07-24
// Mechanismus: is_active=false pro karanténní retailery (offers se přestanou zobrazovat).
// Produkty s jediným karanténním prodejcem → inactive+quarantine tag.
// Plně reverzibilní: is_active=true + products status_reason_code='quarantine' → aktivovat zpět.
//
// Smluvní (zůstávají): affiliate_network IN ('eHUB','Dognet','CJ','Heureka')
// Karanténa: vše ostatní (direct, null)
//
// POZNÁMKA: Sloupec is_paused bude přidán deployem migrace 20260724_product_offers_is_paused.sql.
// Do té doby karanténa běží přes is_active=false na retailers tabulce.

import { supabaseAdmin } from '@/lib/supabase'

const QUARANTINE_TAG = 'quarantine-2026-07'
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(`[quarantine] start ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`)

  // 1. Zjisti smluvní vs. karanténní retailery
  const { data: allRetailers } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, affiliate_network, is_active')
    .eq('is_active', true)

  const CONTRACTED_NETWORKS = ['eHUB', 'Dognet', 'CJ', 'Heureka']
  const smluvni = (allRetailers ?? []).filter(r => CONTRACTED_NETWORKS.includes(r.affiliate_network ?? ''))
  const karantena = (allRetailers ?? []).filter(r => !CONTRACTED_NETWORKS.includes(r.affiliate_network ?? ''))

  console.log(`\nSmluvní (${smluvni.length}): ${smluvni.map(r => r.slug).join(', ')}`)
  console.log(`Karanténa (${karantena.length}): ${karantena.map(r => r.slug).join(', ')}`)

  if (karantena.length === 0) {
    console.log('Žádní karanténní retaileři — konec.')
    return
  }

  const karantenaIds = karantena.map(r => r.id)
  const smluvniIds = smluvni.map(r => r.id)

  // 2. Zjisti, které produkty mají alespoň 1 smluvní nabídku (budou zůstávat active)
  const { data: smluvniOffers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id')
    .in('retailer_id', smluvniIds)

  const productsWithSmluvniOffer = new Set((smluvniOffers ?? []).map(o => o.product_id))

  // 3. Zjisti aktivní produkty a roztřiď je
  const { data: activeProducts } = await supabaseAdmin
    .from('products')
    .select('id, slug, status')
    .eq('status', 'active')

  const quarantineProducts = (activeProducts ?? []).filter(p => !productsWithSmluvniOffer.has(p.id))
  const stayProducts = (activeProducts ?? []).filter(p => productsWithSmluvniOffer.has(p.id))

  console.log(`\nProdukty se smluvní nabídkou (zůstávají active): ${stayProducts.length}`)
  console.log(`Produkty BEZ smluvní nabídky (→ inactive): ${quarantineProducts.length}`)

  if (quarantineProducts.length > 0 && !DRY_RUN) {
    console.log('\nPříklady produktů → inactive:')
    quarantineProducts.slice(0, 5).forEach(p => console.log(`  ${p.slug}`))
    if (quarantineProducts.length > 5) console.log(`  ... a ${quarantineProducts.length - 5} dalších`)

    // Batch po 100
    const qIds = quarantineProducts.map(p => p.id)
    for (let i = 0; i < qIds.length; i += 100) {
      const batch = qIds.slice(i, i + 100)
      const { error } = await supabaseAdmin
        .from('products')
        .update({
          status: 'inactive',
          status_reason_code: 'quarantine',
          status_reason_note: QUARANTINE_TAG,
        })
        .in('id', batch)
      if (error) throw new Error(`products inactive failed: ${error.message}`)
    }
    console.log(`  ✓ ${quarantineProducts.length} produktů nastaveno inactive`)
  }

  // 4. Deaktivuj karanténní retailers (is_active=false → jejich offers zmizí z listingu)
  const { data: karantenaOffers } = await supabaseAdmin
    .from('product_offers')
    .select('id, product_id, retailer_id')
    .in('retailer_id', karantenaIds)

  console.log(`\nOffers od karanténních retailers: ${karantenaOffers?.length ?? 0}`)
  console.log(`Nastavuji is_active=false pro ${karantena.length} karanténních retailers...`)

  if (!DRY_RUN) {
    const { error } = await supabaseAdmin
      .from('retailers')
      .update({ is_active: false })
      .in('id', karantenaIds)
    if (error) throw new Error(`retailers is_active=false failed: ${error.message}`)
    console.log(`  ✓ ${karantena.length} retailers deaktivováno`)
  }

  // 5. Sumarizace po retailerech
  console.log('\n=== REPORT PO RETAILERECH ===')
  for (const r of karantena) {
    const offersFromR = (karantenaOffers ?? []).filter(o => o.retailer_id === r.id)
    const affectedProductIds = [...new Set(offersFromR.map(o => o.product_id))]
    const quarantinedCount = affectedProductIds.filter(id =>
      quarantineProducts.some(p => p.id === id)
    ).length
    console.log(`  ${r.slug}: ${offersFromR.length} offers, ${quarantinedCount} produktů → inactive`)
  }

  // 6. Log do agent_decisions
  if (!DRY_RUN) {
    await supabaseAdmin.from('agent_decisions').insert({
      agent_name: 'quarantine-retailers',
      decision_type: 'quarantine_executed',
      payload: {
        tag: QUARANTINE_TAG,
        quarantine_retailers: karantena.map(r => r.slug),
        smluvni_retailers: smluvni.map(r => r.slug),
        offers_hidden: karantenaOffers?.length ?? 0,
        products_deactivated: quarantineProducts.length,
        products_remaining_active: stayProducts.length,
      },
    })
    console.log('\n✓ Zalogováno do agent_decisions')
  }

  console.log(`\n[quarantine] done. Active produkty po karanténě: ${DRY_RUN ? stayProducts.length + ' (dry run)' : stayProducts.length}`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
