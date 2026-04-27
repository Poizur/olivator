'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function QualityActions() {
  const router = useRouter()
  const [running, setRunning] = useState<null | 'audit' | 'meta' | 'vision'>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  async function onAudit() {
    if (!confirm('Spustit audit všech aktivních produktů? Trvá ~30-60s podle počtu.')) return
    setRunning('audit')
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
      setRunning(null)
    }
  }

  async function onBulkMeta() {
    if (!confirm('Vygenerovat SEO meta description pro všechny produkty s prázdným polem? Trvá ~1-2 min.')) return
    setRunning('meta')
    setError(null)
    setSummary(null)
    try {
      const res = await fetch('/api/admin/products/bulk-meta', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSummary(
        data.processed === 0
          ? `✓ ${data.message ?? 'Vše už má meta description.'}`
          : `✓ Hotovo: ${data.processed} vygenerováno, ${data.failed ?? 0} selhalo`
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setRunning(null)
    }
  }

  async function onBulkVision() {
    if (!confirm('AI vision pass: alt text všech fotek + auto-scan lab reportů. Trvá ~5-10 min, stojí ~$2 v Claude API. OK?')) return
    setRunning('vision')
    setError(null)
    setSummary(null)
    try {
      const res = await fetch('/api/admin/products/bulk-vision', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSummary(
        `✓ Alt: ${data.alt_processed} (skip ${data.alt_skipped}, fail ${data.alt_failed}) · Lab: ${data.lab_scanned} skenováno, ${data.lab_updated} doplněno`
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2 flex-wrap justify-end">
        <button
          type="button"
          onClick={onAudit}
          disabled={running !== null}
          className="bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
        >
          {running === 'audit' ? '🔍 Auditing…' : '🔍 Spustit audit'}
        </button>
        <button
          type="button"
          onClick={onBulkMeta}
          disabled={running !== null}
          className="bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
          title="SEO meta description pro Google snippet (130-160 znaků)"
        >
          {running === 'meta' ? '✏️ Generuju…' : '✏️ SEO meta description'}
        </button>
        <button
          type="button"
          onClick={onBulkVision}
          disabled={running !== null}
          className="bg-olive text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
          title="AI vision: alt text všech fotek + auto-scan lab reportů. ~$2 v Claude API."
        >
          {running === 'vision' ? '👁️ Vidím…' : '👁️ Vision pass'}
        </button>
      </div>
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
