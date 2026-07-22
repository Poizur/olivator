'use client'

import { useState } from 'react'

interface Option {
  label: string
  description: string
  impact: string
}

interface Props {
  decisionId: string
  options: Option[]
  currentChoice: string | null
}

const CHOICE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  ANO: { bg: 'bg-olive/10', text: 'text-olive font-semibold', border: 'border-olive' },
  NE: { bg: 'bg-red-50', text: 'text-red-700 font-semibold', border: 'border-red-300' },
  ODLOŽIT: { bg: 'bg-amber-50', text: 'text-amber-700 font-semibold', border: 'border-amber-300' },
}

export function DecisionButtons({ decisionId, options, currentChoice }: Props) {
  const [chosen, setChosen] = useState<string | null>(currentChoice)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleChoice(label: string) {
    if (chosen === label) return
    setLoading(label)
    setError(null)
    try {
      const res = await fetch('/api/admin/brief/decision', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, choice: label }),
      })
      if (!res.ok) throw new Error(await res.text())
      setChosen(label)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isChosen = chosen === opt.label
          const isLoading = loading === opt.label
          const style = CHOICE_STYLE[opt.label] ?? { bg: 'bg-off', text: 'text-text2', border: 'border-off2' }
          return (
            <button
              key={opt.label}
              onClick={() => handleChoice(opt.label)}
              disabled={!!loading}
              className={`
                px-4 py-2 rounded-xl text-[13px] border transition-all
                ${isChosen
                  ? `${style.bg} ${style.text} ${style.border} ring-2 ring-offset-1 ring-current`
                  : 'bg-off border-off2 text-text2 hover:border-text3 hover:text-text'
                }
                disabled:opacity-50
              `}
              title={opt.description}
            >
              {isLoading ? '...' : (isChosen ? `✓ ${opt.label}` : opt.label)}
            </button>
          )
        })}
      </div>

      {chosen && !loading && (
        <div className="text-[12px] text-text3">
          {options.find((o) => o.label === chosen)?.impact}
        </div>
      )}

      {error && <div className="text-[12px] text-red-600">{error}</div>}
    </div>
  )
}
