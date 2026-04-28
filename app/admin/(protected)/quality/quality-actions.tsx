'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function QualityActions() {
  const router = useRouter()
  const [running, setRunning] = useState<null | 'audit' | 'meta' | 'vision' | 'links'>(null)
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

  async function onLinkCheck() {
    if (!confirm('Projet všechny affiliate URLs a deaktivovat 404? Trvá ~2-3 min.')) return
    setRunning('links')
    setError(null)
    setSummary(null)
    try {
      const res = await fetch('/api/admin/link-check', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSummary(
        `✓ ${data.totalChecked} URLs: ${data.alive} živé, ${data.dead} mrtvé · nabídky -${data.deactivated}/+${data.reactivated} · produkty -${data.productsDeactivated}/+${data.productsReactivated}`
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
          title="Spustí quality rules audit napříč katalogem"
        >
          {running === 'audit' ? '🔍 Auditing…' : '🔍 Spustit audit'}
        </button>
        <button
          type="button"
          onClick={onBulkMeta}
          disabled={running !== null}
          className="bg-white border border-off2 text-text2 rounded-full px-4 py-2 text-[13px] font-medium hover:border-olive-light hover:text-olive disabled:opacity-40 transition-colors"
          title="Manuální fix: SEO meta description pro produkty bez něj. Pro nové produkty se generuje automaticky při discovery."
        >
          {running === 'meta' ? '✏️ Generuju…' : '✏️ Doplnit SEO meta'}
        </button>
        <button
          type="button"
          onClick={onLinkCheck}
          disabled={running !== null}
          className="bg-white border border-off2 text-text2 rounded-full px-4 py-2 text-[13px] font-medium hover:border-olive-light hover:text-olive disabled:opacity-40 transition-colors"
          title="HEAD request na všechny affiliate URLs — 404/410 deaktivuje, znovu-žijící reaktivuje. Cron běží denně automaticky."
        >
          {running === 'links' ? '🔗 Kontroluju…' : '🔗 Zkontrolovat odkazy'}
        </button>
        <button
          type="button"
          onClick={onBulkVision}
          disabled={running !== null}
          className="bg-white border border-off2 text-text2 rounded-full px-4 py-2 text-[13px] font-medium hover:border-olive-light hover:text-olive disabled:opacity-40 transition-colors"
          title="Manuální fix: AI vision alt text + lab scan pro existující fotky. Pro nové se dělá automaticky při discovery. Stojí ~$2 v Claude API."
        >
          {running === 'vision' ? '👁️ Vidím…' : '👁️ Doplnit vision'}
        </button>
      </div>
      <div className="text-[11px] text-text3 max-w-[420px] text-right leading-snug">
        Tlačítka <strong>Doplnit</strong> jsou pojistka — pro nové produkty se vše dělá automaticky
        v discovery cronu. Klikni jen pro retroaktivní fix nebo po výpadku Claude API.
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
