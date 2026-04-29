'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateRow } from './candidate-row'

interface JobState {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  total: number
  processed: number
  succeeded: number
  failed: number
  current_item: string | null
  errors: Array<{ id: string; reason: string }>
  completed_at: string | null
}

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
  const [job, setJob] = useState<JobState | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll job status every 2s while running
  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed') {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/bulk-jobs/${job.id}`)
        const data = await res.json()
        if (!res.ok || !data.job) return
        setJob(data.job)
        if (data.job.status === 'completed' || data.job.status === 'failed') {
          // Done — refresh page to show updated candidate list
          router.refresh()
          setBusy(null)
        }
      } catch {
        // ignore intermittent errors
      }
    }, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [job?.id, job?.status, router])

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
    const totalSec = selected.size * 30
    const verb = action === 'approve' ? 'schválit' : 'zamítnout'
    if (!confirm(
      `${verb.toUpperCase()} ${selected.size} kandidátů?\n\n` +
      (action === 'approve'
        ? `Pro každý se spustí AI pipeline (image + facts + flavor + score + AI rewrite). Trvá ~30s/produkt = celkem ~${Math.ceil(totalSec / 60)} min.\n\nBěží na pozadí — můžeš zavřít tab a vrátit se později.`
        : 'Kandidáti se označí jako zamítnuté. Hotovo okamžitě.')
    )) return

    setBusy(action)
    setError(null)
    setProgress(null)
    setJob(null)
    try {
      const res = await fetch('/api/admin/discovery/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (action === 'reject' || data.immediate) {
        // Fast path — immediate result
        setProgress(`✓ Zamítnuto: ${data.rejected ?? 0}`)
        setSelected(new Set())
        router.refresh()
        setBusy(null)
        setTimeout(() => setProgress(null), 5000)
      } else if (data.jobId) {
        // Async — start polling
        setSelected(new Set())
        setJob({
          id: data.jobId,
          status: 'pending',
          total: 0,
          processed: 0,
          succeeded: 0,
          failed: 0,
          current_item: null,
          errors: [],
          completed_at: null,
        })
        // First poll fires from useEffect when job state set
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
      setBusy(null)
    }
  }

  // Helpers for progress UI
  const isJobActive = job && (job.status === 'pending' || job.status === 'running')
  const pct = job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0

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
              className="bg-white border border-off2 text-text2 rounded-full px-4 py-1.5 text-[12px] font-medium hover:border-terra hover:text-amber-700 disabled:opacity-40"
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
          <span className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 ml-auto">
            ⚠ {error}
          </span>
        )}
      </div>

      {/* Background job progress panel — appears while async work runs */}
      {job && (
        <div className={`mb-3 rounded-lg p-4 border ${
          job.status === 'completed'
            ? 'bg-olive-bg border-olive-border'
            : job.status === 'failed'
            ? 'bg-red-50 border-red-200'
            : 'bg-olive-bg/50 border-olive-border'
        }`}>
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="text-[13px] font-semibold text-olive-dark">
              {job.status === 'completed'
                ? `✓ Bulk schválení dokončeno (${job.succeeded}/${job.total})`
                : job.status === 'failed'
                ? `❌ Bulk schválení selhalo`
                : `⏳ Schvaluji ${job.processed} z ${job.total}`
              }
            </div>
            <div className="text-[11px] text-text2">
              ✅ {job.succeeded} úspěšně {job.failed > 0 && `· ❌ ${job.failed} selhalo`}
            </div>
          </div>

          {/* Progress bar */}
          {job.total > 0 && (
            <div className="w-full bg-off/60 rounded-full h-2 mb-2 overflow-hidden">
              <div
                className={`h-2 transition-all duration-500 ${
                  job.status === 'failed' ? 'bg-red-400' : 'bg-olive'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-text3">
            <span>
              {job.current_item && isJobActive && (
                <>Aktuálně: <strong className="text-text2">{job.current_item}</strong></>
              )}
            </span>
            <span>{pct} %</span>
          </div>

          {isJobActive && (
            <div className="mt-2 text-[10px] text-text3">
              💡 Můžeš zavřít tab — běží na pozadí. Vrať se za ~{Math.ceil((job.total - job.processed) * 30 / 60)} min.
            </div>
          )}

          {job.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-amber-700">
                {job.errors.length} chyb — zobrazit
              </summary>
              <ul className="mt-1 text-[11px] text-text3 space-y-0.5 ml-4">
                {job.errors.slice(0, 8).map((e, i) => (
                  <li key={i} className="truncate">• {e.reason}</li>
                ))}
                {job.errors.length > 8 && (
                  <li className="italic">... a {job.errors.length - 8} dalších</li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}

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
