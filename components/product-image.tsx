import Image from 'next/image'
import type { Product } from '@/lib/types'

interface ProductImageProps {
  product: Pick<Product, 'imageUrl' | 'name'>
  className?: string
  fallbackSize?: string
  sizes?: string
  /** 'contain' (výchozí) zachová celou fotku — Apple-style čistý vzhled.
   *  Container by měl být bg-white (ne bg-off) pro hladký přechod do photo
   *  whitespace. 'cover' vyplní container ale crop láhve — použij vzácně. */
  fit?: 'cover' | 'contain'
  /** Volitelný zoom factor (1 = bez zoom, default). Pouze pokud má source
   *  fotka výrazný whitespace padding který chceš oříznout. */
  zoom?: number
}

export function ProductImage({
  product,
  className = '',
  fallbackSize = 'text-6xl',
  sizes = '(max-width: 768px) 100vw, 400px',
  fit = 'contain',
  zoom = 1,
}: ProductImageProps) {
  if (product.imageUrl) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${className}`}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes={sizes}
          className={fit === 'cover' ? 'object-cover object-center' : 'object-contain'}
          style={zoom !== 1 ? { transform: `scale(${zoom})` } : undefined}
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
