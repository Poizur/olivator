import Link from 'next/link'
import {
  getProductsWithOffers,
  getSiteStats,
  getRegionTiles,
  getBrandTiles,
} from '@/lib/data'
import { getActiveArticles } from '@/lib/articles-db'
import { getActiveRecipes } from '@/lib/recipes-db'
import { pickOilOfDay, pickScoreFeature } from '@/lib/home-picks'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { ProductImage } from '@/components/product-image'
import { Trophy, BarChart3, Bot, Ban, Globe2, Leaf, Gift } from 'lucide-react'
import { SommelierHero } from '@/components/sommelier-hero'
import { FlavorSelector } from '@/components/flavor-selector'
import { RegionAtlas } from '@/components/region-atlas'
import { BrandStrip } from '@/components/brand-strip'
import { ComparatorTeaser, type Duel } from '@/components/comparator-teaser'
import { countryName, countryFlag, formatPrice, formatPricePer100ml } from '@/lib/utils'
import { computeBadges, pickByCategory, type ProductBadge } from '@/lib/product-badges'
import { diverseTopProducts } from '@/lib/product-selection'
import { classifyIntensity, INTENSITY_LABELS, INTENSITY_DESCRIPTIONS, type Intensity } from '@/lib/intensity-classifier'
import type { Product, ProductOffer } from '@/lib/types'
import { ScoreBadge } from '@/components/score-badge'
import { TopByCountry } from '@/components/home/top-by-country'

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
  const [guides, recipes] = await Promise.all([
    getActiveArticles(),
    getActiveRecipes(),
  ])

  // Top 3 by Score for hero sidebar — max 1 per brand (prevent Lozano ×3)
  const topPicks = diverseTopProducts(
    allProducts.filter((p) => p.cheapestOffer != null && p.olivatorScore != null && p.olivatorScore >= 60),
    3,
    1,
  )

  // Lookup table for AI sommelier reply → product card
  const productLookup: Record<string, ProductWithOffer> = {}
  for (const p of allProducts) productLookup[p.slug] = p

  // Top 12 olejů této chvíle (catalog teaser — 3×4 grid) — max 2 per brand
  const topTwelve = diverseTopProducts(
    allProducts.filter((p) => p.cheapestOffer != null && p.olivatorScore != null && p.olivatorScore > 0),
    12,
    2,
  )

  // Auto-vypočítané badges pro top 12 (Top Score / Nejvíc polyfenolů / …)
  const badgesByProduct = computeBadges(topTwelve)

  // Tipy 3 olejů — výrazný / jemný / zdravý (shoptet-style featured cards)
  const tipVyrazny = pickByCategory(allProducts, 'vyrazny')
  const tipJemny = pickByCategory(allProducts, 'jemny')
  const tipZdravy = pickByCategory(allProducts, 'zdravy')

  // Intensity sekce — skupiny jemný / střední / pikantní
  const scoredWithOffer = allProducts.filter(
    (p) => p.cheapestOffer != null && p.type !== 'flavored'
  )
  const intensityGroups: Record<Intensity, ProductWithOffer[]> = { jemny: [], stredni: [], pikantni: [] }
  for (const p of scoredWithOffer) {
    intensityGroups[classifyIntensity(p)].push(p)
  }
  // Top 5 per skupiny dle Score
  const intensityTop: Record<Intensity, ProductWithOffer[]> = {
    jemny: [...intensityGroups.jemny].sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0)).slice(0, 5),
    stredni: [...intensityGroups.stredni].sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0)).slice(0, 5),
    pikantni: [...intensityGroups.pikantni].sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0)).slice(0, 5),
  }

  // Comparator teaser — 3 prefab duely
  const withOffer = allProducts.filter((p) => p.cheapestOffer != null)

  const duelTopScore = [...withOffer]
    .filter((p) => p.olivatorScore != null && p.olivatorScore > 0)
    .sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))
    .slice(0, 3)

  const duelBioGreek = withOffer
    .filter(
      (p) =>
        p.originCountry === 'GR' &&
        p.certifications.some((c) => {
          const lc = c.toLowerCase()
          return lc === 'bio' || lc === 'organic' || lc === 'eu_bio'
        })
    )
    .sort((a, b) => {
      const ppa = a.cheapestOffer!.price / Math.max(1, a.volumeMl ?? 500)
      const ppb = b.cheapestOffer!.price / Math.max(1, b.volumeMl ?? 500)
      return ppa - ppb
    })
    .slice(0, 3)

  // 3. duel — nejlepší Score do 500 Kč (běžný shopper)
  const duelBudget = withOffer
    .filter(
      (p) =>
        p.cheapestOffer!.price <= 500 &&
        p.olivatorScore != null && p.olivatorScore > 0 &&
        !duelTopScore.some((t) => t.id === p.id)
    )
    .sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))
    .slice(0, 3)

  const duels: Duel[] = [
    {
      key: 'top-score',
      icon: Trophy,
      label: 'Top 3 dle Score',
      sub: 'Absolutní špička katalogu',
      hint: 'Tři nejlepší oleje napříč všemi kategoriemi — nejvyšší Olivator Score, nejtvrdší metriky.',
      products: duelTopScore,
    },
    {
      key: 'bio-greek',
      icon: Leaf,
      label: 'BIO řecké do koše',
      sub: 'Nejlepší poměr cena/100 ml',
      hint: 'Tři nejlevnější bio řecké oleje za 100 ml — kvalita certifikovaná, peněženka v klidu.',
      products: duelBioGreek,
    },
    {
      key: 'budget',
      icon: Gift,
      label: 'Skvělé do 500 Kč',
      sub: 'Nejlepší Score v rozumné ceně',
      hint: 'Tři oleje pro každodenní vaření — nejlepší Score do 500 Kč. Žádný kompromis na kvalitě.',
      products: duelBudget,
    },
  ].filter((d) => d.products.length >= 2) as Duel[]

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

      {/* ─── HERO NEWSLETTER STRIP ─────────────────────────────────── */}
      <div className="bg-olive-dark px-6 md:px-10 py-5">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="text-white font-semibold text-[15px] leading-snug">
              Slevy + tipy na olivový olej — Olíkův týdenní digest
            </div>
            <div className="text-white/55 text-[12px] mt-0.5">Hned po přihlášení dostaneš aktuální slevy. Pak každý čtvrtek v 8:00.</div>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[300px] shrink-0">
            <NewsletterSignup source="homepage" variant="dark" />
          </div>
        </div>
      </div>

      {/* ─── COMPARATOR TEASER ─ 3 prefab duely + trust counter ─── */}
      <ComparatorTeaser
        duels={duels}
        totalProducts={stats.totalProducts}
        totalRetailers={stats.activeRetailers}
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

      {/* ─── TOP PER ZEMĚ ───────────────────────────────────────────── */}
      <TopByCountry products={allProducts} />

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

      {/* ─── INTENZITA CHUTI ─────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              — Hořkost a pálivost v oleji
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
              Jemné, střední nebo výrazné?
            </h2>
            <p className="text-[15px] text-text2 font-light mt-3 max-w-xl mx-auto leading-relaxed">
              Hořkost a pálivost nejsou vady — jsou to polyfenoly. Čím ranější sklizeň a více
              polyfenolů, tím intenzivnější chuť a více zdravých látek. Najdi svoji míru.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['jemny', 'stredni', 'pikantni'] as Intensity[]).map((key) => (
              <IntensityCard
                key={key}
                intensity={key}
                products={intensityTop[key]}
                count={intensityGroups[key].length}
              />
            ))}
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
                  {oilOfDay.olivatorScore != null && oilOfDay.olivatorScore > 0 && oilOfDay.type !== 'flavored' && (
                    <div className="absolute top-4 left-4 bg-terra text-white rounded-full px-3 py-1 text-xs font-bold tabular-nums shadow-md">
                      {oilOfDay.olivatorScore}/100
                    </div>
                  )}
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
                { Icon: Ban, title: 'Žádná reklama', body: 'Žádné sponsored' },
                { Icon: Globe2, title: `${stats.activeRetailers} prodejců`, body: 'Cena denně' },
              ].map((d) => (
                <div key={d.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <d.Icon size={20} strokeWidth={1.5} className="text-olive4 mb-3" />
                  <div className="text-[13px] font-semibold mb-0.5">{d.title}</div>
                  <div className="text-[11px] text-white/60">{d.body}</div>
                </div>
              ))}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <img src="/olik.png" alt="Olík" className="w-6 h-6 object-contain mb-3" />
                <div className="text-[13px] font-semibold mb-0.5">Olík</div>
                <div className="text-[11px] text-white/60">Olej za 5 sekund</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

// ── Subcomponents ──────────────────────────────────────────

// badgeClass přesunuto do components/home/top-product-card.tsx
import { TopProductCard, badgeClass } from '@/components/home/top-product-card'

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
          <div className="absolute top-2 left-2">
            <ScoreBadge score={product.olivatorScore} type={product.type} size="small" />
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

function IntensityCard({
  intensity,
  products,
  count,
}: {
  intensity: Intensity
  products: ProductWithOffer[]
  count: number
}) {
  const config: Record<Intensity, { emoji: string; bg: string; tag: string; border: string }> = {
    jemny: {
      emoji: '🫒',
      bg: 'bg-olive-bg',
      tag: 'bg-olive text-white',
      border: 'border-olive-border hover:border-olive',
    },
    stredni: {
      emoji: '⚖️',
      bg: 'bg-off',
      tag: 'bg-text text-white',
      border: 'border-off2 hover:border-text2',
    },
    pikantni: {
      emoji: '🔥',
      bg: 'bg-amber-50',
      tag: 'bg-terra text-white',
      border: 'border-amber-200 hover:border-terra',
    },
  }
  const c = config[intensity]

  return (
    <Link
      href={`/srovnavac?intensity=${intensity}`}
      className={`block ${c.bg} border ${c.border} rounded-[var(--radius-card)] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[22px]">{c.emoji}</span>
        <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${c.tag}`}>
          {INTENSITY_LABELS[intensity]}
        </span>
        <span className="ml-auto text-[11px] text-text3">{count} olejů</span>
      </div>
      <p className="text-[13px] text-text2 leading-snug mb-4">
        {INTENSITY_DESCRIPTIONS[intensity]}
      </p>
      {products.length > 0 && (
        <div className="flex gap-2 mb-4">
          {products.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="w-[52px] h-[68px] rounded-lg bg-white border border-off2 overflow-hidden flex-shrink-0 shadow-sm"
              title={p.name}
            >
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-1" loading="lazy" />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-[22px]">🫒</span>
              )}
            </div>
          ))}
        </div>
      )}
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-olive">
        Zobrazit {INTENSITY_LABELS[intensity].toLowerCase()} oleje
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
      </span>
    </Link>
  )
}
