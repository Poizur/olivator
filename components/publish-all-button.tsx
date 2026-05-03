'use client'

// Rychlé publikování všech entit — flipne status z draft na active pro
// vše co má vyplněný content. Nedělá AI gen — jen status update.
// Pro situace: bulk regen vygeneroval content ale status zůstal draft.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PublishAllButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function publish() {
    if (!confirm('Publikovat všechny entity (regiony/značky/odrůdy/recepty) co mají vyplněný obsah? Status z draft → active.')) return
    setBusy(true)
    setFeedback('⏳ Publikuji…')
    try {
      const res = await fetch('/api/admin/publish-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const summary = Object.entries(data.results as Record<string, { published: number; total: number }>)
        .map(([t, v]) => `${t}: ${v.published}/${v.total}`)
        .join(', ')
      setFeedback(`✅ ${summary}`)
      router.refresh()
    } catch (err) {
      setFeedback(`❌ ${err instanceof Error ? err.message : 'Chyba'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={publish}
        disabled={busy}
        className="inline-flex items-center gap-1.5 bg-white border border-olive-border text-olive-dark hover:bg-olive-bg/40 rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-50"
      >
        {busy ? '⏳ Publikuji…' : '⚡ Publikovat všechny drafty'}
      </button>
      {feedback && <p className="text-[12px] text-text2 mt-2">{feedback}</p>}
    </div>
  )
}
