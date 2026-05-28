import type { Metadata } from 'next'
import Link from 'next/link'
import { getBestsellers } from '@/lib/data'
import { formatPrice, formatPricePer100ml, countryFlag, countryName } from '@/lib/utils'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { ProductImage } from '@/components/product-image'
import type { Product, ProductOffer } from '@/lib/types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Nejprodávanější olivový olej v ČR — žebříček 2026 | Olivátor',
  description:
    'Žebříček nejprodávanějších olivových olejů v Česku. Oleje dostupné u nejvíce prodejců, s nejlepším Olivator Score — aktualizováno denně.',
  alternates: { canonical: 'https://olivator.cz/nejprodavanejsi' },
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: 'https://olivator.cz/nejprodavanejsi',
    siteName: 'Olivator',
    title: 'Nejprodávanější olivové oleje v ČR — Olivátor',
    description: 'Nejdostupnější olivové oleje seřazené dle popularity a kvality. Aktualizováno denně.',
  },
}

const SITE = 'https://olivator.cz'

const FAQ_ITEMS = [
  {
    q: 'Jak Olivátor určuje, který olej je nejprodávanější?',
    a: 'Vycházíme z reálných affiliate kliknutí za posledních 30 dní a počtu prodejců, kteří daný olej nabízejí. Olej dostupný u 8 prodejců s vysokým skóre je zárukou popularity i kvality.',
  },
  {
    q: 'Jsou tyto oleje vhodné pro každodenní vaření?',
    a: 'Většina ano. Nejprodávanější oleje jsou oblíbené právě proto, že nabízí dobrý poměr ceny a kvality pro každodenní použití. Hledáte-li olej na salát nebo do studené kuchyně, vybírejte dle Score — čím vyšší, tím lepší.',
  },
  {
    q: 'Proč je Motakis Kréta na prvním místě i přes nižší Score?',
    a: 'Motakis je podle dat z českého maloobchodu reálně nejprodávanější 5L olej v ČR. Nižší Score (25–45) odráží chybějící lab data o kyselosti a polyfenolech — neznamená, že jde o špatný olej. Popularita ≠ Olivator Score.',
  },
  {
    q: 'Jak poznám řecký vs. italský vs. španělský olej?',
    a: 'Každá karta zobrazuje vlajku a původ. Řecko (🇬🇷) = obvykle vyšší polyfenoly, robustní chuť. Španělsko (🇪🇸) = velmi dostupné, fruitier Picual a Arbequina. Itálie (🇮🇹) = regionální rozmanitost, prémiové DOP odrůdy.',
  },
  {
    q: 'Jak se liší tento žebříček od žebříčku "Nejlepší oleje"?',
    a: 'Nejlepší oleje = maximální Olivator Score (absolutní kvalita). Nejprodávanější = reálná oblíbenost u zákazníků. Nejprodávanější bývá přístupnější na peněženku.',
  },
]

type BestsellerItem = Product & { cheapestOffer: ProductOffer | null }

function BestsellerCard({ product, rank }: { product: BestsellerItem; rank: number }) {
  const offer = product.cheapestOffer
  const per100ml = offer ? formatPricePer100ml(offer.price, product.volumeMl) : null
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  const isTop1 = rank === 1
  const volumeLabel =
    product.volumeMl >= 1000
      ? `${product.volumeMl / 1000} l`
      : `${product.volumeMl} ml`

  return (
    <div
      className={[
        'relative bg-white rounded-[var(--radius-card)] overflow-hidden flex flex-col',
        'hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] transition-all duration-200 group',
        isTop1 ? 'ring-2 ring-olive' : 'border border-off2',
      ].join(' ')}
    >
      {/* ── Rank + badge ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-0 min-h-[30px]">
        <span className="flex items-center gap-1">
          {medal ? (
            <span className="text-[20px] leading-none">{medal}</span>
          ) : (
            <span className="text-[11px] font-bold text-text3">#{rank}</span>
          )}
          {medal && <span className="text-[11px] font-semibold text-text2">#{rank}</span>}
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
          <ProductImage
            product={product}
            fallbackSize="text-5xl"
            sizes="(max-width: 480px) 50vw, (max-width: 1024px) 34vw, 20vw"
          />
        </div>
      </Link>

      {/* ── Info ── */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1">
        {/* Původ + objem */}
        <p className="text-[11px] text-text3 mb-1.5 flex items-center gap-1 min-h-[16px]">
          {product.originCountry && (
            <span className="shrink-0">{countryFlag(product.originCountry)}</span>
          )}
          <span className="truncate">
            {product.originRegion || (product.originCountry ? countryName(product.originCountry) : '')}
          </span>
          {volumeLabel && <span className="shrink-0">· {volumeLabel}</span>}
        </p>

        {/* Název — jen jednou */}
        <p className="text-[13px] font-semibold text-text leading-snug line-clamp-2 group-hover:text-olive transition-colors mb-3 flex-1">
          {product.nameShort || product.name}
        </p>

        {/* Cena + cena/100 ml */}
        <div className="flex items-baseline justify-between gap-1 mb-3">
          {offer ? (
            <span className="text-[18px] font-bold text-text tabular-nums leading-none">
              {formatPrice(offer.price)}
            </span>
          ) : (
            <span className="text-[13px] text-text3">—</span>
          )}
          {per100ml && (
            <span className="text-[11px] font-semibold text-olive-light shrink-0">{per100ml}</span>
          )}
        </div>

        {/* CTA full-width */}
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
  const bestsellers = await getBestsellers({ limit: 10 })

  const itemListSchema =
    bestsellers.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Nejprodávanější olivové oleje v ČR — Olivátor',
          numberOfItems: bestsellers.length,
          itemListElement: bestsellers.map((p, i) => ({
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

      <main className="min-h-screen">

        {/* ── Hero ── */}
        <section className="px-6 md:px-10 pt-12 pb-8 border-b border-off2 bg-white">
          <div className="max-w-[1280px] mx-auto">
            <nav className="text-[12px] text-text3 mb-6 flex items-center gap-1.5">
              <Link href="/" className="hover:text-olive transition-colors">Olivátor</Link>
              <span>›</span>
              <span className="text-text2">Nejprodávanější</span>
            </nav>
            <p className="text-[11px] font-bold tracking-widest uppercase text-terra mb-3">
              🏆 Denně aktualizováno
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-[48px] font-normal text-text leading-tight mb-3">
              Nejprodávanější{' '}
              <em className="text-olive italic">olivové oleje</em>
            </h1>
            <p className="text-[16px] text-text2 leading-relaxed max-w-[560px]">
              Oleje seřazené dle reálné oblíbenosti — kombinace affiliate kliknutí
              a počtu prodejců, kteří daný olej nabízejí.
            </p>
          </div>
        </section>

        {/* ── Filtry + stats ── */}
        <section className="px-6 md:px-10 py-4 border-b border-off2 bg-white">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { label: '🇬🇷 Řecké', href: '/srovnavac?origin=GR' },
                { label: '🇪🇸 Španělské', href: '/srovnavac?origin=ES' },
                { label: '🇮🇹 Italské', href: '/srovnavac?origin=IT' },
                { label: '🌿 BIO', href: '/srovnavac?cert=bio' },
                { label: '📦 5L balení', href: '/srovnavac?volume=5000' },
              ].map(f => (
                <Link
                  key={f.label}
                  href={f.href}
                  className="text-[12px] font-medium bg-off border border-off2 hover:border-olive-light hover:text-olive rounded-full px-3.5 py-1.5 transition-colors text-text2"
                >
                  {f.label}
                </Link>
              ))}
            </div>
            <span className="text-[12px] text-text3 whitespace-nowrap hidden sm:block">
              Top {bestsellers.length} · Data z 18+ prodejců
            </span>
          </div>
        </section>

        {/* ── Mřížka ── */}
        <section className="px-6 md:px-10 py-10">
          <div className="max-w-[1280px] mx-auto">
            {bestsellers.length === 0 ? (
              <p className="text-text2 text-center py-20">Data se načítají...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {bestsellers.map((p, i) => (
                    <BestsellerCard key={p.id} product={p} rank={i + 1} />
                  ))}
                </div>
                <p className="text-[11px] text-text3 mt-5 text-center">
                  Affiliate partnerství — nákupem přes Olivátor podpoříte provoz srovnávače bez příplatku.
                </p>
              </>
            )}
          </div>
        </section>

        {/* ── Edukační blok ── */}
        <section className="px-6 md:px-10 py-10 bg-off border-t border-off2">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-[18px] font-bold text-text mb-6">Jak vybrat ten správný?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '🏆', title: 'Olivator Score', body: 'Score 0–100 zohledňuje kyselost, certifikace, polyfenoly a poměr cena/kvalita. Čím výše, tím lepší objektivní hodnocení.' },
                { icon: '📍', title: 'Původ rozhoduje', body: 'Řecké oleje mívají vyšší polyfenoly. Španělské jsou cenově dostupnější. Italské nabídnou regionální rozmanitost a prémiové DOP.' },
                { icon: '🔢', title: 'Počet prodejců = jistota', body: 'Olej dostupný u 5+ prodejců je vždy k dostání a bývá cenově stabilnější.' },
              ].map(({ icon, title, body }) => (
                <div key={title}>
                  <div className="text-[28px] mb-2">{icon}</div>
                  <h3 className="text-[14px] font-semibold text-text mb-1">{title}</h3>
                  <p className="text-[13px] text-text2 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Propojovací dlaždice ── */}
        <section className="px-6 md:px-10 py-10 border-t border-off2">
          <div className="max-w-[1280px] mx-auto grid sm:grid-cols-2 gap-4">
            <Link
              href="/slevy"
              className="group bg-olive4 border border-olive-border hover:border-olive rounded-2xl p-6 flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1">Aktuálně</p>
                <p className="text-[20px] font-bold text-text group-hover:text-olive transition-colors">Hledáš slevy?</p>
                <p className="text-[13px] text-text2 mt-0.5">Denně aktualizované výprodeje</p>
              </div>
              <span className="text-3xl text-olive group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              href="/srovnavac"
              className="group bg-white border border-off2 hover:border-olive-light rounded-2xl p-6 flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1">500+ produktů</p>
                <p className="text-[20px] font-bold text-text group-hover:text-olive transition-colors">Celý katalog →</p>
                <p className="text-[13px] text-text2 mt-0.5">Filtry, srovnání, detaily</p>
              </div>
              <span className="text-3xl text-text3 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-6 md:px-10 py-10 border-t border-off2">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-[20px] font-bold text-text mb-5">Časté otázky</h2>
            <dl className="space-y-4 max-w-[760px]">
              {FAQ_ITEMS.map(({ q, a }) => (
                <div key={q} className="border border-off2 rounded-xl p-5">
                  <dt className="text-[14px] font-semibold text-text mb-2">{q}</dt>
                  <dd className="text-[13px] text-text2 leading-relaxed m-0">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Newsletter ── */}
        <section className="px-6 md:px-10 py-16 bg-olive-dark">
          <div className="max-w-[1280px] mx-auto">
            <div className="max-w-[480px]">
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive3 mb-2">
                — Zůstaň v obraze
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-white mb-2 leading-tight">
                Olivový týden
              </h2>
              <p className="text-[14px] text-white/60 mb-6">
                Nové bestsellery, slevy a tipy každý čtvrtek.
              </p>
              <NewsletterSignup source="footer" variant="dark" />
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
