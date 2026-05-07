'use client'

import { useState, useTransition } from 'react'
import { addNote } from './actions'

const CATEGORIES = [
  { value: 'strategy', label: '🎯 Strategie' },
  { value: 'obstacle', label: '🚧 Překážka' },
  { value: 'win', label: '🏆 Výhra' },
  { value: 'question', label: '❓ Otázka' },
  { value: 'idea', label: '💡 Nápad' },
  { value: 'retro', label: '🔄 Retro' },
] as const

const PHASES = [
  { value: '', label: 'Bez fáze' },
  { value: '0', label: 'Fáze 0 — Quick Wins' },
  { value: '1', label: 'Fáze 1 — Schema' },
  { value: '2', label: 'Fáze 2 — Entity' },
  { value: '3', label: 'Fáze 3 — Meta' },
  { value: '4', label: 'Fáze 4 — Topic Authority' },
  { value: '5', label: 'Fáze 5 — E-E-A-T' },
  { value: '6', label: 'Fáze 6 — Backlinks' },
  { value: '7', label: 'Fáze 7 — Advanced' },
]

export function AddNoteForm() {
  const [category, setCategory] = useState<typeof CATEGORIES[number]['value']>('idea')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [phase, setPhase] = useState<string>('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handle(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!title.trim()) {
      setError('Title je povinný')
      return
    }
    startTransition(async () => {
      const result = await addNote({
        category,
        title: title.trim(),
        body: body.trim() || undefined,
        related_phase: phase ? parseInt(phase, 10) : null,
      })
      if (result.ok) {
        setTitle('')
        setBody('')
        setPhase('')
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2500)
      } else {
        setError(result.error ?? 'Chyba')
      }
    })
  }

  const inputCls = 'w-full bg-white border border-off2 rounded-md px-3 py-2 text-[13px] text-text focus:outline-none focus:border-olive transition-colors'

  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[140px_140px_1fr] gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value as typeof CATEGORIES[number]['value'])}
          className={inputCls}
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={phase}
          onChange={e => setPhase(e.target.value)}
          className={inputCls}
        >
          {PHASES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Krátký titulek (např. 'Zvážit GSC napojení v Q3')"
          maxLength={200}
          className={inputCls}
        />
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Detail (volitelné) — kontext, akční kroky, source links…"
        rows={3}
        className={inputCls}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className={`text-[13px] bg-olive text-white hover:bg-olive2 rounded-md px-4 py-2 transition-colors ${pending || !title.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {pending ? 'Ukládám…' : 'Uložit insight'}
        </button>
        {success && <span className="text-[12px] text-emerald-700">✓ Uloženo</span>}
        {error && <span className="text-[12px] text-red-600">{error}</span>}
      </div>
    </form>
  )
}
