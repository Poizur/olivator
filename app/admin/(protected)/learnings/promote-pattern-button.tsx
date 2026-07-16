'use client'

import { useState } from 'react'

interface Props {
  patternId: string
  signature: string
}

export function PromotePatternButton({ patternId, signature }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handlePromote() {
    setState('loading')
    try {
      const res = await fetch('/api/admin/learnings/promote-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId }),
      })
      if (!res.ok) throw new Error(await res.text())
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <span className="text-[12px] text-olive font-medium shrink-0">✓ Označeno</span>
    )
  }

  return (
    <button
      onClick={handlePromote}
      disabled={state === 'loading'}
      title={`Označit pattern "${signature}" jako converted`}
      className="shrink-0 text-[12px] border border-off2 text-text2 rounded-lg px-3 py-1.5 hover:border-olive3/50 hover:text-olive transition-colors disabled:opacity-40"
    >
      {state === 'loading' ? '...' : state === 'error' ? 'Chyba' : 'Vytvořit lekci →'}
    </button>
  )
}
