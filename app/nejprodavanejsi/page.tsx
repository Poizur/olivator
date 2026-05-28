import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { countryFlag, countryName, formatPrice, formatPricePer100ml } from '@/lib/utils'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Nejprodávanější olivový olej v ČR — žebříček 2026 | Olivátor',
  description:
    'Žebříček nejprodávanějších olivových olejů v Česku. Oleje dostupné u nejvíce prodejců, s nejlepším Olivator Score — aktualizováno denně.',
  alternates: { canonical: 'https://olivator.cz/nejprodavanejsi' },
  openGraph: {
    title: 'Nejprodávanější olivové oleje v ČR — Olivátor',
    description: 'Nejdostupnější olivové oleje seřazené dle popularity a kvality. Aktualizováno denně ze 18 prodejců.',
    url: 'https://olivator.cz/nejprodavanejsi',
  },
}

const SITE = 'https://olivator.cz'

const FAQ_ITEMS = [
  {
    q: 'Jak Olivátor určuje, který olej je nejprodávanější?',
    a: 'Vycházíme ze dvou kritérií: kolik prodejců daný olej nabízí (čím víc prodejců, tím je populárnější) a Olivator Score (0–100). Olej dostupný u 8 prodejců s vysokým skóre je zárukou toho, že obstál na trhu i kvality.',
  },
  {
    q: 'Jsou tyto oleje vhodné pro každodenní vaření?',
    a: 'Většina ano. Nejprodávanější oleje jsou oblíbené právě proto, že nabízí dobrý poměr ceny a kvality pro každodenní použití. Hledáte-li olej na salát nebo do studené kuchyně, vybírejte dle Score — čím vyšší, tím lepší.',
  },
  {
    q: 'Proč tu nejsou nejlevnější oleje?',
    a: 'Zobrazujeme pouze produkty s aktivním Olivator Score — tedy oleje, u kterých máme dostatečná data o kyselosti, certifikacích nebo složení. Superlevné rafinované oleje záměrně vynecháváme.',
  },
  {
    q: 'Jak poznám řecký vs. italský vs. španělský olej?',
    a: 'Každá karta zobrazuje vlajku a původ. Řecko (🇬🇷) = obvykle vyšší polyfenoly, robustní chuť. Španělsko (🇪🇸) = velmi dostupné, fruitier Picual a Arbequina. Itálie (🇮🇹) = regionální rozmanitost, prémiové DOP odrůdy.',
  },
  {
    q: 'Jak se liší tento žebříček od žebříčku "Nejlepší oleje"?',
    a: 'Nejlepší oleje = maximální Olivator Score (absolutní kvalita). Nejprodávanější = reálná dostupnost + dobrá cena + kvalita dohromady. Nejprodávanější bývá přístupnější na peněženku.',
  },
]

interface BestsellerProduct {
  id: string
  slug: string
  name: string
  nameShort: string | null
  olivatorScore: number | null
  type: string
  originCountry: string | null
  originRegion: string | null
  volumeMl: number | null
  certifications: string[]
  imageUrl: string | null
  offerCount: number
  cheapestPrice: number | null
  cheapestRetailer: string | null
  cheapestRetailerSlug: string | null
}

async function getBestsellers(limit = 10): Promise<{
  products: BestsellerProduct[]
  stats: { totalProducts: number; retailerCount: number; avgScore: number }
}> {
  const { data: offerCounts } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price, retailers!inner(name, slug)')

  if (!offerCounts) return { products: [], stats: { totalProducts: 0, retailerCount: 0, avgScore: 0 } }

  const offerMap: Record<string, { count: number; minPrice: number; retailerName: string; retailerSlug: string }> = {}
  for (const o of offerCounts) {
    const pid = o.product_id as string
    const price = o.price as number
    const retailer = o.retailers as unknown as { name: string; slug: string }
    if (!offerMap[pid]) {
      offerMap[pid] = { count: 0, minPrice: price, retailerName: retailer.name, retailerSlug: retailer.slug }
    }
    offerMap[pid].count++
    if (price < offerMap[pid].minPrice) {
      offerMap[pid].minPrice = price
      offerMap[pid].retailerName = retailer.name
      offerMap[pid].retailerSlug = retailer.slug
    }
  }

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, olivator_score, type, origin_country, origin_region, volume_ml, certifications')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .gt('olivator_score', 0)
    .in('id', Object.keys(offerMap))

  if (!products) return { products: [], stats: { totalProducts: 0, retailerCount: 0, avgScore: 0 } }

  const productIds = products.map(p => p.id)
  const { data: images } = await supabaseAdmin
    .from('product_images')
    .select('product_id, url')
    .in('product_id', productIds)
    .eq('is_primary', true)
    .limit(productIds.length)

  const imageMap: Record<string, string> = {}
  for (const img of images ?? []) imageMap[img.product_id as string] = img.url as string

  const sorted = products
    .map(p => ({
      id: p.id as string,
      slug: p.slug as string,
      name: p.name as string,
      nameShort: p.name_short as string | null,
      olivatorScore: p.olivator_score as number | null,
      type: p.type as string,
      originCountry: p.origin_country as string | null,
      originRegion: p.origin_region as string | null,
      volumeMl: p.volume_ml as number | null,
      certifications: (p.certifications as string[] | null) ?? [],
      imageUrl: imageMap[p.id] ?? null,
      offerCount: offerMap[p.id]?.count ?? 0,
      cheapestPrice: offerMap[p.id]?.minPrice ?? null,
      cheapestRetailer: offerMap[p.id]?.retailerName ?? null,
      cheapestRetailerSlug: offerMap[p.id]?.retailerSlug ?? null,
    }))
    .sort((a, b) => {
      if (b.offerCount !== a.offerCount) return b.offerCount - a.offerCount
      return (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0)
    })
    .slice(0, limit)

  const retailerSlugs = new Set(Object.values(offerMap).map(o => o.retailerSlug))
  const avgScore = Math.round(
    sorted.reduce((s, p) => s + (p.olivatorScore ?? 0), 0) / Math.max(1, sorted.length)
  )

  return {
    products: sorted,
    stats: { totalProducts: sorted.length, retailerCount: retailerSlugs.size, avgScore },
  }
}

function BestsellerCard({ product, rank }: { product: BestsellerProduct; rank: number }) {
  const per100ml =
    product.cheapestPrice != null && product.volumeMl
      ? formatPricePer100ml(product.cheapestPrice, product.volumeMl)
      : null

  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  const isTop1 = rank === 1

  const volumeLabel = product.volumeMl
    ? product.volumeMl >= 1000
      ? `${product.volumeMl / 1000} l`
      : `${product.volumeMl} ml`
    : null

  return (
    <div
      className={[
        'relative bg-white rounded-[var(--radius-card)] overflow-hidden flex flex-col',
        'hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] transition-all duration-200 group',
        isTop1 ? 'ring-2 ring-olive' : 'border border-off2',
      ].join(' ')}
    >
      {/* ── Rank + badge ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-0 min-h-[32px]">
        <span className="flex items-center gap-1">
          {medal ? (
            <span className="text-[20px] leading-none">{medal}</span>
          ) : (
            <span className="text-[12px] font-bold text-text3">#{rank}</span>
          )}
          {medal && (
            <span className="text-[12px] font-semibold text-text2">#{rank}</span>
          )}
        </span>
        {isTop1 ? (
          <span className="text-[9px] font-bold bg-olive text-white px-2 py-0.5 rounded-full tracking-widest uppercase">
            Bestseller ČR
          </span>
        ) : product.olivatorScore ? (
          <span className="text-[11px] text-text3 font-medium">Score {product.olivatorScore}</span>
        ) : null}
      </div>

      {/* ── Foto ── */}
      <Link href={`/olej/${product.slug}`} className="block px-3 pt-2">
        <div className="relative aspect-[4/5] bg-white rounded-xl overflow-hidden border border-off2/50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 34vw, 20vw"
              className="object-contain p-2"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-5xl opacity-20 select-none">
              🫒
            </div>
          )}
        </div>
      </Link>

      {/* ── Textové info ── */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1">
        {/* Původ + objem */}
        <p className="text-[11px] text-text3 mb-1.5 flex items-center gap-1 min-h-[16px]">
          {product.originCountry && (
            <span className="shrink-0">{countryFlag(product.originCountry)}</span>
          )}
          <span className="truncate">
            {product.originRegion ||
              (product.originCountry ? countryName(product.originCountry) : '')}
          </span>
          {volumeLabel && <span className="shrink-0 text-text3">· {volumeLabel}</span>}
        </p>

        {/* Název — jen jednou */}
        <p className="text-[13px] font-semibold text-text leading-snug line-clamp-2 group-hover:text-olive transition-colors mb-3 flex-1">
          {product.nameShort || product.name}
        </p>

        {/* Cena + cena/100 ml */}
        <div className="flex items-baseline justify-between gap-1 mb-3">
          {product.cheapestPrice ? (
            <span className="text-[18px] font-bold text-text tabular-nums leading-none">
              {formatPrice(product.cheapestPrice)}
            </span>
          ) : (
            <span className="text-[13px] text-text3">—</span>
          )}
          {per100ml && (
            <span className="text-[11px] font-semibold text-olive-light shrink-0">{per100ml}</span>
          )}
        </div>

        {/* CTA — full-width */}
        <Link
          href={`/olej/${product.slug}`}
          className="flex items-center justify-center w-full bg-olive-dark hover:bg-olive text-white text-[13px] font-semibold py-2.5 rounded-xl transition-colors"
        >
          Zobrazit →
        </Link>
      </div>
    </div>
  )
}

export default async function NejprodavanejiPage() {
  const { products, stats } = await getBestsellers(10)

  const itemListSchema =
    products.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Nejprodávanější olivové oleje v ČR — Olivátor',
          description:
            'Žebříček nejprodávanějších olivových olejů seřazených dle dostupnosti u prodejců a Olivator Score.',
          numberOfItems: products.length,
          itemListElement: products.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE}/olej/${p.slug}`,
            name: p.name,
          })),
        }
      : null

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Olivátor', item: SITE },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Nejprodávanější olivové oleje',
        item: `${SITE}/nejprodavanejsi`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="max-w-[1240px] mx-auto px-4 py-10 md:py-14">

        {/* ── Breadcrumb ── */}
        <nav className="text-[12px] text-text3 mb-8 flex items-center gap-1.5">
          <Link href="/" className="hover:text-olive transition-colors">
            Olivátor
          </Link>
          <span>›</span>
          <span className="text-text2">Nejprodávanější</span>
        </nav>

        {/* ── Hero (kompaktní) ── */}
        <section className="mb-8">
          <p className="text-[11px] font-bold tracking-widest uppercase text-olive mb-3">
            🏆 Denně aktualizováno
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[32px] md:text-[44px] font-normal text-text leading-tight mb-3">
            Nejprodávanější olivový olej v ČR
          </h1>
          <p className="text-[16px] text-text2 leading-relaxed max-w-xl">
            Oleje dostupné u nejvíce prodejců — kombinace reálné popularity na českém trhu
            a ověřené kvality Olivator Score.
          </p>
        </section>

        {/* ── Rychlé filtry ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: '🇬🇷 Řecké', href: '/srovnavac?origin=GR' },
            { label: '🇪🇸 Španělské', href: '/srovnavac?origin=ES' },
            { label: '🇮🇹 Italské', href: '/srovnavac?origin=IT' },
            { label: '🌿 BIO', href: '/srovnavac?cert=bio' },
            { label: '🏅 DOP/PGI', href: '/srovnavac?cert=dop' },
            { label: '📦 5L balení', href: '/srovnavac?volume=5000' },
          ].map(f => (
            <Link
              key={f.label}
              href={f.href}
              className="text-[12px] font-medium bg-white border border-off2 hover:border-olive-light hover:text-olive rounded-full px-3.5 py-1.5 transition-colors text-text2"
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* ── Stats strip ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text3 mb-6 pb-5 border-b border-off2">
          <span>🛒 {stats.totalProducts} bestsellerů</span>
          <span>·</span>
          <span>Aktualizováno denně</span>
          <span>·</span>
          <span>Data z {stats.retailerCount}+ prodejců</span>
          <span>·</span>
          <span>Průměrný Score {stats.avgScore}/100</span>
        </div>

        {/* ── Mřížka ── */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] font-semibold text-text">
              Top {products.length} nejprodávanějších
            </h2>
            <span className="text-[12px] text-text3 hidden sm:block">
              seřazeno: dostupnost + Score
            </span>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {products.map((p, i) => (
                <BestsellerCard key={p.id} product={p} rank={i + 1} />
              ))}
            </div>
          ) : (
            <div className="bg-off rounded-2xl p-8 text-center">
              <p className="text-[16px] text-text2 mb-4">Data se načítají.</p>
              <Link
                href="/srovnavac"
                className="inline-block bg-olive text-white text-[13px] font-semibold px-6 py-3 rounded-full hover:bg-olive2 transition-colors"
              >
                Otevřít celý katalog →
              </Link>
            </div>
          )}

          <p className="text-[11px] text-text3 mt-4 text-center">
            Affiliate partnerství — nákupem přes Olivátor podpoříte provoz srovnávače bez příplatku pro vás.
          </p>
        </section>

        {/* ── Edukační blok ── */}
        <section className="my-12 bg-off rounded-2xl p-6 md:p-8">
          <h2 className="text-[18px] font-bold text-text mb-5">Jak vybrat ten správný?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-[28px] mb-2">🏆</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Olivator Score</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Score 0–100 zohledňuje kyselost, certifikace, polyfenoly a poměr cena/kvalita.
                Čím výše, tím lepší objektivní hodnocení.
              </p>
            </div>
            <div>
              <div className="text-[28px] mb-2">📍</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Původ rozhoduje</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Řecké oleje mívají vyšší polyfenoly. Španělské jsou cenově dostupnější.
                Italské nabídnou regionální rozmanitost a prémiové DOP.
              </p>
            </div>
            <div>
              <div className="text-[28px] mb-2">🔢</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Počet prodejců = jistota</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Olej dostupný u 5+ prodejců je vždy k dostání a bývá cenově stabilnější.
              </p>
            </div>
          </div>
        </section>

        {/* ── Propojovací dlaždice ── */}
        <div className="grid sm:grid-cols-2 gap-4 mb-14">
          <Link
            href="/slevy"
            className="group bg-olive4 border border-olive-border hover:border-olive rounded-2xl p-6 flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1">
                Aktuálně
              </p>
              <p className="text-[20px] font-bold text-text group-hover:text-olive transition-colors">
                Hledáš slevy?
              </p>
              <p className="text-[13px] text-text2 mt-0.5">Denně aktualizované výprodeje</p>
            </div>
            <span className="text-3xl text-olive group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
          <Link
            href="/srovnavac"
            className="group bg-white border border-off2 hover:border-olive-light rounded-2xl p-6 flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1">
                500+ produktů
              </p>
              <p className="text-[20px] font-bold text-text group-hover:text-olive transition-colors">
                Celý katalog →
              </p>
              <p className="text-[13px] text-text2 mt-0.5">Filtry, srovnání, detaily</p>
            </div>
            <span className="text-3xl text-text3 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
        </div>

        {/* ── FAQ ── */}
        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-text mb-5">Časté otázky</h2>
          <dl className="space-y-4">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="border border-off2 rounded-xl p-5">
                <dt className="text-[14px] font-semibold text-text mb-2">{q}</dt>
                <dd className="text-[13px] text-text2 leading-relaxed m-0">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

      </main>
    </>
  )
}
