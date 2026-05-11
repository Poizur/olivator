'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BackfillOriginButton({ missingCount }: { missingCount: number }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ filled: number; skipped: number } | null>(null)

  if (missingCount === 0) return null

  async function run() {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/products/backfill-origin', { method: 'POST' })
      const data = await res.json() as { filled: number; skipped: number }
      setResult(data)
      router.refresh()
    } catch {
      setResult({ filled: 0, skipped: missingCount })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[13px] font-semibold text-amber-900">🏳️ Chybí vlajky — {missingCount} produktů bez origin_country</div>
        <div className="text-[11px] text-amber-700 mt-0.5">Automaticky doplní zemi původu z názvu a popisu produktu.</div>
        {result && (
          <div className="text-[11px] text-olive mt-1">
            ✓ Doplněno: {result.filled} &nbsp;·&nbsp; Nelze odhadnout: {result.skipped} (vyplň ručně)
          </div>
        )}
      </div>
      <button
        onClick={run}
        disabled={running}
        className="bg-amber-600 text-white rounded-full px-4 py-2 text-[12px] font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
      >
        {running ? '⏳ Probíhá…' : `Doplnit vlajky →`}
      </button>
    </div>
  )
}
