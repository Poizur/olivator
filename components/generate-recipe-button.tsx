'use client'

// Tlačítko "Navrhni recept" na entity edit stránkách (region/cultivar/brand).
// AI vygeneruje strukturovaný recept jako draft → admin otevře editor → publish.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  entityType: 'region' | 'cultivar' | 'brand'
  slug: string
  entityName: string
}

export function GenerateRecipeButton({ entityType, slug, entityName }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  async function generate() {
    const dishHint = prompt(
      `Navrhni recept k ${entityName}.\n\nVolitelně zadej hint co za jídlo (např. "salát", "hlavní chod", "dezert"), nebo nech prázdné a AI vybere sama.`,
      ''
    )
    if (dishHint === null) return // cancel

    setBusy(true)
    setFeedback({ ok: true, msg: '⏳ Generuji recept… (~30s, Claude Sonnet)' })

    try {
      const res = await fetch('/api/admin/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          slug,
          dishHint: dishHint?.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setFeedback({ ok: true, msg: `✅ Hotovo: "${data.title}". Otevírám editor…` })
      // Po 1.5s redirect na nový recept
      setTimeout(() => {
        router.push(`/admin/recipes/${data.slug}`)
      }, 1500)
    } catch (err) {
      setFeedback({
        ok: false,
        msg: err instanceof Error ? err.message : 'Chyba',
      })
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="inline-flex items-center gap-1.5 bg-white border border-olive-border text-olive-dark hover:bg-olive-bg/40 rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-50"
      >
        {busy ? '⏳ Generuji…' : '🍳 Navrhni recept k této entitě'}
      </button>
      {feedback && (
        <p className={`text-[12px] mt-2 ${feedback.ok ? 'text-olive-dark' : 'text-red-700'}`}>
          {feedback.msg}
        </p>
      )}
    </div>
  )
}
