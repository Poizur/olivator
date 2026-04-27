'use client'

import { useState } from 'react'
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
}

export function DiscoveryRunner() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onRun() {
    if (!confirm('Spustit Discovery agent? Trvá 1-5 min podle počtu nálezů.')) return
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/discovery/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data as RunResult)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
      >
        {running ? '⏳ Hledám nové oleje...' : '🚀 Spustit Discovery'}
      </button>
      {error && (
        <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          ⚠ {error}
        </span>
      )}
      {result && (
        <div className="text-[11px] text-olive-dark bg-olive-bg border border-olive-border rounded px-3 py-2 max-w-[300px]">
          ✓ Hotovo · {result.shopsCrawled} shopů · {result.totalUrlsFound} URL ·{' '}
          {result.newCandidates} kandidátů · {result.autoPublished} auto · {result.needsReview} k review
          {result.shopErrors.length > 0 && (
            <div className="text-terra mt-1">
              ⚠ {result.shopErrors.length} shopů selhalo
            </div>
          )}
        </div>
      )}
    </div>
  )
}
