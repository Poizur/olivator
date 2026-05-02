'use client'

// Tlačítko "Sledovat cenu" na produktové stránce.
// Otevře modal: email + (volitelně) custom threshold → POST /api/price-alerts.

import { useState } from 'react'

interface Props {
  productId: string
  productName: string
  currentPrice: number | null
}

export function PriceAlertButton({ productId, productName, currentPrice }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [threshold, setThreshold] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  // Default threshold: -10 % od aktuální ceny, zaokrouhleno
  const defaultThreshold = currentPrice ? Math.round(currentPrice * 0.9) : 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'sending') return
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          productId,
          thresholdPrice: threshold ? Number(threshold) : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Nepodařilo se nastavit')
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Chyba')
    }
  }

  if (!currentPrice) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12px] text-text2 hover:text-olive transition-colors px-2 py-1"
      >
        🔔 Sleduj cenu
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-[420px] w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {status === 'success' ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-olive-bg mx-auto mb-3 flex items-center justify-center text-2xl">
                  ✓
                </div>
                <h2 className="text-[18px] font-semibold text-text mb-1">Alert nastaven</h2>
                <p className="text-[13px] text-text2 leading-relaxed mb-5">
                  Pošleme ti email až cena <strong>{productName}</strong> klesne pod{' '}
                  <strong>{threshold || defaultThreshold} Kč</strong>. Sledujeme ceny každý den.
                </p>
                <button
                  onClick={() => {
                    setOpen(false)
                    setEmail('')
                    setThreshold('')
                    setStatus('idle')
                  }}
                  className="bg-olive text-white rounded-full px-5 py-2 text-[13px] font-medium"
                >
                  Hotovo
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 className="text-[18px] font-semibold text-text mb-1">
                  Sledovat cenu olejé
                </h2>
                <p className="text-[13px] text-text2 leading-snug mb-4">
                  Pošleme ti email jakmile <strong>{productName}</strong> klesne na tvoji cenu.
                  Aktuálně {currentPrice} Kč.
                </p>

                <label className="block text-[12px] font-medium text-text2 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tvuj@email.cz"
                  className="w-full px-3 py-2 border border-off2 rounded-lg text-[14px] mb-3 focus:outline-none focus:border-olive"
                />

                <label className="block text-[12px] font-medium text-text2 mb-1">
                  Trigger cena (Kč) — nepovinné
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder={`Default: ${defaultThreshold} Kč (-10 %)`}
                  className="w-full px-3 py-2 border border-off2 rounded-lg text-[14px] mb-3 focus:outline-none focus:border-olive"
                />
                <p className="text-[11px] text-text3 leading-snug mb-4">
                  Pokud necháš prázdné, alert se spustí při poklesu o 10 % nebo víc.
                </p>

                {status === 'error' && (
                  <div className="text-[12px] text-red-600 mb-3">⚠ {error}</div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="flex-1 bg-olive text-white rounded-full px-5 py-2.5 text-[13px] font-medium hover:bg-olive-dark disabled:opacity-40"
                  >
                    {status === 'sending' ? 'Nastavuji…' : 'Sledovat'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="bg-off text-text rounded-full px-5 py-2.5 text-[13px] font-medium"
                  >
                    Zrušit
                  </button>
                </div>

                <p className="text-[10px] text-text3 mt-3 text-center leading-snug">
                  Email použijeme pouze pro tento alert. Žádný spam.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
