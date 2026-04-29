'use client'

import { useState } from 'react'

interface GenerateResult {
  type: string
  slug: string
  ok: boolean
  chars?: number
  error?: string
}

type EntityType = 'all' | 'regions' | 'brands' | 'cultivars'

export default function RegionsAdminPage() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<GenerateResult[]>([])
  const [summary, setSummary] = useState<{ generated: number; failed: number } | null>(null)
  const [selectedType, setSelectedType] = useState<EntityType>('all')

  async function generate(entityType: EntityType, slug?: string) {
    setRunning(true)
    setResults([])
    setSummary(null)
    try {
      const res = await fetch('/api/admin/generate-entity-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, slug: slug ?? null }),
      })
      const data = await res.json()
      if (data.results) setResults(data.results)
      setSummary({ generated: data.generated ?? 0, failed: data.failed ?? 0 })
    } catch {
      setSummary({ generated: 0, failed: 1 })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-text mb-1">Content Ecosystem</h1>
      <p className="text-sm text-text3 mb-8">
        Generování AI textů pro regiony, značky a odrůdy. Texty se ukládají do DB
        a okamžitě zobrazí na veřejných stránkách.
      </p>

      {/* Výběr entity type */}
      <div className="bg-white border border-off2 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-text mb-4">Generovat texty pro</h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'regions', 'brands', 'cultivars'] as EntityType[]).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                selectedType === t
                  ? 'bg-olive text-white border-olive'
                  : 'bg-white text-text2 border-off2 hover:border-olive'
              }`}
            >
              {t === 'all' ? '🌐 Vše' : t === 'regions' ? '🌍 Regiony' : t === 'brands' ? '🫒 Značky' : '🌿 Odrůdy'}
            </button>
          ))}
        </div>

        <button
          onClick={() => generate(selectedType)}
          disabled={running}
          className="px-6 py-2.5 bg-olive text-white rounded-lg text-sm font-medium hover:bg-olive2 disabled:opacity-50 transition-colors"
        >
          {running ? '⏳ Generuji…' : '✨ Spustit generování'}
        </button>

        <p className="text-xs text-text3 mt-3">
          Každá entita ~20–30 s · celkem {selectedType === 'all' ? '~7 min' : selectedType === 'regions' ? '~2 min' : '~2 min'}
        </p>
      </div>

      {/* Výsledky */}
      {summary && (
        <div className={`rounded-lg px-5 py-3 mb-4 text-sm ${summary.failed === 0 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
          ✓ Vygenerováno: {summary.generated} · Chyby: {summary.failed}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white border border-off2 rounded-xl divide-y divide-off2">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="text-base">{r.ok ? '✅' : '❌'}</span>
              <span className="text-text3 w-16 shrink-0">{r.type}</span>
              <span className="font-medium text-text flex-1">{r.slug}</span>
              {r.ok && r.chars != null && (
                <span className="text-text3">{r.chars} znaků</span>
              )}
              {!r.ok && r.error && (
                <span className="text-red-500 text-xs truncate max-w-[200px]">{r.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Přehled entit */}
      <div className="mt-10 grid grid-cols-3 gap-4">
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="text-2xl mb-2">🌍</div>
          <div className="text-sm font-medium text-text mb-1">Regiony</div>
          <div className="text-xs text-text3">Peloponés, Kréta, Apulie, Korfu</div>
          <a href="/oblast/kreta" target="_blank" className="mt-3 block text-xs text-olive hover:underline">
            Náhled → /oblast/kreta
          </a>
        </div>
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="text-2xl mb-2">🫒</div>
          <div className="text-sm font-medium text-text mb-1">Značky</div>
          <div className="text-xs text-text3">Intini, Corinto, Evoilino, Orino, Sitia Kréta</div>
          <a href="/znacka/intini" target="_blank" className="mt-3 block text-xs text-olive hover:underline">
            Náhled → /znacka/intini
          </a>
        </div>
        <div className="bg-white border border-off2 rounded-xl p-5">
          <div className="text-2xl mb-2">🌿</div>
          <div className="text-sm font-medium text-text mb-1">Odrůdy</div>
          <div className="text-xs text-text3">Koroneiki, Manaki, Kalamata, Coratina, Cima di Mola</div>
          <a href="/odruda/koroneiki" target="_blank" className="mt-3 block text-xs text-olive hover:underline">
            Náhled → /odruda/koroneiki
          </a>
        </div>
      </div>
    </div>
  )
}
