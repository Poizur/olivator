/**
 * Regeneruje VŠECHNY žebříčky správně:
 * - filtr: jen produkty s aktivní buyable nabídkou (ne karanténa)
 * - řazení: Score DESC (nebo poly DESC pro poly žebříček)
 * - vyloučení: ochucené, neaktivní, bez nabídky
 * - deaktivace: 3 duplicitní delší slugy
 *
 * Spuštění: env -u ANTHROPIC_API_KEY npx tsx --env-file=.env.local scripts/regenerate-all-rankings.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

// ─── Duplicitní slugy k deaktivaci ───────────────────────────────────────────
// Kratší slugy jsou v static-content.ts jako fallback → kanonické
// Delší slugy jsou DB-only duplikáty bez fallbacku
const DUPLICATE_SLUGS_TO_DEACTIVATE = [
  'nejlepsi-recky-olivovy-olej',
  'nejlepsi-bio-olivovy-olej',
  'nejlepsi-italsky-olivovy-olej',
]

// ─── Definice všech žebříčků ─────────────────────────────────────────────────
type RankingDef = {
  slug: string
  title: string
  description: string
  emoji: string
  metaTitle?: string
  maxItems?: number
  filter: (p: Product) => boolean
  // sortKey: undefined = Score DESC; 'polyphenols' = poly DESC
  sortKey?: 'polyphenols'
  // extra sort after primary: secondary asc/desc
}

type Product = {
  id: string
  slug: string
  name: string
  olivator_score: number | null
  polyphenols: number | null
  acidity: number | null
  type: string
  status: string
  certifications: string[]
  origin_country: string | null
  use_cases: string[]
  volume_ml: number
}

const FLAVOR_KW = [
  'rozmarýn','rosemary','chilli','chili','citron','česnek','garlic',
  'lanýž','truffle','bazalka','basil','uzený','uzena','koření',
  'oregano','jalapeño','feferonk','lemon','tymián','zázvor',
]
function isFlavored(p: Product): boolean {
  if (p.type === 'flavored') return true
  const lower = p.name.toLowerCase()
  return FLAVOR_KW.some((k) => lower.includes(k))
}

const RANKINGS: RankingDef[] = [
  {
    slug: 'nejlepsi-olivovy-olej-2026',
    title: 'Nejlepší olivový olej 2026: žebříček podle dat',
    description: 'Nejlepší extra panenské olivové oleje dostupné v ČR — seřazeno dle Olivator Score z objektivních dat: kyselost, polyfenoly, certifikace a cena.',
    emoji: '🏆',
    metaTitle: 'Nejlepší olivový olej 2026 | Olivátor',
    maxItems: 12,
    filter: (p) => !isFlavored(p) && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-recky-olej',
    title: 'Nejlepší řecký olivový olej',
    description: 'Top řecké olivové oleje podle Olivator Score. Koroneiki, Manaki a Athinolia — odrůdy s přirozeně nízkými kyselinami a vysokými polyfenoly.',
    emoji: '🇬🇷',
    metaTitle: 'Nejlepší řecký olivový olej 2026 | Olivátor',
    maxItems: 12,
    filter: (p) => !isFlavored(p) && p.origin_country === 'GR' && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-italsky-olej',
    title: 'Nejlepší italský olivový olej',
    description: 'Top italské olivové oleje z Apulie, Toskánska a Kalábrie. Seřazeno podle Olivator Score.',
    emoji: '🇮🇹',
    metaTitle: 'Nejlepší italský olivový olej 2026 | Olivátor',
    maxItems: 12,
    filter: (p) => !isFlavored(p) && p.origin_country === 'IT' && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-bio-olej',
    title: 'Nejlepší bio olivový olej',
    description: 'Certifikované BIO olivové oleje s nejvyšším Olivator Score. Bez pesticidů, s ověřeným certifikátem.',
    emoji: '🌿',
    metaTitle: 'Nejlepší BIO olivový olej 2026 | Olivátor',
    maxItems: 12,
    filter: (p) => !isFlavored(p) && p.certifications.some(c => c === 'bio' || c === 'organic') && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-bio-recky-olej',
    title: 'Nejlepší bio řecký olivový olej',
    description: 'Průnik dvou kvalit: BIO certifikace + řecký terroir. Většinou Koroneiki. Seřazeno podle Olivator Score.',
    emoji: '🌿',
    metaTitle: 'Nejlepší BIO řecký olivový olej 2026 | Olivátor',
    maxItems: 10,
    filter: (p) => !isFlavored(p) && p.origin_country === 'GR' && p.certifications.some(c => c === 'bio' || c === 'organic') && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-dop-olivovy-olej',
    title: 'Nejlepší DOP olivový olej',
    description: 'Chráněné označení původu — geograficky vázané, tradiční výrobní postup. Seřazeno podle Olivator Score.',
    emoji: '✓',
    metaTitle: 'Nejlepší DOP olivový olej 2026 | Olivátor',
    maxItems: 10,
    filter: (p) => !isFlavored(p) && p.certifications.includes('dop') && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-vysokopolyfenolovy-olej',
    title: 'Nejlepší vysokopolyfenolové oleje',
    description:
      'Oleje s nejvyšším doloženým obsahem polyfenolů — seřazeny sestupně podle mg/kg. ' +
      'Práh vstupu do žebříčku: ≥500 mg/kg (EU tvrzení „vysoký obsah" začíná na 250 mg/kg; ' +
      'nad 500 mg/kg mluvíme o intenzitě, nad 1 500 mg/kg o světové špičce). ' +
      'Jen oleje s aktivní nabídkou u ověřeného prodejce.',
    emoji: '⚗️',
    metaTitle: 'Nejlepší vysokopolyfenolový olivový olej 2026 | Olivátor',
    maxItems: 12,
    sortKey: 'polyphenols',
    filter: (p) => !isFlavored(p) && (p.polyphenols ?? 0) >= 500,
  },
  {
    slug: 'nejlepsi-olivovy-olej-na-salat',
    title: 'Nejlepší olivový olej do salátu',
    description: 'Intenzivní profil, vysoké polyfenoly, pikantní a hořké tóny — finishing oil. Seřazeno podle Olivator Score.',
    emoji: '🥗',
    metaTitle: 'Nejlepší olivový olej do salátu 2026 | Olivátor',
    maxItems: 10,
    filter: (p) => !isFlavored(p) && p.use_cases.some(u => u === 'salad' || u === 'dipping') && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-olivovy-olej-na-vareni',
    title: 'Nejlepší olivový olej na vaření',
    description: 'Vyvážený profil pro každodenní kuchyni, dobrá tepelná stabilita. Seřazeno podle Olivator Score.',
    emoji: '🍳',
    metaTitle: 'Nejlepší olivový olej na vaření 2026 | Olivátor',
    maxItems: 10,
    filter: (p) => !isFlavored(p) && p.use_cases.some(u => u === 'cooking' || u === 'frying') && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-premiovy-olivovy-olej',
    title: 'Nejlepší prémiový olivový olej (>500 Kč/L)',
    description: 'Pro gourmet pokrmy a dárky — single estate, early harvest. Filtrováno: ≥50 Kč/100 ml, jen nejvyšší Score.',
    emoji: '👑',
    metaTitle: 'Nejlepší prémiový olivový olej 2026 | Olivátor',
    maxItems: 10,
    // price filter handled separately (needs offer price per 100ml)
    filter: (p) => !isFlavored(p) && (p.olivator_score ?? 0) > 0,
  },
  {
    slug: 'nejlepsi-olivovy-olej-na-svete',
    title: 'Nejlepší olivový olej na světě: top 12 podle Olivator Score',
    description: 'Žebříček sestavený výhradně z objektivních dat — Olivator Score, kyselost, polyfenoly a certifikace. Top 12 extra panenských olejů z Řecka, Španělska a Itálie dostupných v ČR.',
    emoji: '🌍',
    metaTitle: 'Nejlepší olivový olej na světě 2026 | Olivátor',
    maxItems: 12,
    filter: (p) => !isFlavored(p) && ['GR','IT','ES'].includes(p.origin_country ?? '') && (p.olivator_score ?? 0) > 0,
  },
]

// ─── Cenové žebříčky (handled by fix-price-rankings.ts) — jen ověření ───────
// nejlepsi-olivovy-olej-do-200-kc, do-300-kc, do-500-kc
// Ty jsou OK dle auditu, neregenrujeme zde.

// ─── Dedup helper ─────────────────────────────────────────────────────────────
function dedupByBrand(products: Array<Product & { bucketKey: string }>, maxItems: number) {
  const seen = new Set<string>()
  const result: typeof products = []
  for (const p of products) {
    if (seen.has(p.bucketKey)) continue
    seen.add(p.bucketKey)
    result.push(p)
    if (result.length >= maxItems) break
  }
  return result
}

async function main() {
  // 1. Načti min. cenu lahve per produkt (aktivní, buyable, ne karanténa)
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

  // 2. Načti všechny aktivní produkty
  const { data: allProducts, error: productsErr } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, olivator_score, polyphenols, acidity, type, status, certifications, origin_country, use_cases, volume_ml')
    .eq('status', 'active')
  if (productsErr) throw productsErr

  const products = (allProducts ?? []) as unknown as Product[]

  // 3. Deaktivace duplicit
  console.log('\n=== Deaktivace duplicitních žebříčků ===')
  for (const slug of DUPLICATE_SLUGS_TO_DEACTIVATE) {
    const { error } = await supabaseAdmin
      .from('rankings')
      .update({ status: 'archived' })
      .eq('slug', slug)
    if (error) {
      console.error(`  ✗ ${slug}: ${error.message}`)
    } else {
      console.log(`  ✓ Deaktivován: ${slug}`)
    }
  }

  // 4. Regenerace žebříčků
  console.log('\n=== Regenerace žebříčků ===')

  for (const def of RANKINGS) {
    const eligible = products.filter((p) => {
      if (!minBottlePrice.has(p.id)) return false // bez aktivní nabídky ven
      return def.filter(p)
    })

    let sorted: Product[]
    if (def.sortKey === 'polyphenols') {
      // Poly DESC + Score jako tiebreaker; dedup per poly_bucket × brand_prefix
      const withPoly = eligible
        .filter(p => (p.polyphenols ?? 0) >= 500)
        .sort((a, b) => {
          const polyDiff = (b.polyphenols ?? 0) - (a.polyphenols ?? 0)
          if (polyDiff !== 0) return polyDiff
          return (b.olivator_score ?? 0) - (a.olivator_score ?? 0)
        })
        .map(p => ({
          ...p,
          bucketKey: `${Math.round((p.polyphenols ?? 0) / 100) * 100}-${p.slug.split('-')[0]}`,
        }))
      sorted = dedupByBrand(withPoly, def.maxItems ?? 12)
    } else if (def.slug === 'nejlepsi-premiovy-olivovy-olej') {
      // Premium: per100ml >= 50 Kč, Score DESC + brand dedup (max 2)
      const byPrice = eligible
        .filter(p => {
          const price = minBottlePrice.get(p.id)
          if (!price || !p.volume_ml) return false
          const per100 = (price / p.volume_ml) * 100
          return per100 >= 50
        })
        .sort((a, b) => (b.olivator_score ?? 0) - (a.olivator_score ?? 0))
      const premiumBrandCount = new Map<string, number>()
      const premiumDeduped: Product[] = []
      for (const p of byPrice) {
        const brand = p.slug.split('-')[0]
        const count = premiumBrandCount.get(brand) ?? 0
        if (count >= 2) continue
        premiumBrandCount.set(brand, count + 1)
        premiumDeduped.push(p)
        if (premiumDeduped.length >= (def.maxItems ?? 10)) break
      }
      sorted = premiumDeduped
    } else {
      // Score DESC + brand dedup (max 2 per brand prefix, aby ranking nebyl 5× Sitia)
      const byScore = eligible.sort((a, b) => {
        const scoreDiff = (b.olivator_score ?? 0) - (a.olivator_score ?? 0)
        if (scoreDiff !== 0) return scoreDiff
        return (b.polyphenols ?? 0) - (a.polyphenols ?? 0)
      })
      const brandCount = new Map<string, number>()
      const deduped: Product[] = []
      for (const p of byScore) {
        const brand = p.slug.split('-')[0]
        const count = brandCount.get(brand) ?? 0
        if (count >= 2) continue // max 2 produkty per značka
        brandCount.set(brand, count + 1)
        deduped.push(p)
        if (deduped.length >= (def.maxItems ?? 12)) break
      }
      sorted = deduped
    }

    const productSlugs = sorted.map(p => p.slug)

    console.log(`\n[${def.emoji}] ${def.slug}: ${productSlugs.length} produktů`)
    sorted.forEach((p, i) => {
      const price = minBottlePrice.get(p.id)
      const extra = def.sortKey === 'polyphenols' ? `poly=${p.polyphenols}` : `score=${p.olivator_score}`
      console.log(`  ${i + 1}. ${extra} | ${p.name.slice(0, 55)} [${price} Kč]`)
    })

    if (productSlugs.length === 0) {
      console.warn(`  ⚠️  Žádné produkty — žebříček neregenrujeme`)
      continue
    }

    const winner = sorted[0]
    const winnerPrice = minBottlePrice.get(winner.id)
    const winnerShortName = winner.name.length > 50 ? winner.name.slice(0, 48) + '…' : winner.name
    const metaDesc = def.sortKey === 'polyphenols'
      ? `Vítěz: ${winnerShortName} (Score ${winner.olivator_score}, ${winner.polyphenols} mg/kg)${winnerPrice ? ` od ${winnerPrice} Kč` : ''}. Top ${productSlugs.length} olejů seřazených podle mg/kg polyfenolů.`
      : `Vítěz: ${winnerShortName} (Score ${winner.olivator_score}/100)${winnerPrice ? ` od ${winnerPrice} Kč` : ''}. ${productSlugs.length} nejlepších olivových olejů dle Olivator Score.`

    // Update (ne upsert) — záznamy existují; pro neexistující upsert
    const { data: existing } = await supabaseAdmin
      .from('rankings')
      .select('slug')
      .eq('slug', def.slug)
      .maybeSingle()

    if (existing) {
      const { error } = await supabaseAdmin
        .from('rankings')
        .update({
          title: def.title,
          description: def.description,
          emoji: def.emoji,
          meta_title: def.metaTitle ?? null,
          meta_description: metaDesc,
          product_slugs: productSlugs,
          status: 'active',
        })
        .eq('slug', def.slug)
      if (error) {
        console.error(`  ✗ Update chyba: ${error.message}`)
      } else {
        console.log(`  ✓ Aktualizováno`)
      }
    } else {
      const { error } = await supabaseAdmin
        .from('rankings')
        .insert({
          slug: def.slug,
          title: def.title,
          description: def.description,
          emoji: def.emoji,
          meta_title: def.metaTitle ?? null,
          meta_description: metaDesc,
          product_slugs: productSlugs,
          status: 'active',
        })
      if (error) {
        console.error(`  ✗ Insert chyba: ${error.message}`)
      } else {
        console.log(`  ✓ Vytvořeno`)
      }
    }
  }

  console.log('\nHotovo.')
}

main().catch(console.error)
