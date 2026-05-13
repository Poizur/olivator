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
  // Fallback: olive-toned gradient s lahví — výrazně lepší než šedé písmeno
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#e8f0dc] to-[#c8d9ae] ${className}`}>
      {/* Olive oil bottle silhouette */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5a7a3a"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-50"
        style={{ width: fallbackSize === 'text-lg' ? '18px' : fallbackSize === 'text-2xl' ? '28px' : '40px' }}
        aria-hidden="true"
      >
        {/* Bottle shape */}
        <path d="M9 3h6" />
        <path d="M10 3v2.5c0 .5-.8 1.2-1.5 2C7.2 9 7 10 7 11v8a1 1 0 001 1h8a1 1 0 001-1v-8c0-1-.2-2-1.5-3.5C14.8 6.7 14 6 14 5.5V3" />
        <line x1="7" y1="14" x2="17" y2="14" />
      </svg>
    </div>
  )
}
