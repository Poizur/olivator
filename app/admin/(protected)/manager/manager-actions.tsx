'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ManagerActions() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  async function onRun() {
    if (!confirm('Spustit Manager agent teď? Trvá ~30-60s, stojí ~$0.05 v Claude API. Pošle email + uloží report.')) return
    setRunning(true)
    setError(null)
    setSummary(null)
    try {
      const res = await fetch('/api/admin/manager/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const r = data.report
      setSummary(
        `✓ Report vygenerován: ${r.suggestedActions?.length ?? 0} akcí, ${r.metrics?.totalClicks ?? 0} kliků za týden`
      )
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
        {running ? '🤔 Analyzuji…' : '🚀 Spustit Manager teď'}
      </button>
      {summary && (
        <span className="text-[11px] text-olive-dark bg-olive-bg border border-olive-border rounded px-3 py-1.5">
          {summary}
        </span>
      )}
      {error && (
        <span className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          ⚠ {error}
        </span>
      )}
    </div>
  )
}
