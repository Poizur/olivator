'use client'

import { useState, useId } from 'react'

interface LeadMagnetCtaProps {
  title?: string
  description?: string
  compact?: boolean
  /** Vizuální varianta: 'default' | 'compact' | 'sidebar' | 'banner' | 'slim' | 'strip' */
  variant?: 'default' | 'compact' | 'sidebar' | 'banner' | 'slim' | 'strip'
  /** Zdrojový tag pro analytics — uloží se do newsletter_signups.source */
  source?: string
}

export function LeadMagnetCta({ title, description, compact = false, variant = 'default', source = 'lead_magnet' }: LeadMagnetCtaProps) {
  // legacy compact prop → map to variant
  const effectiveVariant = compact && variant === 'default' ? 'compact' : variant
  const [email, setEmail] = useState('')
  const [gdpr, setGdpr] = useState(false)
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputId = useId()
  const checkId = useId()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (effectiveVariant === 'default' || effectiveVariant === 'compact') {
      if (!gdpr) { setErrorMsg('Prosím potvrďte souhlas se zasíláním.'); return }
    }

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source,
          preferences: { weekly: true, deals: true, harvest: false, alerts: false },
        }),
      })

      const data = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Něco se nepovedlo. Zkuste to za chvíli.')
        setState('error')
        return
      }

      setState('sent')
    } catch {
      setErrorMsg('Síťová chyba. Zkontrolujte připojení a zkuste znovu.')
      setState('error')
    }
  }

  const defaultTitle = 'Průvodce výběrem olivového oleje — zdarma'
  const defaultDesc = '6 sekcí · infografiky · nákupní checklist · jak číst etiketu'

  // ── Slim (footer, dark) ──────────────────────────────────────────────────
  if (effectiveVariant === 'slim') {
    if (state === 'sent') return <p className="text-[13px] text-[#b7e4c7]">✓ Potvrzovací email odeslán — mrkni do schránky.</p>
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
        <span className="text-[13px] text-white/75 shrink-0">📖 Průvodce olivovými oleji zdarma:</span>
        <div className="flex gap-2 flex-1 min-w-[240px]">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tvuj@email.cz" disabled={state === 'loading'}
            className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 min-w-0" />
          <button type="submit" disabled={state === 'loading'}
            className="bg-white text-[#1b4332] rounded-full px-4 py-1.5 text-[13px] font-semibold hover:bg-[#d8f3dc] disabled:opacity-40 transition-colors whitespace-nowrap">
            {state === 'loading' ? '…' : 'Stáhnout →'}
          </button>
        </div>
        {errorMsg && <span className="text-[11px] text-red-300 w-full">⚠ {errorMsg}</span>}
        <span className="text-[10px] text-white/35 w-full">
          Bez spamu. Odhlásit 1 klikem.{' '}
          <a href="/ochrana-osobnich-udaju" className="underline decoration-dotted text-white/45">Zásady OOU.</a>
        </span>
      </form>
    )
  }

  // ── Strip (slevy — newsletter framing, light) ────────────────────────────
  if (effectiveVariant === 'strip') {
    if (state === 'sent') return (
      <div className="bg-[#d8f3dc] border border-[#b7e4c7] rounded-[var(--radius-card)] px-5 py-3.5 text-[14px] font-medium text-[#1b4332]">
        ✓ Hotovo! Potvrzovací email odeslán — nové slevy dorazí každý čtvrtek v 8:00.
      </div>
    )
    return (
      <div>
        <div className="bg-[#d8f3dc] border border-[#b7e4c7] rounded-[var(--radius-card)] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[14px] font-semibold text-[#1b4332]">🔔 Nové slevy vám pošleme emailem</span>
            <span className="text-[13px] text-[#2d6a4f] ml-1.5 hidden sm:inline">— každý čtvrtek + mimořádné akce</span>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 shrink-0">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tvuj@email.cz" disabled={state === 'loading'}
              className="px-3 py-2 bg-white border border-[#b7e4c7] rounded-full text-[13px] text-text placeholder:text-text3 focus:outline-none focus:border-[#40916c] w-[180px]" />
            <button type="submit" disabled={state === 'loading'}
              className="bg-[#2d6a4f] text-white rounded-full px-4 py-2 text-[13px] font-semibold hover:bg-[#1b4332] disabled:opacity-40 transition-colors whitespace-nowrap">
              {state === 'loading' ? '…' : 'Odebírat'}
            </button>
            {errorMsg && <span className="text-[11px] text-red-600 self-center">⚠ {errorMsg}</span>}
          </form>
        </div>
        <p className="text-[10px] text-[#40916c] mt-1">
          Bez spamu. Odhlásit 1 klikem.{' '}
          <a href="/ochrana-osobnich-udaju" className="underline decoration-dotted">Zásady OOU.</a>
        </p>
      </div>
    )
  }

  // ── Sidebar (srovnavac, compact card) ───────────────────────────────────
  if (effectiveVariant === 'sidebar') {
    if (state === 'sent') return (
      <div className="bg-[#d8f3dc] border border-[#b7e4c7] rounded-[var(--radius-card)] p-4 text-center">
        <div className="text-[13px] font-semibold text-[#1b4332] mb-1">✓ Email na cestě!</div>
        <div className="text-[12px] text-[#2d6a4f]">Klikni na odkaz v emailu — průvodce přijde ihned.</div>
      </div>
    )
    return (
      <div className="bg-[#d8f3dc] border border-[#b7e4c7] rounded-[var(--radius-card)] p-4">
        <div className="text-[10px] font-bold tracking-widest uppercase text-[#2d6a4f] mb-2">📖 Průvodce zdarma</div>
        <p className="text-[13px] font-medium text-[#1b4332] leading-snug mb-1">Nevíte, jak vybrat olivový olej?</p>
        <p className="text-[12px] text-[#40916c] leading-snug mb-3">Průvodce na 5 stran — kyselost, polyfenoly, jak číst etiketu. Na email zdarma.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tvuj@email.cz" disabled={state === 'loading'}
            className="px-3 py-2 bg-white border border-[#b7e4c7] rounded-full text-[13px] text-text placeholder:text-text3 focus:outline-none focus:border-[#40916c]" />
          <button type="submit" disabled={state === 'loading'}
            className="bg-[#2d6a4f] text-white rounded-full py-2 text-[13px] font-semibold hover:bg-[#1b4332] disabled:opacity-40 transition-colors">
            {state === 'loading' ? 'Posílám…' : 'Stáhnout průvodce →'}
          </button>
          {errorMsg && <span className="text-[11px] text-red-600">⚠ {errorMsg}</span>}
        </form>
        <p className="text-[10px] text-[#40916c] mt-2">
          Bez spamu. Odhlásit 1 klikem.{' '}
          <a href="/ochrana-osobnich-udaju" className="underline decoration-dotted">Zásady OOU.</a>
        </p>
      </div>
    )
  }

  // ── Banner (homepage, horizontal) ───────────────────────────────────────
  if (effectiveVariant === 'banner') {
    if (state === 'sent') return (
      <div className="bg-[#d8f3dc] border border-[#b7e4c7] rounded-[var(--radius-card)] p-6 text-center">
        <div className="text-[17px] font-semibold text-[#1b4332] mb-1">✓ Potvrzovací email je na cestě.</div>
        <div className="text-[13px] text-[#2d6a4f]">Klikni na odkaz v emailu — průvodce obdržíš ihned.</div>
      </div>
    )
    return (
      <div className="bg-[#d8f3dc] border border-[#b7e4c7] rounded-[var(--radius-card)] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold tracking-widest uppercase text-[#2d6a4f] mb-2">📖 Zdarma ke stažení</div>
          <div className="font-[family-name:var(--font-display)] text-[22px] md:text-[26px] font-medium text-[#1b4332] leading-tight mb-1">
            {title ?? 'Průvodce výběrem olivového oleje'}
          </div>
          <p className="text-[13px] text-[#40916c] leading-relaxed">
            {description ?? '5 stránek: polyfenoly, kyselost, jak číst etiketu, nákupní checklist.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 shrink-0 w-full md:w-auto">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tvuj@email.cz" disabled={state === 'loading'}
            className="flex-1 md:w-[220px] px-4 py-2.5 bg-white border border-[#b7e4c7] rounded-full text-[14px] text-text placeholder:text-text3 focus:outline-none focus:border-[#40916c]" />
          <button type="submit" disabled={state === 'loading'}
            className="bg-[#2d6a4f] text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-[#1b4332] disabled:opacity-40 transition-colors whitespace-nowrap">
            {state === 'loading' ? 'Posílám…' : 'Stáhnout zdarma →'}
          </button>
          {errorMsg && <span className="text-[11px] text-red-600 w-full">⚠ {errorMsg}</span>}
          <span className="text-[10px] text-[#40916c] w-full">
            Bez spamu. Odhlásit 1 klikem.{' '}
            <a href="/ochrana-osobnich-udaju" className="underline decoration-dotted">Zásady OOU.</a>
          </span>
        </form>
      </div>
    )
  }

  if (state === 'sent') {
    return (
      <div style={boxStyle(effectiveVariant === 'compact', true)}>
        <div style={{ textAlign: 'center', padding: effectiveVariant === 'compact' ? '12px 0' : '24px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🫒</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', margin: '0 0 6px' }}>
            Zkontrolujte email
          </p>
          <p style={{ fontSize: 14, color: '#3d3d3d', margin: 0, lineHeight: 1.6 }}>
            Poslali jsme vám potvrzovací email. Klikněte na odkaz — průvodce vám přijde ihned.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={boxStyle(effectiveVariant === 'compact', false)}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        {effectiveVariant !== 'compact' && (
          <div style={{ fontSize: 36, flexShrink: 0, lineHeight: 1 }}>📗</div>
        )}
        <div>
          <p style={{ fontWeight: 700, fontSize: effectiveVariant === 'compact' ? 15 : 17, color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.3 }}>
            {title ?? defaultTitle}
          </p>
          <p style={{ fontSize: 13, color: '#878779', margin: 0, lineHeight: 1.5 }}>
            {description ?? defaultDesc}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            id={inputId}
            type="email"
            required
            autoComplete="email"
            placeholder="váš@email.cz"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={state === 'loading'}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 14,
              border: '1.5px solid #d0d0d0',
              borderRadius: 6,
              outline: 'none',
              color: '#1a1a1a',
              background: '#fff',
            }}
          />
          <button
            type="submit"
            disabled={state === 'loading' || !email}
            style={{
              padding: '10px 18px',
              background: state === 'loading' ? '#40916c' : '#2d6a4f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: state === 'loading' ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background .15s',
            }}
          >
            {state === 'loading' ? 'Odesílám…' : 'Stáhnout zdarma'}
          </button>
        </div>

        {/* GDPR checkbox — povinný */}
        <label
          htmlFor={checkId}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
        >
          <input
            id={checkId}
            type="checkbox"
            checked={gdpr}
            onChange={e => setGdpr(e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5 }}>
            Souhlasím se zasíláním průvodce a navazující email série (4 emaily o výběru olivového oleje).
            Odhlásit se lze kdykoliv jedním klikem.
          </span>
        </label>

        {errorMsg && (
          <p style={{ fontSize: 12, color: '#c4711a', margin: '8px 0 0' }}>{errorMsg}</p>
        )}
      </form>

      {/* Trust signals */}
      {effectiveVariant !== 'compact' && (
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
          {['✓ Žádný spam', '✓ Odhlásit 1 klikem', '✓ GDPR'].map(t => (
            <span key={t} style={{ fontSize: 11.5, color: '#878779' }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function boxStyle(isCompact: boolean, success: boolean): React.CSSProperties {
  if (isCompact) {
    return {
      border: '1.5px solid #c8ddcf',
      borderRadius: 8,
      padding: '18px 20px',
      background: '#f8fcfa',
      margin: '24px 0',
    }
  }
  return {
    border: success ? '1.5px solid #c8ddcf' : '1.5px solid #c8ddcf',
    borderRadius: 10,
    padding: '24px 28px',
    background: 'linear-gradient(135deg, #f8fcfa 0%, #faf8f5 100%)',
    margin: '32px 0',
    boxShadow: '0 2px 12px rgba(45,106,79,.08)',
  }
}
