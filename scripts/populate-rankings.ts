/**
 * Naplní product_slugs pro 8 nových žebříčků v rankings tabulce automaticky
 * dle filter logiky (cena, certifikace, use_case, origin).
 *
 * Idempotentní — re-run přepíše dle aktuálních cen + Score.
 *
 * Run: npx tsx --env-file=.env.local scripts/populate-rankings.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

interface ProductWithOffer {
  slug: string
  name: string
  type: string
  origin_country: string | null
  certifications: string[] | null
  use_cases: string[] | null
  olivator_score: number | null
  volume_ml: number | null
  cheapest_price: number | null
  price_per_500ml: number | null  // normalizovaná cena
}

async function loadProducts(): Promise<ProductWithOffer[]> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, type, origin_country, certifications, use_cases, olivator_score, volume_ml')
    .eq('status', 'active')
    .neq('type', 'flavored')

  const ps = (products ?? []) as Array<{
    id: string
    slug: string
    name: string
    type: string
    origin_country: string | null
    certifications: string[] | null
    use_cases: string[] | null
    olivator_score: number | null
    volume_ml: number | null
  }>

  // Cheapest offer per product
  const result: ProductWithOffer[] = []
  for (const p of ps) {
    const { data: offers } = await supabaseAdmin
      .from('product_offers')
      .select('price')
      .eq('product_id', p.id)
      .eq('in_stock', true)
      .order('price', { ascending: true })
      .limit(1)

    const cheapest = offers?.[0]?.price ?? null
    const ppMl500 = cheapest != null && p.volume_ml
      ? (cheapest * 500) / p.volume_ml
      : null

    result.push({
      slug: p.slug,
      name: p.name,
      type: p.type,
      origin_country: p.origin_country,
      certifications: p.certifications,
      use_cases: p.use_cases,
      olivator_score: p.olivator_score,
      volume_ml: p.volume_ml,
      cheapest_price: cheapest,
      price_per_500ml: ppMl500,
    })
  }
  return result
}

function topByScoreFiltered(
  products: ProductWithOffer[],
  filter: (p: ProductWithOffer) => boolean,
  limit = 12
): string[] {
  return products
    .filter(filter)
    .filter(p => p.olivator_score != null && p.olivator_score > 0)
    .sort((a, b) => (b.olivator_score ?? 0) - (a.olivator_score ?? 0))
    .slice(0, limit)
    .map(p => p.slug)
}

async function updateRanking(slug: string, productSlugs: string[]) {
  if (productSlugs.length === 0) {
    console.log(`  ⚠ ${slug}: 0 produktů — preskakuji update`)
    return
  }
  const { error } = await supabaseAdmin
    .from('rankings')
    .update({ product_slugs: productSlugs, updated_at: new Date().toISOString() })
    .eq('slug', slug)
  if (error) console.log(`  ❌ ${slug}: ${error.message}`)
  else console.log(`  ✅ ${slug}: ${productSlugs.length} produktů`)
}

async function main() {
  console.log('Načítám produkty + nabídky…')
  const products = await loadProducts()
  console.log(`  → ${products.length} aktivních produktů (bez flavored)`)
  console.log(`  → ${products.filter(p => p.cheapest_price != null).length} s aktuální cenou`)

  console.log('\nNaplňuji žebříčky:\n')

  // 1. Do 200 Kč — top score s cenou ≤ 200 Kč za 500 ml
  await updateRanking(
    'nejlepsi-olivovy-olej-do-200-kc',
    topByScoreFiltered(products, p => p.price_per_500ml != null && p.price_per_500ml <= 200, 12)
  )

  // 2. Do 300 Kč — sweet spot většiny domácností
  await updateRanking(
    'nejlepsi-olivovy-olej-do-300-kc',
    topByScoreFiltered(products, p => p.price_per_500ml != null && p.price_per_500ml <= 300, 12)
  )

  // 3. Do 500 Kč — premium pásmo
  await updateRanking(
    'nejlepsi-olivovy-olej-do-500-kc',
    topByScoreFiltered(products, p => p.price_per_500ml != null && p.price_per_500ml <= 500, 12)
  )

  // 4. Premium > 500 Kč
  await updateRanking(
    'nejlepsi-premiovy-olivovy-olej',
    topByScoreFiltered(products, p => p.price_per_500ml != null && p.price_per_500ml > 500, 10)
  )

  // 5. Bio řecký
  await updateRanking(
    'nejlepsi-bio-recky-olej',
    topByScoreFiltered(products, p =>
      p.origin_country === 'GR' &&
      (p.certifications ?? []).some(c => c.toLowerCase() === 'bio' || c.toLowerCase() === 'organic'),
      10
    )
  )

  // 6. DOP
  await updateRanking(
    'nejlepsi-dop-olivovy-olej',
    topByScoreFiltered(products, p =>
      (p.certifications ?? []).some(c => c.toLowerCase() === 'dop'),
      10
    )
  )

  // 7. Na salát — use_case 'salad' nebo 'dipping'
  await updateRanking(
    'nejlepsi-olivovy-olej-na-salat',
    topByScoreFiltered(products, p =>
      (p.use_cases ?? []).some(u => u === 'salad' || u === 'dipping' || u === 'fish'),
      10
    )
  )

  // 8. Na vaření — use_case 'cooking' nebo 'frying' nebo 'meat'
  await updateRanking(
    'nejlepsi-olivovy-olej-na-vareni',
    topByScoreFiltered(products, p =>
      (p.use_cases ?? []).some(u => u === 'cooking' || u === 'frying' || u === 'meat'),
      10
    )
  )

  // ── Bonus: stávající žebříčky bez seedovaných slugů (recky, italsky, bio,
  //          vysokopolyfenolovy) — pokud jsou prázdné, naplníme i je ────────────
  await updateRanking(
    'nejlepsi-recky-olej',
    topByScoreFiltered(products, p => p.origin_country === 'GR', 10)
  )
  await updateRanking(
    'nejlepsi-italsky-olej',
    topByScoreFiltered(products, p => p.origin_country === 'IT', 10)
  )
  await updateRanking(
    'nejlepsi-bio-olej',
    topByScoreFiltered(products, p =>
      (p.certifications ?? []).some(c => c.toLowerCase() === 'bio' || c.toLowerCase() === 'organic'),
      12
    )
  )

  // Vysokopolyfenolovy — potřebuje polyphenol data, načteme zvlášť
  const { data: highPoly } = await supabaseAdmin
    .from('products')
    .select('slug, polyphenols, olivator_score')
    .eq('status', 'active')
    .neq('type', 'flavored')
    .gte('polyphenols', 500)
    .order('polyphenols', { ascending: false })
    .limit(10)
  await updateRanking(
    'nejlepsi-vysokopolyfenolovy-olej',
    ((highPoly ?? []) as Array<{ slug: string }>).map(p => p.slug)
  )

  console.log('\n✅ Hotovo')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
