import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { getSlevyDeals, type SlevyDeal } from '@/lib/welcome-series'
import { countryFlag } from '@/lib/utils'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Olivový olej v akci — denně aktualizované slevy | Olivátor',
  description:
    'Přehled aktuálních slev na olivový olej ze 18 českých prodejců. Pouze ověřené slevy porovnané s 30denním maximem ceny.',
  alternates: { canonical: 'https://olivator.cz/slevy' },
  openGraph: {
    title: 'Slevy na olivový olej — Olivátor',
    description: 'Denně aktualizovaný přehled skutečných slev ze 18 prodejců.',
    url: 'https://olivator.cz/slevy',
  },
}

const SITE = 'https://olivator.cz'
const UTM = 'utm_source=web&utm_medium=slevy&utm_campaign=deals_page'

const FAQ_ITEMS = [
  {
    q: 'Jak Olivátor ověřuje, že jde o skutečnou slevu?',
    a: 'Sledujeme ceny ze 18 prodejců každý den. Slevu zobrazujeme pouze tehdy, pokud je aktuální cena alespoň 5 % pod maximální cenou za posledních 30 dní u konkrétního prodejce.',
  },
  {
    q: 'Jak často se přehled aktualizuje?',
    a: 'Ceny scraperujeme jednou denně v ranních hodinách. Stránka se zobrazuje s maximálně hodinovým zpožděním — takže vždy vidíte dnešní stav.',
  },
  {
    q: 'Mohu si nastavit upozornění na slevy?',
    a: 'Zatím ne automaticky, ale přihlášením k newsletteru dostanete slevy každý čtvrtek ráno do emailu. Pracujeme na price alertech — budou brzy.',
  },
  {
    q: 'Jak jsou slevy seřazeny?',
    a: 'Slevy řadíme kombinací výše slevy (40 %) a Olivator Score (60 %). Takže olej s vysokým skóre a menší slevou může být výše než levný olej s obří slevou — jde nám o nejlepší deal celkově.',
  },
  {
    q: 'Jsou tu oleje ze Španělska, Řecka i Itálie?',
    a: 'Ano. Procházíme nabídky ze všech hlavních původů. Aktuální přehled vždy závisí na tom, co prodejci zlevnili — sezóna a sklizně mají velký vliv.',
  },
]

function formatPer100ml(price: number, volumeMl: number | null): string | null {
  if (!volumeMl) return null
  return `${Math.round((price / volumeMl) * 100)} Kč / 100 ml`
}

function DealCard({ deal, rank }: { deal: SlevyDeal; rank: number }) {
  const per100ml = formatPer100ml(deal.currentPrice, deal.volumeMl)

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden hover:border-olive-light hover:shadow-[0_4px_16px_rgba(0,0,0,.06)] transition-all">
      <Link href={`/olej/${deal.slug}`} className="flex gap-4 p-4 group">
        {/* Image */}
        <div className="shrink-0 w-20 h-20 rounded-lg bg-off overflow-hidden flex items-center justify-center relative">
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl}
              alt={deal.name}
              fill
              sizes="80px"
              className="object-contain"
            />
          ) : (
            <span className="text-3xl">🫒</span>
          )}
          {/* Rank badge */}
          <span className={`absolute top-1 left-1 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
            rank <= 3 ? 'bg-terra text-white' : 'bg-off2 text-text3'
          }`}>
            {rank}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {deal.brandName && (
            <p className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-0.5">
              {deal.brandName}
            </p>
          )}
          <p className="text-[14px] font-semibold text-text leading-snug line-clamp-2 group-hover:text-olive transition-colors">
            {deal.originCountry ? `${countryFlag(deal.originCountry)} ` : ''}{deal.name}
          </p>
          {deal.volumeMl && (
            <p className="text-[11px] text-text3 mt-0.5">{deal.volumeMl} ml</p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {/* Score */}
            <span className="text-[10px] font-semibold bg-olive4 text-[#1b4332] px-2 py-0.5 rounded-full">
              Score {deal.score}
            </span>
            {/* Drop badge */}
            <span className="text-[10px] font-bold bg-terra text-white px-2 py-0.5 rounded-full">
              -{deal.dropPct}&nbsp;%
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[18px] font-bold text-text">{deal.currentPrice} Kč</span>
            <span className="text-[12px] text-text3 line-through">{deal.oldPrice} Kč</span>
            {per100ml && (
              <span className="text-[11px] text-text3">{per100ml}</span>
            )}
          </div>
        </div>
      </Link>

      {/* CTA row */}
      <div className="px-4 pb-4">
        <Link
          href={`${deal.ctaUrl}?${UTM}&utm_content=deal_${rank}`}
          className="flex items-center justify-between w-full bg-olive hover:bg-olive2 text-white text-[12px] font-semibold px-4 py-2.5 rounded-full transition-colors"
        >
          <span>Koupit u {deal.retailerName}</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  )
}

export default async function SlevyPage() {
  const { deals, stats } = await getSlevyDeals(20)

  const byRetailer = deals.reduce<Record<string, { name: string; deals: SlevyDeal[] }>>((acc, d) => {
    if (!acc[d.retailerSlug]) acc[d.retailerSlug] = { name: d.retailerName, deals: [] }
    acc[d.retailerSlug].deals.push(d)
    return acc
  }, {})
  const retailerGroups = Object.entries(byRetailer).sort((a, b) => b[1].deals.length - a[1].deals.length)

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const itemListSchema = deals.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Slevy na olivový olej — Olivátor',
        description: `${deals.length} ověřených slev na olivový olej ze srovnání 18 prodejců.`,
        numberOfItems: deals.length,
        itemListElement: deals.slice(0, 10).map((d, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE}/olej/${d.slug}`,
          name: d.name,
        })),
      }
    : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}

      <main className="max-w-[960px] mx-auto px-4 py-10 md:py-16">

        {/* ── Hero ── */}
        <section className="mb-10">
          <p className="text-[11px] font-bold tracking-widest uppercase text-olive mb-3">
            🏷 Denně aktualizováno
          </p>
          <h1 className="text-[32px] md:text-[44px] font-bold text-text leading-tight mb-4">
            Slevy na olivový olej
          </h1>
          <p className="text-[16px] text-text2 leading-relaxed max-w-xl mb-8">
            Jenom ověřené slevy — porovnáváme s 30denním maximem ceny
            u každého prodejce. Žádné nafouklé „původní" ceny.
          </p>

          {/* Stats chips */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-olive4 rounded-full px-4 py-2">
              <span className="text-[22px] font-bold text-olive">{stats.totalDeals}</span>
              <span className="text-[12px] text-text2 ml-1.5">aktuálních slev</span>
            </div>
            <div className="bg-off rounded-full px-4 py-2">
              <span className="text-[22px] font-bold text-text">{stats.avgDropPct}&nbsp;%</span>
              <span className="text-[12px] text-text2 ml-1.5">průměrná sleva</span>
            </div>
            <div className="bg-off rounded-full px-4 py-2">
              <span className="text-[22px] font-bold text-text">{stats.retailerCount}</span>
              <span className="text-[12px] text-text2 ml-1.5">prodejců</span>
            </div>
            <div className="bg-off rounded-full px-4 py-2 flex items-center">
              <span className="text-[12px] text-text2">Ověřené srovnáním s 30d max</span>
            </div>
          </div>
        </section>

        {/* ── Top deals grid ── */}
        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-text mb-5">
            {deals.length > 0 ? 'Nejlepší slevy teď' : 'Žádné slevy tento týden'}
          </h2>

          {deals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deals.map((deal, i) => (
                <DealCard key={deal.productId} deal={deal} rank={i + 1} />
              ))}
            </div>
          ) : (
            <div className="bg-off rounded-2xl p-8 text-center">
              <p className="text-[16px] text-text2 mb-4">
                Aktuálně nemáme žádné slevy na kvalitní oleje.<br />
                Zkuste to znovu za pár dní — sezóna akcí přichází.
              </p>
              <Link
                href="/srovnavac"
                className="inline-block bg-olive text-white text-[13px] font-semibold px-6 py-3 rounded-full hover:bg-olive2 transition-colors"
              >
                Procházet celý katalog →
              </Link>
            </div>
          )}
        </section>

        {/* ── By retailer ── */}
        {retailerGroups.length > 0 && (
          <section className="mb-14">
            <h2 className="text-[20px] font-bold text-text mb-5">Slevy podle prodejce</h2>
            <div className="space-y-6">
              {retailerGroups.map(([slug, group]) => (
                <div key={slug}>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-[15px] font-semibold text-text">{group.name}</h3>
                    <span className="text-[11px] bg-off px-2.5 py-0.5 rounded-full text-text3">
                      {group.deals.length} {group.deals.length === 1 ? 'sleva' : group.deals.length <= 4 ? 'slevy' : 'slev'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {group.deals.map(d => (
                      <Link
                        key={d.productId}
                        href={`/olej/${d.slug}`}
                        className="flex flex-col bg-white border border-off2 hover:border-olive-light hover:shadow-[0_2px_8px_rgba(0,0,0,.06)] rounded-xl overflow-hidden transition-all w-[118px] shrink-0"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-full h-[88px] bg-off">
                          {d.imageUrl ? (
                            <Image
                              src={d.imageUrl}
                              alt={d.name}
                              fill
                              sizes="118px"
                              className="object-contain p-2"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">🫒</div>
                          )}
                          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-terra text-white px-1.5 py-0.5 rounded-full leading-tight">
                            -{d.dropPct}&nbsp;%
                          </span>
                        </div>
                        {/* Info */}
                        <div className="p-2">
                          <p className="text-[11px] font-semibold text-text leading-snug line-clamp-2 min-h-[30px]">
                            {d.name}
                          </p>
                          <p className="text-[13px] font-bold text-text mt-1">{d.currentPrice}&nbsp;Kč</p>
                          {d.oldPrice && (
                            <p className="text-[10px] text-text3 line-through">{d.oldPrice}&nbsp;Kč</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Educational block ── */}
        <section className="mb-14 bg-off rounded-2xl p-6 md:p-8">
          <h2 className="text-[18px] font-bold text-text mb-5">Jak poznám skutečnou slevu?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-[28px] mb-2">📊</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">30denní maximum</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Srovnáváme aktuální cenu s maximem za posledních 30 dní.
                Zobrazujeme i menší slevy — důležité je, že jde o reálný pokles ceny.
              </p>
            </div>
            <div>
              <div className="text-[28px] mb-2">🏆</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Řazení dle hodnoty</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Výše slevy × Olivator Score. Nejlepší poměr kvality a
                ceny vždy nahoře — ne jen největší slevový procento.
              </p>
            </div>
            <div>
              <div className="text-[28px] mb-2">🔄</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Denní aktualizace</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Ceny u 18 prodejců scrapujeme každý den ráno. Co vidíte,
                to je dnešní stav — ne zastaralá data z minulého týdne.
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

        {/* ── Newsletter CTA ── */}
        <section className="mb-4">
          <div className="bg-olive4 border border-[#b7e4c7] rounded-2xl p-6 md:p-8">
            <p className="text-[11px] font-bold tracking-widest uppercase text-olive mb-3">
              🫒 Nechte si posílat slevy
            </p>
            <h2 className="text-[22px] font-bold text-text mb-2">
              Slevy každý čtvrtek ráno do emailu
            </h2>
            <p className="text-[14px] text-text2 mb-6 leading-relaxed">
              Přihlaste se a dostanete hned email s aktuálními slevami.
              Pak každý čtvrtek v 8:00 nový přehled — bez spamu.
            </p>
            <NewsletterSignup source="price_alert" variant="inline" />
          </div>
        </section>

        {/* ── Links ── */}
        <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-off2">
          <Link href="/srovnavac" className="text-[13px] text-olive font-medium hover:underline">
            → Celý katalog olejů
          </Link>
          <Link href="/zebricek/nejlepsi" className="text-[13px] text-olive font-medium hover:underline">
            → Žebříček nejlepších olejů
          </Link>
          <Link href="/metodika" className="text-[13px] text-olive font-medium hover:underline">
            → Jak hodnotíme (Olivator Score)
          </Link>
        </div>

      </main>
    </>
  )
}
