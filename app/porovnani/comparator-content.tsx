'use client'

import Link from 'next/link'
import { useCompare } from '@/lib/compare-context'
import { countryFlag, formatPrice, formatPricePer100ml, certLabel } from '@/lib/utils'
import type { Product, ProductOffer } from '@/lib/types'

type ProductWithOffer = Product & { cheapestOffer: ProductOffer | null }

export function ComparatorContent({ allProducts }: { allProducts: ProductWithOffer[] }) {
  const { items, removeItem, addItem } = useCompare()
  const empty = 5 - items.length
  const offerByProductId = new Map(allProducts.map(p => [p.id, p.cheapestOffer]))
  const getCheapestOffer = (pid: string) => offerByProductId.get(pid) ?? null
  const notInCompare = allProducts.filter(p => !items.some(i => i.id === p.id))

  const winner = items.length >= 2
    ? items.reduce((best, p) => p.olivatorScore > best.olivatorScore ? p : best)
    : null

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
      getValue: (p: Product) => p.acidity ?? 999, // null = "worst" for lower-better
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
      label: 'Cena / 100 ml',
      getValue: (p: Product) => {
        const offer = getCheapestOffer(p.id)
        return offer ? Math.round((offer.price / p.volumeMl) * 100) : 9999
      },
      format: (v: number) => v === 9999 ? '—' : `${v} Kč`,
      higherBetter: false,
    },
    {
      label: 'Cena lahve',
      getValue: (p: Product) => getCheapestOffer(p.id)?.price || 9999,
      format: (v: number) => v === 9999 ? '—' : `${v} Kč`,
      higherBetter: false,
    },
    {
      label: 'Certifikace',
      getValue: (p: Product) => p.certifications.length,
      format: (_: number, p: Product) => p.certifications.length > 0 ? p.certifications.map(certLabel).join(' + ') : 'Žádné',
      higherBetter: true,
    },
    {
      label: 'Rok sklizně',
      getValue: (p: Product) => p.harvestYear ?? 0,
      format: (_v: number, p: Product) => p.harvestYear ? String(p.harvestYear) : '—',
      higherBetter: true,
    },
  ]

  return (
    <div className="max-w-[1080px] mx-auto px-10 py-10">
      <div className="text-center mb-9">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
          Olej proti oleji
        </h1>
        <p className="text-[15px] text-text2 font-light">
          Score · kyselost · polyfenoly · cena za 100&nbsp;ml. Bez marketingu, jen fakta.
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
                  <div className="w-full h-full flex items-center justify-center text-3xl">🫒</div>
                )}
                <div className="absolute top-1.5 right-1.5 bg-terra text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                  {item.olivatorScore}
                </div>
              </div>
              <div className="text-[13px] font-medium text-text leading-tight mb-1 line-clamp-2 min-h-[34px]">
                {countryFlag(item.originCountry)} {item.nameShort}
              </div>
              <div className="text-xs text-text3">
                {formatPrice(getCheapestOffer(item.id)?.price || 0)} &middot; {formatPricePer100ml(getCheapestOffer(item.id)?.price || 0, item.volumeMl)}
              </div>
            </Link>
            <button
              onClick={() => removeItem(item.id)}
              className="text-[10px] text-text3 mt-1.5 cursor-pointer hover:text-terra"
            >
              ✕ odebrat
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

      {/* Quick add chips */}
      {notInCompare.length > 0 && (
        <div className="bg-off rounded-xl p-4 mb-6">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-2.5">
            Rychlé přidání
          </div>
          <div className="flex gap-2 flex-wrap">
            {items.map(item => (
              <span key={item.id} className="text-xs px-3.5 py-1.5 rounded-full bg-olive text-white border border-olive">
                {countryFlag(item.originCountry)} {item.nameShort}
                {item.volumeMl > 0 && <span className="opacity-70 ml-1">{item.volumeMl >= 1000 ? `${item.volumeMl / 1000}l` : `${item.volumeMl}ml`}</span>}
              </span>
            ))}
            {notInCompare.slice(0, 4).map(p => (
              <button
                key={p.id}
                onClick={() => addItem(p)}
                className="text-xs px-3.5 py-1.5 rounded-full border border-off2 bg-white text-text2 cursor-pointer transition-all hover:border-olive-light hover:text-olive"
                title={p.name}
              >
                {countryFlag(p.originCountry)} {p.nameShort}
                {p.volumeMl > 0 && <span className="opacity-60 ml-1">{p.volumeMl >= 1000 ? `${p.volumeMl / 1000}l` : `${p.volumeMl}ml`}</span>}
              </button>
            ))}
            <Link
              href="/srovnavac"
              className="text-xs px-3.5 py-1.5 rounded-full border border-off2 bg-white text-text2 hover:border-olive-light hover:text-olive"
            >
              Hledat další →
            </Link>
          </div>
        </div>
      )}

      {/* Winner */}
      {winner && items.length >= 2 && (
        <div className="bg-olive-bg rounded-[var(--radius-card)] px-6 py-5 mb-5 flex items-center gap-4">
          <span className="text-3xl">🏆</span>
          <div>
            <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-0.5">
              Olivator doporučuje
            </div>
            <div className="text-sm font-medium text-text">
              {winner.name} — Score {winner.olivatorScore}
            </div>
            <div className="text-xs text-text2 mt-0.5">
              {(() => {
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
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Comparison table */}
      {items.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-semibold text-text3 tracking-wider uppercase px-3.5 py-2.5 border-b-2 border-off w-40">
                  Parametr
                </th>
                {items.map(item => (
                  <th key={item.id} className="text-center text-[11px] font-semibold text-olive tracking-wider uppercase px-3.5 py-2.5 border-b-2 border-off">
                    <Link href={`/olej/${item.slug}`} className="inline-flex flex-col items-center gap-1.5 hover:opacity-80 transition-opacity">
                      <div className="w-10 h-10 bg-off rounded overflow-hidden border border-off2">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base">🫒</div>
                        )}
                      </div>
                      <span className="text-[10px] leading-tight">
                        {countryFlag(item.originCountry)} {item.nameShort}
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

                      return (
                        <td
                          key={item.id}
                          className={`text-center font-medium px-3.5 py-3 border-b border-off text-[13px] ${
                            isMissing ? 'text-text3 italic' : isBest ? 'text-green-600' : isWorst ? 'text-red-500' : 'text-text'
                          }`}
                        >
                          {formatted}
                          {metric.showBar && !isMissing && (
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                              <div className="w-14 h-[5px] bg-off2 rounded-full overflow-hidden inline-block">
                                <div
                                  className="h-full rounded-full bg-terra"
                                  style={{ width: `${val}%` }}
                                />
                              </div>
                            </div>
                          )}
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

      {/* CTA row */}
      {items.length >= 2 && (
        <div className="grid gap-2.5 mt-4" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
          {items.map((item, i) => {
            const offer = getCheapestOffer(item.id)
            return (
              <div
                key={item.id}
                className={`rounded-xl px-3.5 py-2.5 text-center cursor-pointer transition-all border ${
                  i === 0 ? 'bg-olive border-olive' : 'bg-off border-off2 hover:border-olive-light hover:bg-olive-bg'
                }`}
              >
                <div className={`text-[11px] mb-0.5 ${i === 0 ? 'text-white/70' : 'text-text3'}`}>
                  {offer?.retailer.name}{i === 0 ? ' · Nejlevněji' : ''}
                </div>
                <div className={`text-[15px] font-semibold ${i === 0 ? 'text-white' : 'text-text'}`}>
                  {offer ? formatPrice(offer.price) : '—'} — {item.nameShort}
                </div>
              </div>
            )
          })}
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
