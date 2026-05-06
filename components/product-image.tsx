import Image from 'next/image'
import type { Product } from '@/lib/types'

interface ProductImageProps {
  product: Pick<Product, 'imageUrl' | 'name'>
  className?: string
  fallbackSize?: string
  sizes?: string
  /** 'cover' (výchozí) vyplní container — produkt větší, žádné šedé pruhy.
   *  'contain' zachová celou fotku — použij na detail stránce kde nesmí
   *  být olej cropped. */
  fit?: 'cover' | 'contain'
  /** Zoom factor — default 1.25 (cover) ořízne whitespace padding ze
   *  source fotek. Jednotlivé retailery mají různě široký okraj kolem
   *  lahve, scale-125 řeší 90 % případů. Nastav 1 pro detail/gallery. */
  zoom?: number
}

export function ProductImage({
  product,
  className = '',
  fallbackSize = 'text-6xl',
  sizes = '(max-width: 768px) 100vw, 400px',
  fit = 'cover',
  zoom,
}: ProductImageProps) {
  // Default zoom = 1.25 pro cover (ořízne whitespace), 1 pro contain
  const effectiveZoom = zoom ?? (fit === 'cover' ? 1.25 : 1)
  if (product.imageUrl) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${className}`}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes={sizes}
          className={fit === 'cover' ? 'object-cover object-center' : 'object-contain'}
          style={effectiveZoom !== 1 ? { transform: `scale(${effectiveZoom})` } : undefined}
        />
      </div>
    )
  }
  // Fallback: first letter of product name in display serif on neutral background
  const initial = product.name.charAt(0).toUpperCase()
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      <span className={`font-[family-name:var(--font-display)] ${fallbackSize} font-normal italic text-text3/30 leading-none select-none`}>
        {initial}
      </span>
    </div>
  )
}
