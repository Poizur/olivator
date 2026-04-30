'use client'

import { useState, useEffect } from 'react'
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

/** Public product page gallery: large hero image + thumbnail strip + lightbox.
 *  Klik na hero foto = zoom v lightboxu (důležité pro lab reporty/certifikáty
 *  které jsou na malé verzi nečitelné). */
export function ProductGallery({
  productName,
  fallbackImageUrl,
  galleryImages,
  scoreBadge,
}: ProductGalleryProps) {
  const images: GalleryImage[] = galleryImages.length > 0
    ? galleryImages
    : fallbackImageUrl
    ? [{ id: 'fallback', url: fallbackImageUrl, altText: productName, isPrimary: true }]
    : []

  const [activeId, setActiveId] = useState<string>(images[0]?.id ?? '')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const active = images.find(i => i.id === activeId) ?? images[0]

  // Keyboard nav v lightboxu — Escape zavře, šipky přepínají
  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false)
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = images.findIndex((i) => i.id === activeId)
        if (idx < 0) return
        const next =
          e.key === 'ArrowRight'
            ? (idx + 1) % images.length
            : (idx - 1 + images.length) % images.length
        setActiveId(images[next].id)
      }
    }
    window.addEventListener('keydown', handler)
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, images, activeId])

  if (!active) {
    return (
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] aspect-[4/5] flex items-center justify-center relative overflow-hidden">
        {scoreBadge && (
          <div className="absolute top-4 right-4">{scoreBadge}</div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="sticky top-[72px]">
        {/* Hero image — klikem se otevře v lightboxu */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full bg-white border border-off2 rounded-[var(--radius-card)] aspect-[4/5] flex items-center justify-center relative mb-3 overflow-hidden cursor-zoom-in group"
          aria-label="Zvětšit foto"
        >
          <Image
            src={active.url}
            alt={active.altText ?? productName}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            priority
          />
          {scoreBadge && (
            <div className="absolute top-4 right-4 z-10">{scoreBadge}</div>
          )}
          {/* Zoom indikátor v rohu */}
          <div className="absolute bottom-3 right-3 z-10 bg-white/90 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center text-text shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </div>
        </button>

        {/* Thumbnail strip */}
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

      {/* Lightbox modal — full-screen zoom pro detail / lab reporty */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close + counter v hlavičce */}
          <div className="absolute top-0 left-0 right-0 px-5 py-4 flex items-center justify-between text-white z-10">
            <div className="text-[12px] font-medium">
              {images.findIndex((i) => i.id === activeId) + 1} / {images.length}
            </div>
            <button
              onClick={() => setLightboxOpen(false)}
              aria-label="Zavřít"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Image container — center, max 90vh + padding */}
          <div
            className="relative w-full h-full flex items-center justify-center px-4 md:px-16 py-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.altText ?? productName}
              className="max-w-full max-h-full object-contain select-none"
            />
          </div>

          {/* Prev/next šipky pokud je víc fotek */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = images.findIndex((i) => i.id === activeId)
                  const prev = (idx - 1 + images.length) % images.length
                  setActiveId(images[prev].id)
                }}
                aria-label="Předchozí"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl transition-colors"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = images.findIndex((i) => i.id === activeId)
                  const next = (idx + 1) % images.length
                  setActiveId(images[next].id)
                }}
                aria-label="Další"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl transition-colors"
              >
                ›
              </button>
            </>
          )}

          {/* Caption / alt text dole */}
          {active.altText && (
            <div className="absolute bottom-0 left-0 right-0 px-5 py-4 text-white/70 text-[12px] text-center max-w-[800px] mx-auto">
              {active.altText}
            </div>
          )}
        </div>
      )}
    </>
  )
}
