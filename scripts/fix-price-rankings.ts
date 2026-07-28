/**
 * Regeneruje cenové žebříčky ("do X Kč") s SPRÁVNOU logikou:
 * filtruje podle CENY LAHVE (cheapest offer price), ne Kč/100ml.
 *
 * Per-100ml řazení je správné jen pro 5L stránku.
 *
 * Spuštění: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/fix-price-rankings.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

const PRICE_RANKINGS = [
  {
    slug: 'nejlepsi-olivovy-olej-do-200-kc',
    title: 'Nejlepší olivový olej do 200 Kč',
    description: 'Olivové oleje s nejvyšším Olivator Score dostupné za méně než 200 Kč za lahev. Aktualizováno denně podle reálných cen.',
    emoji: '💚',
    priceMax: 200,
  },
  {
    slug: 'nejlepsi-olivovy-olej-do-300-kc',
    title: 'Nejlepší olivový olej do 300 Kč',
    description: 'Nejlepší extra panenské olivové oleje do 300 Kč za lahev — ideální poměr kvality a ceny.',
    emoji: '🏆',
    priceMax: 300,
  },
  {
    slug: 'nejlepsi-olivovy-olej-do-500-kc',
    title: 'Nejlepší olivový olej do 500 Kč',
    description: 'Prémiové olivové oleje do 500 Kč za lahev — pro ty, kdo nechtějí kompromis na kvalitě.',
    emoji: '⭐',
    priceMax: 500,
  },
]

async function main() {
  // 1. Načti min. cenu lahve per produkt (aktivní nabídky, skladem)
  const { data: allOffers, error: offersErr } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price')
    .eq('in_stock', true)
  if (offersErr) throw offersErr

  const minBottlePrice = new Map<string, number>()
  for (const o of allOffers ?? []) {
    const cur = minBottlePrice.get(o.product_id as string)
    const price = o.price as number
    if (cur === undefined || price < cur) minBottlePrice.set(o.product_id as string, price)
  }
  console.log(`Loaded ${minBottlePrice.size} products with offers`)

  // 2. Načti aktivní produkty s olivator_score
  const { data: allProducts, error: productsErr } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, olivator_score, volume_ml')
    .eq('status', 'active')
    .gt('olivator_score', 0)
    .order('olivator_score', { ascending: false })
  if (productsErr) throw productsErr

  // 3. Pro každý žebříček: filtruj + sort + upsert
  for (const def of PRICE_RANKINGS) {
    const filtered = (allProducts ?? []).filter((p) => {
      const bottlePrice = minBottlePrice.get(p.id as string)
      return bottlePrice !== undefined && bottlePrice <= def.priceMax
    })

    // Top 20 po Score (bereits seřazeno desc)
    const top20 = filtered.slice(0, 20)
    const productSlugs = top20.map((p) => p.slug as string)

    console.log(`\n${def.slug}: ${productSlugs.length} produktů do ${def.priceMax} Kč (lahev)`)
    top20.forEach((p, i) => {
      const price = minBottlePrice.get(p.id as string)
      console.log(`  ${i + 1}. ${p.slug} — ${p.olivator_score} score, ${price} Kč, ${p.volume_ml}ml`)
    })

    if (productSlugs.length === 0) {
      console.warn(`  ⚠️  Žádné produkty pro ${def.slug} — žebříček neregenrujeme`)
      continue
    }

    const { error } = await supabaseAdmin
      .from('rankings')
      .upsert(
        {
          slug: def.slug,
          title: def.title,
          description: def.description,
          emoji: def.emoji,
          product_slugs: productSlugs,
          status: 'active',
        },
        { onConflict: 'slug' },
      )

    if (error) {
      console.error(`  ✗ Chyba při upsert ${def.slug}:`, error.message)
    } else {
      console.log(`  ✓ Upsertováno ${productSlugs.length} produktů`)
    }
  }

  console.log('\nHotovo.')
}

main().catch(console.error)
