import Link from 'next/link'
import { getProductsWithOffers, getSiteStats } from '@/lib/data'
import { getArticles } from '@/lib/static-content'
import { pickOilOfDay, pickThreeCurated, pickScoreFeature } from '@/lib/home-picks'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { ProductImage } from '@/components/product-image'
import { countryFlag, countryName, formatPrice, formatPricePer100ml } from '@/lib/utils'
import type { Product, ProductOffer } from '@/lib/types'

// Homepage rotuje denně (revalidate = 1 hodina, ale dailySeed je per-day)
export const revalidate = 3600

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

export default async function Home() {
  const [allProducts, stats] = await Promise.all([
    getProductsWithOffers(),
    getSiteStats(),
  ])
  const oilOfDay = pickOilOfDay(allProducts)
  const curated = pickThreeCurated(allProducts)
  const scoreFeature = pickScoreFeature(allProducts)
  const articles = getArticles()
  const heroArticle = articles[0]
  const restArticles = articles.slice(1, 4)

  return (
    <>
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section className="relative px-6 md:px-10 pt-16 pb-20 text-center bg-white overflow-hidden">
        {/* Subtle background gradient */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-olive-bg/30 via-white to-white"
        />

        <div className="inline-flex items-center gap-2 text-[11px] font-medium text-olive bg-olive-bg px-3.5 py-1.5 rounded-full mb-6 tracking-wide">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-olive opacity-50" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-olive" />
          </span>
          {stats.totalProducts} olejů · {stats.activeRetailers} prodejců · ceny aktualizované dnes
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-[72px] font-normal leading-[1.02] tracking-tight text-text mb-5">
          Najdi svůj<br />
          <em className="text-olive italic">dokonalý olej.</em>
        </h1>

        <p className="text-[17px] text-text2 font-light leading-relaxed max-w-[520px] mx-auto mb-9">
          Bez reklam, bez sponzoringu, bez bla bla.{' '}
          <span className="block md:inline">Vlastní Score, kurátorský výběr, AI Sommelier.</span>
        </p>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/quiz"
            className="group inline-flex items-center gap-2.5 bg-olive text-white rounded-full px-7 py-3.5 text-[15px] font-semibold transition-all hover:bg-olive2 hover:scale-[1.02] shadow-[0_4px_24px_rgba(45,106,79,0.25)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Najdeme ti olej
            <span className="text-white/60 text-[12px] font-normal">· 5 otázek</span>
          </Link>
          <Link
            href="/srovnavac"
            className="text-[13px] text-text3 hover:text-text transition-colors"
          >
            nebo procházet katalog ↓
          </Link>
        </div>
      </section>

      {/* ─── OLEJ DNE ─────────────────────────────────────────── */}
      {oilOfDay && (
        <section className="px-6 md:px-10 py-14 max-w-[960px] mx-auto">
          <div className="flex items-center justify-center gap-2 mb-7">
            <span className="text-2xl">🏆</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-text2">
              Olej dne
            </span>
            <span className="text-[11px] text-text3">
              · vybráno automaticky podle Score / cena
            </span>
          </div>

          <Link
            href={`/olej/${oilOfDay.slug}`}
            className="block bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden transition-all hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-olive-light"
          >
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
              {/* Foto */}
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

              {/* Info */}
              <div className="p-6 md:p-8 flex flex-col">
                <div className="text-[12px] text-text3 mb-2 flex items-center gap-1.5">
                  <span>{countryFlag(oilOfDay.originCountry)}</span>
                  <span>
                    {oilOfDay.originRegion ? `${oilOfDay.originRegion}, ` : ''}
                    {countryName(oilOfDay.originCountry)}
                  </span>
                </div>

                <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-text leading-tight mb-3">
                  {oilOfDay.name}
                </h2>

                {/* Hlavní fakty */}
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
                  {oilOfDay.certifications.slice(0, 2).map(c => (
                    <span key={c} className="text-[11px] bg-off text-text2 border border-off2 rounded-full px-2.5 py-0.5 uppercase font-medium">
                      {c}
                    </span>
                  ))}
                </div>

                {/* Cena */}
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
                      Detail oleje →
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ─── PROČ OLIVATOR ───────────────────────────────────── */}
      <section className="bg-off/60 px-6 md:px-10 py-16">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              Co děláme jinak
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text">
              Oproti běžným srovnávačům
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                emoji: '📊',
                title: 'Vlastní Score',
                body: '4 kritéria, 100 bodů, transparentní breakdown.',
                cta: { href: '/metodika', label: 'Jak počítáme' },
              },
              {
                emoji: '🤖',
                title: 'AI Sommelier',
                body: '"Lehký řecký do 300 Kč" — najde ti olej za 5 sekund.',
                cta: { href: '#sommelier', label: 'Otevřít chat' },
              },
              {
                emoji: '🚫',
                title: 'Žádná reklama',
                body: 'Není sponsored, není provize-driven výběr.',
                cta: { href: '/o-projektu', label: 'O projektu' },
              },
              {
                emoji: '🌍',
                title: '18 prodejců',
                body: 'Cena se mění, my hlídáme. Aktualizace každý den.',
                cta: { href: '/srovnavac', label: 'Procházet katalog' },
              },
            ].map((d) => (
              <div
                key={d.title}
                className="bg-white border border-off2 rounded-[var(--radius-card)] p-5 flex flex-col hover:border-olive-light transition-colors"
              >
                <div className="text-3xl mb-3">{d.emoji}</div>
                <div className="text-base font-semibold text-text mb-1.5">{d.title}</div>
                <div className="text-[13px] text-text2 leading-relaxed mb-4 flex-1">{d.body}</div>
                <Link
                  href={d.cta.href}
                  className="text-[12px] text-olive hover:text-olive2 font-medium"
                >
                  {d.cta.label} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SCORE EXPLAINER ────────────────────────────────── */}
      {scoreFeature && (
        <section className="px-6 md:px-10 py-16 max-w-[960px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              Jak vzniká Score
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text mb-3">
              Žádná magie. 4 čísla.
            </h2>
            <p className="text-[15px] text-text2 max-w-[480px] mx-auto">
              Vyzkoušej si to na konkrétním produktu. <strong className="text-text">{scoreFeature.name}</strong> dostala <strong className="text-text">{scoreFeature.olivatorScore}/100</strong>. Tady je proč:
            </p>
          </div>

          <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 md:p-8">
            <div className="space-y-5">
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

            <div className="flex flex-wrap items-center justify-between gap-3 mt-7 pt-6 border-t border-off">
              <Link
                href={`/olej/${scoreFeature.slug}`}
                className="text-[13px] text-olive font-medium hover:text-olive2"
              >
                Zobrazit {scoreFeature.name} →
              </Link>
              <Link
                href="/metodika"
                className="text-[13px] text-text2 hover:text-text"
              >
                Detailní metodika →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── 3 DOPORUČENÍ ───────────────────────────────────── */}
      {(curated.health || curated.cooking || curated.gift) && (
        <section className="px-6 md:px-10 py-16 max-w-[1080px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              Naše 3 doporučení
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text">
              Pro každý důvod jeden olej
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {curated.health && (
              <CuratedCard
                product={curated.health}
                emoji="💚"
                tag="Pro zdraví"
                why={
                  curated.health.polyphenols
                    ? `${curated.health.polyphenols} mg/kg polyfenolů — antioxidanty na maximum`
                    : 'Maximum antioxidantů a kvality'
                }
              />
            )}
            {curated.cooking && (
              <CuratedCard
                product={curated.cooking}
                emoji="🍳"
                tag="Pro vaření"
                why={
                  curated.cooking.acidity != null
                    ? `Kyselost ${curated.cooking.acidity} % — univerzál do kuchyně`
                    : 'Univerzál do kuchyně'
                }
              />
            )}
            {curated.gift && (
              <CuratedCard
                product={curated.gift}
                emoji="🎁"
                tag="Pro dárek"
                why={
                  curated.gift.certifications.length > 0
                    ? `${curated.gift.certifications.map((c) => c.toUpperCase()).join(' · ')} · prémium prezentace`
                    : 'Prémium prezentace, vysoké Score'
                }
              />
            )}
          </div>
        </section>
      )}

      {/* ─── AI SOMMELIER CTA ──────────────────────────────── */}
      <section id="sommelier" className="px-6 md:px-10 py-16">
        <div className="max-w-[920px] mx-auto bg-olive-dark rounded-[var(--radius-card)] px-8 md:px-12 py-12 text-center text-white">
          <div className="text-5xl mb-4">🫒</div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal mb-3 leading-tight">
            Nevíš který? Zeptej se.
          </h2>
          <p className="text-white/70 text-[15px] mb-7 max-w-[520px] mx-auto">
            AI Sommelier tě provede výběrem ze všech {stats.totalProducts} olejů. Zdarma, bez registrace.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              'Lehký řecký do 300 Kč',
              'Co má nejvíc polyfenolů?',
              'Dárek pro tátu co rád vaří',
            ].map((q) => (
              <span
                key={q}
                className="text-[12px] bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-white/85"
              >
                "{q}"
              </span>
            ))}
          </div>

          <p className="text-[12px] text-white/50">
            Klikni na 🫒 vpravo dole — chat se otevře.
          </p>
        </div>
      </section>

      {/* ─── ČLÁNKY ────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-12 max-w-[1080px] mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
              Z olivového světa
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text">
              Průvodce a recepty
            </h2>
          </div>
          <Link href="/pruvodce" className="text-[13px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap">
            Všechny články →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4">
          {/* Hero článek */}
          {heroArticle && (
            <Link
              href={`/${heroArticle.category === 'recept' ? 'recept' : 'pruvodce'}/${heroArticle.slug}`}
              className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-olive-light"
            >
              <div className="aspect-[16/9] bg-gradient-to-br from-olive-bg/30 to-off flex items-center justify-center text-[80px]">
                {heroArticle.emoji}
              </div>
              <div className="p-6">
                <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
                  {heroArticle.category === 'recept' ? 'Recept' : heroArticle.category === 'zebricek' ? 'Žebříček' : 'Průvodce'}
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-text leading-tight mb-2">
                  {heroArticle.title}
                </h3>
                <p className="text-[13px] text-text2 mb-3 leading-relaxed line-clamp-2">
                  {heroArticle.excerpt}
                </p>
                <div className="text-[11px] text-text3">{heroArticle.readTime}</div>
              </div>
            </Link>
          )}

          {/* 3 menší */}
          <div className="space-y-3">
            {restArticles.map(a => (
              <Link
                key={a.slug}
                href={`/${a.category === 'recept' ? 'recept' : 'pruvodce'}/${a.slug}`}
                className="bg-white border border-off2 rounded-[var(--radius-card)] p-4 flex items-center gap-4 transition-all hover:border-olive-light hover:translate-x-1"
              >
                <div className="w-14 h-14 shrink-0 bg-off rounded-lg flex items-center justify-center text-3xl">
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1">
                    {a.category === 'recept' ? 'Recept' : a.category === 'zebricek' ? 'Žebříček' : 'Průvodce'}
                  </div>
                  <div className="text-[14px] font-semibold text-text leading-snug mb-0.5 line-clamp-2">
                    {a.title}
                  </div>
                  <div className="text-[11px] text-text3">{a.readTime}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NEWSLETTER ────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 max-w-[1080px] mx-auto">
        <NewsletterSignup source="homepage" variant="hero" />
      </section>
    </>
  )
}

// ── Subcomponents ──────────────────────────────────────────

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
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-sm font-semibold text-text">
          {label} <span className="text-text3 text-[11px] font-normal">({weight} váhy)</span>
        </div>
        <div className="text-sm tabular-nums font-bold text-olive">
          {points}<span className="text-text3 font-normal">/{max}</span>
        </div>
      </div>
      <div className="h-2 bg-off2 rounded-full overflow-hidden">
        <div
          className="h-full bg-olive rounded-full transition-all"
          style={{ width: `${safe}%` }}
        />
      </div>
      <div className="text-[11px] text-text3 mt-1.5">↳ {detail}</div>
    </div>
  )
}

function CuratedCard({
  product,
  emoji,
  tag,
  why,
}: {
  product: ProductWithOffer
  emoji: string
  tag: string
  why: string
}) {
  return (
    <Link
      href={`/olej/${product.slug}`}
      className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden flex flex-col transition-all hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-olive-light"
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-olive">
            {tag}
          </span>
        </div>
        <span className="text-[11px] font-bold bg-terra text-white rounded-full px-2.5 py-0.5 tabular-nums">
          {product.olivatorScore}
        </span>
      </div>

      <div className="aspect-square bg-gradient-to-br from-off to-white relative">
        <ProductImage product={product} fallbackSize="text-[72px]" sizes="(max-width: 768px) 100vw, 350px" />
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="text-[11px] text-text3 mb-1 flex items-center gap-1">
          {countryFlag(product.originCountry)} {countryName(product.originCountry)}
        </div>
        <div className="text-[15px] font-semibold text-text leading-tight mb-2 line-clamp-2">
          {product.name}
        </div>
        <p className="text-[12px] text-text2 leading-snug mb-3 line-clamp-2">{why}</p>

        {product.cheapestOffer && (
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-off">
            <div>
              <div className="text-base font-bold text-text">
                {formatPrice(product.cheapestOffer.price)}
              </div>
              <div className="text-[10px] text-text3">
                {formatPricePer100ml(product.cheapestOffer.price, product.volumeMl)}
              </div>
            </div>
            <span className="text-[11px] text-olive group-hover:text-olive2 font-semibold">
              Detail →
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
