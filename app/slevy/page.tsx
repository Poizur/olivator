import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { LeadMagnetCta } from '@/components/lead-magnet-cta'
import { PriceWatchButton } from '@/components/price-watch-button'
import { getSlevyDeals, getActionPriceNotices, type SlevyDeal, type ActionPriceNotice } from '@/lib/welcome-series'
import { AffiliateLink } from '@/components/affiliate-link'
import { getWeeklyPriceDrops, type WeeklyPriceDrop } from '@/lib/price-drops'
import { countryFlag } from '@/lib/utils'
import { formatDealDate, DEAL_RULE_TEXT } from '@/lib/price'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Olivový olej — akce a slevy dnes | Olivátor',
  description:
    'Přehled skutečných slev na olivový olej od partnerských e-shopů. Slevu ukazujeme, jen když je cena aspoň o 5 % nižší než nejnižší cena za 30 dní před zlevněním a zlevnění není starší než 90 dní.',
  alternates: { canonical: 'https://olivator.cz/slevy' },
  openGraph: {
    title: 'Olivový olej — akce a slevy dnes | Olivátor',
    description: 'Denně aktualizovaný přehled skutečných slev od partnerských e-shopů.',
    url: 'https://olivator.cz/slevy',
  },
}

const SITE = 'https://olivator.cz'
const UTM = 'utm_source=web&utm_medium=slevy&utm_campaign=deals_page'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

const FAQ_ITEMS = [
  {
    q: 'Jak Olivátor ověřuje, že jde o skutečnou slevu?',
    a: `Ceny u partnerských e-shopů zaznamenáváme každý den. ${DEAL_RULE_TEXT} Akční ceny, které obchod uvádí, ale toto pravidlo nesplňují, ukazujeme zvlášť bez přeškrtnuté ceny a bez procent. Menší nebo starší poklesy ceny (aspoň 2 % za posledních 7 dní) uvádíme jen jako informaci „cena klesla z … na …“.`,
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
    a: 'Od nejnovějšího zlevnění. U každé slevy je datum, kdy obchod cenu snížil, a nejnižší cena za 30 dní před tím.',
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

function WeeklyDropCard({ drop }: { drop: WeeklyPriceDrop }) {
  const per100ml = formatPer100ml(drop.priceNow, drop.volumeMl)

  return (
    <div className="bg-white border border-olive-border rounded-[var(--radius-card)] overflow-hidden hover:border-olive-light hover:shadow-[0_4px_16px_rgba(0,0,0,.06)] transition-all">
      <Link href={`/olej/${drop.slug}`} className="flex gap-4 p-4 group">
        <div className="shrink-0 w-16 h-16 rounded-lg bg-off overflow-hidden flex items-center justify-center relative">
          {drop.imageUrl ? (
            <Image src={drop.imageUrl} alt={drop.name} fill sizes="64px" className="object-contain" />
          ) : (
            <span className="text-2xl">🫒</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-text leading-snug line-clamp-2 group-hover:text-olive transition-colors">
            {drop.originCountry ? `${countryFlag(drop.originCountry)} ` : ''}{drop.name}
          </p>
          {drop.volumeMl && (
            <p className="text-[10px] text-text3 mt-0.5">{drop.volumeMl} ml</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {drop.dealPct != null && (
              <span className="text-[10px] font-bold bg-terra text-white px-2 py-0.5 rounded-full">
                Sleva -{drop.dealPct}&nbsp;%
              </span>
            )}
            {drop.olivatorScore != null && (
              <span className="text-[10px] bg-olive4 text-[#1b4332] px-2 py-0.5 rounded-full">
                Score {drop.olivatorScore}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-[16px] font-bold text-text">{drop.priceNow} Kč</span>
            {per100ml && <span className="text-[11px] text-text3">{per100ml}</span>}
          </div>
          <p className="text-[11px] text-text2 mt-1 leading-snug">
            Cena klesla z {drop.priceBefore} Kč na {drop.priceNow} Kč ({formatDealDate(drop.changedOn)}).
          </p>
        </div>
      </Link>
      <div className="px-4 pb-4 flex items-center gap-3">
        <AffiliateLink
          data={{ productSlug: drop.slug, productName: drop.name, retailerSlug: drop.retailerSlug, retailerName: drop.retailerName, price: drop.priceNow, source: 'slevy' }}
          extraParams={`${UTM}&utm_content=weekly_drop`}
          className="flex-1 flex items-center justify-between bg-olive hover:bg-olive2 text-white text-[12px] font-semibold px-4 py-2.5 rounded-full transition-colors"
        >
          <span>Koupit u {drop.retailerName}</span>
          <span>→</span>
        </AffiliateLink>
        <PriceWatchButton productId={drop.productId} productName={drop.name} />
      </div>
    </div>
  )
}

function DealCard({ deal, rank }: { deal: SlevyDeal; rank: number }) {
  const per100ml = formatPer100ml(deal.currentPrice, deal.volumeMl)

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden hover:border-olive-light hover:shadow-[0_4px_16px_rgba(0,0,0,.06)] transition-all">
      <Link href={`/olej/${deal.slug}`} className="flex gap-4 p-4 group">
        {/* Image */}
        <div className="shrink-0 w-20 h-20 rounded-lg bg-white overflow-hidden flex items-center justify-center relative">
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
          <p className="text-[11px] text-text2 mt-1">
            <strong className="font-semibold">zlevněno {formatDealDate(deal.since)}</strong> · nejnižší cena za 30 dní před tím {deal.oldPrice} Kč
          </p>
        </div>
      </Link>

      {/* CTA row */}
      <div className="px-4 pb-4 flex items-center gap-3">
        <AffiliateLink
          data={{ productSlug: deal.slug, productName: deal.name, retailerSlug: deal.retailerSlug, retailerName: deal.retailerName, price: deal.currentPrice, source: 'slevy' }}
          extraParams={`${UTM}&utm_content=deal_${rank}`}
          className="flex-1 flex items-center justify-between bg-olive hover:bg-olive2 text-white text-[12px] font-semibold px-4 py-2.5 rounded-full transition-colors"
        >
          <span>Koupit u {deal.retailerName}</span>
          <span>→</span>
        </AffiliateLink>
        <PriceWatchButton productId={deal.productId} productName={deal.name} />
      </div>
    </div>
  )
}

function NoticeCard({ notice }: { notice: ActionPriceNotice }) {
  const per100ml = formatPer100ml(notice.currentPrice, notice.volumeMl)
  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
      <Link href={`/olej/${notice.slug}`} className="flex gap-4 p-4 group">
        <div className="shrink-0 w-16 h-16 rounded-lg bg-off overflow-hidden flex items-center justify-center relative">
          {notice.imageUrl ? (
            <Image src={notice.imageUrl} alt={notice.name} fill sizes="64px" className="object-contain" />
          ) : (
            <span className="text-2xl">🫒</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {notice.brandName && (
            <p className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-0.5">{notice.brandName}</p>
          )}
          <p className="text-[13px] font-semibold text-text leading-snug line-clamp-2 group-hover:text-olive transition-colors">{notice.name}</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-[16px] font-bold text-text">{notice.currentPrice} Kč</span>
            {per100ml && <span className="text-[11px] text-text3">{per100ml}</span>}
            {notice.score != null && (
              <span className="text-[10px] bg-olive4 text-[#1b4332] px-2 py-0.5 rounded-full">Score {notice.score}</span>
            )}
          </div>
          <p className="text-[11px] text-text2 mt-1.5 leading-snug">
            Obchod uvádí běžnou cenu {notice.listPrice} Kč. Za tuhle cenu ho evidujeme od {formatDate(notice.since)}.
          </p>
        </div>
      </Link>
      <div className="px-4 pb-4 flex items-center gap-3">
        <AffiliateLink
          data={{ productSlug: notice.slug, productName: notice.name, retailerSlug: notice.retailerSlug, retailerName: notice.retailerName, price: notice.currentPrice, source: 'slevy' }}
          extraParams={`${UTM}&utm_content=action_price`}
          className="flex-1 flex items-center justify-between bg-off hover:bg-off2 text-text text-[12px] font-semibold px-4 py-2.5 rounded-full transition-colors"
        >
          <span>Zobrazit u {notice.retailerName}</span>
          <span>→</span>
        </AffiliateLink>
        <PriceWatchButton productId={notice.productId} productName={notice.name} />
      </div>
    </div>
  )
}

export default async function SlevyPage() {
  const [{ deals, stats }, weeklyResult, notices] = await Promise.all([
    getSlevyDeals(20),
    getWeeklyPriceDrops(6),
    getActionPriceNotices(),
  ])
  const weeklyDrops = weeklyResult.drops

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
        description: `${deals.length} ověřených slev na olivový olej od partnerských e-shopů.`,
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
            Olivový olej — akce a slevy dnes
          </h1>
          <p className="text-[16px] text-text2 leading-relaxed max-w-xl mb-8">
            {DEAL_RULE_TEXT} Žádné nafouklé „původní" ceny.
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
              <span className="text-[12px] text-text2">Ověřeno historií cen · zlevnění max. 90 dní</span>
            </div>
          </div>
        </section>

        {/* ── Newsletter strip — nad kartami ── */}
        <div className="mb-8">
          <LeadMagnetCta variant="strip" source="newsletter_slevy" />
        </div>

        {/* ── Nové poklesy tento týden (jen když existují) ── */}
        {weeklyDrops.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[18px] font-bold text-text">🆕 Nové poklesy tento týden</h2>
              <span className="text-[11px] bg-[#e8f5e9] text-[#2d6a4f] px-2.5 py-1 rounded-full font-medium">
                {weeklyDrops.length} {weeklyDrops.length === 1 ? 'produkt' : weeklyDrops.length <= 4 ? 'produkty' : 'produktů'}
              </span>
            </div>
            <p className="text-[13px] text-text3 mb-5">
              Každý pokles ceny aspoň o 2 % za posledních 7 dní podle naší denní historie cen. Slevou ho nazýváme,
              jen když je cena zároveň aspoň o 5 % nižší než nejnižší cena za 30 dní před zlevněním.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyDrops.map(drop => (
                <WeeklyDropCard key={`${drop.productId}|${drop.retailerSlug}`} drop={drop} />
              ))}
            </div>
            <div className="border-b border-off2 mt-10" />
          </section>
        )}

        {/* ── Top deals grid ── */}
        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-text mb-5">
            {deals.length > 0 ? 'Ověřené slevy — od nejnovější' : 'Teď žádná ověřená sleva'}
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
                Teď žádnou slevu nemáme potvrzenou historií cen.<br />
                Akční ceny, které uvádějí obchody, najdete níže; zkuste to znovu za pár dní.
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
                          <p className="text-[10px] text-text3 mt-0.5">zlevněno {formatDealDate(d.since)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Akční ceny podle obchodu (nepotvrzené historií) ── */}
        {notices.length > 0 && (
          <section className="mb-14">
            <h2 className="text-[20px] font-bold text-text mb-2">Akční ceny podle obchodu</h2>
            <p className="text-[13px] text-text3 mb-5 max-w-2xl">
              Obchod tyto ceny označuje jako akční, ale pravidlo slevy nesplňují — za stejnou cenu jsme olej
              evidovali už dřív, nebo cena platí déle než 90 dní a je to už běžná cena. Proto bez přeškrtnuté ceny a bez procent.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map((n) => (
                <NoticeCard key={`${n.productId}|${n.retailerSlug}`} notice={n} />
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
              <h3 className="text-[14px] font-semibold text-text mb-1">Nejnižší cena za 30 dní</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Referenční cena je nejnižší cena, za kterou obchod olej prodával během 30 dní
                před zlevněním. Sleva musí být aspoň 5 % a zlevnění nesmí být starší než 90 dní.
              </p>
            </div>
            <div>
              <div className="text-[28px] mb-2">📅</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Od nejnovější</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Slevy řadíme od nejnovějšího zlevnění a u každé je datum, kdy obchod
                cenu snížil.
              </p>
            </div>
            <div>
              <div className="text-[28px] mb-2">🔄</div>
              <h3 className="text-[14px] font-semibold text-text mb-1">Denní aktualizace</h3>
              <p className="text-[13px] text-text2 leading-relaxed">
                Ceny u partnerských e-shopů načítáme každý den ráno z jejich feedů. Co vidíte,
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
              Přihlaste se a dostanete hned email s aktuálními slevami nebo tipy z katalogu.
              Pak každý čtvrtek ráno nový přehled — bez spamu.
            </p>
            <NewsletterSignup source="price_alert" variant="inline" />
          </div>
        </section>

        {/* ── Links ── */}
        <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-off2">
          <Link href="/srovnavac" className="text-[13px] text-olive font-medium hover:underline">
            → Celý katalog olejů
          </Link>
          <Link href="/zebricek" className="text-[13px] text-olive font-medium hover:underline">
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
