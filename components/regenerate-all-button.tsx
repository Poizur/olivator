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
  /** Pokud true, zahrne extras (TL;DR, terroir, FAQ) — default true */
  includeExtras?: boolean
  /** Pokud true, nastaví status='active' (publish) — default true */
  setActive?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  regions: 'všechny regiony',
  brands: 'všechny značky',
  cultivars: 'všechny odrůdy',
  all: 'VŠECHNY entity (regiony + značky + odrůdy)',
}

export function RegenerateAllButton({
  entityType,
  estimatedCount,
  label,
  includeExtras = true,
  setActive = true,
}: Props) {
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
        body: JSON.stringify({ entityType, includeExtras, setActive }),
      })

      // Robust parsing — server může vrátit HTML při timeout/proxy error.
      // V tom případě zkusíme přečíst text a dát user srozumitelný hint.
      let data: { ok?: boolean; error?: string; generated?: number; failed?: number; results?: Array<{ ok: boolean; slug: string; error?: string }> } = {}
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}))
      } else {
        const text = await res.text().catch(() => '')
        const snippet = text.slice(0, 200).replace(/\s+/g, ' ')
        throw new Error(
          `Server vrátil ne-JSON odpověď (HTTP ${res.status}). Pravděpodobně timeout nebo gateway error. Obsah je možná publikovaný i tak — zkontroluj /oblast, /znacka, /odruda. Náhled: ${snippet}`
        )
      }
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
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
      // Browser timeout / network abort se hlásí jako DOMException s různě
      // obskurními messages („The string did not match the expected pattern",
      // „Failed to fetch"). Server pravděpodobně dál běží a content je
      // publikovaný — řekneme to user.
      const raw = err instanceof Error ? err.message : 'Chyba'
      const looksLikeAbort =
        raw.includes('did not match') ||
        raw.includes('Failed to fetch') ||
        raw.includes('aborted') ||
        raw.includes('NetworkError')
      setFeedback({
        ok: false,
        msg: looksLikeAbort
          ? `⚠️ Spojení se přerušilo (${raw}). Generování ale typicky doběhne na serveru — počkej 5–10 min, pak obnov stránku a zkontroluj /oblast/[slug], /znacka/[slug], /odruda/[slug] jestli je obsah živý.`
          : `❌ ${raw}`,
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
