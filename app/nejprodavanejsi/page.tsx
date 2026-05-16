import type { Metadata } from 'next'
import Link from 'next/link'
import { Flame, Info } from 'lucide-react'
import { getBestsellers } from '@/lib/data'
import { formatPrice, formatPricePer100ml } from '@/lib/utils'
import { TopProductCard } from '@/components/home/top-product-card'
import { NewsletterSignup } from '@/components/newsletter-signup'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Nejprodávanější olivové oleje 2026 | Olivator',
  description:
    'Co Češi reálně kupují. Nejpopulárnější olivové oleje seřazené podle skutečné popularity — včetně Motakis, Sitia a dalších oblíbených značek.',
  alternates: { canonical: 'https://olivator.cz/nejprodavanejsi' },
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: 'https://olivator.cz/nejprodavanejsi',
    siteName: 'Olivator',
    title: 'Nejprodávanější olivové oleje 2026',
    description: 'Co Češi reálně kupují — nejoblíbenější olivové oleje bez filtru.',
  },
}

export default async function NejprodavanejiPage() {
  const bestsellers = await getBestsellers({ limit: 50 })

  return (
    <main className="min-h-screen">

      {/* ── Hero ── */}
      <section className="px-6 md:px-10 pt-14 pb-10 border-b border-off2 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-[10px] font-bold tracking-widest uppercase text-terra mb-3 inline-flex items-center gap-1.5">
            <Flame size={11} strokeWidth={2.25} />
            Bestsellery
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-[48px] font-normal text-text leading-tight mb-4">
            Nejprodávanější{' '}
            <em className="text-olive italic">olivové oleje</em>
          </h1>
          <p className="text-[17px] font-normal text-text2 max-w-[600px] leading-relaxed mb-6">
            Co Češi reálně kupují — seřazeno podle skutečné popularity. Zahrnuje
            i oleje s nižším Olivator Score, které jsou v ČR masově oblíbené
            (např. Motakis Kréta 5L).
          </p>

          {/* Info box */}
          <div className="inline-flex items-start gap-2.5 bg-off rounded-xl px-4 py-3 max-w-[560px]">
            <Info size={14} className="text-text3 mt-0.5 shrink-0" />
            <p className="text-[12px] text-text2 leading-relaxed">
              Pořadí vychází z affiliate kliknutí za posledních 30 dní.
              Manuálně nominované bestsellery (Motakis) jsou ve výsledcích
              zahrnuty i přes nižší Score — jde o realitu trhu, ne naše doporučení.
            </p>
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-[1280px] mx-auto">
          {bestsellers.length === 0 ? (
            <p className="text-text2 text-center py-20">Data se načítají...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {bestsellers.map((p, i) => (
                  <div key={p.id} className="relative">
                    {/* Rank badge */}
                    <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-0.5 bg-terra text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 shadow-sm leading-none">
                      {i === 0 ? '🔥' : `#${i + 1}`}
                    </div>
                    <TopProductCard
                      product={p}
                      rank={i + 1}
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                    />
                  </div>
                ))}
              </div>

              <p className="text-[12px] text-text3 text-center mt-8">
                Zobrazeno {bestsellers.length} bestsellerů · Aktualizováno denně
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Note o Motakis / Score vs popularita ── */}
      <section className="px-6 md:px-10 py-12 bg-off/50 border-t border-off2">
        <div className="max-w-[760px] mx-auto">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
            Proč Motakis Kréta 5L?
          </h2>
          <p className="text-[15px] text-text2 leading-relaxed mb-4">
            Motakis Kréta 5L je podle dat z českého maloobchodu nejprodávanější
            5litrový olivový olej v ČR. Přesto má nízký Olivator Score (25–45) —
            hlavně proto, že nemáme lab data o kyselosti a polyfenolech, které
            tvoří 60 % výpočtu.
          </p>
          <p className="text-[15px] text-text2 leading-relaxed mb-6">
            Neznamená to, že Motakis je špatný olej. Znamená to, že{' '}
            <strong className="text-text">popularita ≠ Olivator Score</strong>.
            Pro nezávislé hodnocení kvality doporučujeme Score 75+. Pro lidové
            bestsellery je tato stránka.
          </p>
          <Link
            href="/metodika"
            className="text-[13px] text-olive font-semibold hover:text-olive2 transition-colors"
          >
            Jak počítáme Olivator Score →
          </Link>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <NewsletterSignup />
    </main>
  )
}
