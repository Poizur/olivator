const LABEL_CZ: Record<string, string> = {
  ovocny:  'Ovocný',
  bylinny: 'Bylinný',
  horky:   'Hořký',
  palivy:  'Pálivý',
  jemny:   'Jemný',
  vyrazny: 'Výrazný',
}

// Pořadí zobrazení
const LABEL_ORDER = ['jemny', 'ovocny', 'bylinny', 'horky', 'palivy', 'vyrazny']

export function FlavorTags({ labels }: { labels: string[] }) {
  if (!labels || labels.length === 0) return null

  const ordered = LABEL_ORDER.filter((l) => labels.includes(l))
  const displayed = ordered.slice(0, 4)

  return (
    <div className="bg-off rounded-xl p-5 mt-5">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[13px] font-semibold text-text">Chuťový profil</h2>
        <span className="group relative inline-flex items-center gap-1">
          <span className="text-[11px] text-text3">dle popisu výrobce</span>
          <span
            tabIndex={0}
            aria-label="Vysvětlivka k chuťovému profilu"
            className="w-3.5 h-3.5 inline-flex items-center justify-center bg-off2 text-text3 hover:bg-olive-bg hover:text-olive rounded-full text-[9px] font-bold cursor-help transition-colors"
          >
            ?
          </span>
          <span
            role="tooltip"
            className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 absolute right-0 top-full mt-2 z-50 w-60 bg-text text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-opacity"
          >
            Štítky vycházejí ze slovního popisu výrobce. Chuť je subjektivní — berte jako orientaci. Vlastní degustaci neprovádíme.
            <span className="absolute -top-1 right-4 w-2 h-2 bg-text rotate-45" />
          </span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayed.map((l) => (
          <span
            key={l}
            className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium border border-olive/25 bg-olive-bg text-olive"
          >
            {LABEL_CZ[l] ?? l}
          </span>
        ))}
      </div>
    </div>
  )
}
