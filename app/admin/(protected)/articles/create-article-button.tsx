'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORY_OPTIONS = [
  { value: 'pruvodce', label: 'Průvodce' },
  { value: 'zebricek', label: 'Žebříček' },
  { value: 'srovnani', label: 'Srovnání' },
  { value: 'vzdelavani', label: 'Vzdělávání' },
]

export function CreateArticleButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function createBlank() {
    const title = prompt('Název článku:')
    if (!title?.trim()) return
    const category = prompt(
      'Kategorie? (pruvodce / zebricek / srovnani / vzdelavani)',
      'pruvodce'
    )
    if (!category || !CATEGORY_OPTIONS.some((c) => c.value === category)) {
      alert('Neplatná kategorie')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/admin/articles/${data.slug}`)
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
      {busy ? '⏳ Vytvářím…' : '+ Nový článek'}
    </button>
  )
}
