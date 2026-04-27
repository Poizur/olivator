'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function QualityActions() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  async function onAudit() {
    if (!confirm('Spustit audit všech aktivních produktů? Trvá ~30-60s podle počtu.')) return
    setRunning(true)
    setError(null)
    setSummary(null)
    try {
      const res = await fetch('/api/admin/quality/audit', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSummary(`✓ Audit dokončen: ${data.total} produktů, ${data.totalViolations} issues`)
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
        onClick={onAudit}
        disabled={running}
        className="bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
      >
        {running ? '🔍 Auditing...' : '🔍 Spustit audit'}
      </button>
      {summary && (
        <span className="text-[11px] text-olive-dark bg-olive-bg border border-olive-border rounded px-3 py-1.5">
          {summary}
        </span>
      )}
      {error && (
        <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          ⚠ {error}
        </span>
      )}
    </div>
  )
}
