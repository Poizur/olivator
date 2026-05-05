'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export interface FilterCounts {
  types: Record<string, number>
  origins: Record<string, number>
  certifications: Record<string, number>
  highPolyphenols?: number
  highOleocanthal?: number
}

const TYPE_LABELS: Record<string, string> = {
  evoo: 'Extra panenský',
  virgin: 'Panenský',
  refined: 'Rafinovaný',
  olive_oil: 'Olivový olej',
  pomace: 'Pokrutinový',
}

const ORIGIN_LABELS: Record<string, string> = {
  GR: '🇬🇷 Řecko',
  IT: '🇮🇹 Itálie',
  ES: '🇪🇸 Španělsko',
  HR: '🇭🇷 Chorvatsko',
  PT: '🇵🇹 Portugalsko',
  TR: '🇹🇷 Turecko',
}

const CERT_LABELS: Record<string, string> = {
  bio: 'BIO / Organic',
  dop: 'DOP / CHOP',
  pgp: 'PGP',
  nyiooc: 'Oceněný NYIOOC',
  organic: 'Organic',
}

export function FilterPanel({ counts }: { counts: FilterCounts }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeTypes = searchParams.get('type')?.split(',').filter(Boolean) || []
  const activeOrigins = searchParams.get('origin')?.split(',').filter(Boolean) || []
  const activeCerts = searchParams.get('cert')?.split(',').filter(Boolean) || []
  const activeQuality = searchParams.get('quality')?.split(',').filter(Boolean) || []

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

  const typeItems = Object.entries(counts.types)
    .filter(([, n]) => n > 0)
    .map(([v, n]) => ({ value: v, label: TYPE_LABELS[v] ?? v, count: n }))
    .sort((a, b) => b.count - a.count)

  const originItems = Object.entries(counts.origins)
    // Vyloučí prázdné/null country kódy (15 produktů má NULL origin_country
    // → ukazovalo by to bez vlajky a bez labelu, jen číslo).
    .filter(([v, n]) => n > 0 && v && v !== 'null' && v !== '<NULL>' && v !== 'undefined')
    .map(([v, n]) => ({ value: v, label: ORIGIN_LABELS[v] ?? `🏳️ ${v}`, count: n }))
    .sort((a, b) => b.count - a.count)

  const certItems = Object.entries(counts.certifications)
    .filter(([, n]) => n > 0)
    .map(([v, n]) => ({ value: v, label: CERT_LABELS[v] ?? v.toUpperCase(), count: n }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-4 lg:sticky lg:top-[100px]">
      {typeItems.length > 0 && (
        <FilterSection
          label="Typ"
          items={typeItems}
          active={activeTypes}
          onToggle={(v) => toggleFilter('type', v)}
        />
      )}
      {originItems.length > 0 && (
        <FilterSection
          label="Původ"
          items={originItems}
          active={activeOrigins}
          onToggle={(v) => toggleFilter('origin', v)}
        />
      )}
      {certItems.length > 0 && (
        <FilterSection
          label="Certifikace"
          items={certItems}
          active={activeCerts}
          onToggle={(v) => toggleFilter('cert', v)}
        />
      )}
      {((counts.highPolyphenols ?? 0) > 0 || (counts.highOleocanthal ?? 0) > 0) && (
        <FilterSection
          label="Kvalita"
          items={[
            ...((counts.highPolyphenols ?? 0) > 0 ? [{
              value: 'high_polyphenols',
              label: 'Vysoký obsah polyfenolů (≥500 mg/kg)',
              count: counts.highPolyphenols ?? 0,
            }] : []),
            ...((counts.highOleocanthal ?? 0) > 0 ? [{
              value: 'high_oleocanthal',
              label: 'Vysoký oleokantal (≥100 mg/kg)',
              count: counts.highOleocanthal ?? 0,
            }] : []),
          ]}
          active={activeQuality}
          onToggle={(v) => toggleFilter('quality', v)}
          isLast
        />
      )}
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
