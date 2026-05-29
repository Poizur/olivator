// Produktová karta pro vložení do těla článku přes {{product:slug}} token.
// Server component — žádný 'use client'. Data přicházejí z resolveProductTokens.

import Link from 'next/link'
import type { ArticleProductData } from '@/lib/template-vars'
import { countryFlag, countryName, formatPrice } from '@/lib/utils'

interface Props {
  data: ArticleProductData
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 87 ? '#2d6a4f' : score >= 75 ? '#d97706' : '#3b82f6'
  return (
    <span
      className="inline-flex items-center justify-center w-12 h-12 rounded-full text-white text-[13px] font-bold shrink-0"
      style={{ background: color }}
    >
      {score}
    </span>
  )
}

export function ArticleProductCard({ data }: Props) {
  const productLink = `/olej/${data.slug}`
  const buyLink = data.retailerSlug ? `/go/${data.retailerSlug}/${data.slug}` : productLink

  return (
    <div className="my-6 border border-off2 rounded-[var(--radius-card)] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link href={productLink} className="flex gap-4 p-4 group" prefetch={false}>
        {/* Obrázek */}
        <div className="w-[96px] h-[120px] shrink-0 bg-off rounded overflow-hidden">
          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt={data.nameShort ?? data.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🫙</div>
          )}
        </div>

        {/* Data */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Původ */}
              {data.originCountry && (
                <div className="text-[11px] text-text3 mb-1 font-medium tracking-wide">
                  {countryFlag(data.originCountry)} {countryName(data.originCountry)}
                  {data.volumeMl ? ` · ${data.volumeMl} ml` : ''}
                </div>
              )}

              {/* Název */}
              <div className="text-[15px] font-semibold text-text leading-snug mb-2 group-hover:text-olive line-clamp-2">
                {data.nameShort ?? data.name}
              </div>

              {/* Parametry */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {data.acidity != null && (
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-olive-bg text-olive-dark font-medium">
                    Kyselost {String(data.acidity).replace('.', ',')} %
                  </span>
                )}
                {data.polyphenols != null && data.polyphenols > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-olive-bg text-olive-dark font-medium">
                    Polyfenoly {data.polyphenols} mg/kg
                  </span>
                )}
              </div>
            </div>

            {/* Score kruh */}
            {data.olivatorScore != null && data.olivatorScore > 0 && (
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <ScoreRing score={data.olivatorScore} />
                <span className="text-[9px] text-text3 uppercase tracking-widest">Score</span>
              </div>
            )}
          </div>

          {/* Cena */}
          {data.cheapestPrice != null && (
            <div className="text-[18px] font-bold text-text leading-none mb-0.5">
              {formatPrice(data.cheapestPrice)}
            </div>
          )}
          {data.cheapestPrice != null && data.volumeMl && (
            <div className="text-[11px] text-text3">
              {Math.round((data.cheapestPrice / data.volumeMl) * 100)} Kč / 100 ml
            </div>
          )}
        </div>
      </Link>

      {/* CTA tlačítko */}
      <div className="px-4 pb-4">
        <Link
          href={buyLink}
          className="block w-full text-center text-[13px] font-semibold text-white bg-olive hover:bg-olive-dark py-2.5 rounded-lg transition-colors"
          prefetch={false}
        >
          Koupit nejlevněji →
        </Link>
        <Link
          href={productLink}
          className="block w-full text-center text-[12px] text-olive mt-1.5 hover:text-olive-dark"
          prefetch={false}
        >
          Olivator Score + recenze →
        </Link>
      </div>
    </div>
  )
}
