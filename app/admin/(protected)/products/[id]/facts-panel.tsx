'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface ExtractedFact {
  key: string
  label: string
  value: string
  importance: 'high' | 'medium' | 'low'
  source: 'scraped' | 'manual' | 'ai'
}

interface FactsPanelProps {
  productId: string
  initialFacts: ExtractedFact[]
}

export function FactsPanel({ productId, initialFacts }: FactsPanelProps) {
  const router = useRouter()
  const [facts, setFacts] = useState<ExtractedFact[]>(initialFacts)
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = JSON.stringify(facts) !== JSON.stringify(initialFacts)

  function updateFact(i: number, patch: Partial<ExtractedFact>) {
    setFacts(prev => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }

  function removeFact(i: number) {
    setFacts(prev => prev.filter((_, idx) => idx !== i))
  }

  function addFact() {
    setFacts(prev => [
      ...prev,
      {
        key: 'custom',
        label: '',
        value: '',
        importance: 'medium',
        source: 'manual',
      },
    ])
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/facts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facts: facts.filter(f => f.label.trim() && f.value.trim()),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Save failed')
      }
      setStatus('Fakta uložena')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setSaving(false)
    }
  }

  async function onReextract() {
    if (!confirm('Přepsat všechny fakty novou AI extrakcí z popisu produktu? Manuální úpravy budou ztraceny.'))
      return
    setExtracting(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/facts`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extrakce selhala')
      setFacts(data.facts || [])
      setStatus(`Extrahováno ${data.count} faktů`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[var(--radius-card)] p-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <div className="text-sm font-semibold text-white">Extrahovaná fakta</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Specifické detaily z popisu produktu. AI rewrite je MUSÍ zmínit (high).
            Můžeš přidávat vlastní.
          </div>
        </div>
        <button
          type="button"
          onClick={onReextract}
          disabled={extracting || saving}
          className="bg-zinc-800/40 border border-zinc-800 rounded-full px-3 py-1.5 text-[12px] font-medium hover:border-olive3 hover:text-olive disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {extracting ? '⏳ Extrahuji...' : '🔄 Extrahovat AI'}
        </button>
      </div>

      {facts.length === 0 ? (
        <div className="text-[13px] text-zinc-500 italic text-center py-6 bg-zinc-800/40 rounded-lg">
          Zatím žádná fakta. Klikni &ldquo;🔄 Extrahovat AI&rdquo; pro automatické načtení z popisu,
          nebo přidej vlastní.
        </div>
      ) : (
        <div className="space-y-2">
          {facts.map((fact, i) => (
            <div
              key={i}
              className="grid grid-cols-[100px_1fr_1.5fr_30px] gap-2 items-center p-2 rounded-lg bg-zinc-800/40"
            >
              <ImportanceSelect
                value={fact.importance}
                onChange={v => updateFact(i, { importance: v })}
              />
              <input
                type="text"
                value={fact.label}
                onChange={e => updateFact(i, { label: e.target.value })}
                placeholder="Název (např. Teplota lisování)"
                className="px-2.5 py-1.5 border border-zinc-800 rounded text-[13px] bg-zinc-900 focus:outline-none focus:border-olive"
              />
              <input
                type="text"
                value={fact.value}
                onChange={e => updateFact(i, { value: e.target.value })}
                placeholder="Hodnota (např. do 40 °C)"
                className="px-2.5 py-1.5 border border-zinc-800 rounded text-[13px] bg-zinc-900 focus:outline-none focus:border-olive"
              />
              <button
                type="button"
                onClick={() => removeFact(i)}
                className="text-zinc-500 hover:text-amber-400 text-sm"
                title="Smazat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={addFact}
          className="text-[12px] text-olive hover:text-emerald-400"
        >
          + Přidat vlastní fakt
        </button>
        {hasChanges && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="ml-auto bg-olive text-white rounded-full px-4 py-1.5 text-[12px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
          >
            {saving ? 'Ukládám...' : 'Uložit fakty'}
          </button>
        )}
      </div>

      {status && (
        <div className="mt-3 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          ✓ {status}
        </div>
      )}
      {error && (
        <div className="mt-3 text-xs text-red-400 bg-red-500/100/10 border border-red-500/20 rounded-lg px-3 py-2">
          ⚠ {error}
        </div>
      )}
    </div>
  )
}

function ImportanceSelect({
  value,
  onChange,
}: {
  value: ExtractedFact['importance']
  onChange: (v: ExtractedFact['importance']) => void
}) {
  const bg =
    value === 'high'
      ? 'bg-red-500/100/10 text-red-400 border-red-500/20'
      : value === 'medium'
      ? 'bg-amber-500/100/10 text-amber-400 border-terra/30'
      : 'bg-zinc-800/40 text-zinc-500 border-zinc-800'
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ExtractedFact['importance'])}
      className={`px-2 py-1.5 border rounded text-[11px] font-medium cursor-pointer ${bg}`}
    >
      <option value="high">🔴 HIGH</option>
      <option value="medium">🟡 MEDIUM</option>
      <option value="low">⚪ LOW</option>
    </select>
  )
}
