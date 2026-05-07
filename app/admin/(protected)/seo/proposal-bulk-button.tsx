'use client'

import { useState, useTransition } from 'react'
import { applyAllProposalsByRule } from './actions'

export function ProposalBulkButton({ ruleId, count }: { ruleId: string; count: number }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Opravit všech ${count} návrhů pro tento typ?\n\nNěkteré akce volají Claude/Unsplash API — může trvat ${Math.ceil(count * 5)}s.`)) return
    setResult(null)
    startTransition(async () => {
      const r = await applyAllProposalsByRule(ruleId)
      setResult(`${r.ok}/${r.total} ok`)
      setTimeout(() => setResult(null), 5000)
    })
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className={`text-[11px] bg-olive text-white hover:bg-olive2 rounded-md px-2.5 py-1 transition-colors ${pending ? 'opacity-60' : ''}`}
    >
      {pending ? `${count} …` : result ?? `✓ Opravit všech ${count}`}
    </button>
  )
}
