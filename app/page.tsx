import Link from 'next/link'
import {
  getProductsWithOffers,
  getSiteStats,
  getBestsellers,
  getFeaturedBrands,
} from '@/lib/data'
import { getActiveArticles } from '@/lib/articles-db'
import { getActiveRecipes } from '@/lib/recipes-db'
import { ProductImage } from '@/components/product-image'
import { SommelierHero } from '@/components/sommelier-hero'
import { computeBadges } from '@/lib/product-badges'
import { diverseTopProducts } from '@/lib/product-selection'
import type { Product, ProductOffer } from '@/lib/types'
import { ScoreBadge } from '@/components/score-badge'
import { TopByCountry } from '@/components/home/top-by-country'
import { DealsNewsSection } from '@/components/home/deals-news-section'
import { BestsellersSection } from '@/components/home/bestsellers-section'
import { FeaturedBrandsSection } from '@/components/home/featured-brands-section'
import { TopProductCard } from '@/components/home/top-product-card'
import { FlavorSelector } from '@/components/flavor-selector'

export const metadata = {
  title: 'Olivový olej — srovnávač Olivátor | Score, ceny, recenze',
  alternates: { canonical: 'https://olivator.cz' },
}

export const revalidate = 3600

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

export default async function Home() {
  const [allProducts, stats, rawBestsellers, featuredBrands] = await Promise.all([
    getProductsWithOffers(),
    getSiteStats(),
    getBestsellers({ limit: 20 }),
    getFeaturedBrands(),
  ])

  const [guides, recipes] = await Promise.all([
    getActiveArticles(),
    getActiveRecipes(),
  ])

  // Lookup table pro chat modal (AI Sommelier reply → product card)
  const productLookup: Record<string, ProductWithOffer> = {}
  for (const p of allProducts) productLookup[p.slug] = p

  // Dedup by name_short — jeden produkt per name_short (nejvyšší score vyhraje)
  const _nsMap = new Map<string, ProductWithOffer>()
  for (const p of allProducts) {
    const key = p.nameShort ?? p.name
    if (!_nsMap.has(key) || ((_nsMap.get(key)!.olivatorScore ?? 0) < (p.olivatorScore ?? 0))) {
      _nsMap.set(key, p)
    }
  }
  const dedupedByNameShort = Array.from(_nsMap.values())

  // Top 12 olejů této chvíle (2×6 grid) — max 2 per brand
  const topTwelve = diverseTopProducts(
    dedupedByNameShort.filter((p) => p.cheapestOffer != null && p.olivatorScore != null && p.olivatorScore > 0),
    12,
    2,
  )
  const badgesByProduct = computeBadges(topTwelve)

  // Bestsellery homepage — 6 produktů, max 2 per brand
  const _bsBrands = new Map<string, number>()
  const homepageBestsellers: typeof rawBestsellers = []
  for (const p of rawBestsellers) {
    const b = p.brandSlug ?? p.id
    const c = _bsBrands.get(b) ?? 0
    if (c < 2) {
      homepageBestsellers.push(p)
      _bsBrands.set(b, c + 1)
      if (homepageBestsellers.length >= 6) break
    }
  }

  // Velká balení ≥ 1500 ml — seřazená od nejlevnějšího za litr
  const largePacks = allProducts
    .filter((p) => p.cheapestOffer != null && p.volumeMl >= 1500)
    .sort((a, b) => {
      const pplA = a.cheapestOffer!.price / (a.volumeMl / 1000)
      const pplB = b.cheapestOffer!.price / (b.volumeMl / 1000)
      return pplA - pplB
    })
    .slice(0, 6)

  return (
    <>
      {/* ─── HERO: kompaktní Olík AI bar ──────────────────────────────── */}
      <SommelierHero
        totalProducts={stats.totalProducts}
        activeRetailers={stats.activeRetailers}
        totalBrands={stats.totalBrands}
        productLookup={productLookup}
      />

      {/* ─── TRUST BAR ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-off2 px-6 md:px-10 py-5">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: '🔬', title: 'Lab data', body: 'Polyfenoly, kyselost, peroxidy' },
            { icon: '🚫', title: 'Žádná reklama', body: 'Třídění podle kvality, ne provize' },
            { icon: '📊', title: 'Nezávislé Score', body: '4 čísla, 100 bodů' },
            { icon: '🔄', title: 'Aktualizace 2× denně', body: 'Ceny + dostupnost' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <div className="text-[14px] font-medium text-text leading-tight">{item.title}</div>
                <div className="text-[12px] text-text2 leading-tight">{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── QUICK CATEGORIES ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-off2 px-6 md:px-10 py-3.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="max-w-[1280px] mx-auto flex items-center gap-2 flex-nowrap">
          {[
            { label: '🏆 Top Score', href: '/srovnavac', variant: 'default' },
            { label: '🔥 Bestsellery', href: '/nejprodavanejsi', variant: 'featured' },
            { label: '🏷️ Slevy', href: '/slevy', variant: 'danger' },
            { label: '🇬🇷 Řecko', href: '/srovnavac?origin=GR', variant: 'default' },
            { label: '🇮🇹 Itálie', href: '/srovnavac?origin=IT', variant: 'default' },
            { label: '🇪🇸 Španělsko', href: '/srovnavac?origin=ES', variant: 'default' },
            { label: '📦 5L balení', href: '/olivovy-olej-5l', variant: 'default' },
            { label: `🌱 BIO`, href: '/srovnavac?cert=bio', variant: 'default' },
            { label: '🏆 PDO', href: '/srovnavac?cert=dop', variant: 'default' },
            { label: '🔬 Polyfenoly 250+', href: '/srovnavac?quality=high_polyphenols', variant: 'default' },
          ].map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              className={`text-[13px] font-medium whitespace-nowrap rounded-full px-3.5 py-2 transition-all shrink-0 flex items-center gap-1.5 ${
                chip.variant === 'featured'
                  ? 'bg-amber-bg text-amber-text hover:bg-amber-mid hover:text-white'
                  : chip.variant === 'danger'
                  ? 'bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#A32D2D] hover:text-white'
                  : 'bg-off text-text2 hover:bg-olive-bg hover:text-olive'
              }`}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ─── TOP 12 OLEJŮ TÉTO CHVÍLE ─────────────────────────────────── */}
      <section className="px-6 md:px-10 py-9">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-end justify-between mb-[18px] flex-wrap gap-4">
            <div>
              <div className="text-[12px] font-medium tracking-[0.05em] uppercase text-text2 mb-[6px]">
                — Tucet nejlepších
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-[30px] font-medium text-text leading-[1.1]">
                Dvanáct olejů, na které <em className="italic text-olive-light">sázíme</em>.
              </h2>
              <p className="text-[14px] text-text2 mt-[6px] max-w-[460px]">
                Nejvyšší Score napříč katalogem. Aktualizováno denně podle nových cen.
              </p>
            </div>
            <Link
              href="/srovnavac"
              className="text-[13px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap"
            >
              Celý žebříček ({stats.totalProducts}) →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
            {topTwelve.map((p, i) => (
              <TopProductCard
                key={p.id}
                product={p}
                rank={i + 1}
                badge={badgesByProduct.get(p.id) ?? null}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── BESTSELLERS ────────────────────────────────────────────────── */}
      <BestsellersSection products={homepageBestsellers} totalCount={rawBestsellers.length} />

      {/* ─── CHUŤOVÝ PROFIL ─────────────────────────────────────────────── */}
      <FlavorSelector totalProducts={stats.totalProducts} />

      {/* ─── TOP ZNAČKY ─────────────────────────────────────────────────── */}
      <FeaturedBrandsSection brands={featuredBrands} />

      {/* ─── 5L FEATURED BOX ─────────────────────────────────────────────── */}
      {(() => {
        const bulk5Lpool = allProducts.filter(
          (p) => p.volumeMl >= 4500 && p.volumeMl <= 5500 && p.cheapestOffer != null && p.olivatorScore != null,
        )
        const bulk5L = diverseTopProducts(bulk5Lpool, 6, 2)
        if (bulk5L.length < 2) return null
        const minPerLiter = Math.min(
          ...bulk5L.map((p) => Math.round(p.cheapestOffer!.price / (p.volumeMl / 1000))),
        )
        return (
          <section className="px-6 md:px-10 py-9 border-t border-off2 bg-olive-dark">
            <div className="max-w-[1280px] mx-auto">
              <div className="flex items-end justify-between mb-[18px] flex-wrap gap-3">
                <div>
                  <div className="text-[12px] font-medium tracking-[0.05em] uppercase text-olive3 mb-[6px]">
                    — Velká balení
                  </div>
                  <h2 className="font-[family-name:var(--font-display)] text-[30px] font-medium text-white leading-[1.1]">
                    Olivový olej 5L — <em className="italic text-olive-bright">ušetřete až 44 %</em>
                    <span className="text-[16px] font-normal text-white/75 ml-3">Od {minPerLiter} Kč/litr</span>
                  </h2>
                </div>
                <Link
                  href="/olivovy-olej-5l"
                  className="text-[12px] text-olive3 border-b border-olive3/40 hover:text-white whitespace-nowrap"
                >
                  Všech{' '}
                  {allProducts.filter((p) => p.volumeMl >= 4500 && p.volumeMl <= 5500 && p.cheapestOffer != null)
                    .length}{' '}
                  produktů →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
                {bulk5L.map((p) => (
                  <Link
                    key={p.id}
                    href={`/olej/${p.slug}`}
                    className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-[4/5] bg-white overflow-hidden">
                      <span className="absolute top-1.5 right-1.5 z-10 shadow-md rounded-full">
                        <ScoreBadge score={p.olivatorScore} type={p.type} size="small" />
                      </span>
                      <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                        <ProductImage
                          product={p}
                          fallbackSize="text-[60px]"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                        />
                      </div>
                    </div>
                    <div className="p-2 flex-1 flex flex-col">
                      <div className="text-[10px] font-semibold text-text leading-tight mb-1.5 line-clamp-2 min-h-[2.4em]">
                        {p.nameShort || p.name}
                      </div>
                      {p.cheapestOffer && (
                        <div className="mt-auto pt-1.5 border-t border-off">
                          <div className="text-[12px] font-bold text-text tabular-nums">
                            {Math.round(p.cheapestOffer.price / (p.volumeMl / 1000))} Kč/l
                          </div>
                          <div className="text-[10px] text-text2 tabular-nums">
                            {Math.round(p.cheapestOffer.price)} Kč
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )
      })()}

      {/* ─── TOP PER ZEMĚ ────────────────────────────────────────────────── */}
      <TopByCountry products={allProducts} />

      {/* ─── PRŮVODCE ────────────────────────────────────────────────────── */}
      {guides.length > 0 && (
        <section className="px-6 md:px-10 py-9">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-end justify-between mb-[18px]">
              <div>
                <div className="text-[12px] font-medium tracking-[0.05em] uppercase text-text2 mb-[6px]">
                  — Vzdělávání a testy
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[30px] font-medium text-text leading-[1.1]">
                  Průvodce olivovým olejem
                </h2>
              </div>
              <Link href="/pruvodce" className="text-[13px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap">
                Všechny průvodce →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {guides.slice(0, 4).map((a) => {
                const label =
                  a.category === 'zebricek' ? 'Žebříček' :
                  a.category === 'srovnani' ? 'Srovnání' :
                  a.category === 'vzdelavani' ? 'Vzdělávání' : 'Průvodce'
                const href = a.category === 'zebricek' ? `/zebricek/${a.slug}` : `/pruvodce/${a.slug}`
                const initial = a.title.charAt(0).toUpperCase()
                return (
                  <Link
                    key={a.slug}
                    href={href}
                    className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:border-olive-light hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="aspect-[16/10] bg-olive-dark flex items-center justify-center relative overflow-hidden">
                      {a.heroImageUrl ? (
                        <img src={a.heroImageUrl} alt={a.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="font-[family-name:var(--font-display)] text-[120px] font-normal italic text-white/15 leading-none select-none">
                          {initial}
                        </div>
                      )}
                      <div className="absolute top-3 left-3 text-[9px] font-bold tracking-widest uppercase text-white/70 bg-black/20 rounded px-1.5 py-0.5 backdrop-blur-sm">
                        {label}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-[family-name:var(--font-display)] text-lg text-text leading-tight mb-2 line-clamp-2">
                        {a.title}
                      </h3>
                      <p className="text-[12px] text-text2 leading-snug line-clamp-2 mb-2 flex-1">{a.excerpt}</p>
                      <div className="text-[11px] text-text3">{a.readTime}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── RECEPTY ─────────────────────────────────────────────────────── */}
      {recipes.length > 0 && (
        <section className="px-6 md:px-10 py-9 bg-white border-t border-off2">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-end justify-between mb-[18px]">
              <div>
                <div className="text-[12px] font-medium tracking-[0.05em] uppercase text-terra mb-[6px]">
                  — V kuchyni
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[30px] font-medium text-text leading-[1.1]">
                  Recepty s <em className="italic text-olive-light">olivovým olejem</em>
                </h2>
                <p className="text-[14px] text-text2 mt-[6px]">Jak vybraný olej použít — od dezertů po grilování.</p>
              </div>
              <Link href="/recept" className="text-[13px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap">
                Všechny recepty →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.slice(0, 3).map((a) => {
                const initial = a.title.charAt(0).toUpperCase()
                return (
                  <Link
                    key={a.slug}
                    href={`/recept/${a.slug}`}
                    className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:border-terra/30 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="aspect-[16/9] bg-[#7a3b1e] flex items-center justify-center relative overflow-hidden">
                      {a.heroImageUrl ? (
                        <img src={a.heroImageUrl} alt={a.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="font-[family-name:var(--font-display)] text-[120px] font-normal italic text-white/15 leading-none select-none">
                          {initial}
                        </div>
                      )}
                      <div className="absolute top-3 left-3 text-[9px] font-bold tracking-widest uppercase text-white/70 bg-black/20 rounded px-1.5 py-0.5 backdrop-blur-sm">
                        Recept
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-[family-name:var(--font-display)] text-lg text-text leading-tight mb-2 line-clamp-2">
                        {a.title}
                      </h3>
                      <p className="text-[12px] text-text2 leading-snug line-clamp-2 mb-2 flex-1">{a.excerpt}</p>
                      <div className="text-[11px] text-terra">{a.readTime}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── VELKÁ BALENÍ — seřazeno od nejlevnějšího za litr ───────────── */}
      {largePacks.length >= 3 && (
        <section className="px-6 md:px-10 py-10 border-t border-off2" style={{ background: 'linear-gradient(160deg, #6b3012, #8B4513)' }}>
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-white/50 mb-2">
                  — Ekonomické volby
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[26px] md:text-[32px] font-normal text-white leading-tight">
                  Velká balení
                </h2>
                <p className="text-[13px] text-white/60 mt-1">
                  {largePacks.length}+ produktů · Bag-in-Box, plech, plast · Seřazeno od nejlevnějšího za litr
                </p>
              </div>
              <Link
                href="/srovnavac?volume=1500"
                className="text-[13px] font-semibold text-white/80 hover:text-white transition-colors whitespace-nowrap"
              >
                Všechna velká balení →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {largePacks.map((p, i) => (
                <BulkPackCard key={p.id} product={p} rank={i + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── SLEVY + NOVINKY — 2-sloupcový layout ───────────────────────── */}
      <DealsNewsSection />

    </>
  )
}

function BulkPackCard({ product, rank }: { product: ProductWithOffer; rank: number }) {
  const offer = product.cheapestOffer!
  const pricePerLitre = Math.round(offer.price / (product.volumeMl / 1000))
  const volumeLabel =
    product.volumeMl >= 1000
      ? `${product.volumeMl / 1000} l`
      : `${product.volumeMl} ml`

  return (
    <Link
      href={`/olej/${product.slug}`}
      className="group bg-white/10 border border-white/15 hover:bg-white/20 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/5] bg-white overflow-hidden">
        <span className="absolute top-1.5 left-1.5 z-10 text-[10px] font-bold bg-white/90 text-text rounded px-1.5 py-0.5 leading-none">
          #{rank}
        </span>
        <ProductImage product={product} fallbackSize="text-4xl" sizes="(max-width: 640px) 50vw, 200px" />
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <p className="text-amber-200 text-[15px] font-bold tabular-nums leading-none mb-0.5">
          {pricePerLitre} Kč/l
        </p>
        <p className="text-white/50 text-[10px] mb-1.5">{offer.price} Kč · {volumeLabel}</p>
        <p className="text-white/80 text-[11px] font-medium leading-snug line-clamp-2 flex-1">
          {product.nameShort || product.name}
        </p>
      </div>
    </Link>
  )
}
