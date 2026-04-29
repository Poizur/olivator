// Read-only zobrazení raw parameter table z extracted_facts.
// Admin vidí přesně to, co scraper našel ve zdroji — všechny key:value páry.
// Použití: identifikovat pole, která zatím nemapujeme, a flagovat ke
// strukturovanému storage.

interface ParameterPanelProps {
  extractedFacts: Array<{ key: string; value: string; label?: string }> | unknown[]
}

const KNOWN_MAPPED_KEYS = [
  // Tyto klíče už mapujeme do strukturovaných polí — admin nemusí řešit.
  'ean',
  'acidita', 'kyselost',
  'velikost balení', 'velikost', 'objem',
  'druh oleje',
  'druh obalu', 'obal',
  'peroxidové číslo', 'peroxid',
  'k232', 'k270', 'dk',
  'vosk',
  'kyselina olejová',
  'země původu', 'původ',
  'polyfenoly',
]

function isKnownKey(label: string): boolean {
  const norm = label.toLowerCase().replace(/[:.\s]/g, '')
  return KNOWN_MAPPED_KEYS.some((k) => norm.includes(k.replace(/\s/g, '')))
}

export function ParameterPanel({ extractedFacts }: ParameterPanelProps) {
  // Find the parameter_table fact entry
  let parameterTable: Record<string, string> = {}
  if (Array.isArray(extractedFacts)) {
    type Fact = { key: string; value: string }
    const tableEntry = (extractedFacts as Fact[]).find(
      (f) => typeof f === 'object' && f !== null && f.key === 'parameter_table'
    )
    if (tableEntry?.value) {
      try {
        parameterTable = JSON.parse(tableEntry.value)
      } catch {
        // ignore parse errors
      }
    }
  }

  const entries = Object.entries(parameterTable)
  if (entries.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-[var(--radius-card)] p-6">
        <div className="text-sm font-semibold text-white mb-1">Parametry produktu (raw)</div>
        <div className="text-xs text-zinc-500 italic mt-2 bg-zinc-800/40 rounded-lg px-3 py-3 text-center">
          Zatím žádná data z parameter tabulky. Spusť &ldquo;🔄 Rescrape&rdquo; nahoře.
        </div>
      </div>
    )
  }

  const knownCount = entries.filter(([k]) => isKnownKey(k)).length
  const unknownCount = entries.length - knownCount

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[var(--radius-card)] p-6">
      <div className="flex items-start justify-between mb-3 gap-4">
        <div>
          <div className="text-sm font-semibold text-white">
            Parametry produktu <span className="text-zinc-500 font-normal">(raw ze zdroje)</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {entries.length} klíčů celkem · <span className="text-emerald-400">{knownCount} mapovaných</span>
            {unknownCount > 0 && (
              <> · <span className="text-amber-400">{unknownCount} ne-mapovaných</span></>
            )}
          </div>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <tbody>
            {entries.map(([label, value]) => {
              const known = isKnownKey(label)
              return (
                <tr key={label} className="border-b border-zinc-800 last:border-b-0">
                  <td className="px-3 py-2 text-zinc-400 font-medium align-top w-[40%]">
                    {known && <span className="text-olive mr-1.5" title="Mapováno do strukturovaného úložiště">✓</span>}
                    {!known && <span className="text-amber-400 mr-1.5" title="Není mapováno — uvidíš v extracted_facts">○</span>}
                    {label}
                  </td>
                  <td className="px-3 py-2 text-white">
                    {value}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11px] text-zinc-500 leading-snug">
        <span className="text-olive">✓</span> mapováno do strukturovaného úložiště ·{' '}
        <span className="text-amber-400">○</span> dostupné jen v <code className="text-zinc-400 bg-zinc-800/40 px-1 rounded">extracted_facts</code>.
        Pokud chceš nějaké &ldquo;○&rdquo; pole povýšit na strukturované, řekni Claudovi.
      </div>
    </div>
  )
}
