'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  draftCount: number
}

export function BulkRescrapeButton({ draftCount }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  if (draftCount === 0) return null

  async function rescrape() {
    const minutes = Math.ceil((draftCount * 60) / 60)
    if (
      !confirm(
        `Rescrape všech ${draftCount} draftů?\n\nPro každý: scrape → fakta → flavor → AI popisy → Score → galerie + auto lab scan. Cca ${minutes} min, $${(draftCount * 0.05).toFixed(2)} Claude API.\n\nServer zpracuje max 10 v jednom běhu — pokud máš víc, klikni znovu.`
      )
    )
      return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/products/bulk-rescrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', limit: 10 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Bulk rescrape selhal')
      setFeedback({
        ok: data.failed === 0,
        msg:
          data.failed === 0
            ? `✅ Hotovo: ${data.succeeded}/${data.processed} draftů zpracováno`
            : `⚠️ ${data.succeeded} OK, ${data.failed} selhalo — zkontroluj`,
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
        onClick={rescrape}
        disabled={busy}
        className="bg-white border border-olive-border text-olive-dark hover:bg-olive-bg/40 rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-50 transition-colors"
        title="Pro všechny drafty: scrape + fakta + AI popisy + Score + galerie + lab scan"
      >
        {busy ? '⏳ Zpracovávám…' : `✨ Rescrape všech ${draftCount} draftů`}
      </button>
      {feedback && (
        <span
          className={`text-[12px] ${
            feedback.ok ? 'text-olive-dark' : 'text-red-700'
          }`}
        >
          {feedback.msg}
        </span>
      )}
    </div>
  )
}
