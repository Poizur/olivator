'use client'

// Bulk regenerate editorial content přes /api/admin/generate-entity-content.
// Iteruje přes všechny entity daného typu, jeden Claude call per entitu (~30-60s).
// Progress feedback během regenerace.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  entityType: 'regions' | 'brands' | 'cultivars' | 'all'
  estimatedCount?: number
  label?: string
}

const TYPE_LABELS: Record<string, string> = {
  regions: 'všechny regiony',
  brands: 'všechny značky',
  cultivars: 'všechny odrůdy',
  all: 'VŠECHNY entity (regiony + značky + odrůdy)',
}

export function RegenerateAllButton({ entityType, estimatedCount, label }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{
    ok: boolean
    msg: string
    detail?: string
  } | null>(null)

  async function regenerate() {
    const typeLabel = TYPE_LABELS[entityType]
    const estimate = estimatedCount ? `~${estimatedCount}` : 'několika'
    const minutes = estimatedCount ? Math.ceil(estimatedCount * 0.7) : 5
    const cost = estimatedCount ? `~$${(estimatedCount * 0.05).toFixed(2)}` : '~$0.50'

    const confirmMsg = `Přepsat editorial obsah pro ${typeLabel}?

• Volání Claude AI pro ${estimate} entit
• Trvá ~${minutes} minut (nepřerušuj)
• Náklady: ${cost} (Claude Sonnet)
• Stávající text bude PŘEPSÁN

Pokračovat?`

    if (!confirm(confirmMsg)) return

    setBusy(true)
    setFeedback({ ok: true, msg: `⏳ Regeneruji ${typeLabel}… nezavírej okno.` })

    try {
      const res = await fetch('/api/admin/generate-entity-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Regenerate failed')
      }

      const ok = data.generated ?? 0
      const failed = data.failed ?? 0
      const total = ok + failed
      setFeedback({
        ok: failed === 0,
        msg: failed === 0
          ? `✅ Vygenerováno ${ok} z ${total}`
          : `⚠️ Hotovo: ${ok} úspěšně, ${failed} selhalo`,
        detail: data.results
          ?.filter((r: { ok: boolean; error?: string }) => !r.ok)
          .slice(0, 5)
          .map((r: { slug: string; error?: string }) => `${r.slug}: ${r.error}`)
          .join(', '),
      })
      router.refresh()
    } catch (err) {
      setFeedback({
        ok: false,
        msg: `❌ ${err instanceof Error ? err.message : 'Chyba'}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={regenerate}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-white border border-olive-border text-olive-dark hover:bg-olive-bg/40 rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-50 transition-colors"
      >
        {busy ? '⏳ Regeneruji…' : `✨ ${label ?? `Přepsat všechny`}`}
      </button>
      {feedback && (
        <div
          className={`mt-2 text-[12px] ${feedback.ok ? 'text-olive-dark' : 'text-red-700'}`}
        >
          {feedback.msg}
          {feedback.detail && <div className="text-[11px] text-text3 mt-1">{feedback.detail}</div>}
        </div>
      )}
    </div>
  )
}
