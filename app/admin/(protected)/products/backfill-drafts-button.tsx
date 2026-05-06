'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BackfillResult {
  ok: boolean
  summary: {
    total: number
    images: { added: number; existed: number; failed: number }
    meta: { added: number; existed: number; failed: number }
    region: { added: number; failed: number }
  }
  results: Array<{
    slug: string
    image: string
    meta: string
    region: string
    error?: string
  }>
}

export function BackfillDraftsButton({ draftCount }: { draftCount: number }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BackfillResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (
      !confirm(
        `Spustit backfill pro ${draftCount} draftů? Pro každý dohraje:\n\n` +
          `• Obrázek (og:image z URL retailera)\n` +
          `• Meta description (Claude Haiku, ~$0.001 / draft)\n` +
          `• Region slug (fuzzy match z názvu)\n\n` +
          `Trvá ~${Math.ceil((draftCount * 4) / 60)} min.`
      )
    ) {
      return
    }
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/products/backfill-drafts', { method: 'POST' })
      const data = (await res.json()) as BackfillResult
      if (!res.ok || !data.ok) throw new Error('Backfill selhal')
      setResult(data)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-amber-900">
            🔧 Backfill chybějících polí
          </div>
          <p className="text-[12px] text-amber-900/80 mt-0.5 leading-snug">
            Drafty z XML feedů (Heureka) přicházely bez fotek a meta_description. Tento
            backfill dohraje obrázek (og:image), meta a region. Pro budoucí drafty se
            vše ukládá automaticky.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="bg-amber-600 text-white rounded-full px-4 py-2 text-[12px] font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {running ? '⏳ Backfill běží…' : `Spustit pro ${draftCount} draftů`}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          ⚠ {error}
        </div>
      )}

      {result && (
        <div className="mt-3 text-[12px] text-amber-900 bg-white rounded-lg border border-amber-200 p-3">
          <div className="font-semibold mb-2">
            Hotovo — {result.summary.total} draftů zpracováno
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="🖼️ Obrázky"
              added={result.summary.images.added}
              existed={result.summary.images.existed}
              failed={result.summary.images.failed}
            />
            <Stat
              label="📝 Meta desc"
              added={result.summary.meta.added}
              existed={result.summary.meta.existed}
              failed={result.summary.meta.failed}
            />
            <Stat
              label="🗺️ Region"
              added={result.summary.region.added}
              existed={0}
              failed={result.summary.region.failed}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  added,
  existed,
  failed,
}: {
  label: string
  added: number
  existed: number
  failed: number
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold mb-1">{label}</div>
      <div className="text-[10px] space-y-0.5">
        <div className="text-olive">✓ doplněno: {added}</div>
        {existed > 0 && <div className="text-text3">~ už bylo: {existed}</div>}
        {failed > 0 && <div className="text-red-700">✗ selhalo: {failed}</div>}
      </div>
    </div>
  )
}
