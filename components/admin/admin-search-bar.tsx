'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useRef } from 'react'

interface Props {
  defaultValue?: string
  placeholder?: string
  // Serialized URLSearchParams from the server — avoids useSearchParams (BUG-018)
  currentParamsString: string
}

export function AdminSearchBar({ defaultValue = '', placeholder = 'Hledat...', currentParamsString }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  function handleChange(value: string) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(currentParamsString)
      if (value.trim()) {
        params.set('search', value.trim())
      } else {
        params.delete('search')
      }
      params.delete('page') // reset to page 1 on new search
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    }, 300)
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none text-sm select-none">
        ⌕
      </span>
      <input
        type="search"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm border border-off2 rounded-lg bg-white focus:outline-none focus:border-olive transition-colors"
      />
    </div>
  )
}
