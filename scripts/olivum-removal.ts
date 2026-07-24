// OLIVUM REMOVAL — právní úklid 2026-07-24
// Spustit: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/olivum-removal.ts
// Bezpečné opakovat — operace jsou idempotentní.

import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const OLIVUM_SLUG = 'olivum'
const REMOVAL_NOTE = 'removed on legal request 2026-07-24'

async function main() {
  console.log('=== OLIVUM REMOVAL ===', new Date().toISOString())

  // 1. Získat retailer ID
  const { data: retailer, error: rErr } = await supabaseAdmin
    .from('retailers')
    .select('id, slug, name, is_active')
    .eq('slug', OLIVUM_SLUG)
    .maybeSingle()

  if (rErr || !retailer) {
    console.error('CHYBA: Olivum retailer nenalezen:', rErr?.message)
    process.exit(1)
  }

  const retailerId = retailer.id
  console.log(`Retailer: ${retailer.name} (${retailerId}), is_active=${retailer.is_active}`)

  // 2. Produkty s olivum nabídkou
  const { data: offers, error: oErr } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, product_url')
    .eq('retailer_id', retailerId)

  if (oErr) { console.error('CHYBA offers:', oErr.message); process.exit(1) }

  const productIds = [...new Set((offers ?? []).map(o => o.product_id))]
  console.log(`\nProdukty k deaktivaci: ${productIds.length}`)

  // 3. Načíst primary image storage paths před mazáním
  const { data: primaryImages } = await supabaseAdmin
    .from('product_images')
    .select('id, product_id, url')
    .in('product_id', productIds)
    .eq('is_primary', true)
    .eq('source', 'scraper')

  console.log(`Primary fotky v Storage: ${primaryImages?.length ?? 0}`)

  // --- FÁZE A: Candidate hotlinky (162 olivum.cz CDN hotlinků) ---
  console.log('\n[A] Mazání scraper_candidate hotlinků na olivum.cz CDN...')
  const { data: deletedCandidates, error: dcErr } = await supabaseAdmin
    .from('product_images')
    .delete()
    .in('product_id', productIds)
    .eq('source', 'scraper_candidate')
    .select('id')

  if (dcErr) console.error('  Chyba candidate delete:', dcErr.message)
  console.log(`  Smazáno candidate images: ${deletedCandidates?.length ?? 0}`)

  // --- FÁZE B: Primary fotky ze Storage ---
  console.log('\n[B] Mazání primary fotek ze Supabase Storage...')

  // Storage client (potřebuje service key — supabaseAdmin má tu správnou)
  // Extrahuj storage paths z URL: https://xxx.supabase.co/storage/v1/object/public/products/PATH
  const storagePathsToDelete: string[] = []
  for (const img of primaryImages ?? []) {
    const match = img.url?.match(/\/storage\/v1\/object\/public\/products\/(.+)$/)
    if (match) {
      storagePathsToDelete.push(match[1])
    } else {
      console.warn(`  Nelze parsovat storage path: ${img.url?.slice(0, 80)}`)
    }
  }

  console.log(`  Storage paths k mazání: ${storagePathsToDelete.length}`)

  if (storagePathsToDelete.length > 0) {
    // Mazat po 50 (Supabase limit)
    for (let i = 0; i < storagePathsToDelete.length; i += 50) {
      const batch = storagePathsToDelete.slice(i, i + 50)
      const { error: storageErr } = await supabaseAdmin.storage
        .from('products')
        .remove(batch)
      if (storageErr) {
        console.warn(`  Storage batch ${i}–${i+batch.length}: ${storageErr.message}`)
      } else {
        console.log(`  Storage batch ${i}–${i+batch.length}: OK`)
      }
    }
  }

  // Smazat primary images z DB
  const { data: deletedPrimary, error: dpErr } = await supabaseAdmin
    .from('product_images')
    .delete()
    .in('product_id', productIds)
    .eq('is_primary', true)
    .select('id')

  if (dpErr) console.error('  Chyba primary DB delete:', dpErr.message)
  console.log(`  Smazáno primary images z DB: ${deletedPrimary?.length ?? 0}`)

  // Smazat zbývající images pro tyto produkty (galerie)
  const { data: deletedGallery, error: dgErr } = await supabaseAdmin
    .from('product_images')
    .delete()
    .in('product_id', productIds)
    .select('id')

  if (dgErr) console.error('  Chyba gallery delete:', dgErr.message)
  console.log(`  Smazáno galerie images z DB: ${deletedGallery?.length ?? 0}`)

  // --- FÁZE C: Smazat product_offers ---
  console.log('\n[C] Mazání product_offers od olivum...')
  const { data: deletedOffers, error: doErr } = await supabaseAdmin
    .from('product_offers')
    .delete()
    .eq('retailer_id', retailerId)
    .select('id')

  if (doErr) console.error('  Chyba offers delete:', doErr.message)
  console.log(`  Smazáno offers: ${deletedOffers?.length ?? 0}`)

  // --- FÁZE D: Produkty → inactive ---
  console.log('\n[D] Nastavení produktů na status=inactive...')

  // Batch po 50
  let deactivatedCount = 0
  for (let i = 0; i < productIds.length; i += 50) {
    const batch = productIds.slice(i, i + 50)
    const { data: updated, error: uErr } = await supabaseAdmin
      .from('products')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .in('id', batch)
      .select('id')

    if (uErr) console.error(`  Batch ${i}: chyba update:`, uErr.message)
    deactivatedCount += updated?.length ?? 0
  }
  console.log(`  Deaktivováno produktů: ${deactivatedCount}`)

  // --- FÁZE E: Retailer deaktivace ---
  console.log('\n[E] Deaktivace olivum retailera...')
  const { error: riErr } = await supabaseAdmin
    .from('retailers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', retailerId)

  if (riErr) console.error('  Chyba retailer update:', riErr.message)
  else console.log('  Retailer is_active=false: OK')

  // --- FÁZE F: Zápis poznámky do discovery_sources (pokud existuje) ---
  console.log('\n[F] Zablokování olivum.cz v discovery_sources...')
  const { error: dsErr } = await supabaseAdmin
    .from('discovery_sources')
    .update({ status: 'disabled', note: REMOVAL_NOTE, updated_at: new Date().toISOString() })
    .ilike('url', '%olivum.cz%')

  if (dsErr) {
    // Tabulka nemusí existovat nebo záznam chybí — záznam přidat jako pojistku
    console.warn('  discovery_sources update skipped:', dsErr.message)
    // Pokus vložit záznam
    const { error: dsInsertErr } = await supabaseAdmin
      .from('discovery_sources')
      .upsert({
        url: 'https://olivum.cz',
        retailer_slug: 'olivum',
        status: 'disabled',
        note: REMOVAL_NOTE,
      }, { onConflict: 'url' })
    if (dsInsertErr) console.warn('  discovery_sources insert skipped:', dsInsertErr.message)
    else console.log('  discovery_sources: olivum.cz disabled (upserted)')
  } else {
    console.log('  discovery_sources: olivum.cz disabled')
  }

  // --- FÁZE G: Články — odstranění olivum zmínek ---
  console.log('\n[G] Čištění olivum zmínek v článcích...')
  const { data: articles, error: artErr } = await supabaseAdmin
    .from('articles')
    .select('id, slug, body_markdown, status')
    .ilike('body_markdown', '%olivum%')

  if (artErr) console.error('  Chyba načtení článků:', artErr.message)
  console.log(`  Nalezeno článků s olivum: ${articles?.length ?? 0}`)

  for (const article of articles ?? []) {
    let body = article.body_markdown ?? ''
    const originalBody = body

    // 1. Ceníkové věty typu "459 Kč u Olivum.cz" nebo "od 459 Kč u Olivum" — odstraň celou větu/klauzuli
    // Vzory: "od X Kč u Olivum.cz", "X Kč u Olivum.cz", "u Olivum.cz", "na Olivum.cz"
    body = body.replace(/\bkoupit:?\s*[^\n]*[Oo]livum\.cz[^\n]*/g, '')
    body = body.replace(/[^.!\n]*\d+\s*Kč[^.!\n]*[Oo]livum[^.!\n]*[.!]?/g, '')
    body = body.replace(/\(([^)]*[Oo]livum[^)]*)\)/g, '')  // (... Olivum ...)
    body = body.replace(/,?\s*[Oo]livum\.cz\s*[^\s,;.]*[,;.]?/g, '')  // "... , Olivum.cz ..."
    body = body.replace(/,?\s*[Oo]livum\s+(nabíz|má|prodáv)[^.!?\n]*[.!?]?/g, '')

    // 2. Editorial zmínka v nejlepsi-olivovy-olej-2026
    if (article.slug === 'nejlepsi-olivovy-olej-2026') {
      body = body.replace(/Olivum\.cz nabíz[^.!?\n]*[.!?]/g,
        'Specializované olivárny s kurátorským výběrem mají zpravidla lepší přehled o původu a sklizni.')
      body = body.replace(/[Oo]livarna\.cz nebo [Oo]livum\.cz ([^.!?\n]*)[.!?]/g,
        'Specializované olivárny $1.')
    }

    // 3. Cleanup prázdných řádků / trailing spaces
    body = body.replace(/\n{3,}/g, '\n\n').trim()

    if (body !== originalBody) {
      const { error: patchErr } = await supabaseAdmin
        .from('articles')
        .update({ body_markdown: body, updated_at: new Date().toISOString() })
        .eq('id', article.id)

      if (patchErr) {
        console.error(`  CHYBA patch ${article.slug}:`, patchErr.message)
      } else {
        console.log(`  Opraveno: ${article.slug}`)
      }
    } else {
      console.log(`  Beze změn (regex nenalezl vzor): ${article.slug}`)
    }
  }

  // --- SOUHRN ---
  console.log('\n=== SOUHRN ===')
  console.log(`Candidate images smazáno: ${deletedCandidates?.length ?? 0}`)
  console.log(`Primary images ze Storage: ${storagePathsToDelete.length}`)
  console.log(`Primary images z DB: ${deletedPrimary?.length ?? 0}`)
  console.log(`Galerie images z DB: ${deletedGallery?.length ?? 0}`)
  console.log(`Offers smazáno: ${deletedOffers?.length ?? 0}`)
  console.log(`Produkty deaktivovány: ${deactivatedCount}`)
  console.log(`Retailer deaktivován: ${!riErr}`)
  console.log(`Články opraveny: ${(articles ?? []).length} zkontrolováno`)

  // Price index re-check
  console.log('\n[H] Price index statistiky po odstranění...')
  const { count: activeProducts } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  const { count: activeOffers } = await supabaseAdmin
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
    .eq('in_stock', true)
  console.log(`  Aktivních produktů: ${activeProducts}`)
  console.log(`  Aktivních nabídek: ${activeOffers}`)

  // Ověření: žádný olivum v aktivních produktech
  const { data: residualOffers } = await supabaseAdmin
    .from('product_offers')
    .select('id')
    .eq('retailer_id', retailerId)

  console.log(`\n[I] Ověření: zbývající olivum offers: ${residualOffers?.length ?? 0}`)
  if ((residualOffers?.length ?? 0) > 0) {
    console.error('  VAROVÁNÍ: Stále existují olivum offers! Zkontrolovat ručně.')
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
