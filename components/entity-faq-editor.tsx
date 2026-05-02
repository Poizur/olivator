'use client'

// Inline editor pro entity_faqs. CRUD přes /api/admin/entity-faqs.
// Embedded pod EntityEditForm v admin entity stránce.

import { useState } from 'react'

export interface FaqRow {
  id: string
  question: string
  answer: string
  sort_order: number
}

interface Props {
  entityType: 'region' | 'brand' | 'cultivar'
  entityId: string
  initialFaqs: FaqRow[]
}

export function EntityFaqEditor({ entityType, entityId, initialFaqs }: Props) {
  const [faqs, setFaqs] = useState<FaqRow[]>(initialFaqs)
  const [drafting, setDrafting] = useState(false)
  const [draftQ, setDraftQ] = useState('')
  const [draftA, setDraftA] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addFaq() {
    if (!draftQ.trim() || !draftA.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/entity-faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          question: draftQ.trim(),
          answer: draftA.trim(),
          sortOrder: faqs.length,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setFaqs([...faqs, json.faq])
      setDraftQ('')
      setDraftA('')
      setDrafting(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setBusy(false)
    }
  }

  async function updateFaq(id: string, patch: Partial<FaqRow>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/entity-faqs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setFaqs(faqs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setBusy(false)
    }
  }

  async function deleteFaq(id: string) {
    if (!confirm('Smazat FAQ?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/entity-faqs?id=${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setFaqs(faqs.filter((f) => f.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-text3">{faqs.length} otázek · vykreslí se v FAQ akordeonu + JSON-LD pro Google</p>
      </div>

      {faqs.length === 0 && !drafting && (
        <p className="text-xs text-text3 italic mb-3">
          Žádné FAQ. Ideální 4–6 otázek per entita pro Google + AI vyhledávače.
        </p>
      )}

      <div className="space-y-3 mb-4">
        {faqs.map((f) => (
          <FaqRowEditor
            key={f.id}
            faq={f}
            onUpdate={(patch) => updateFaq(f.id, patch)}
            onDelete={() => deleteFaq(f.id)}
            disabled={busy}
          />
        ))}
      </div>

      {drafting ? (
        <div className="border border-olive-border bg-olive-bg/30 rounded-lg p-3 space-y-2">
          <input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Otázka"
            className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text bg-white"
          />
          <textarea
            value={draftA}
            onChange={(e) => setDraftA(e.target.value)}
            placeholder="Odpověď (max ~3 věty)"
            rows={3}
            className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text resize-y bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={addFaq}
              disabled={busy}
              className="px-3 py-1.5 bg-olive text-white rounded-md text-xs font-medium hover:bg-olive-dark disabled:opacity-50"
            >
              Uložit
            </button>
            <button
              onClick={() => {
                setDrafting(false)
                setDraftQ('')
                setDraftA('')
              }}
              className="px-3 py-1.5 bg-white border border-off2 text-text2 rounded-md text-xs hover:border-olive-light"
            >
              Zrušit
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setDrafting(true)}
          className="text-xs text-olive border border-olive-border rounded-md px-3 py-1.5 hover:bg-olive-bg"
        >
          + Přidat FAQ
        </button>
      )}

      {error && <p className="text-xs text-terra mt-2">{error}</p>}
    </div>
  )
}

function FaqRowEditor({
  faq,
  onUpdate,
  onDelete,
  disabled,
}: {
  faq: FaqRow
  onUpdate: (patch: Partial<FaqRow>) => void
  onDelete: () => void
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [q, setQ] = useState(faq.question)
  const [a, setA] = useState(faq.answer)

  if (editing) {
    return (
      <div className="border border-olive-border bg-olive-bg/30 rounded-lg p-3 space-y-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text bg-white"
        />
        <textarea
          value={a}
          onChange={(e) => setA(e.target.value)}
          rows={3}
          className="w-full border border-off2 rounded-lg px-3 py-2 text-sm text-text resize-y bg-white"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              onUpdate({ question: q, answer: a })
              setEditing(false)
            }}
            disabled={disabled}
            className="px-3 py-1.5 bg-olive text-white rounded-md text-xs font-medium hover:bg-olive-dark disabled:opacity-50"
          >
            Uložit
          </button>
          <button
            onClick={() => {
              setQ(faq.question)
              setA(faq.answer)
              setEditing(false)
            }}
            className="px-3 py-1.5 bg-white border border-off2 text-text2 rounded-md text-xs hover:border-olive-light"
          >
            Zrušit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-off2 rounded-lg p-3 flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text mb-1">{faq.question}</p>
        <p className="text-xs text-text2 leading-snug whitespace-pre-line">{faq.answer}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-text2 hover:text-olive border border-off2 rounded-md px-2 py-1"
        >
          Upravit
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="text-xs text-terra hover:text-terra-dark border border-off2 rounded-md px-2 py-1 disabled:opacity-50"
        >
          Smazat
        </button>
      </div>
    </div>
  )
}
