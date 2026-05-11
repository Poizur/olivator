'use client'

import { useState } from 'react'

export function BulkFillSpecsButton() {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ updated: number; skipped: number; total: number } | null>(null)

  async function run() {
    setState('running')
    try {
      const res = await fetch('/api/admin/products/bulk-fill-specs', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Chyba')
      setResult(data)
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done' && result) {
    return (
      <span className="text-[12px] text-olive-dark bg-olive-bg border border-olive-border rounded-full px-4 py-2">
        ✓ Doplněno {result.updated} produktů z {result.total}
      </span>
    )
  }

  return (
    <button
      onClick={run}
      disabled={state === 'running'}
      title="Doplní chybějící oleokantal, rok sklizně, zpracování a polyfenoly ze scrapnutých dat (bez re-scrape)"
      className="bg-off border border-off2 text-text2 rounded-full px-4 py-2 text-[13px] hover:text-text hover:border-text3 disabled:opacity-40 transition-colors"
    >
      {state === 'running' ? '⏳ Doplňuji specifikace…' : state === 'error' ? '⚠ Chyba — zkus znovu' : '🔧 Doplnit chybějící specs'}
    </button>
  )
}
