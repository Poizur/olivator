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
        className="text-[12px] bg-off text-text2 hover:bg-olive-bg hover:text-olive border border-off2 hover:border-olive/30 rounded-full px-3.5 py-1.5 disabled:opacity-40 transition-colors"
      >
        {running ? 'Načítám…' : 'Doplnit chybějící fotky'}
      </button>

      {error && (
        <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 w-full">
          {error}
        </span>
      )}
      {result && (
        <div className="text-xs bg-white border border-off2 rounded-lg px-3 py-2 w-full">
          <div className="text-text">
            Hotovo: <strong className="text-olive">{result.succeeded} uloženo</strong>
            {result.failed > 0 && (
              <> &middot; <span className="text-terra">{result.failed} selhalo</span></>
            )}
          </div>
          {result.failed > 0 && (
            <details className="mt-2 text-text2">
              <summary className="cursor-pointer">Detail chyb</summary>
              <ul className="mt-1 space-y-0.5">
                {result.results.filter(r => !r.ok).map(r => (
                  <li key={r.id}>
                    <span className="text-text">{r.name}</span>: {r.reason}
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
