'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCompare } from '@/lib/compare-context'
import { formatPrice, formatPricePer100ml, certLabel, typeLabel, countryName } from '@/lib/utils'
import type { Product, ProductOffer } from '@/lib/types'

const PACKAGING_LABELS: Record<string, string> = {
  dark_glass: 'Tmavé sklo',
  glass: 'Sklo',
  tin: 'Plech',
  pet: 'PET',
  ceramic: 'Keramika',
}

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

interface Props {
  allProducts: ProductWithOffer[]
  serverItems?: ProductWithOffer[]
}

export function ComparatorContent({ allProducts, serverItems = [] }: Props) {
  const { items: clientItems, removeItem, addItem } = useCompare()
  const [hydrated, setHydrated] = useState(false)

  // Hydration pattern: pre-mount render uses serverItems (z URL ?ids=)
  // takže SSR HTML obsahuje skutečnou tabulku pro Google bot. Po mount-u
  // synchronizujeme localStorage na URL state a přepneme na clientItems.
  useEffect(() => {
    if (serverItems.length > 0) {
      const clientIds = new Set(clientItems.map((p) => p.id))
      for (const sp of serverItems) {
        if (!clientIds.has(sp.id)) addItem(sp)
      }
    }
    setHydrated(true)
    // Run once on mount — clientItems intentionally not in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-hydration: použij URL serverItems (nutné pro SSR + match s prvním
  // klient renderem aby nedošlo k hydration mismatch). Po mount-u: clientItems.
  const items = hydrated ? clientItems : serverItems

  const empty = 5 - items.length
  const offerByProductId = new Map(allProducts.map(p => [p.id, p.cheapestOffer]))
  const getCheapestOffer = (pid: string) => offerByProductId.get(pid) ?? null
  const notInCompare = allProducts.filter(p => !items.some(i => i.id === p.id))

  const winner = items.length >= 2
    ? items.reduce((best, p) => p.olivatorScore > best.olivatorScore ? p : best)
    : null

  // Smart suggestions: pro každý kandidát spočítáme podobnost vůči všem
  // už vybraným olejům (origin, region, score, certifikace, typ). Pokud je
  // compare prázdný, fallback na top-Score produkty.
  const suggestions = (() => {
    if (notInCompare.length === 0) return []
    if (items.length === 0) {
      return [...notInCompare].sort((a, b) => b.olivatorScore - a.olivatorScore).slice(0, 4)
    }
    const scored = notInCompare.map((p) => {
      const similarity = items.reduce((sum, item) => {
        let s = 0
        if (p.originCountry && p.originCountry === item.originCountry) s += 0.3
        if (p.originRegion && p.originRegion === item.originRegion) s += 0.2
        const scoreDiff = Math.abs(p.olivatorScore - item.olivatorScore)
        s += Math.max(0, (20 - scoreDiff) / 20) * 0.2
        const sharedCerts = p.certifications.filter((c) => item.certifications.includes(c)).length
        s += Math.min(sharedCerts * 0.1, 0.2)
        if (p.type === item.type) s += 0.1
        return sum + s
      }, 0) / items.length
      return { product: p, similarity }
    })
    // Min threshold — pokud kandidát nemá nic společného (similarity < 0.15), nezahrnovat
    return scored
      .filter((x) => x.similarity >= 0.15)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 4)
      .map((x) => x.product)
  })()

  // Null-safe metric: getValue always returns a number (0 = "missing" sentinel),
  // format checks the original Product for true nullability.
  const metrics = [
    {
      label: 'Olivator Score',
      getValue: (p: Product) => p.olivatorScore,
      format: (v: number) => String(v),
      higherBetter: true,
      showBar: true,
    },
    {
      label: 'Kyselost',
      getValue: (p: Product) => p.acidity ?? 999,
      format: (_v: number, p: Product) => p.acidity != null ? `${p.acidity} %` : '—',
      higherBetter: false,
    },
    {
      label: 'Polyfenoly',
      getValue: (p: Product) => p.polyphenols ?? 0,
      format: (_v: number, p: Product) => p.polyphenols != null ? `${p.polyphenols} mg/kg` : '—',
      higherBetter: true,
    },
    {
      label: 'Certifikace',
      getValue: (p: Product) => p.certifications.length,
      format: (_: number, p: Product) => p.certifications.length > 0 ? p.certifications.map(certLabel).join(' + ') : 'Žádné',
      higherBetter: true,
    },
    {
      label: 'Typ',
      getValue: () => 0,
      format: (_v: number, p: Product) => p.type ? typeLabel(p.type) : '—',
      higherBetter: true,
    },
    {
      label: 'Původ',
      getValue: () => 0,
      format: (_v: number, p: Product) => {
        if (!p.originCountry) return '—'
        const country = countryName(p.originCountry)
        return p.originRegion ? `${p.originRegion}, ${country}` : country
      },
      higherBetter: true,
    },
    {
      label: 'Peroxidové číslo',
      getValue: (p: Product) => p.peroxideValue ?? 999,
      format: (_v: number, p: Product) => p.peroxideValue != null ? `${p.peroxideValue} mEq/kg` : '—',
      higherBetter: false,
    },
    {
      label: 'Obal',
      getValue: () => 0,
      format: (_v: number, p: Product) => p.packaging ? (PACKAGING_LABELS[p.packaging] ?? p.packaging) : '—',
      higherBetter: true,
    },
    {
      label: 'Rok sklizně',
      getValue: (p: Product) => p.harvestYear ?? 0,
      format: (_v: number, p: Product) => p.harvestYear ? String(p.harvestYear) : '—',
      higherBetter: true,
    },
    // Ceny + nákup CTA — záměrně NA KONCI tabulky, po všech datech.
    // Cena/100 ml = férové srovnání napříč objemy. Cena lahve = co skutečně
    // zaplatíš → je to zároveň affiliate odkaz (decentní CTA).
    {
      label: 'Cena / 100 ml',
      getValue: (p: Product) => {
        const offer = getCheapestOffer(p.id)
        return offer ? Math.round((offer.price / p.volumeMl) * 100) : 9999
      },
      format: (v: number) => v === 9999 ? '—' : `${v} Kč`,
      higherBetter: false,
    },
    {
      label: 'Cena & nákup',
      getValue: (p: Product) => getCheapestOffer(p.id)?.price || 9999,
      format: (v: number) => v === 9999 ? '—' : `${v} Kč`,
      higherBetter: false,
      isCta: true,
    },
  ]

  return (
    <div className="max-w-[1080px] mx-auto px-4 md:px-10 py-6 md:py-10">
      <div className="text-center mb-9">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
          Pomůžeme ti vybrat olej
        </h1>
        <p className="text-[15px] text-text2 font-light">
          Postav 2 až 5 olejů vedle sebe — uvidíš rozdíly v Score, kyselosti, polyfenolech i ceně.
        </p>
      </div>

      {/* Slots — s náhledovou fotkou produktu */}
      <div className="flex gap-3 mb-9 overflow-x-auto pb-1">
        {items.map(item => (
          <div
            key={item.id}
            className="flex-1 min-w-[160px] rounded-[var(--radius-card)] border-[1.5px] border-off2 p-4 text-center bg-white hover:border-olive-light transition-all"
          >
            <Link href={`/olej/${item.slug}`} className="block">
              <div className="relative w-full aspect-square bg-off rounded-lg mb-2 overflow-hidden">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain p-1"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-[family-name:var(--font-display)] text-3xl italic text-text3/40">{item.name.charAt(0)}</div>
                )}
                {item.originCountry && (
                  <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] leading-none shadow-sm uppercase tracking-widest font-bold text-text2" title={countryName(item.originCountry)}>
                    {item.originCountry}
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 bg-terra text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                  {item.olivatorScore}
                </div>
              </div>
              <div className="text-base font-semibold text-text leading-tight mb-1.5 line-clamp-2 min-h-[40px]">
                {item.nameShort}
              </div>
              <div className="text-[13px] text-text font-medium">
                {formatPrice(getCheapestOffer(item.id)?.price || 0)}
              </div>
              <div className="text-[11px] text-text3">
                {formatPricePer100ml(getCheapestOffer(item.id)?.price || 0, item.volumeMl)}
              </div>
            </Link>
            <button
              onClick={() => removeItem(item.id)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-terra border border-terra/40 rounded-full px-3 py-1 cursor-pointer transition-colors hover:bg-terra hover:text-white hover:border-terra"
            >
              <span aria-hidden="true">✕</span>
              <span>Odebrat</span>
            </button>
          </div>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <Link
            key={`empty-${i}`}
            href="/srovnavac"
            className={`flex-1 min-w-[160px] rounded-[var(--radius-card)] border-[1.5px] border-dashed border-off2 p-5 text-center bg-white cursor-pointer hover:border-olive-light hover:bg-olive-bg transition-all flex flex-col items-center justify-center ${
              i > 1 ? 'opacity-40' : ''
            }`}
          >
            <div className="text-[28px] text-off2 mb-1.5">+</div>
            <div className="text-xs text-text3">Přidat olej</div>
          </Link>
        ))}
      </div>

      {/* Smart suggestions — podobné oleje na základě toho, co už máš v porovnání */}
      {suggestions.length > 0 && items.length < 5 && (
        <div className="bg-olive-bg/40 border border-olive-border/30 rounded-xl p-4 mb-6">
          <div className="text-[11px] font-semibold tracking-widest uppercase text-olive-dark mb-3">
            — {items.length === 0 ? 'Doporučujeme začít s těmito' : 'Mohlo by sednout do porovnání'}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {suggestions.map((p) => {
              const offer = getCheapestOffer(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="group flex items-center gap-2.5 p-2 rounded-lg bg-white border border-off2 hover:border-olive-light hover:shadow-sm transition-all text-left"
                  title={`Přidat: ${p.name}`}
                >
                  <div className="relative w-10 h-10 shrink-0 bg-off rounded overflow-hidden border border-off2">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-[family-name:var(--font-display)] text-base italic text-text3/40">{p.name.charAt(0)}</div>
                    )}
                    {p.originCountry && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded text-[8px] leading-none px-1 py-0.5 shadow-sm border border-off2 uppercase tracking-widest font-bold text-text2">
                        {p.originCountry}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-text font-medium truncate">
                      {p.nameShort}
                      {p.volumeMl > 0 && <span className="text-text3 ml-1">{p.volumeMl >= 1000 ? `${p.volumeMl / 1000}l` : `${p.volumeMl}ml`}</span>}
                    </div>
                    <div className="text-[10px] text-text3 mt-0.5 flex items-center gap-1.5">
                      <span className="text-terra font-semibold">Score {p.olivatorScore}</span>
                      {offer && <span>· {offer.price} Kč</span>}
                    </div>
                  </div>
                  <span className="text-olive opacity-0 group-hover:opacity-100 transition-opacity text-sm shrink-0">+</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 text-[11px] text-text3 text-right">
            <Link href="/srovnavac" className="text-olive hover:text-olive-dark">
              Najít další oleje →
            </Link>
          </div>
        </div>
      )}

      {/* Winner — klíčový conversion moment: photo + reason + buy CTA */}
      {winner && items.length >= 2 && (() => {
        const winnerOffer = getCheapestOffer(winner.id)
        const reasons = (() => {
          const parts: string[] = []
          if (winner.acidity != null) {
            parts.push(`${winner.acidity <= 0.25 ? 'Nejlepší kyselost' : 'Nízká kyselost'} (${winner.acidity} %)`)
          }
          if (winner.polyphenols != null) {
            parts.push(`${winner.polyphenols} mg/kg polyfenolů`)
          }
          if (winner.certifications.length > 0) {
            parts.push(`certifikace ${winner.certifications.map(certLabel).join(' + ')}`)
          }
          return parts.length > 0 ? parts.join(', ') + '.' : `Celkové skóre ${winner.olivatorScore}/100.`
        })()

        return (
          <div className="bg-olive-bg rounded-[var(--radius-card)] p-4 md:p-5 mb-5 flex items-center gap-4 flex-wrap md:flex-nowrap">
            <Link href={`/olej/${winner.slug}`} className="relative w-20 h-20 shrink-0 bg-white rounded-lg border border-olive-border/40 overflow-hidden hover:shadow-md transition-shadow">
              {winner.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={winner.imageUrl} alt={winner.name} className="w-full h-full object-contain p-1" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-[family-name:var(--font-display)] text-3xl italic text-text3/40">{winner.name.charAt(0)}</div>
              )}
              {winner.originCountry && (
                <div className="absolute bottom-1 right-1 bg-white rounded shadow-sm px-1 py-0.5 text-[9px] uppercase tracking-widest font-bold text-text2">
                  {winner.originCountry}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-0.5">
                Olivator doporučuje
              </div>
              <Link href={`/olej/${winner.slug}`} className="text-sm font-medium text-text leading-tight block hover:text-olive-dark transition-colors">
                {winner.name} <span className="text-text3 font-normal">— Score {winner.olivatorScore}</span>
              </Link>
              <div className="text-xs text-text2 mt-1">{reasons}</div>
            </div>
            {winnerOffer && (
              <a
                href={`/go/${winnerOffer.retailer.slug}/${winner.slug}`}
                target="_blank"
                rel="noopener sponsored"
                className="bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-olive-dark transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                title={`Koupit u ${winnerOffer.retailer.name}`}
              >
                Koupit za {formatPrice(winnerOffer.price)}
                <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        )
      })()}

      {/* Schema.org ItemList — Google rich result */}
      {items.length >= 2 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: items.map((p) => p.nameShort).join(' vs '),
              description: `Porovnání ${items.length} olivových olejů`,
              numberOfItems: items.length,
              itemListElement: items.map((item, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'Product',
                  name: item.name,
                  image: item.imageUrl ?? undefined,
                  brand: { '@type': 'Brand', name: item.nameShort },
                  ...(item.ean ? { gtin13: item.ean } : {}),
                  url: `https://olivator.cz/olej/${item.slug}`,
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: item.olivatorScore,
                    bestRating: 100,
                    worstRating: 0,
                    ratingCount: 1,
                  },
                  offers: getCheapestOffer(item.id)
                    ? {
                        '@type': 'Offer',
                        price: getCheapestOffer(item.id)!.price,
                        priceCurrency: getCheapestOffer(item.id)!.currency ?? 'CZK',
                        availability: 'https://schema.org/InStock',
                      }
                    : undefined,
                },
              })),
            }),
          }}
        />
      )}

      {/* MOBILE — stacked cards (each product = vertical block, all metrics inside) */}
      {items.length >= 2 && (
        <div className="md:hidden space-y-4">
          {items.map((item) => {
            const offer = getCheapestOffer(item.id)
            return (
              <div key={item.id} className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
                <Link href={`/olej/${item.slug}`} className="flex items-center gap-3 p-4 border-b border-off bg-off/30 hover:bg-off/60 transition-colors">
                  <div className="relative w-14 h-14 shrink-0 bg-white rounded overflow-hidden border border-off2">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-[family-name:var(--font-display)] text-xl italic text-text3/40">{item.name.charAt(0)}</div>
                    )}
                    {item.originCountry && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded text-[8px] leading-none px-1 py-0.5 shadow-sm border border-off2 uppercase tracking-widest font-bold text-text2">
                        {item.originCountry}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text leading-tight">{item.name}</div>
                    {offer && (
                      <div className="text-xs text-text3 mt-0.5">
                        {formatPrice(offer.price)} · {formatPricePer100ml(offer.price, item.volumeMl)}
                      </div>
                    )}
                  </div>
                  <div className="bg-terra text-white text-sm font-bold px-2.5 py-1 rounded-full">{item.olivatorScore}</div>
                </Link>
                <div className="divide-y divide-off">
                  {metrics.map((metric) => {
                    const values = items.map((p) => metric.getValue(p))
                    const best = metric.higherBetter ? Math.max(...values) : Math.min(...values)
                    const worst = metric.higherBetter ? Math.min(...values) : Math.max(...values)
                    const formattedAll = items.map((it, idx) =>
                      metric.format.length > 1
                        ? (metric.format as (v: number, p: Product) => string)(values[idx], it)
                        : (metric.format as (v: number) => string)(values[idx])
                    )
                    if (formattedAll.every((s) => s === '—' || s === 'Žádné')) return null
                    const itemIdx = items.findIndex((i) => i.id === item.id)
                    const val = values[itemIdx]
                    const formatted = formattedAll[itemIdx]
                    const isMissing = formatted === '—' || formatted === 'Žádné'
                    const hasVariation = best !== worst
                    const isBest = hasVariation && val === best && !isMissing
                    const isWorst = hasVariation && val === worst && !isMissing
                    const isCta = 'isCta' in metric && metric.isCta && !isMissing && offer
                    const ctaHref = isCta ? `/go/${offer.retailer.slug}/${item.slug}` : null

                    if (isCta && ctaHref) {
                      return (
                        <a
                          key={metric.label}
                          href={ctaHref}
                          target="_blank"
                          rel="noopener sponsored"
                          className="flex items-center justify-between px-4 py-3 bg-olive-bg/40 hover:bg-olive-bg transition-colors"
                        >
                          <span className="text-[12px] text-olive-dark font-medium">
                            Koupit u {offer.retailer.name}
                          </span>
                          <span className={`text-[14px] font-semibold tabular-nums flex items-center gap-1.5 ${isBest ? 'text-green-600' : 'text-text'}`}>
                            {formatted}
                            <span className="text-olive">→</span>
                          </span>
                        </a>
                      )
                    }

                    return (
                      <div key={metric.label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[12px] text-text3">{metric.label}</span>
                        <span
                          className={`text-[13px] font-medium tabular-nums ${
                            isMissing ? 'text-text3 italic' : isBest ? 'text-green-600' : isWorst ? 'text-red-500' : 'text-text'
                          }`}
                        >
                          {formatted}
                          {isBest && <span className="text-[10px] ml-1.5 text-green-600/70">nejlepší</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* DESKTOP — comparison table */}
      {items.length >= 2 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-semibold text-text3 tracking-wider uppercase px-3.5 py-2.5 border-b-2 border-off w-40">
                  Parametr
                </th>
                {items.map(item => (
                  <th key={item.id} className="text-center text-[11px] font-semibold text-olive tracking-wider uppercase px-3.5 pb-3 pt-2 border-b-2 border-off">
                    <Link href={`/olej/${item.slug}`} className="inline-flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
                      <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden border border-off2">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1.5" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-[family-name:var(--font-display)] text-2xl italic text-text3/40">{item.name.charAt(0)}</div>
                        )}
                        {item.originCountry && (
                          <div className="absolute bottom-1 right-1 bg-white rounded text-[9px] leading-none px-1 py-0.5 shadow-sm border border-off2 uppercase tracking-widest font-bold text-text2">
                            {item.originCountry}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] leading-tight">
                        {item.nameShort}
                      </span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => {
                const values = items.map(p => metric.getValue(p))
                const best = metric.higherBetter ? Math.max(...values) : Math.min(...values)
                const worst = metric.higherBetter ? Math.min(...values) : Math.max(...values)

                // Skip rows where all values are the "missing" sentinel — žádný produkt nemá data,
                // tabulka by ukazovala jen "—" napříč. Šum, neukazuj.
                const formattedAll = items.map((it, i) =>
                  metric.format.length > 1
                    ? (metric.format as (v: number, p: Product) => string)(values[i], it)
                    : (metric.format as (v: number) => string)(values[i])
                )
                const allMissing = formattedAll.every(s => s === '—' || s === 'Žádné')
                if (allMissing) return null

                // Color coding má smysl jen když existuje skutečný rozdíl mezi produkty
                const hasVariation = best !== worst

                return (
                  <tr key={metric.label} className="hover:bg-off">
                    <td className="text-[13px] text-text2 px-3.5 py-3 border-b border-off">
                      {metric.label}
                    </td>
                    {items.map((item, i) => {
                      const val = values[i]
                      const formatted = formattedAll[i]
                      const isMissing = formatted === '—' || formatted === 'Žádné'
                      const isBest = hasVariation && val === best && !isMissing
                      const isWorst = hasVariation && val === worst && !isMissing
                      const offer = getCheapestOffer(item.id)
                      // Decentní CTA buňka — kliknutím na cenu jde uživatel
                      // přes /go/[retailer]/[product] affiliate redirect na e-shop
                      const isCta = 'isCta' in metric && metric.isCta && !isMissing && offer
                      const ctaHref = isCta ? `/go/${offer.retailer.slug}/${item.slug}` : null

                      const cellClasses = `text-center font-medium px-3.5 py-3 border-b border-off text-[13px] ${
                        isMissing ? 'text-text3 italic' : isBest ? 'text-green-600' : isWorst ? 'text-red-500' : 'text-text'
                      }`

                      const inner = (
                        <>
                          {formatted}
                          {metric.showBar && !isMissing && (
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                              <div className="w-14 h-[5px] bg-off2 rounded-full overflow-hidden inline-block">
                                <div className="h-full rounded-full bg-terra" style={{ width: `${val}%` }} />
                              </div>
                            </div>
                          )}
                        </>
                      )

                      if (isCta && ctaHref) {
                        return (
                          <td key={item.id} className="text-center px-2 py-3 border-b border-off">
                            <a
                              href={ctaHref}
                              target="_blank"
                              rel="noopener sponsored"
                              className={`group inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-all ${
                                isBest
                                  ? 'bg-olive text-white hover:bg-olive-dark shadow-sm'
                                  : 'bg-white border border-olive text-olive-dark hover:bg-olive hover:text-white hover:border-olive-dark'
                              }`}
                              title={`Koupit u ${offer.retailer.name}`}
                            >
                              <span>{formatted}</span>
                              <span aria-hidden="true" className="opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
                            </a>
                            <div className="text-[10px] text-text3 mt-1 leading-none">
                              u {offer.retailer.name}
                            </div>
                          </td>
                        )
                      }

                      return (
                        <td key={item.id} className={cellClasses}>
                          {inner}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {items.length < 2 && (
        <div className="text-center py-20">
          <div className="text-[15px] text-text2 mb-1">Začni dvěma oleji.</div>
          <div className="text-xs text-text3 mb-5">Tabulka se postaví sama, čísla rozhodnou za tebe.</div>
          <Link href="/srovnavac" className="inline-flex items-center gap-2 bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-medium hover:bg-olive-dark transition-colors">
            Vybrat oleje →
          </Link>
        </div>
      )}
    </div>
  )
}
