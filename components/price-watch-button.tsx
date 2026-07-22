'use client'

import { useState } from 'react'

interface Props {
  productId: string
  productName: string
}

type State = 'idle' | 'open' | 'submitting' | 'double_opt_in' | 'auto_confirmed' | 'error'

export function PriceWatchButton({ productId, productName }: Props) {
  const [state, setState] = useState<State>('idle')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) {
      setErrorMsg('Souhlas se zpracováním je povinný.')
      return
    }
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/price-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, productId, consentGiven: true }),
      })
      const data = (await res.json()) as { ok: boolean; flow?: string; error?: string }
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Nepodařilo se nastavit hlídání. Zkus to znovu.')
        setState('open')
        return
      }
      setState(data.flow === 'auto_confirmed' ? 'auto_confirmed' : 'double_opt_in')
    } catch {
      setErrorMsg('Chyba připojení. Zkus to znovu.')
      setState('open')
    }
  }

  if (state === 'double_opt_in') {
    return (
      <div className="text-[13px] text-text2 bg-olive-bg border border-olive-border rounded-xl px-4 py-3 text-center">
        <span className="text-olive font-medium">📧 Potvrďte email</span>
        <br />
        <span className="text-[12px] text-text3">Poslali jsme odkaz na {email}. Klikni a hlídání se aktivuje.</span>
      </div>
    )
  }

  if (state === 'auto_confirmed') {
    return (
      <div className="text-[13px] text-text2 bg-olive-bg border border-olive-border rounded-xl px-4 py-3 text-center">
        <span className="text-olive font-medium">✓ Nastaveno</span>
        <br />
        <span className="text-[12px] text-text3">Hlídáme za vás. Email přijde jakmile cena klesne.</span>
      </div>
    )
  }

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setState('open')}
        className="text-[12px] text-text2 hover:text-olive transition-colors underline underline-offset-2"
      >
        🔔 Hlídat cenu
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-off border border-off2 rounded-xl px-4 py-3 text-left mt-1">
      <div className="text-[12px] font-medium text-text mb-2">
        Hlídat cenu — {productName}
      </div>
      <input
        type="email"
        required
        placeholder="váš@email.cz"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full text-[13px] border border-off2 rounded-lg px-3 py-2 mb-2 outline-none focus:border-olive transition-colors bg-white"
        disabled={state === 'submitting'}
      />
      <label className="flex items-start gap-2 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 shrink-0 accent-olive"
          disabled={state === 'submitting'}
        />
        <span className="text-[11px] text-text3 leading-snug">
          Souhlasím se zasíláním cenových upozornění na zadaný email.{' '}
          <a href="/zasady-ochrany-soukromi" className="text-olive underline" target="_blank" rel="noopener">
            Zásady ochrany soukromí
          </a>
          .
        </span>
      </label>
      {errorMsg && <p className="text-[11px] text-red-500 mb-2">{errorMsg}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="flex-1 bg-olive text-white rounded-lg py-2 text-[13px] font-medium hover:bg-olive-dark transition-colors disabled:opacity-50"
        >
          {state === 'submitting' ? 'Nastavuji…' : 'Hlídat cenu'}
        </button>
        <button
          type="button"
          onClick={() => { setState('idle'); setErrorMsg('') }}
          className="text-[12px] text-text3 hover:text-text transition-colors px-2"
          disabled={state === 'submitting'}
        >
          Zrušit
        </button>
      </div>
    </form>
  )
}
