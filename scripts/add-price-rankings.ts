/**
 * Přidá cenové žebříčky do rankings tabulky.
 * Spuštění: env -u ANTHROPIC_API_KEY node --env-file=.env.local --import tsx scripts/add-price-rankings.ts
 */
import { supabaseAdmin } from '@/lib/supabase'

interface RankingDef {
  slug: string
  title: string
  description: string
  emoji: string
  originCountry?: string
  certFilter?: string
  priceMax?: number
}

const RANKINGS: RankingDef[] = [
  {
    slug: 'nejlepsi-olivovy-olej-do-200-kc',
    title: 'Nejlepší olivový olej do 200 Kč',
    description: 'Olivové oleje s nejvyšším Olivator Score dostupné do 200 Kč. Aktualizováno denně podle reálných cen.',
    emoji: '💚',
    priceMax: 200,
  },
  {
    slug: 'nejlepsi-olivovy-olej-do-300-kc',
    title: 'Nejlepší olivový olej do 300 Kč',
    description: 'Nejlepší extra panenské olivové oleje do 300 Kč — ideální poměr kvality a ceny.',
    emoji: '🏆',
    priceMax: 300,
  },
  {
    slug: 'nejlepsi-olivovy-olej-do-500-kc',
    title: 'Nejlepší olivový olej do 500 Kč',
    description: 'Prémiové olivové oleje do 500 Kč — pro ty, kdo nechtějí kompromis na kvalitě.',
    emoji: '⭐',
    priceMax: 500,
  },
  {
    slug: 'nejlepsi-recky-olivovy-olej',
    title: 'Nejlepší řecký olivový olej',
    description: 'Top řecké olivové oleje podle Olivator Score. Řecko produkuje přes 80 % extra panenského oleje v Evropě.',
    emoji: '🇬🇷',
    originCountry: 'GR',
  },
  {
    slug: 'nejlepsi-bio-olivovy-olej',
    title: 'Nejlepší BIO olivový olej',
    description: 'Certifikované BIO olivové oleje s nejvyšším Olivator Score. Bez pesticidů, s ověřeným certifikátem.',
    emoji: '🌱',
    certFilter: 'bio',
  },
  {
    slug: 'nejlepsi-italsky-olivovy-olej',
    title: 'Nejlepší italský olivový olej',
    description: 'Top italské olivové oleje z Apulie, Toskánska a Kalábrie. Seřazeno podle Olivator Score.',
    emoji: '🇮🇹',
    originCountry: 'IT',
  },
]

async function main() {
  const { data: existing } = await supabaseAdmin.from('rankings').select('slug')
  const existingSlugs = new Set((existing ?? []).map((r: { slug: string }) => r.slug))

  // Fetch all affordable product offers for price filtering
  const { data: allOffers } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price')
    .eq('in_stock', true)

  // Map product_id → min price
  const minPriceByProduct = new Map<string, number>()
  for (const o of (allOffers ?? []) as { product_id: string; price: number }[]) {
    const cur = minPriceByProduct.get(o.product_id)
    if (cur === undefined || o.price < cur) minPriceByProduct.set(o.product_id, o.price)
  }

  // Fetch all active products with score
  const { data: allProducts } = await supabaseAdmin
    .from('products')
    .select('id, slug, olivator_score, origin_country, certifications')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .order('olivator_score', { ascending: false })

  const products = (allProducts ?? []) as {
    id: string
    slug: string
    olivator_score: number
    origin_country: string | null
    certifications: string[] | null
  }[]

  for (const def of RANKINGS) {
    if (existingSlugs.has(def.slug)) {
      console.log(`skip (exists): ${def.slug}`)
      continue
    }

    let filtered = products

    if (def.originCountry) {
      filtered = filtered.filter(p => p.origin_country === def.originCountry)
    }

    if (def.certFilter) {
      filtered = filtered.filter(p => p.certifications?.includes(def.certFilter!))
    }

    if (def.priceMax) {
      filtered = filtered.filter(p => {
        const price = minPriceByProduct.get(p.id)
        return price !== undefined && price <= def.priceMax!
      })
    }

    const productSlugs = filtered.slice(0, 20).map(p => p.slug)

    if (productSlugs.length === 0) {
      console.log(`skip (no products): ${def.slug}`)
      continue
    }

    const { error } = await supabaseAdmin.from('rankings').insert({
      slug: def.slug,
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      product_slugs: productSlugs,
      status: 'active',
    })

    if (error) console.error(`error: ${def.slug}`, error.message)
    else console.log(`✓ inserted: ${def.slug} (${productSlugs.length} produktů)`)
  }

  console.log('\nHotovo.')
}

main().catch(console.error)
