'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface RunResult {
  shopsCrawled: number
  totalUrlsFound: number
  newCandidates: number
  autoPublished: number
  autoAddedOffers: number
  needsReview: number
  failed: number
  shopErrors: Array<{ shop: string; error: string }>
  errors?: string[]
}

interface ProgressState {
  total: number
  auto_published: number
  auto_added_offer: number
  needs_review: number
  failed: number
  recent: Array<{ name: string; status: string; domain: string }>
}

export function DiscoveryRunner() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startPolling() {
    const started = new Date().toISOString()
    startedAtRef.current = started
    setProgress({ total: 0, auto_published: 0, auto_added_offer: 0, needs_review: 0, failed: 0, recent: [] })
    setElapsed(0)

    // Tick — update elapsed every second for visual smoothness
    tickIntervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)

    // Poll every 2s for new candidates
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/discovery/status?since=${encodeURIComponent(started)}`)
        if (!res.ok) return
        const data = await res.json()
        setProgress(data)
      } catch {
        // ignore polling errors — main run will report them
      }
    }, 2000)
  }

  function stopPolling() {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)
    pollIntervalRef.current = null
    tickIntervalRef.current = null
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  async function onRun() {
    if (!confirm('Najít nové oleje na všech aktivních e-shopech? Trvá 5–20 min podle počtu produktů.')) return
    setRunning(true)
    setResult(null)
    setError(null)
    startPolling()

    try {
      const res = await fetch('/api/admin/discovery/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hledání selhalo')
      setResult(data as RunResult)
      router.refresh()
    } catch (err) {
      // Better error message
      let msg = err instanceof Error ? err.message : 'Chyba'
      if (msg.includes('did not match the expected pattern')) {
        msg = 'Některá URL nebyla validní. Hledání běželo dál — počkej + Cmd+R, uvidíš co se uložilo.'
      }
      setError(msg)
    } finally {
      stopPolling()
      setRunning(false)
    }
  }

  function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-end gap-2 max-w-md">
      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
      >
        {running ? `⏳ Hledám... ${formatElapsed(elapsed)}` : '🚀 Najít nové oleje'}
      </button>

      {/* Live progress while running */}
      {running && progress && (
        <div className="text-[12px] bg-olive-bg border border-olive-border rounded-lg px-3 py-2 w-full">
          <div className="font-semibold text-olive-dark mb-1.5">
            Nalezeno {progress.total}{' '}
            {progress.total === 1 ? 'produkt' : progress.total < 5 ? 'produkty' : 'produktů'}
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px] text-text2">
            {progress.auto_published > 0 && (
              <div>✅ <strong>{progress.auto_published}</strong> automaticky publikováno</div>
            )}
            {progress.auto_added_offer > 0 && (
              <div>🔗 <strong>{progress.auto_added_offer}</strong> nových cen</div>
            )}
            {progress.needs_review > 0 && (
              <div>⏳ <strong>{progress.needs_review}</strong> ke schválení</div>
            )}
            {progress.failed > 0 && (
              <div className="text-amber-700">❌ <strong>{progress.failed}</strong> selhalo</div>
            )}
          </div>
          {progress.recent.length > 0 && (
            <div className="mt-2 pt-2 border-t border-olive-border/50">
              <div className="text-[10px] uppercase tracking-wider text-text3 mb-1">Poslední</div>
              {progress.recent.slice(0, 3).map((r, i) => (
                <div key={i} className="text-[11px] truncate">
                  {r.status === 'auto_published' ? '✅' : r.status === 'needs_review' ? '⏳' : '🔗'}{' '}
                  {r.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full">
          ⚠ {error}
        </div>
      )}

      {result && (
        <div className="text-[11px] text-olive-dark bg-olive-bg border border-olive-border rounded-lg px-3 py-2 w-full">
          ✓ Hotovo · {result.shopsCrawled} shopů · {result.totalUrlsFound} URL ·{' '}
          {result.newCandidates} kandidátů · {result.autoPublished} auto · {result.needsReview} k review
          {result.shopErrors.length > 0 && (
            <div className="text-amber-700 mt-1">
              ⚠ {result.shopErrors.length} shopů selhalo
            </div>
          )}
          {result.errors && result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px]">Chyby ({result.errors.length})</summary>
              <ul className="mt-1 text-[10px] text-text3 space-y-0.5">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="truncate">• {e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
