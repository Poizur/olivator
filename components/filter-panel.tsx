'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const TYPES = [
  { value: 'evoo', label: 'Extra panenský', count: 5 },
  { value: 'virgin', label: 'Panenský', count: 1 },
  { value: 'refined', label: 'Rafinovaný', count: 1 },
]

const ORIGINS = [
  { value: 'GR', label: '🇬🇷 Řecko', count: 3 },
  { value: 'IT', label: '🇮🇹 Itálie', count: 2 },
  { value: 'ES', label: '🇪🇸 Španělsko', count: 2 },
  { value: 'HR', label: '🇭🇷 Chorvatsko', count: 1 },
]

const CERTS = [
  { value: 'bio', label: 'BIO / Organic', count: 4 },
  { value: 'dop', label: 'DOP / CHOP', count: 3 },
  { value: 'nyiooc', label: 'Oceněný NYIOOC', count: 2 },
]

export function FilterPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeTypes = searchParams.get('type')?.split(',').filter(Boolean) || []
  const activeOrigins = searchParams.get('origin')?.split(',').filter(Boolean) || []
  const activeCerts = searchParams.get('cert')?.split(',').filter(Boolean) || []

  const toggleFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const current = params.get(key)?.split(',').filter(Boolean) || []
    const idx = current.indexOf(value)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(value)
    }
    if (current.length > 0) {
      params.set(key, current.join(','))
    } else {
      params.delete(key)
    }
    router.push(`/srovnavac?${params.toString()}`)
  }, [searchParams, router])

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4 sticky top-[72px]">
      <FilterSection
        label="Typ"
        items={TYPES}
        active={activeTypes}
        onToggle={(v) => toggleFilter('type', v)}
      />
      <FilterSection
        label="Původ"
        items={ORIGINS}
        active={activeOrigins}
        onToggle={(v) => toggleFilter('origin', v)}
      />
      <FilterSection
        label="Certifikace"
        items={CERTS}
        active={activeCerts}
        onToggle={(v) => toggleFilter('cert', v)}
        isLast
      />
    </div>
  )
}

function FilterSection({
  label,
  items,
  active,
  onToggle,
  isLast,
}: {
  label: string
  items: { value: string; label: string; count: number }[]
  active: string[]
  onToggle: (value: string) => void
  isLast?: boolean
}) {
  return (
    <div className={`${isLast ? '' : 'mb-5 pb-5 border-b border-off'}`}>
      <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-2.5">
        {label}
      </div>
      {items.map(item => {
        const checked = active.includes(item.value)
        return (
          <div
            key={item.value}
            className="flex items-center gap-2 mb-1.5 cursor-pointer"
            onClick={() => onToggle(item.value)}
          >
            <div className={`w-[15px] h-[15px] border-[1.5px] rounded flex items-center justify-center transition-all ${
              checked ? 'bg-olive border-olive' : 'border-off2'
            }`}>
              {checked && <span className="text-[9px] text-white font-bold">✓</span>}
            </div>
            <span className="text-[13px] text-text cursor-pointer">{item.label}</span>
            <span className="text-[11px] text-text3 ml-auto">{item.count}</span>
          </div>
        )
      })}
    </div>
  )
}
