import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { ScoreBadge } from '@/components/score-badge'
import { NewsletterSignup } from '@/components/newsletter-signup'
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

async function getBestsellers(limit = 50): Promise<{ products: BestsellerProduct[]; stats: { totalProducts: number; retailerCount: number; avgScore: number } }> {
  // Produkty s nejvíce nabídkami u retailerů = proxy pro popularitu na trhu
  const { data: offerCounts } = await supabaseAdmin
    .from('product_offers')
    .select('product_id, price, retailers!inner(name, slug)')

  if (!offerCounts) return { products: [], stats: { totalProducts: 0, retailerCount: 0, avgScore: 0 } }

  // Agregace per product_id
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

  // Produkty s alespoň 1 nabídkou a Score
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, slug, name, name_short, olivator_score, type, origin_country, origin_region, volume_ml, certifications')
    .eq('status', 'active')
    .not('olivator_score', 'is', null)
    .gt('olivator_score', 0)
    .in('id', Object.keys(offerMap))

  if (!products) return { products: [], stats: { totalProducts: 0, retailerCount: 0, avgScore: 0 } }

  // Fotky — primary image per product (1 dotaz pro všechny)
  const productIds = products.map(p => p.id)
  const { data: images } = await supabaseAdmin
    .from('product_images')
    .select('product_id, url')
    .in('product_id', productIds)
    .eq('is_primary', true)
    .limit(productIds.length)

  const imageMap: Record<string, string> = {}
  for (const img of images ?? []) imageMap[img.product_id as string] = img.url as string

  // Seřadit: offer count DESC → score DESC
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
  const avgScore = Math.round(sorted.reduce((s, p) => s + (p.olivatorScore ?? 0), 0) / Math.max(1, sorted.length))

  return {
    products: sorted,
    stats: { totalProducts: sorted.length, retailerCount: retailerSlugs.size, avgScore },
  }
}

function BestsellerCard({ product, rank }: { product: BestsellerProduct; rank: number }) {
  const per100ml = product.cheapestPrice != null && product.volumeMl
    ? formatPricePer100ml(product.cheapestPrice, product.volumeMl)
    : null

  const hasBio = product.certifications.some(c => ['bio', 'organic', 'eu_bio'].includes(c.toLowerCase()))
  const hasDop = product.certifications.some(c => ['dop', 'igp', 'pgp'].includes(c.toLowerCase()))

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden hover:border-olive-light hover:shadow-[0_4px_20px_rgba(0,0,0,.06)] transition-all group">
      <Link href={`/olej/${product.slug}`} className="flex gap-0">

        {/* ── Rank sloupec ── */}
        <div className="w-10 shrink-0 flex flex-col items-center justify-start pt-4 gap-1">
          <span className={`text-[13px] font-bold tabular-nums ${rank <= 3 ? 'text-terra' : 'text-text3'}`}>
            {rank <= 3 ? '★' : '#'}{rank}
          </span>
          {product.offerCount >= 3 && (
            <span className="text-[8px] font-bold uppercase tracking-wider text-olive/60 writing-mode-vertical">
              {product.offerCount}×
            </span>
          )}
        </div>

        {/* ── Foto ── */}
        <div className="w-[72px] h-[88px] shrink-0 bg-white flex items-center justify-center relative self-center mx-2 my-2 rounded-lg overflow-hidden border border-off2/60">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="72px"
              className="object-contain p-1"
            />
          ) : (
            <span className="text-3xl">🫒</span>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex-1 min-w-0 py-3 pr-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              {/* Origin + flags */}
              <p className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-0.5 flex items-center gap-1">
                {product.originCountry && (
                  <span title={countryName(product.originCountry)}>{countryFlag(product.originCountry)}</span>
                )}
                {product.originRegion || (product.originCountry ? countryName(product.originCountry) : null)}
                {hasBio && <span className="text-[8px] bg-olive4 text-olive rounded px-1">BIO</span>}
                {hasDop && <span className="text-[8px] bg-amber-50 text-amber-700 rounded px-1">DOP</span>}
              </p>
              {/* Název */}
              <p className="text-[14px] font-semibold text-text leading-snug line-clamp-2 group-hover:text-olive transition-colors">
                {product.nameShort || product.name}
              </p>
              {product.volumeMl && (
                <p className="text-[11px] text-text3 mt-0.5">{product.volumeMl} ml</p>
              )}
            </div>
            {/* Score */}
            <div className="shrink-0 mt-0.5">
              <ScoreBadge score={product.olivatorScore} type={product.type} size="medium" />
            </div>
          </div>

          {/* Dostupnost badge */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-[10px] font-semibold bg-olive-bg text-olive border border-olive-border rounded-full px-2 py-0.5">
              ✓ {product.offerCount} {product.offerCount === 1 ? 'prodejce' : product.offerCount <= 4 ? 'prodejci' : 'prodejců'}
            </span>
            {product.cheapestPrice && (
              <span className="text-[13px] font-bold text-text tabular-nums">
                od {formatPrice(product.cheapestPrice)}
              </span>
            )}
            {per100ml && (
              <span className="text-[11px] text-text3">{per100ml}</span>
            )}
          </div>
        </div>
      </Link>

      {/* ── CTA řádek ── */}
      {product.cheapestRetailerSlug && product.slug && (
        <div className="px-3 pb-3">
          <Link
            href={`/go/${product.cheapestRetailerSlug}/${product.slug}`}
            className="flex items-center justify-between w-full bg-olive hover:bg-olive2 text-white text-[12px] font-semibold px-4 py-2 rounded-full transition-colors"
          >
            <span>Nejlevněji u {product.cheapestRetailer}</span>
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export default async function NejprodavanejiPage() {
  const { products, stats } = await getBestsellers(50)

  const itemListSchema = products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Nejprodávanější olivové oleje v ČR — Olivátor',
    description: 'Žebříček nejprodávanějších olivových olejů seřazených dle dostupnosti u prodejců a Olivator Score.',
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/olej/${p.slug}`,
      name: p.name,
    })),
  } : null

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
      { '@type': 'ListItem', position: 2, name: 'Nejprodávanější olivové oleje', item: `${SITE}/nejprodavanejsi` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main className="max-w-[960px] mx-auto px-4 py-10 md:py-16">

        {/* ── Breadcrumb ── */}
        <nav className="text-[12px] text-text3 mb-8 flex items-center gap-1.5">
          <Link href="/" className="hover:text-olive transition-colors">Olivátor</Link>
          <span>›</span>
          <span className="text-text2">Nejprodávanější</span>
        </nav>

        {/* ── Hero ── */}
        <section className="mb-10">
          <p className="text-[11px] font-bold tracking-widest uppercase text-olive mb-3">
            🏆 Denně aktualizováno
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[32px] md:text-[44px] font-normal text-text leading-tight mb-4">
            Nejprodávanější olivový olej v ČR
          </h1>
          <p className="text-[16px] text-text2 leading-relaxed max-w-2xl mb-8">
            Žebříček olejů dostupných u nejvíce prodejců — kombinace reálné
            popularity na českém trhu a Olivator Score. Ne nejlevnější,
            ale nejdostupnější a ověřené.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-olive4 border border-olive-border rounded-full px-4 py-2 flex items-center gap-2">
              <span className="text-[22px] font-bold text-olive">{stats.totalProducts}</span>
              <span className="text-[12px] text-text2">hodnocených olejů</span>
            </div>
            <div className="bg-off rounded-full px-4 py-2 flex items-center gap-2">
              <span className="text-[22px] font-bold text-text">{stats.retailerCount}</span>
              <span className="text-[12px] text-text2">prodejců porovnáno</span>
            </div>
            <div className="bg-off rounded-full px-4 py-2 flex items-center gap-2">
              <span className="text-[22px] font-bold text-text">{stats.avgScore}</span>
              <span className="text-[12px] text-text2">průměrný Score</span>
            </div>
          </div>
        </section>

        {/* ── Rychlé filtry ── */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: '🇬🇷 Řecké', href: '/srovnavac?origin=GR' },
            { label: '🇪🇸 Španělské', href: '/srovnavac?origin=ES' },
            { label: '🇮🇹 Italské', href: '/srovnavac?origin=IT' },
            { label: '🌿 BIO', href: '/srovnavac?cert=bio' },
            { label: '🏅 DOP/PGI', href: '/srovnavac?cert=dop' },
            { label: '📦 5L balení', href: '/nejprodavanejsi/velka-baleni' },
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

        {/* ── Seznam produktů ── */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] font-semibold text-text">
              {products.length > 0 ? `Top ${products.length} nejprodávanějších olejů` : 'Načítám žebříček…'}
            </h2>
            <span className="text-[12px] text-text3">seřazeno: dostupnost + Score</span>
          </div>

          {products.length > 0 ? (
            <div className="flex flex-col gap-3">
              {products.map((p, i) => (
                <BestsellerCard key={p.id} product={p} rank={i + 1} />
              ))}
            </div>
          ) : (
            <div className="bg-off rounded-2xl p-8 text-center">
              <p className="text-[16px] text-text2 mb-4">Data se načítají.</p>
              <Link href="/srovnavac" className="inline-block bg-olive text-white text-[13px] font-semibold px-6 py-3 rounded-full hover:bg-olive2 transition-colors">
                Otevřít celý katalog →
              </Link>
            </div>
          )}
        </section>

        {/* ── Edukační blok ── */}
        <section className="mb-14 bg-off rounded-2xl p-6 md:p-8">
          <h2 className="text-[18px] font-bold text-text mb-5">Jak vybrat ten správný?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-[28px] mb-2">🏆</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Olivator Score</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Score 0–100 zohledňuje kyselost, certifikace, polyfenoly
                a poměr cena/kvalita. Čím výše, tím lepší objektivní hodnocení.
              </p>
            </div>
            <div>
              <div className="text-[28px] mb-2">📍</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Původ rozhoduje</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Řecké oleje mívají vyšší polyfenoly. Španělské jsou cenově
                dostupnější. Italské nabídnou regionální rozmanitost a prémiové DOP.
              </p>
            </div>
            <div>
              <div className="text-[28px] mb-2">🔢</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Počet prodejců = jistota</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Olej dostupný u 5+ prodejců je vždy k dostání a bývá
                cenově stabilnější. Náš odznak „N prodejců" to ukazuje hned.
              </p>
            </div>
          </div>
        </section>

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

        {/* ── Newsletter ── */}
        <section className="mb-4">
          <div className="bg-olive4 border border-[#b7e4c7] rounded-2xl p-6 md:p-8">
            <p className="text-[11px] font-bold tracking-widest uppercase text-olive mb-3">
              🫒 Zůstaňte v obraze
            </p>
            <h2 className="text-[22px] font-bold text-text mb-2">
              Novinky a akce každý čtvrtek
            </h2>
            <p className="text-[14px] text-text2 mb-6 leading-relaxed">
              Nové oleje v žebříčku, největší slevy týdne, tipy od Olíka.
              Bez spamu — odhlášení jedním klikem.
            </p>
            <NewsletterSignup source="homepage" variant="inline" />
          </div>
        </section>

        {/* ── Cross-links ── */}
        <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-off2">
          <Link href="/srovnavac" className="text-[13px] text-olive font-medium hover:underline">
            → Celý katalog olejů
          </Link>
          <Link href="/slevy" className="text-[13px] text-olive font-medium hover:underline">
            → Aktuální slevy
          </Link>
          <Link href="/zebricek/nejlepsi" className="text-[13px] text-olive font-medium hover:underline">
            → Žebříček nejlepších
          </Link>
          <Link href="/metodika" className="text-[13px] text-olive font-medium hover:underline">
            → Jak hodnotíme (Olivator Score)
          </Link>
        </div>

      </main>
    </>
  )
}
