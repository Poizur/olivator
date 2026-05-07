'use client'

import { useState, useTransition } from 'react'
import { runProposalAuditNow } from './actions'

export function RunProposalAuditButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handle() {
    setResult(null)
    startTransition(async () => {
      const r = await runProposalAuditNow()
      setResult(`✓ ${r.totalDetected} návrhů (${r.totalNew} new) za ${r.elapsed}s`)
      setTimeout(() => setResult(null), 6000)
    })
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className={`text-[12px] bg-olive text-white hover:bg-olive2 rounded-md px-3 py-1.5 transition-colors ${pending ? 'opacity-60' : ''}`}
    >
      {pending ? 'Skenuji…' : result ?? '🔍 Spustit audit teď'}
    </button>
  )
}
