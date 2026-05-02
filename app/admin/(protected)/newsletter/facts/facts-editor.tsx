'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FactRow {
  id: string
  body: string
  category: string
  source_url: string | null
  active: boolean
  used_count: number
  last_used_at: string | null
}

const CATEGORIES = [
  { value: 'general', label: 'Obecné' },
  { value: 'health', label: 'Zdraví' },
  { value: 'production', label: 'Výroba' },
  { value: 'storage', label: 'Skladování' },
  { value: 'tasting', label: 'Chuť' },
  { value: 'history', label: 'Historie' },
]

export function FactsEditor({ initialFacts }: { initialFacts: FactRow[] }) {
  const router = useRouter()
  const [facts, setFacts] = useState<FactRow[]>(initialFacts)
  const [editing, setEditing] = useState<string | null>(null)
  const [newFact, setNewFact] = useState('')
  const [newCategory, setNewCategory] = useState('general')

  async function addFact() {
    const body = newFact.trim()
    if (!body) return
    const res = await fetch('/api/admin/newsletter/facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, category: newCategory }),
    })
    if (!res.ok) {
      alert('Chyba při ukládání')
      return
    }
    setNewFact('')
    router.refresh()
  }

  async function updateFact(id: string, patch: Partial<FactRow>) {
    const res = await fetch(`/api/admin/newsletter/facts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      alert('Chyba při ukládání')
      return
    }
    setFacts((arr) => arr.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  async function deleteFact(id: string) {
    if (!confirm('Smazat tento fakt?')) return
    const res = await fetch(`/api/admin/newsletter/facts/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('Chyba')
      return
    }
    setFacts((arr) => arr.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Add new */}
      <div className="bg-white border border-off2 rounded-2xl p-5">
        <div className="text-[12px] font-medium text-text2 mb-2">Přidat nový fakt</div>
        <textarea
          value={newFact}
          onChange={(e) => setNewFact(e.target.value)}
          rows={3}
          placeholder="Polyfenoly v olivovém oleji jsou…"
          className="w-full border border-off2 rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-olive"
        />
        <div className="flex items-center gap-2 mt-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="border border-off2 rounded-md px-2 py-1.5 text-[12px]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={addFact}
            disabled={!newFact.trim()}
            className="bg-olive text-white rounded-full px-4 py-1.5 text-[12px] font-medium disabled:opacity-40"
          >
            + Přidat
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {facts.length === 0 && (
          <div className="bg-white border border-off2 rounded-2xl p-8 text-center text-[13px] text-text3">
            Žádné fakty. Přidej první nahoře.
          </div>
        )}
        {facts.map((f) => {
          const isEditing = editing === f.id
          return (
            <div
              key={f.id}
              className={`bg-white border rounded-xl p-4 ${
                f.active ? 'border-off2' : 'border-off2 opacity-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <textarea
                      defaultValue={f.body}
                      rows={3}
                      onBlur={(e) => {
                        updateFact(f.id, { body: e.target.value })
                        setEditing(null)
                      }}
                      autoFocus
                      className="w-full border border-olive rounded-lg px-3 py-2 text-[13px] resize-y"
                    />
                  ) : (
                    <p
                      onClick={() => setEditing(f.id)}
                      className="text-[13px] text-text2 leading-relaxed cursor-pointer hover:bg-off/40 -mx-1 px-1 rounded"
                    >
                      {f.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] bg-off text-text3 rounded-full px-2 py-0.5">
                      {CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category}
                    </span>
                    <span className="text-[10px] text-text3">
                      použito {f.used_count}× · {f.last_used_at ? new Date(f.last_used_at).toLocaleDateString('cs-CZ') : 'nikdy'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => updateFact(f.id, { active: !f.active })}
                    className="text-[11px] text-text3 hover:text-olive px-2"
                    title={f.active ? 'Vypnout (nepoužívat)' : 'Zapnout'}
                  >
                    {f.active ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => deleteFact(f.id)}
                    className="text-[11px] text-text3 hover:text-red-600 px-2"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
