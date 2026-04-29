'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Result {
  total: number
  succeeded: number
  failed: number
  results: Array<{ id: string; name: string; ok: boolean; reason?: string }>
}

export function BulkFetchImagesButton() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onRun() {
    if (!confirm('Spustit načtení chybějících fotek z Open Food Facts? Může trvat pár minut.')) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/products/fetch-missing-images', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Batch failed')
      setResult(data)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="text-[12px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-md px-3.5 py-1.5 disabled:opacity-40 transition-colors"
      >
        {running ? 'Načítám…' : 'Doplnit chybějící fotky'}
      </button>

      {error && (
        <span className="text-xs text-red-400 bg-red-500/100/10 border border-red-500/20 rounded-lg px-3 py-1.5 w-full">
          {error}
        </span>
      )}
      {result && (
        <div className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 w-full">
          <div className="text-white">
            Hotovo: <strong className="text-olive">{result.succeeded} uloženo</strong>
            {result.failed > 0 && (
              <> &middot; <span className="text-amber-400">{result.failed} selhalo</span></>
            )}
          </div>
          {result.failed > 0 && (
            <details className="mt-2 text-zinc-400">
              <summary className="cursor-pointer">Detail chyb</summary>
              <ul className="mt-1 space-y-0.5">
                {result.results.filter(r => !r.ok).map(r => (
                  <li key={r.id}>
                    <span className="text-white">{r.name}</span>: {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </>
  )
}
