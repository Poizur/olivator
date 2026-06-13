'use client'

import { useRouter, usePathname } from 'next/navigation'

interface Props {
  currentParamsString: string
  brands: [string, number, string][] // [slug, count, label]
  activeBrand?: string
}

export function BrandSelect({ currentParamsString, brands, activeBrand }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = brands.some(([slug]) => slug === activeBrand)

  function handleChange(value: string) {
    const params = new URLSearchParams(currentParamsString)
    if (value) params.set('brand', value)
    else params.delete('brand')
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <select
      value={isActive ? activeBrand : ''}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Další výrobci"
      className={`text-[13px] pl-3 pr-2 py-1.5 rounded-full border cursor-pointer focus:outline-none max-w-[220px] ${
        isActive
          ? 'bg-olive text-white border-olive'
          : 'bg-white border-off2 text-text2 hover:border-olive3 hover:text-olive focus:border-olive'
      }`}
    >
      <option value="">Další výrobci ({brands.length})</option>
      {brands.map(([slug, count, label]) => (
        <option key={slug} value={slug}>
          {label} ({count})
        </option>
      ))}
    </select>
  )
}
