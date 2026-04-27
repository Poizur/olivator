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
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6">
        <div className="text-sm font-semibold text-text mb-1">Parametry produktu (raw)</div>
        <div className="text-xs text-text3 italic mt-2 bg-off rounded-lg px-3 py-3 text-center">
          Zatím žádná data z parameter tabulky. Spusť &ldquo;🔄 Rescrape&rdquo; nahoře.
        </div>
      </div>
    )
  }

  const knownCount = entries.filter(([k]) => isKnownKey(k)).length
  const unknownCount = entries.length - knownCount

  return (
    <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6">
      <div className="flex items-start justify-between mb-3 gap-4">
        <div>
          <div className="text-sm font-semibold text-text">
            Parametry produktu <span className="text-text3 font-normal">(raw ze zdroje)</span>
          </div>
          <div className="text-xs text-text3 mt-0.5">
            {entries.length} klíčů celkem · <span className="text-olive-dark">{knownCount} mapovaných</span>
            {unknownCount > 0 && (
              <> · <span className="text-terra">{unknownCount} ne-mapovaných</span></>
            )}
          </div>
        </div>
      </div>

      <div className="border border-off2 rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <tbody>
            {entries.map(([label, value]) => {
              const known = isKnownKey(label)
              return (
                <tr key={label} className="border-b border-off last:border-b-0">
                  <td className="px-3 py-2 text-text2 font-medium align-top w-[40%]">
                    {known && <span className="text-olive mr-1.5" title="Mapováno do strukturovaného úložiště">✓</span>}
                    {!known && <span className="text-terra mr-1.5" title="Není mapováno — uvidíš v extracted_facts">○</span>}
                    {label}
                  </td>
                  <td className="px-3 py-2 text-text">
                    {value}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11px] text-text3 leading-snug">
        <span className="text-olive">✓</span> mapováno do strukturovaného úložiště ·{' '}
        <span className="text-terra">○</span> dostupné jen v <code className="text-text2 bg-off px-1 rounded">extracted_facts</code>.
        Pokud chceš nějaké &ldquo;○&rdquo; pole povýšit na strukturované, řekni Claudovi.
      </div>
    </div>
  )
}
