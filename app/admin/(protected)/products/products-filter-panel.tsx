'use client'

import { useRouter, usePathname } from 'next/navigation'

interface Props {
  currentParamsString: string
  availableTypes: string[]
  availableOrigins: string[]
  activeType?: string
  activeOrigin?: string
  activeMissing: string[]
  activeHasOffers?: string
  activeScoreMin?: string
  activeScoreMax?: string
}

const TYPE_LABELS: Record<string, string> = {
  evoo: 'Extra panenský',
  virgin: 'Panenský',
  refined: 'Rafinovaný',
  olive_oil: 'Olivový (blend)',
  pomace: 'Z pokrutin',
  flavored: 'Ochucený',
}

const ORIGIN_FLAGS: Record<string, string> = {
  GR: '🇬🇷', IT: '🇮🇹', ES: '🇪🇸', HR: '🇭🇷', PT: '🇵🇹',
  TR: '🇹🇷', MA: '🇲🇦', TN: '🇹🇳', IL: '🇮🇱', US: '🇺🇸',
}

const MISSING_OPTIONS = [
  { id: 'ean', label: 'Chybí EAN' },
  { id: 'acidity', label: 'Chybí kyselost' },
  { id: 'polyphenols', label: 'Chybí polyfenoly' },
  { id: 'score', label: 'Chybí Score' },
  { id: 'image', label: 'Chybí hero image' },
]

export function ProductsFilterPanel({
  currentParamsString,
  availableTypes,
  availableOrigins,
  activeType,
  activeOrigin,
  activeMissing,
  activeHasOffers,
  activeScoreMin,
  activeScoreMax,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(currentParamsString)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function toggleMissing(field: string) {
    const params = new URLSearchParams(currentParamsString)
    const cur = params.get('missing')?.split(',').filter(Boolean) ?? []
    const next = cur.includes(field) ? cur.filter((f) => f !== field) : [...cur, field]
    if (next.length > 0) params.set('missing', next.join(','))
    else params.delete('missing')
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function resetAdvanced() {
    const params = new URLSearchParams(currentParamsString)
    for (const k of ['type', 'origin', 'missing', 'scoreMin', 'scoreMax', 'hasOffers']) params.delete(k)
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const hasActive = !!(activeType || activeOrigin || activeMissing.length > 0 || activeHasOffers || activeScoreMin || activeScoreMax)

  const pillBase = 'text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer'
  const pillOn = 'bg-olive text-white border-olive'
  const pillOff = 'border-off2 text-text2 hover:border-olive bg-white'

  return (
    <details className="mb-4" open={hasActive}>
      <summary className="text-[11px] font-semibold tracking-wider uppercase text-text3 cursor-pointer hover:text-text select-none flex items-center gap-2 mb-0">
        Pokročilé filtry
        {hasActive && (
          <span className="bg-olive text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">aktivní</span>
        )}
      </summary>

      <div className="mt-3 p-4 bg-off/50 border border-off2 rounded-xl space-y-4">
        {/* Type */}
        {availableTypes.length > 0 && (
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-2">Typ</div>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => update('type', null)} className={`${pillBase} ${!activeType ? pillOn : pillOff}`}>
                Vše
              </button>
              {availableTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => update('type', activeType === t ? null : t)}
                  className={`${pillBase} ${activeType === t ? pillOn : pillOff}`}
                >
                  {TYPE_LABELS[t] ?? t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Origin */}
        {availableOrigins.length > 0 && (
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-2">Původ</div>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => update('origin', null)} className={`${pillBase} ${!activeOrigin ? pillOn : pillOff}`}>
                Vše
              </button>
              {availableOrigins.map((o) => (
                <button
                  key={o}
                  onClick={() => update('origin', activeOrigin === o ? null : o)}
                  className={`${pillBase} ${activeOrigin === o ? pillOn : pillOff}`}
                >
                  {ORIGIN_FLAGS[o] ?? ''} {o}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Missing fields */}
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-2">Chybějící pole</div>
          <div className="flex gap-4 flex-wrap">
            {MISSING_OPTIONS.map(({ id, label }) => (
              <label key={id} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeMissing.includes(id)}
                  onChange={() => toggleMissing(id)}
                  className="w-3.5 h-3.5 accent-olive cursor-pointer"
                />
                <span className="text-xs text-text2">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Score range */}
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-2">Score rozsah</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={activeScoreMin ?? ''}
              placeholder="0"
              onBlur={(e) => update('scoreMin', e.target.value || null)}
              className="w-16 text-xs border border-off2 rounded px-2 py-1.5 text-center focus:outline-none focus:border-olive"
            />
            <span className="text-xs text-text3">–</span>
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={activeScoreMax ?? ''}
              placeholder="100"
              onBlur={(e) => update('scoreMax', e.target.value || null)}
              className="w-16 text-xs border border-off2 rounded px-2 py-1.5 text-center focus:outline-none focus:border-olive"
            />
          </div>
        </div>

        {/* Has offers */}
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-2">Nabídky od prodejců</div>
          <div className="flex gap-1.5">
            {([['', 'Vše'], ['yes', 'Má nabídky'], ['no', 'Bez nabídek']] as const).map(([v, label]) => (
              <button
                key={v || 'all'}
                onClick={() => update('hasOffers', v || null)}
                className={`${pillBase} ${(v === '' ? !activeHasOffers : activeHasOffers === v) ? pillOn : pillOff}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        {hasActive && (
          <button onClick={resetAdvanced} className="text-xs text-red-600 hover:text-red-700 underline">
            ✕ Zrušit pokročilé filtry
          </button>
        )}
      </div>
    </details>
  )
}
