'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateRow } from './candidate-row'

interface Candidate {
  id: string
  source_url: string
  source_domain: string
  scraped_at: string | null
  matched_product_id: string | null
  match_type: string | null
  match_confidence: number | null
  candidate_data: Record<string, unknown>
  status: string
  reasoning: string | null
  resulting_product_id: string | null
  resulting_offer_id: string | null
  created_at: string
}

interface DiscoveryQueueProps {
  needsReview: Candidate[]
}

/** Wraps the "Čeká na schválení" section with bulk-action support.
 *  Checkbox per candidate, "Select all" header checkbox, bulk approve / reject. */
export function DiscoveryQueue({ needsReview }: DiscoveryQueueProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === needsReview.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(needsReview.map(c => c.id)))
    }
  }

  async function bulkAction(action: 'approve' | 'reject') {
    if (selected.size === 0) return
    const verb = action === 'approve' ? 'schválit' : 'zamítnout'
    if (!confirm(
      `${verb.toUpperCase()} ${selected.size} kandidátů?\n\n` +
      (action === 'approve'
        ? 'Pro každý se spustí AI pipeline (image + facts + flavor + score + AI rewrite). Trvá ~30s na produkt = celkem ~' + (selected.size * 30) + ' s.'
        : 'Kandidáti se označí jako zamítnuté. Tahle akce je rychlá.')
    )) return

    setBusy(action)
    setError(null)
    setProgress(`Zpracovávám ${selected.size} ${action === 'approve' ? 'schválení' : 'zamítnutí'}...`)
    try {
      const res = await fetch('/api/admin/discovery/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (action === 'approve') {
        setProgress(
          `✓ Hotovo: ${data.approved ?? 0} schváleno, ${data.alreadyPublished ?? 0} již publikováno, ${data.failed ?? 0} selhalo`
        )
      } else {
        setProgress(`✓ Zamítnuto: ${data.rejected ?? 0}`)
      }
      setSelected(new Set())
      router.refresh()
      setTimeout(() => setProgress(null), 6000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
      setProgress(null)
    } finally {
      setBusy(null)
    }
  }

  if (needsReview.length === 0) return null

  const allSelected = selected.size === needsReview.length && needsReview.length > 0
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-text">
          ⏳ Čeká na schválení ({needsReview.length})
        </h2>
      </div>

      {/* Bulk action toolbar — sticky-ish on top of list */}
      <div className="bg-white border border-off2 rounded-lg p-3 mb-3 flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 text-[12px] text-text2 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => {
              if (el) el.indeterminate = someSelected
            }}
            onChange={toggleAll}
            className="w-4 h-4 accent-olive cursor-pointer"
          />
          {selected.size === 0
            ? 'Vybrat vše'
            : selected.size === needsReview.length
            ? `Vybráno ${selected.size}/${needsReview.length}`
            : `Vybráno ${selected.size}/${needsReview.length}`}
        </label>

        {selected.size > 0 && (
          <>
            <button
              type="button"
              onClick={() => bulkAction('approve')}
              disabled={busy !== null}
              className="bg-olive text-white rounded-full px-4 py-1.5 text-[12px] font-medium hover:bg-olive-dark disabled:opacity-40"
            >
              {busy === 'approve' ? '⏳ Schvaluji...' : `✓ Schválit označené (${selected.size})`}
            </button>
            <button
              type="button"
              onClick={() => bulkAction('reject')}
              disabled={busy !== null}
              className="bg-white border border-off2 text-text2 rounded-full px-4 py-1.5 text-[12px] font-medium hover:border-terra hover:text-terra disabled:opacity-40"
            >
              {busy === 'reject' ? '...' : `✕ Zamítnout označené (${selected.size})`}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={busy !== null}
              className="text-text3 hover:text-text text-[12px] px-2"
            >
              Zrušit výběr
            </button>
          </>
        )}

        {progress && (
          <span className="text-[11px] text-olive-dark bg-olive-bg border border-olive-border rounded px-2 py-1 ml-auto">
            {progress}
          </span>
        )}
        {error && (
          <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 ml-auto">
            ⚠ {error}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {needsReview.map(c => (
          <div key={c.id} className="flex items-stretch gap-2">
            <label className="flex items-center px-1 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                className="w-4 h-4 accent-olive cursor-pointer"
              />
            </label>
            <div className="flex-1 min-w-0">
              <CandidateRow candidate={c as never} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
