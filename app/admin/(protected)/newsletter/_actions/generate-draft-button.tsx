'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function GenerateDraftButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function generate() {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/newsletter/generate', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Chyba')
      setResult({ ok: true, message: `✅ Draft vytvořen: ${data.subject}` })
      // Po 2 sekundách přesměruj na nový draft
      setTimeout(() => {
        router.push(`/admin/newsletter/drafts/${data.draftId}`)
      }, 1500)
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Chyba',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={busy}
        className="border border-olive-border bg-olive-bg/30 rounded-xl p-4 hover:bg-olive-bg/50 transition-colors w-full text-left disabled:opacity-50"
      >
        <div className="text-[13px] font-medium text-olive-dark mb-1">
          {busy ? '⏳ Generuji draft…' : '✨ Vygenerovat nový draft'}
        </div>
        <div className="text-[11px] text-olive leading-snug">
          AI vybere obsah z DB, vytvoří hook, vyrenderuje email — pak ho schválíš
        </div>
      </button>
      {result && (
        <div
          className={`text-[12px] mt-2 ${result.ok ? 'text-olive-dark' : 'text-red-600'}`}
        >
          {result.message}
        </div>
      )}
    </div>
  )
}
