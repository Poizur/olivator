'use client'

// Generic bulk publish tlačítko — flipne status='draft' → 'active' pro
// všechny drafty s vyplněným body. Použito v /admin/articles, /admin/recipes.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  endpoint: string  // např. '/api/admin/articles/bulk-publish'
  draftCount: number
  entityLabel: string  // "průvodců", "receptů"
}

export function BulkPublishButton({ endpoint, draftCount, entityLabel }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  if (draftCount === 0) return null

  async function publish() {
    if (!confirm(`Publikovat všechny ${draftCount} draftů ${entityLabel} co mají vyplněný obsah?\n\nDrafty bez obsahu zůstávají.`))
      return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publikování selhalo')
      setFeedback({
        ok: true,
        msg: `✅ Publikováno ${data.published} ${entityLabel}`,
      })
      router.refresh()
    } catch (err) {
      setFeedback({ ok: false, msg: `❌ ${err instanceof Error ? err.message : 'Chyba'}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={publish}
        disabled={busy}
        className="bg-white border border-olive-border text-olive-dark hover:bg-olive-bg/40 rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-50 transition-colors"
      >
        {busy ? '⏳ Publikuji…' : `⚡ Publikovat všechny drafty (${draftCount})`}
      </button>
      {feedback && (
        <span className={`text-[12px] ${feedback.ok ? 'text-olive-dark' : 'text-red-700'}`}>
          {feedback.msg}
        </span>
      )}
    </div>
  )
}
