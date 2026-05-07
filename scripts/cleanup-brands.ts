/**
 * Cleanup brand junk + doplnění country_code.
 * Změny:
 * - p-d-o → kolymbari (řecká vesnice, 7 produktů)
 * - arbequina-picual → smazat brand, products.brand_slug=NULL
 * - alfa → status=inactive (jen 1 inactive product)
 * - casa → smazat brand, jeden product přemapovat na mainova
 * - mainovo → smazat (0 products)
 * - Doplnit country_code pro 9 brandů bez něj
 */
import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // ── 1. p-d-o → kolymbari ──────────────────────────────────────────────────
  console.log('1) p-d-o → kolymbari')
  const { error: e1 } = await supabaseAdmin
    .from('brands')
    .update({
      slug: 'kolymbari',
      name: 'Kolymbari',
      country_code: 'GR',
      status: 'active',  // má 7 active produktů, povýšit
      updated_at: new Date().toISOString(),
    })
    .eq('slug', 'p-d-o')
  if (e1) console.log('   ERR:', e1.message)
  else {
    // Update products.brand_slug
    const { error: e1b } = await supabaseAdmin
      .from('products')
      .update({ brand_slug: 'kolymbari', origin_country: 'GR', origin_region: 'Kréta' })
      .eq('brand_slug', 'p-d-o')
    if (e1b) console.log('   ERR products:', e1b.message)
    else console.log('   ✓ Přejmenováno + 7 produktů updated')
  }

  // ── 2. arbequina-picual: brand smazat, product unlink ─────────────────────
  console.log('2) arbequina-picual: smazat (cultivary nejsou brand)')
  const { error: e2a } = await supabaseAdmin
    .from('products')
    .update({ brand_slug: null })
    .eq('brand_slug', 'arbequina-picual')
  const { error: e2b } = await supabaseAdmin
    .from('brands')
    .delete()
    .eq('slug', 'arbequina-picual')
  if (e2a || e2b) console.log('   ERR:', e2a?.message ?? e2b?.message)
  else console.log('   ✓ Smazán + 1 produkt unlinked')

  // ── 3. alfa: zatím active ale 0 produktů — set inactive ──────────────────
  console.log('3) alfa: 0 active produktů → status=inactive')
  const { error: e3 } = await supabaseAdmin
    .from('brands')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('slug', 'alfa')
  if (e3) console.log('   ERR:', e3.message)
  else console.log('   ✓ alfa nastaven na inactive')

  // ── 4. casa: smazat, product přemapovat na mainova ────────────────────────
  console.log('4) casa: 1 product → přemapovat na mainova, casa smazat')
  const { error: e4a } = await supabaseAdmin
    .from('products')
    .update({ brand_slug: 'mainova' })
    .eq('brand_slug', 'casa')
  const { error: e4b } = await supabaseAdmin
    .from('brands')
    .delete()
    .eq('slug', 'casa')
  if (e4a || e4b) console.log('   ERR:', e4a?.message ?? e4b?.message)
  else console.log('   ✓ Casa smazán, product → mainova')

  // ── 5. mainovo: prázdný brand smazat ─────────────────────────────────────
  console.log('5) mainovo: 0 products → smazat')
  const { error: e5 } = await supabaseAdmin
    .from('brands')
    .delete()
    .eq('slug', 'mainovo')
  if (e5) console.log('   ERR:', e5.message)
  else console.log('   ✓ mainovo smazán')

  // ── 6. Country codes ──────────────────────────────────────────────────────
  console.log('\n6) Doplňování country_code:')
  const updates: Array<{ slug: string; country: string }> = [
    { slug: 'antica-sicilia',   country: 'IT' },
    { slug: 'evolia-platinum',  country: 'GR' },
    { slug: 'foufas',           country: 'GR' },
    { slug: 'messara',          country: 'GR' },
    { slug: 'neotis',           country: 'GR' },
    { slug: 'nikolos',          country: 'GR' },
    { slug: 'pallada-kreta',    country: 'GR' },
    { slug: 'theoni',           country: 'GR' },
    // gourmet-partners — distributor / aggregator, nechat null nebo 'CZ'?
    // Vynechám — admin to může nastavit ručně.
  ]
  for (const u of updates) {
    const { error } = await supabaseAdmin
      .from('brands')
      .update({ country_code: u.country, updated_at: new Date().toISOString() })
      .eq('slug', u.slug)
    if (error) console.log(`   ✗ ${u.slug}: ${error.message}`)
    else console.log(`   ✓ ${u.slug} → ${u.country}`)
  }
}
main().catch(console.error)
