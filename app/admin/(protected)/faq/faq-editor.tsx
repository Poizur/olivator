'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FAQ {
  id: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  category: string
}

interface DraftFAQ extends Omit<FAQ, 'id'> {
  id: string | null // null for new ones
}

export function FAQEditor({ initialFAQs }: { initialFAQs: FAQ[] }) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftFAQ[]>(initialFAQs.map(f => ({ ...f })))
  const [savingId, setSavingId] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  function addNewDraft() {
    setDrafts(prev => [
      ...prev,
      {
        id: null,
        question: '',
        answer: '',
        sortOrder: prev.length,
        isActive: true,
        category: 'general',
      },
    ])
  }

  function updateDraft(index: number, patch: Partial<DraftFAQ>) {
    setDrafts(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  async function saveDraft(index: number) {
    const d = drafts[index]
    if (!d.question.trim() || !d.answer.trim()) {
      setGlobalError('Otázka a odpověď nesmí být prázdné')
      return
    }
    setSavingId(d.id ?? `new-${index}`)
    setGlobalError(null)
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: d.id ?? undefined,
          question: d.question,
          answer: d.answer,
          sortOrder: d.sortOrder,
          isActive: d.isActive,
          category: d.category,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // If was new, set its id from server
      if (!d.id && data.id) {
        setDrafts(prev => prev.map((dd, i) => (i === index ? { ...dd, id: data.id } : dd)))
      }
      router.refresh()
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setSavingId(null)
    }
  }

  async function deleteDraft(index: number) {
    const d = drafts[index]
    if (d.id && !confirm(`Smazat FAQ?\n\n"${d.question.slice(0, 80)}..."`)) return
    if (d.id) {
      try {
        const res = await fetch(`/api/admin/faqs?id=${d.id}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : 'Chyba mazání')
        return
      }
    }
    setDrafts(prev => prev.filter((_, i) => i !== index))
    router.refresh()
  }

  async function onSeed() {
    if (!confirm('Vložit 12 výchozích FAQ otázek? (Existující řádky zůstanou.)')) return
    setSeeding(true)
    setGlobalError(null)
    try {
      const res = await fetch('/api/admin/faqs/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.refresh()
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Seed selhal')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-3">
      {globalError && (
        <div className="text-[13px] text-red-400 bg-red-500/100/10 border border-red-500/20 rounded-lg px-3 py-2">
          ⚠ {globalError}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={addNewDraft}
          className="bg-olive text-white rounded-full px-4 py-1.5 text-[13px] font-medium hover:bg-olive-dark transition-colors"
        >
          + Přidat novou otázku
        </button>
        {drafts.length === 0 && (
          <button
            type="button"
            onClick={onSeed}
            disabled={seeding}
            className="bg-terra text-white rounded-full px-4 py-1.5 text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {seeding ? '⏳ Seeduji...' : '🌱 Naseedovat 12 výchozích FAQ'}
          </button>
        )}
      </div>

      {drafts.map((d, i) => (
        <div
          key={d.id ?? `new-${i}`}
          className="bg-zinc-900 border border-zinc-800 rounded-[var(--radius-card)] p-5"
        >
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <input
                type="checkbox"
                checked={d.isActive}
                onChange={e => updateDraft(i, { isActive: e.target.checked })}
              />
              Zobrazit
            </label>
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              Pořadí
              <input
                type="number"
                value={d.sortOrder}
                onChange={e => updateDraft(i, { sortOrder: Number(e.target.value) || 0 })}
                className="w-14 px-2 py-1 border border-zinc-800 rounded text-[12px]"
              />
            </label>
            <select
              value={d.category}
              onChange={e => updateDraft(i, { category: e.target.value })}
              className="px-2 py-1 border border-zinc-800 rounded text-[12px] text-zinc-400"
            >
              <option value="general">Obecné</option>
              <option value="quality">Kvalita</option>
              <option value="cooking">Použití v kuchyni</option>
              <option value="health">Zdraví</option>
              <option value="storage">Skladování</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveDraft(i)}
                disabled={savingId === (d.id ?? `new-${i}`)}
                className="bg-olive text-white rounded-full px-4 py-1 text-[12px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
              >
                {savingId === (d.id ?? `new-${i}`) ? '...' : '💾 Uložit'}
              </button>
              <button
                type="button"
                onClick={() => deleteDraft(i)}
                className="text-zinc-500 hover:text-amber-400 text-[12px]"
                title="Smazat"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={d.question}
              onChange={e => updateDraft(i, { question: e.target.value })}
              placeholder="Jak vybrat opravdu kvalitní olivový olej?"
              className="w-full px-3 py-2 border border-zinc-800 rounded-lg text-[14px] font-medium focus:outline-none focus:border-olive"
            />
            <textarea
              value={d.answer}
              onChange={e => updateDraft(i, { answer: e.target.value })}
              rows={5}
              placeholder="Podívej se na 4 věci: označení 'extra panenský'..."
              className="w-full px-3 py-2 border border-zinc-800 rounded-lg text-[13px] leading-relaxed focus:outline-none focus:border-olive"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
