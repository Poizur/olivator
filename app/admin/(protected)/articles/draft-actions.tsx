'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  draftId: string
  slug: string
  reviewerSeverity: string | null
  status: string
}

export function DraftActions({ draftId, slug, reviewerSeverity, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState<'return' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (status === 'published' || status === 'rejected') return null

  async function runAction(action: 'publish' | 'return' | 'reject', opts?: { overrideYmylWarn?: boolean }) {
    setError(null)
    const res = await fetch(`/api/admin/article-drafts/${draftId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        admin_note: note || null,
        ...(opts?.overrideYmylWarn ? { override_ymyl_warn: true } : {}),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Chyba')
      return
    }
    setShowNote(null)
    startTransition(() => router.refresh())
  }

  const isBlock = reviewerSeverity === 'block'
  const isWarn = reviewerSeverity === 'warn'

  return (
    <div className="mt-3 space-y-2">
      {error && (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
          {isWarn && error.includes('WARN') && (
            <button
              onClick={() => runAction('publish', { overrideYmylWarn: true })}
              className="ml-2 underline font-medium"
            >
              Vynuceně publikovat
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {/* Publikovat */}
        <button
          disabled={isPending || isBlock}
          onClick={() => runAction('publish')}
          title={isBlock ? 'Reviewer zablokoval — oprav problémy' : undefined}
          className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
            isBlock
              ? 'bg-off text-text3 cursor-not-allowed'
              : isWarn
              ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
              : 'bg-olive text-white hover:bg-olive2'
          }`}
        >
          {isBlock ? '✗ Blokováno' : isWarn ? '⚠ Publikovat (warn)' : '✓ Publikovat'}
        </button>

        {/* Vrátit s poznámkou */}
        <button
          disabled={isPending}
          onClick={() => setShowNote(showNote === 'return' ? null : 'return')}
          className="text-[12px] px-3 py-1.5 rounded-lg font-medium border border-off2 text-text2 hover:border-olive/40 hover:text-olive transition-colors"
        >
          ↩ Vrátit
        </button>

        {/* Zamítnout */}
        <button
          disabled={isPending}
          onClick={() => {
            if (window.confirm(`Zamítnout draft "${slug}"? Tato akce je nevratná.`)) {
              runAction('reject')
            }
          }}
          className="text-[12px] px-3 py-1.5 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          ✕ Zamítnout
        </button>
      </div>

      {showNote === 'return' && (
        <div className="flex gap-2 items-start">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Poznámka pro autora (co opravit)…"
            className="flex-1 text-[12px] border border-off2 rounded-lg px-3 py-2 resize-none h-16 focus:outline-none focus:border-olive"
          />
          <button
            disabled={isPending || !note.trim()}
            onClick={() => runAction('return')}
            className="text-[12px] px-3 py-1.5 rounded-lg font-medium bg-olive text-white hover:bg-olive2 disabled:opacity-50 whitespace-nowrap"
          >
            Odeslat
          </button>
        </div>
      )}
    </div>
  )
}
