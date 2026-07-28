/**
 * Regeneruje cenové žebříčky ("do X Kč") s SPRÁVNOU logikou:
 * filtruje podle CENY LAHVE (cheapest offer price), ne Kč/100ml.
 *
 * Per-100ml řazení je správné jen pro 5L stránku.
 *
 * Spuštění: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/fix-price-rankings.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

// ─── Polyfenolový žebříček ────────────────────────────────────────────────────
const POLY_RANKING = {
  slug: 'nejlepsi-vysokopolyfenolovy-olej',
  title: 'Nejlepší vysokopolyfenolové oleje',
  description:
    'Oleje s nejvyšším doloženým obsahem polyfenolů — seřazeny sestupně podle mg/kg. ' +
    'Práh vstupu do žebříčku: ≥500 mg/kg (EU tvrzení „vysoký obsah" začíná na 250 mg/kg; ' +
    'nad 500 mg/kg mluvíme o intenzitě, nad 1 500 mg/kg o světové špičce). ' +
    'Jen oleje s aktivní nabídkou u ověřeného prodejce.',
  emoji: '⚗️',
  metaTitle: 'Nejlepší vysokopolyfenolový olivový olej 2026 | Olivátor',
  polyMin: 500,
}

async function regeneratePolyRanking(
  isEffectivelyFlavored: (name: string) => boolean,
  minBottlePrice: Map<string, number>
) {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, polyphenols, olivator_score, type, status')
    .eq('status', 'active')
    .gte('polyphenols', POLY_RANKING.polyMin)
    .not('polyphenols', 'is', null)
    .neq('type', 'flavored')
    .order('polyphenols', { ascending: false })
    .order('olivator_score', { ascending: false })
  if (error) throw error

  // Dedup: jeden produkt per (poly_bucket × brand_prefix)
  // Bucket = Math.round(poly/100)*100 → Sitia 646 + 646 + ... → jeden "600-sitia"
  // Různé poly úrovně stejné značky (Evolia 2777 vs 2012, Intini 903 vs 623) → zachovány
  // DŮLEŽITÉ: slug musí přesně odpovídat slug v products tabulce — verifikuj před commitem
  const seenBucket = new Set<string>()
  const filtered: typeof products = []
  for (const p of products ?? []) {
    if (isEffectivelyFlavored(p.name as string)) continue
    if (!minBottlePrice.has(p.id as string)) continue // bez aktivní nabídky ven
    const bucket = `${Math.round((p.polyphenols as number) / 100) * 100}-${(p.slug as string).split('-')[0]}`
    if (seenBucket.has(bucket)) continue
    seenBucket.add(bucket)
    filtered.push(p)
  }

  const top = filtered.slice(0, 12)
  const productSlugs = top.map((p) => p.slug as string)

  console.log(`\n${POLY_RANKING.slug}: ${productSlugs.length} produktů (≥${POLY_RANKING.polyMin} mg/kg, dedupováno)`)
  top.forEach((p, i) => {
    const price = minBottlePrice.get(p.id as string)
    console.log(`  ${i + 1}. poly=${p.polyphenols} score=${p.olivator_score} | ${(p.name as string).slice(0, 60)} [${price} Kč]`)
  })

  if (productSlugs.length === 0) {
    console.warn(`  ⚠️  Žádné produkty — žebříček neregenrujeme`)
    return
  }

  const winner = top[0]
  const winnerPrice = minBottlePrice.get(winner.id as string)
  const metaDesc = `Vítěz: ${winner.name} (Score ${winner.olivator_score}, ${winner.polyphenols} mg/kg polyfenolů)${winnerPrice ? ` od ${winnerPrice} Kč` : ''}. Žebříček ${top.length} olejů s nejvyšší doloženou koncentrací polyfenolů.`

  const { error: upsertErr } = await supabaseAdmin
    .from('rankings')
    .upsert(
      {
        slug: POLY_RANKING.slug,
        title: POLY_RANKING.title,
        description: POLY_RANKING.description,
        emoji: POLY_RANKING.emoji,
        meta_title: POLY_RANKING.metaTitle,
        meta_description: metaDesc,
        product_slugs: productSlugs,
        status: 'active',
      },
      { onConflict: 'slug' },
    )

  if (upsertErr) {
    console.error(`  ✗ Chyba:`, upsertErr.message)
  } else {
    console.log(`  ✓ Upsertováno ${productSlugs.length} produktů`)
    console.log(`  meta_description: ${metaDesc}`)
  }
}

// ─── Cenové žebříčky ──────────────────────────────────────────────────────────
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
  // 1. Načti min. cenu lahve per produkt — pouze aktivní, neskladem-OK, ne karanténní
  //    NUTNÉ: bez tohoto filtru by žebříček zahrnoval produkty bez affiliate URL
  //    nebo od retailerů v karanténě (reálně nedostupné)
  const { data: allOffers, error: offersErr } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price, retailers!inner(is_active, retailer_status)')
    .eq('in_stock', true)
    .not('affiliate_url', 'is', null)
  if (offersErr) throw offersErr

  const minBottlePrice = new Map<string, number>()
  for (const o of allOffers ?? []) {
    const r = o.retailers as { is_active: boolean; retailer_status: string }
    if (!r.is_active) continue
    if (r.retailer_status === 'quarantine' || r.retailer_status === 'removed_legal') continue
    const cur = minBottlePrice.get(o.product_id as string)
    const price = o.price as number
    if (cur === undefined || price < cur) minBottlePrice.set(o.product_id as string, price)
  }
  console.log(`Loaded ${minBottlePrice.size} products with active buyable offers`)

  // 2. Načti aktivní produkty s olivator_score — ochucené vyloučeny (jiná kategorie)
  const { data: allProducts, error: productsErr } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, olivator_score, volume_ml, type')
    .eq('status', 'active')
    .gt('olivator_score', 0)
    .neq('type', 'flavored')
    .order('olivator_score', { ascending: false })
  if (productsErr) throw productsErr

  // DB data quality: typ='evoo' ale přísada v názvu
  const FLAVOR_KW = ['rozmarýn','rosemary','chilli','chili','citron','česnek','garlic','lanýž','truffle','bazalka','basil','uzený','uzena','koření','oregano','jalapeño','feferonk','lemon','tymián','zázvor']
  function isEffectivelyFlavored(name: string): boolean {
    const lower = name.toLowerCase()
    return FLAVOR_KW.some((k) => lower.includes(k))
  }

  // 3. Pro každý žebříček: filtruj + sort + upsert
  for (const def of PRICE_RANKINGS) {
    const filtered = (allProducts ?? []).filter((p) => {
      const bottlePrice = minBottlePrice.get(p.id as string)
      if (bottlePrice === undefined || bottlePrice > def.priceMax) return false
      if (isEffectivelyFlavored(p.name as string)) return false
      return true
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

  // 4. Polyfenolový žebříček (řazení poly DESC, ne Score)
  await regeneratePolyRanking(isEffectivelyFlavored, minBottlePrice)

  console.log('\nHotovo.')
}

main().catch(console.error)
