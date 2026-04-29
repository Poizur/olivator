import Image from 'next/image'
import type { Product } from '@/lib/types'

interface ProductImageProps {
  product: Pick<Product, 'imageUrl' | 'name'>
  className?: string
  fallbackSize?: string
  sizes?: string
}

export function ProductImage({
  product,
  className = '',
  fallbackSize = 'text-6xl',
  sizes = '(max-width: 768px) 100vw, 400px',
}: ProductImageProps) {
  if (product.imageUrl) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes={sizes}
          className="object-contain"
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
