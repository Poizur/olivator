'use client'

import { useState } from 'react'

interface Props {
  source?: 'footer' | 'homepage' | 'product_page'
  variant?: 'inline' | 'hero' | 'dark'
}

/** Newsletter signup form. Sends POST /api/newsletter, shows confirmation. */
export function NewsletterSignup({ source = 'footer', variant = 'inline' }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'sending') return
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
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
          <div className="text-[12px] text-white/60">První Olej měsíce ti přijde příští úterý.</div>
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
            <div className="text-[13px] text-text2 mt-1">První Olej měsíce ti přijde příští úterý.</div>
          </>
        ) : (
          <span className="ml-1">Hotovo, jsi přihlášený. První email přijde příští týden.</span>
        )}
      </div>
    )
  }

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
        <div className="text-[10px] text-white/50">Bez spamu. Odhlásit se dá jedním klikem.</div>
      </form>
    )
  }

  if (variant === 'hero') {
    return (
      <form
        onSubmit={onSubmit}
        className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 max-w-[480px] mx-auto"
      >
        <div className="text-center mb-4">
          <div className="text-base font-semibold text-text mb-1">Olej měsíce — newsletter</div>
          <div className="text-[13px] text-text2 leading-relaxed">
            Týdně 1 e-mail: nejlepší olej týdne, sleva nebo recept. Žádný spam.
          </div>
        </div>
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
          Bez spamu. Odhlásit se dá jedním klikem.
        </div>
      </form>
    )
  }

  // Inline (footer) variant
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 max-w-[280px]">
      <div className="text-[12px] font-semibold text-text">Olej měsíce — newsletter</div>
      <div className="flex gap-1.5">
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
