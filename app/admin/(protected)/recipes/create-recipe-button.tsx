'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateRecipeButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function createBlank() {
    const title = prompt('Název receptu:')
    if (!title?.trim()) return

    setBusy(true)
    try {
      const res = await fetch('/api/admin/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/admin/recipes/${data.slug}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Chyba')
      setBusy(false)
    }
  }

  return (
    <button
      onClick={createBlank}
      disabled={busy}
      className="inline-flex items-center gap-1.5 bg-olive text-white rounded-full px-4 py-2 text-[13px] font-medium hover:bg-olive-dark disabled:opacity-40"
    >
      {busy ? '⏳ Vytvářím…' : '+ Nový recept'}
    </button>
  )
}
