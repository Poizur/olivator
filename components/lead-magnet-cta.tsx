'use client'

import { useState, useId } from 'react'

interface LeadMagnetCtaProps {
  /** Volitelný nadpis — výchozí je standardní copy */
  title?: string
  /** Volitelný popis */
  description?: string
  /** Kompaktní verze (bez obálky s pozadím) — pro inline umístění v článcích */
  compact?: boolean
}

export function LeadMagnetCta({ title, description, compact = false }: LeadMagnetCtaProps) {
  const [email, setEmail] = useState('')
  const [gdpr, setGdpr] = useState(false)
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputId = useId()
  const checkId = useId()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gdpr) { setErrorMsg('Prosím potvrďte souhlas se zasíláním.'); return }

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: 'lead_magnet',
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

  if (state === 'sent') {
    return (
      <div className={compact ? 'lead-magnet-inline' : 'lead-magnet-box'} style={boxStyle(compact, true)}>
        <div style={{ textAlign: 'center', padding: compact ? '12px 0' : '24px 0' }}>
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
    <div style={boxStyle(compact, false)}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        {!compact && (
          <div style={{ fontSize: 36, flexShrink: 0, lineHeight: 1 }}>📗</div>
        )}
        <div>
          <p style={{ fontWeight: 700, fontSize: compact ? 15 : 17, color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.3 }}>
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
      {!compact && (
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
          {['✓ Žádný spam', '✓ Odhlásit 1 klikem', '✓ GDPR'].map(t => (
            <span key={t} style={{ fontSize: 11.5, color: '#878779' }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function boxStyle(compact: boolean, success: boolean): React.CSSProperties {
  if (compact) {
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
