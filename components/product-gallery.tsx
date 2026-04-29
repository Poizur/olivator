'use client'

import { useState } from 'react'
import Image from 'next/image'

export interface GalleryImage {
  id: string
  url: string
  altText: string | null
  isPrimary: boolean
}

interface ProductGalleryProps {
  productName: string
  fallbackImageUrl?: string | null
  galleryImages: GalleryImage[]
  scoreBadge?: React.ReactNode
}

/** Public product page gallery: large hero image + thumbnail strip.
 *  Clicking thumbnail switches the hero. Hero image fills its container with
 *  generous size and minimal padding. */
export function ProductGallery({
  productName,
  fallbackImageUrl,
  galleryImages,
  scoreBadge,
}: ProductGalleryProps) {
  // Build display list: prefer gallery, fall back to single image_url
  const images: GalleryImage[] = galleryImages.length > 0
    ? galleryImages
    : fallbackImageUrl
    ? [{ id: 'fallback', url: fallbackImageUrl, altText: productName, isPrimary: true }]
    : []

  const [activeId, setActiveId] = useState<string>(images[0]?.id ?? '')
  const active = images.find(i => i.id === activeId) ?? images[0]

  if (!active) {
    return (
      <div className="bg-off rounded-[var(--radius-card)] aspect-square flex items-center justify-center relative overflow-hidden">
        {scoreBadge && (
          <div className="absolute top-4 right-4">{scoreBadge}</div>
        )}
      </div>
    )
  }

  return (
    <div className="sticky top-[72px]">
      {/* Hero image — fills the entire box, only minimal padding */}
      <div className="bg-off rounded-[var(--radius-card)] aspect-square flex items-center justify-center relative mb-3 overflow-hidden">
        <Image
          src={active.url}
          alt={active.altText ?? productName}
          fill
          sizes="(max-width: 768px) 100vw, 500px"
          className="object-contain p-2"
          priority
        />
        {scoreBadge && (
          <div className="absolute top-4 right-4 z-10">{scoreBadge}</div>
        )}
      </div>

      {/* Thumbnail strip — only visible when there are 2+ images */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map(img => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveId(img.id)}
              className={`shrink-0 w-20 h-20 bg-off rounded-lg border-[1.5px] overflow-hidden transition-colors ${
                img.id === active.id
                  ? 'border-olive ring-1 ring-olive/30'
                  : 'border-off2 hover:border-olive-light'
              }`}
              aria-label={img.altText ?? `Náhled ${productName}`}
            >
              <div className="relative w-full h-full">
                <Image
                  src={img.url}
                  alt={img.altText ?? ''}
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Attribution — required disclosure that photos come from partner shops */}
      <div className="mt-3 text-[11px] text-text3 leading-snug">
        Fotky od výrobců a partnerských e-shopů.{' '}
        <a
          href="/o-projektu#fotky"
          className="text-text2 hover:text-olive underline decoration-dotted"
        >
          Více
        </a>
      </div>
    </div>
  )
}
