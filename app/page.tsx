import Link from 'next/link'
import {
  getProductsWithOffers,
  getSiteStats,
  getRegionTiles,
  getBrandTiles,
} from '@/lib/data'
import { getArticles } from '@/lib/static-content'
import { pickOilOfDay, pickScoreFeature } from '@/lib/home-picks'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { ProductImage } from '@/components/product-image'
import { Trophy, BarChart3, Bot, Ban, Globe2 } from 'lucide-react'
import { SommelierHero } from '@/components/sommelier-hero'
import { FlavorSelector } from '@/components/flavor-selector'
import { RegionAtlas } from '@/components/region-atlas'
import { BrandStrip } from '@/components/brand-strip'
import { countryName, countryFlag, formatPrice, formatPricePer100ml } from '@/lib/utils'
import { computeBadges, pickByCategory, type ProductBadge } from '@/lib/product-badges'
import type { Product, ProductOffer } from '@/lib/types'

export const revalidate = 3600

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

export default async function Home() {
  const [allProducts, stats, regions, brands] = await Promise.all([
    getProductsWithOffers(),
    getSiteStats(),
    getRegionTiles(),
    getBrandTiles(),
  ])

  const oilOfDay = pickOilOfDay(allProducts)
  const scoreFeature = pickScoreFeature(allProducts)
  const guides = getArticles().filter(a => a.category !== 'recept')
  const recipes = getArticles('recept')

  // Top 3 by Score for hero sidebar
  const topPicks = [...allProducts]
    .filter((p) => p.cheapestOffer != null && p.olivatorScore >= 60)
    .sort((a, b) => b.olivatorScore - a.olivatorScore)
    .slice(0, 3)

  // Lookup table for AI sommelier reply → product card
  const productLookup: Record<string, ProductWithOffer> = {}
  for (const p of allProducts) productLookup[p.slug] = p

  // Top 12 olejů této chvíle (catalog teaser — 3×4 grid)
  const topTwelve = [...allProducts]
    .filter((p) => p.cheapestOffer != null)
    .sort((a, b) => b.olivatorScore - a.olivatorScore)
    .slice(0, 12)

  // Auto-vypočítané badges pro top 12 (Top Score / Nejvíc polyfenolů / …)
  const badgesByProduct = computeBadges(topTwelve)

  // Tipy 3 olejů — výrazný / jemný / zdravý (shoptet-style featured cards)
  const tipVyrazny = pickByCategory(allProducts, 'vyrazny')
  const tipJemny = pickByCategory(allProducts, 'jemny')
  const tipZdravy = pickByCategory(allProducts, 'zdravy')

  return (
    <>
      {/* ─── HERO: AI Sommelier inline ─────────────────────────────── */}
      <SommelierHero
        totalProducts={stats.totalProducts}
        activeRetailers={stats.activeRetailers}
        regionCount={regions.length}
        brandCount={brands.length}
        topPicks={topPicks}
        productLookup={productLookup}
      />

      {/* ─── TOP 12 OLEJŮ TÉTO CHVÍLE ────────────────────────────── */}
      <section className="px-6 md:px-10 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
                — Tucet nejlepších
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
                Dvanáct olejů, na které sázíme.
              </h2>
              <p className="text-[14px] text-text2 mt-1.5 max-w-[460px]">
                Nejvyšší Score napříč katalogem. Aktualizováno denně podle nových cen a nově přidaných produktů.
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

      {/* ─── 3 TIPY: VÝRAZNÝ / JEMNÝ / ZDRAVÝ ─────────────────────── */}
      <section className="px-6 md:px-10 py-16 bg-off/40 border-y border-off2">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-8">
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              — Pro různé chutě
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
              Tři tipy podle toho, co máš rád.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tipVyrazny && <FeaturedTip category="vyrazny" product={tipVyrazny} />}
            {tipJemny && <FeaturedTip category="jemny" product={tipJemny} />}
            {tipZdravy && <FeaturedTip category="zdravy" product={tipZdravy} />}
          </div>
        </div>
      </section>

      {/* ─── FLAVOR SELECTOR ──────────────────────────────────────── */}
      <FlavorSelector totalProducts={stats.totalProducts} />

      {/* ─── ATLAS REGIONŮ ───────────────────────────────────────── */}
      <RegionAtlas regions={regions} />

      {/* ─── BRAND STRIP ──────────────────────────────────────────── */}
      <BrandStrip brands={brands} />

      {/* ─── SCORE BREAKDOWN — kompaktní 2-kolony ────────────────── */}
      {scoreFeature && (
        <section className="px-6 md:px-10 py-16">
          <div className="max-w-[1280px] mx-auto bg-white border border-off2 rounded-[var(--radius-card)] p-8 md:p-10 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-10 items-center">
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
                — Jak vzniká Score
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-3 leading-tight">
                Žádná magie.<br />
                <em className="text-olive italic">Čtyři čísla.</em>
              </h2>
              <p className="text-[14px] text-text2 leading-relaxed mb-5">
                <strong className="text-text">{scoreFeature.name}</strong> dostala <strong className="text-text">{scoreFeature.olivatorScore}/100</strong>. Tady je přesný breakdown — žádné subjektivní hodnocení.
              </p>
              <div className="flex flex-wrap gap-3 text-[12px]">
                <Link href={`/olej/${scoreFeature.slug}`} className="text-olive font-medium hover:text-olive2">
                  Detail oleje →
                </Link>
                <Link href="/metodika" className="text-text2 hover:text-text">
                  Detailní metodika →
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <ScoreBar
                label="Kyselost"
                weight="35 %"
                points={scoreFeature.scoreBreakdown.acidity ?? 0}
                max={35}
                detail={scoreFeature.acidity != null ? `${scoreFeature.acidity} % · norma EVOO max 0,8 %` : '—'}
              />
              <ScoreBar
                label="Certifikace"
                weight="25 %"
                points={scoreFeature.scoreBreakdown.certifications ?? 0}
                max={25}
                detail={
                  scoreFeature.certifications.length > 0
                    ? scoreFeature.certifications.map((c) => c.toUpperCase()).join(' · ')
                    : 'bez certifikace'
                }
              />
              <ScoreBar
                label="Polyfenoly + chemie"
                weight="25 %"
                points={scoreFeature.scoreBreakdown.quality ?? 0}
                max={25}
                detail={
                  scoreFeature.polyphenols != null
                    ? `${scoreFeature.polyphenols} mg/kg · EU health claim ≥ 250`
                    : 'lab data nedostupná'
                }
              />
              <ScoreBar
                label="Cena/kvalita"
                weight="15 %"
                points={scoreFeature.scoreBreakdown.value ?? 0}
                max={15}
                detail={
                  scoreFeature.cheapestOffer
                    ? formatPricePer100ml(scoreFeature.cheapestOffer.price, scoreFeature.volumeMl)
                    : '—'
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* ─── OLEJ MĚSÍCE + NEWSLETTER (combined) ─────────────────── */}
      <section className="px-6 md:px-10 py-16 bg-off/40 border-y border-off2">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8">
          {/* Olej měsíce — actual product */}
          {oilOfDay && (
            <Link
              href={`/olej/${oilOfDay.slug}`}
              className="block bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden transition-all hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-olive-light"
            >
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
                <div className="aspect-[4/5] md:aspect-auto bg-gradient-to-br from-olive-bg/40 to-off relative">
                  <ProductImage
                    product={oilOfDay}
                    fallbackSize="text-[100px]"
                    sizes="(max-width: 768px) 100vw, 280px"
                  />
                  <div className="absolute top-4 left-4 bg-terra text-white rounded-full px-3 py-1 text-xs font-bold tabular-nums shadow-md">
                    {oilOfDay.olivatorScore}/100
                  </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2 flex items-center gap-1.5">
                    <Trophy size={14} strokeWidth={1.75} />
                    Olej týdne
                  </div>

                  <div className="text-[12px] text-text3 mb-1 uppercase tracking-widest font-medium">
                    {oilOfDay.originRegion ? `${oilOfDay.originRegion}, ` : ''}
                    {countryName(oilOfDay.originCountry)}
                  </div>

                  <h3 className="font-[family-name:var(--font-display)] text-2xl text-text leading-tight mb-3">
                    {oilOfDay.name}
                  </h3>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {oilOfDay.acidity != null && (
                      <span className="text-[11px] bg-olive-bg text-olive-dark border border-olive-border rounded-full px-2.5 py-0.5">
                        kyselost {oilOfDay.acidity} %
                      </span>
                    )}
                    {oilOfDay.polyphenols != null && (
                      <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2.5 py-0.5">
                        {oilOfDay.polyphenols} mg/kg polyfenolů
                      </span>
                    )}
                    {oilOfDay.certifications.slice(0, 2).map((c) => (
                      <span key={c} className="text-[11px] bg-off text-text2 border border-off2 rounded-full px-2.5 py-0.5 uppercase font-medium">
                        {c}
                      </span>
                    ))}
                  </div>

                  {oilOfDay.cheapestOffer && (
                    <div className="mt-auto pt-4 border-t border-off flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-2xl font-bold text-text tracking-tight">
                          {formatPrice(oilOfDay.cheapestOffer.price)}
                        </div>
                        <div className="text-[11px] text-text3">
                          {formatPricePer100ml(oilOfDay.cheapestOffer.price, oilOfDay.volumeMl)} ·
                          u {oilOfDay.cheapestOffer.retailer.name}
                        </div>
                      </div>
                      <div className="bg-olive text-white rounded-full px-5 py-2 text-[13px] font-semibold whitespace-nowrap">
                        Detail →
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* Newsletter signup */}
          <div className="bg-olive-dark rounded-[var(--radius-card)] p-7 text-white flex flex-col">
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/60 mb-4">
              — Newsletter
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-normal mb-2 leading-tight">
              Olej měsíce<br />
              <span className="text-white/70 italic">do schránky.</span>
            </h3>
            <p className="text-[13px] text-white/70 mb-5 leading-relaxed">
              Jednou měsíčně: vítěz, nejlepší slevy, nový recept. Žádný spam, odhlášení jedním klikem.
            </p>
            <div className="mt-auto">
              <NewsletterSignup source="homepage" variant="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRŮVODCE ───────────────────────────────────────────── */}
      {guides.length > 0 && (
        <section className="px-6 md:px-10 py-16">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
                  — Vzdělávání a testy
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
                  Průvodce olivovým olejem
                </h2>
              </div>
              <Link href="/pruvodce" className="text-[13px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap">
                Všechny průvodce →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {guides.slice(0, 4).map((a) => {
                const label = a.category === 'zebricek' ? 'Žebříček' : a.category === 'srovnani' ? 'Srovnání' : a.category === 'vzdelavani' ? 'Vzdělávání' : 'Průvodce'
                const initial = a.title.charAt(0).toUpperCase()
                return (
                  <Link
                    key={a.slug}
                    href={`/pruvodce/${a.slug}`}
                    className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:border-olive-light hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="aspect-[16/10] bg-olive-dark flex items-center justify-center relative overflow-hidden">
                      <div className="font-[family-name:var(--font-display)] text-[120px] font-normal italic text-white/15 leading-none select-none">
                        {initial}
                      </div>
                      <div className="absolute top-3 left-3 text-[9px] font-bold tracking-widest uppercase text-white/70">
                        {label}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-[family-name:var(--font-display)] text-lg text-text leading-tight mb-2 line-clamp-2">
                        {a.title}
                      </h3>
                      <p className="text-[12px] text-text2 leading-snug line-clamp-2 mb-2 flex-1">
                        {a.excerpt}
                      </p>
                      <div className="text-[11px] text-text3">{a.readTime}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── RECEPTY ────────────────────────────────────────────── */}
      {recipes.length > 0 && (
        <section className="px-6 md:px-10 py-16 bg-off">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-terra mb-1.5">
                  — V kuchyni
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
                  Recepty s olivovým olejem
                </h2>
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
                      <div className="font-[family-name:var(--font-display)] text-[120px] font-normal italic text-white/15 leading-none select-none">
                        {initial}
                      </div>
                      <div className="absolute top-3 left-3 text-[9px] font-bold tracking-widest uppercase text-white/70">
                        Recept
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-[family-name:var(--font-display)] text-lg text-text leading-tight mb-2 line-clamp-2">
                        {a.title}
                      </h3>
                      <p className="text-[12px] text-text2 leading-snug line-clamp-2 mb-2 flex-1">
                        {a.excerpt}
                      </p>
                      <div className="text-[11px] text-terra">{a.readTime}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── PROČ OLIVÁTOR ─ final value prop ──────────────────── */}
      <section className="bg-olive-dark text-white py-16 px-6 md:px-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 items-center">
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-white/60 mb-2">
                Proč Olivátor?
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[44px] font-normal leading-tight mb-4">
                Bez reklam.<br />
                <em className="text-olive4 italic">Bez kompromisů.</em>
              </h2>
              <p className="text-[14px] text-white/70 leading-relaxed mb-5">
                Vlastní metodika, čtyři tvrdá čísla, denně aktualizované ceny napříč {stats.activeRetailers} prodejci. Neutřídíme oleje podle provize — třídíme je podle kvality.
              </p>
              <Link
                href="/o-projektu"
                className="inline-flex items-center gap-2 bg-white text-olive-dark rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-olive-bg transition-colors"
              >
                O projektu →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { Icon: BarChart3, title: 'Vlastní Score', body: '4 kritéria, 100 bodů' },
                { Icon: Bot, title: 'AI Sommelier', body: 'Olej za 5 sekund' },
                { Icon: Ban, title: 'Žádná reklama', body: 'Žádné sponsored' },
                { Icon: Globe2, title: `${stats.activeRetailers} prodejců`, body: 'Cena denně' },
              ].map((d) => (
                <div key={d.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <d.Icon size={20} strokeWidth={1.5} className="text-olive4 mb-3" />
                  <div className="text-[13px] font-semibold mb-0.5">{d.title}</div>
                  <div className="text-[11px] text-white/60">{d.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

// ── Subcomponents ──────────────────────────────────────────

// Tailwind class pro auto badge na produktové kartě (computeBadges)
function badgeClass(tone: 'gold' | 'olive' | 'terra' | 'amber' | 'sage'): string {
  switch (tone) {
    case 'gold':
      return 'bg-terra text-white'
    case 'olive':
      return 'bg-olive text-white'
    case 'terra':
      return 'bg-terra-bg text-terra'
    case 'amber':
      return 'bg-amber-100 text-amber-800'
    case 'sage':
      return 'bg-olive-bg text-olive-dark'
  }
}

function ScoreBar({
  label,
  weight,
  points,
  max,
  detail,
}: {
  label: string
  weight: string
  points: number
  max: number
  detail: string
}) {
  const pct = max > 0 ? (points / max) * 100 : 0
  const safe = Math.max(0, Math.min(100, pct))
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[13px] font-semibold text-text">
          {label} <span className="text-text3 text-[11px] font-normal">({weight})</span>
        </div>
        <div className="text-[13px] tabular-nums font-bold text-olive">
          {points}<span className="text-text3 font-normal">/{max}</span>
        </div>
      </div>
      <div className="h-1.5 bg-off2 rounded-full overflow-hidden">
        <div className="h-full bg-olive rounded-full transition-all" style={{ width: `${safe}%` }} />
      </div>
      <div className="text-[11px] text-text3 mt-1">↳ {detail}</div>
    </div>
  )
}

function TopProductCard({
  product,
  rank,
  badge,
}: {
  product: ProductWithOffer
  rank: number
  badge?: ProductBadge | null
}) {
  return (
    <Link
      href={`/olej/${product.slug}`}
      className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-olive-light"
    >
      {/* Foto vyplňuje celý prostor — bez vnitřního paddingu.
          Aspekt 4:5 (užší/vyšší než 3:4) protože lahve mají natural portrait.
          bg-white sjednotí s bílým paddingem v product fotech (žádná viditelná hranice). */}
      <div className="relative aspect-[4/5] bg-white overflow-hidden">
        {/* Auto badge — superlativ v čem olej vyniká */}
        {badge && (
          <span
            className={`absolute top-1.5 left-1.5 z-10 text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 shadow-sm ${badgeClass(badge.tone)}`}
            title={badge.hint}
          >
            {badge.label}
          </span>
        )}
        {!badge && (
          <span className="absolute top-1.5 left-1.5 z-10 text-[10px] font-bold tracking-widest uppercase text-text bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 shadow-sm">
            #{rank}
          </span>
        )}
        {/* Score — menší kruh pro užší kartu */}
        <span className="absolute top-1.5 right-1.5 z-10 text-[12px] font-bold bg-terra text-white rounded-full w-9 h-9 flex items-center justify-center tabular-nums shadow-md">
          {product.olivatorScore}
        </span>
        {/* Vlajka — menší */}
        <span
          className="absolute bottom-1.5 left-1.5 z-10 text-[16px] leading-none bg-white/90 backdrop-blur-sm rounded px-1 py-0.5 shadow-sm"
          aria-label={countryName(product.originCountry)}
          title={countryName(product.originCountry)}
        >
          {countryFlag(product.originCountry)}
        </span>
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
          <ProductImage
            product={product}
            fallbackSize="text-[60px]"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
          />
        </div>
      </div>

      {/* Textová část — kompaktní */}
      <div className="p-2.5 flex-1 flex flex-col">
        <div className="text-[11px] font-semibold text-text leading-tight mb-1.5 line-clamp-2 min-h-[2.4em]">
          {product.name}
        </div>

        {product.cheapestOffer && (
          <div className="mt-auto pt-1.5 border-t border-off">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <div className="text-[13px] font-bold text-text leading-tight tabular-nums">
                {formatPrice(product.cheapestOffer.price)}
              </div>
              <div className="text-[9px] font-semibold text-terra bg-terra-bg rounded px-1 py-0.5 tabular-nums">
                {formatPricePer100ml(product.cheapestOffer.price, product.volumeMl)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}


// 3 featured tipy na homepage — jeden top olej v každé chuťové kategorii
// (výrazný/jemný/zdravý). Compact card s headline a obrázkem.
function FeaturedTip({
  category,
  product,
}: {
  category: "vyrazny" | "jemny" | "zdravy"
  product: ProductWithOffer
}) {
  const config = {
    vyrazny: {
      label: "Výrazný",
      sub: "Pro silnou kuchyni",
      bg: "bg-amber-50 border-amber-200",
      tag: "bg-amber-100 text-amber-800",
    },
    jemny: {
      label: "Jemný",
      sub: "K jemným jídlům",
      bg: "bg-olive-bg border-olive-border",
      tag: "bg-olive-bg text-olive-dark",
    },
    zdravy: {
      label: "Zdravý",
      sub: "Polyfenoly nahoře",
      bg: "bg-green-50 border-green-200",
      tag: "bg-green-100 text-green-800",
    },
  } as const
  const c = config[category]

  return (
    <Link
      href={`/olej/${product.slug}`}
      className={`block bg-white border ${c.bg} rounded-[var(--radius-card)] overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]`}
    >
      <div className="grid grid-cols-[120px_1fr] gap-0">
        <div className="aspect-square bg-white relative">
          <ProductImage product={product} fallbackSize="text-[44px]" sizes="120px" />
          <div className="absolute top-2 left-2 bg-terra text-white rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums">
            {product.olivatorScore}
          </div>
        </div>
        <div className="p-4 flex flex-col">
          <div className={`inline-flex w-fit text-[10px] font-bold uppercase tracking-widest ${c.tag} rounded-full px-2 py-0.5 mb-1.5`}>
            {c.label}
          </div>
          <div className="text-[10px] text-text3 mb-0.5 uppercase tracking-widest">
            {c.sub}
          </div>
          <div className="text-[13px] font-semibold text-text leading-tight line-clamp-2 mb-2">
            {product.name}
          </div>
          {product.cheapestOffer && (
            <div className="mt-auto flex items-baseline gap-2 flex-wrap">
              <span className="text-[15px] font-bold text-text tabular-nums">
                {formatPrice(product.cheapestOffer.price)}
              </span>
              {/* Cena/100ml — stejný terra badge jako v TopProductCard */}
              <span className="text-[10px] font-semibold text-terra bg-terra-bg rounded px-1.5 py-0.5 tabular-nums">
                {formatPricePer100ml(product.cheapestOffer.price, product.volumeMl)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
