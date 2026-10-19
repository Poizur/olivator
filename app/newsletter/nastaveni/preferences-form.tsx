'use client'

import { useState } from 'react'

const OPTIONS = [
  { key: 'weekly', label: 'Týdenní přehled', hint: 'Každý čtvrtek: olej týdne, slevy a novinky.' },
  { key: 'deals', label: 'Mimořádné slevy', hint: 'Jen když cena oleje výrazně klesne.' },
  { key: 'harvest', label: 'Nová sklizeň', hint: 'Když dorazí oleje z nové sklizně.' },
  { key: 'alerts', label: 'Hlídání cen', hint: 'Upozornění na oleje, u kterých hlídáte cenu.' },
] as const

type Prefs = Record<(typeof OPTIONS)[number]['key'], boolean>

export function PreferencesForm({ token, initial, unsubscribeUrl }: { token: string; initial: Prefs; unsubscribeUrl: string }) {
  const [prefs, setPrefs] = useState<Prefs>(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    const res = await fetch('/api/newsletter/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, preferences: prefs }),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.ok) {
      setState('saved')
      setMessage('Uloženo.')
    } else {
      setState('error')
      setMessage(data.error ?? 'Uložení se nepovedlo.')
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      {OPTIONS.map((o) => (
        <label key={o.key} className="flex items-start gap-3 bg-white border border-off2 rounded-xl p-4 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 accent-[var(--color-olive,#2d6a4f)]"
            checked={prefs[o.key]}
            onChange={(e) => {
              setPrefs({ ...prefs, [o.key]: e.target.checked })
              setState('idle')
            }}
          />
          <span>
            <span className="block text-[15px] font-medium text-text">{o.label}</span>
            <span className="block text-[13px] text-text2">{o.hint}</span>
          </span>
        </label>
      ))}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <button
          type="submit"
          disabled={state === 'saving'}
          className="bg-olive text-white text-[14px] font-medium px-5 py-2.5 rounded-full hover:bg-olive2 disabled:opacity-60"
        >
          {state === 'saving' ? 'Ukládám…' : 'Uložit nastavení'}
        </button>
        <a href={unsubscribeUrl} className="text-[13px] text-text2 underline">
          Odhlásit všechny e-maily
        </a>
      </div>
      {message && (
        <p role="status" className={`text-[13px] ${state === 'error' ? 'text-red-700' : 'text-olive'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
