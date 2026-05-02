'use client'

import { useState } from 'react'

interface Props {
  source?: 'footer' | 'homepage' | 'product_page' | 'quiz_result'
  variant?: 'inline' | 'hero' | 'dark'
}

export interface Preferences {
  weekly: boolean
  deals: boolean
  harvest: boolean
  alerts: boolean
}

const DEFAULT_PREFERENCES: Preferences = {
  weekly: true,
  deals: true,
  harvest: false,
  alerts: false,
}

const PREFERENCE_OPTIONS: Array<{
  key: keyof Preferences
  label: string
  description: string
  frequency: string
}> = [
  {
    key: 'weekly',
    label: 'Týdenní souhrn',
    description: 'Olej týdne, recepty, novinky',
    frequency: '1× týdně, čtvrtek',
  },
  {
    key: 'deals',
    label: 'Velké slevy',
    description: 'Drops 15 %+ na top oleje',
    frequency: 'ad hoc, max 2× týdně',
  },
  {
    key: 'harvest',
    label: 'Sezónní sklizeň',
    description: 'První letošní řecká, italská, španělská…',
    frequency: '3-4× ročně',
  },
  {
    key: 'alerts',
    label: 'Cenové alerty',
    description: 'Email až olej co sleduješ klesne pod tvůj limit',
    frequency: 'jen když cena klesne',
  },
]

/** Newsletter signup form. Sends POST /api/newsletter, shows confirmation. */
export function NewsletterSignup({ source = 'footer', variant = 'inline' }: Props) {
  const [email, setEmail] = useState('')
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function togglePref(key: keyof Preferences) {
    setPreferences((p) => ({ ...p, [key]: !p[key] }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'sending') return

    // Validace: aspoň jedna preference musí být zaškrtnutá
    const anySelected = Object.values(preferences).some(Boolean)
    if (!anySelected) {
      setStatus('error')
      setErrorMsg('Vyber alespoň jeden typ obsahu')
      return
    }

    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source, preferences }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Nepodařilo se přihlásit')
      setStatus('success')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Něco selhalo')
    }
  }

  if (status === 'success') {
    if (variant === 'dark') {
      return (
        <div className="text-[14px] text-olive4">
          <div className="font-semibold mb-0.5">✓ Hotovo, jsi přihlášený</div>
          <div className="text-[12px] text-white/60">První email ti přijde příští čtvrtek.</div>
        </div>
      )
    }
    return (
      <div
        className={
          variant === 'hero'
            ? 'bg-olive-bg border border-olive-border rounded-[var(--radius-card)] p-6 text-center'
            : 'text-[12px] text-olive'
        }
      >
        <span aria-hidden="true">✓</span>
        {variant === 'hero' ? (
          <>
            <div className="text-base font-semibold text-olive-dark mt-2">Hotovo, jsi přihlášený</div>
            <div className="text-[13px] text-text2 mt-1">První email ti přijde příští čtvrtek.</div>
          </>
        ) : (
          <span className="ml-1">Hotovo, jsi přihlášený. První email přijde příští čtvrtek.</span>
        )}
      </div>
    )
  }

  // ── Hero variant — plný preference picker ────────────────────────────────
  if (variant === 'hero') {
    return (
      <form
        onSubmit={onSubmit}
        className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 md:p-8 max-w-[560px] mx-auto"
      >
        <div className="text-center mb-5">
          <div className="text-[18px] font-semibold text-text mb-1">
            Olivový týden — co tě zajímá?
          </div>
          <div className="text-[13px] text-text2 leading-relaxed">
            Vyber si typy obsahu. Pošleme jen to co chceš, nikdy spam.
          </div>
        </div>

        {/* Preference picker */}
        <div className="space-y-2 mb-5">
          {PREFERENCE_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                preferences[opt.key]
                  ? 'bg-olive-bg/40 border-olive-border'
                  : 'bg-off/50 border-off2 hover:border-olive-border/60'
              }`}
            >
              <input
                type="checkbox"
                checked={preferences[opt.key]}
                onChange={() => togglePref(opt.key)}
                className="mt-0.5 w-4 h-4 accent-olive shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-text leading-tight">
                  {opt.label}
                </div>
                <div className="text-[12px] text-text3 mt-0.5 leading-snug">
                  {opt.description} · <span className="italic">{opt.frequency}</span>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Email + submit */}
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tvuj@email.cz"
            className="flex-1 px-4 py-2.5 bg-off rounded-full border-none text-[14px] text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-olive/40"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-olive-dark disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {status === 'sending' ? 'Posílám…' : 'Přihlásit se'}
          </button>
        </div>
        {status === 'error' && (
          <div className="text-[12px] text-red-600 mt-2">⚠ {errorMsg}</div>
        )}
        <div className="text-[10px] text-text3 mt-3 text-center">
          Bez spamu. Odhlásit se nebo upravit preference jedním klikem.
        </div>
      </form>
    )
  }

  // ── Dark variant — kompaktní (default preferences) ───────────────────────
  if (variant === 'dark') {
    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tvuj@email.cz"
            className="flex-1 px-4 py-2.5 bg-white/10 border border-white/15 rounded-full text-[13px] text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="bg-white text-olive-dark rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-olive-bg disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {status === 'sending' ? '…' : 'Odebírat'}
          </button>
        </div>
        {status === 'error' && <div className="text-[11px] text-red-300">⚠ {errorMsg}</div>}
        <div className="text-[10px] text-white/50">
          Týdenní souhrn + slevy. Bez spamu, odhlásit jedním klikem.
        </div>
      </form>
    )
  }

  // ── Inline variant (footer) — minimal ────────────────────────────────────
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 max-w-[280px]">
      <div className="text-[12px] font-semibold text-text">Olivový týden</div>
      <div className="text-[11px] text-text3 leading-snug -mt-1">
        Týdně 1 email: olej týdne, slevy, recepty
      </div>
      <div className="flex gap-1.5 mt-1">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tvuj@email.cz"
          className="flex-1 px-3 py-1.5 bg-white rounded-full border border-off2 text-[12px] text-text placeholder:text-text3 focus:outline-none focus:border-olive-light"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="bg-olive text-white rounded-full px-3 py-1.5 text-[12px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
        >
          {status === 'sending' ? '…' : 'Odebírat'}
        </button>
      </div>
      {status === 'error' && (
        <div className="text-[11px] text-red-600">⚠ {errorMsg}</div>
      )}
    </form>
  )
}
