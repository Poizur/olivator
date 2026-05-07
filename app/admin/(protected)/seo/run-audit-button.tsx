'use client'

import { useState, useTransition } from 'react'
import { runAutoAuditNow } from './actions'

export function RunAuditButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handle() {
    if (!confirm('Spustit auto-audit? Opraví junk brandy, deterministicky vyřeší quality issues + sejme snapshot. ~10 sekund.')) return
    setResult(null)
    startTransition(async () => {
      const r = await runAutoAuditNow()
      if (r.ok) {
        setResult(`✓ ${r.totalFixed} oprav za ${r.elapsed}s · ${r.detail.junkBrands ?? 0} brandů, ${r.detail.qualityFixes ?? 0} quality, ${r.detail.snapshots ?? 0} snapshotů`)
      } else {
        setResult('Chyba')
      }
      setTimeout(() => setResult(null), 8000)
    })
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className={`text-[12px] bg-olive text-white hover:bg-olive2 rounded-md px-3 py-1.5 transition-colors ${pending ? 'opacity-60' : ''}`}
      title="Spustí stejné kroky jako denní cron — junk brandy, deterministické quality fixes, snapshot"
    >
      {pending ? 'Auditing…' : result ?? '🔧 Spustit audit teď'}
    </button>
  )
}
