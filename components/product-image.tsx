import Image from 'next/image'
import type { Product } from '@/lib/types'

interface ProductImageProps {
  product: Pick<Product, 'imageUrl' | 'name'>
  className?: string
  fallbackSize?: string
  sizes?: string
}

/** Shows real product image from Supabase Storage, falls back to 🫒 emoji. */
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
  return (
    <div className={`w-full h-full flex items-center justify-center ${fallbackSize} ${className}`}>
      🫒
    </div>
  )
}
