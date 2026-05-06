// "O eshopu" sekce na produktové stránce — krátká prezentace prodejce.
// User: "pojďme se zmínit i o eshopu v hezkém. O eshopu na který zákazník
// produkt najde. Aby eshopy radost měli ze prezentujeme hezky."
//
// Příklad: reckonasbavi.cz založili Zdeněk a Marcelka, vášniví cestovatelé z Řecka.

import Link from 'next/link'
import Image from 'next/image'
import type { Retailer } from '@/lib/types'

export interface RetailerPhotoLite {
  url: string
  alt_text: string | null
}

interface Props {
  retailer: Retailer
  productSlug: string
  price: number
  photos?: RetailerPhotoLite[]  // 0-2 atmosférické fotky pod logem
}

export function RetailerCard({ retailer, productSlug, price, photos = [] }: Props) {
  const hasStory = !!(retailer.tagline || retailer.story || retailer.founders)
  if (!hasStory) return null

  // Zobrazujeme max 2 fotky pod logem — víc by rozbilo vertikální rytmus karty.
  const visiblePhotos = photos.slice(0, 2)

  return (
    <section className="mt-12 max-w-[1040px]">
      <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
        — Kde olej koupíte
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-5 leading-tight">
        O e-shopu {retailer.name}
      </h2>

      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 md:p-7 grid grid-cols-1 md:grid-cols-[120px_1fr] gap-5 md:gap-7 items-start">
        {/* Logo + 2 fotky pod sebou */}
        <div className="flex flex-col gap-2">
          {retailer.logoUrl ? (
            // Plain <img> místo Next.js Image — retailer logy přicházejí z 8+
            // různých CDN domén (cretamart.com, static.albert.cz, kosik.cz, atd.)
            // a explicitní allowlist v next.config je nepraktický. Logos jsou
            // navíc malé (<50KB), Next optimization je overkill.
            <div className="w-24 h-24 bg-off rounded-[var(--radius-card)] p-3 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={retailer.logoUrl}
                alt={`${retailer.name} logo`}
                className="max-w-full max-h-full object-contain"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-24 h-24 bg-olive-bg border border-olive-border rounded-[var(--radius-card)] flex items-center justify-center">
              <span className="font-[family-name:var(--font-display)] text-3xl font-normal italic text-olive-dark leading-none">
                {retailer.name.charAt(0)}
              </span>
            </div>
          )}
          {visiblePhotos.length > 0 && (
            <div className="flex flex-col gap-2">
              {visiblePhotos.map((p, i) => (
                <div key={i} className="relative w-24 h-20 rounded-[var(--radius-card)] border border-off2 overflow-hidden">
                  <Image
                    src={p.url}
                    alt={p.alt_text ?? `${retailer.name} fotka ${i + 1}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Tagline */}
          {retailer.tagline && (
            <p className="text-[15px] text-text font-medium leading-snug mb-3">
              {retailer.tagline}
            </p>
          )}

          {/* Story */}
          {retailer.story && (
            <p className="text-[14px] text-text2 leading-relaxed mb-4 whitespace-pre-line">
              {retailer.story}
            </p>
          )}

          {/* Meta řada — zakladatelé / sídlo / rok / specializace */}
          {(retailer.founders ||
            retailer.headquarters ||
            retailer.foundedYear ||
            retailer.specialization) && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-text2 mb-4 pt-3 border-t border-off">
              {retailer.founders && (
                <div>
                  <span className="text-text3 uppercase tracking-wider text-[10px] mr-1.5">
                    Zakladatelé
                  </span>
                  <span className="font-medium text-text">{retailer.founders}</span>
                </div>
              )}
              {retailer.headquarters && (
                <div>
                  <span className="text-text3 uppercase tracking-wider text-[10px] mr-1.5">
                    Sídlo
                  </span>
                  <span className="font-medium text-text">{retailer.headquarters}</span>
                </div>
              )}
              {retailer.foundedYear && (
                <div>
                  <span className="text-text3 uppercase tracking-wider text-[10px] mr-1.5">
                    Od roku
                  </span>
                  <span className="font-medium text-text tabular-nums">
                    {retailer.foundedYear}
                  </span>
                </div>
              )}
              {retailer.specialization && (
                <div>
                  <span className="text-text3 uppercase tracking-wider text-[10px] mr-1.5">
                    Specializace
                  </span>
                  <span className="font-medium text-text">{retailer.specialization}</span>
                </div>
              )}
            </div>
          )}

          {/* CTA — affiliate redirect */}
          <Link
            href={`/go/${retailer.slug}/${productSlug}`}
            target="_blank"
            rel="noopener sponsored"
            className="inline-flex items-center gap-1.5 bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-olive-dark transition-colors"
          >
            Otevřít u {retailer.name} — {Math.round(price)} Kč
            <span className="text-[11px]">↗</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
