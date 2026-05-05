'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BulkResult {
  slug: string
  name: string
  status: 'applied' | 'pending_review' | 'rejected' | 'no_url' | 'error'
  confidence: number | null
  message: string
}

interface BulkResponse {
  ok: boolean
  summary: {
    total: number
    applied: number
    pending: number
    rejected: number
    no_url: number
    error: number
  }
  results: BulkResult[]
}

export function BrandAutoFillBulkButton({ emptyCount }: { emptyCount: number }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BulkResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(force: boolean) {
    const label = force
      ? 'Tohle PŘEPÍŠE i značky které už mají popis. Pokračovat?'
      : `Auto-fill spustí se pro ${emptyCount} značek bez popisu. Bude trvat ~${Math.ceil((emptyCount * 30) / 60)} min. Pokračovat?`
    if (!confirm(label)) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/brands/auto-research-bulk${force ? '?force=1' : ''}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Bulk selhal')
      setResult(data as BulkResponse)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="bg-olive-bg/40 border border-olive-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[13px] font-semibold text-olive-dark">🚀 Bulk auto-fill značek</h3>
          <p className="text-[12px] text-olive-dark/80 mt-0.5">
            Pro každou značku najde web výrobce, ověří match a uloží polished CZ draft. Sekvenčně, ~30 s/značka.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => run(false)}
            disabled={running || emptyCount === 0}
            className="bg-olive text-white rounded-full px-4 py-1.5 text-[12px] font-medium hover:bg-olive2 disabled:opacity-40 transition-colors"
          >
            {running ? '⏳ Pracuji…' : `Vyplnit ${emptyCount} prázdných`}
          </button>
          <button
            type="button"
            onClick={() => run(true)}
            disabled={running}
            className="text-[11px] text-olive-dark hover:underline disabled:opacity-40"
          >
            Přepsat vše
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          ⚠ {error}
        </div>
      )}

      {result && (
        <div className="text-[12px] space-y-2 border-t border-olive-border pt-3">
          <div className="flex gap-3 flex-wrap">
            <Stat label="Celkem" value={result.summary.total} />
            <Stat label="Aplikováno" value={result.summary.applied} color="text-olive" />
            <Stat label="K revizi" value={result.summary.pending} color="text-amber-700" />
            <Stat label="Cross-check ✗" value={result.summary.rejected} color="text-red-700" />
            <Stat label="Bez URL" value={result.summary.no_url} color="text-red-700" />
            <Stat label="Chyba" value={result.summary.error} color="text-red-700" />
          </div>
          <details className="text-[11px]">
            <summary className="cursor-pointer text-text2 hover:text-text">Detail per značka</summary>
            <ul className="mt-2 space-y-1 max-h-72 overflow-y-auto">
              {result.results.map((r) => (
                <li key={r.slug} className="bg-white rounded border border-off2 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text">{r.name}</span>
                    <span className={`text-[10px] uppercase tracking-wider ${statusColor(r.status)}`}>
                      {r.status}
                      {r.confidence !== null && ` ${r.confidence}`}
                    </span>
                  </div>
                  <div className="text-text3 leading-snug">{r.message}</div>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color = 'text-text' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-[11px]">
      <div className="text-text3 uppercase tracking-wider text-[10px]">{label}</div>
      <div className={`font-semibold text-[14px] ${color}`}>{value}</div>
    </div>
  )
}

function statusColor(s: BulkResult['status']) {
  if (s === 'applied') return 'text-olive'
  if (s === 'pending_review') return 'text-amber-700'
  return 'text-red-700'
}
