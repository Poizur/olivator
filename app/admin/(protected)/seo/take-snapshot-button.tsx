'use client'

import { useState, useTransition } from 'react'
import { takeSnapshotNow } from './actions'

export function TakeSnapshotButton() {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function handle() {
    setMsg(null)
    startTransition(async () => {
      const result = await takeSnapshotNow()
      setMsg(result.ok ? `✓ ${result.snapshots} snapshotů` : 'Chyba')
      setTimeout(() => setMsg(null), 3000)
    })
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className={`text-[12px] border border-off2 bg-white hover:bg-off rounded-md px-3 py-1.5 transition-colors ${pending ? 'opacity-60' : ''}`}
    >
      {pending ? 'Snímám…' : msg ?? '📸 Vzít snapshot'}
    </button>
  )
}
