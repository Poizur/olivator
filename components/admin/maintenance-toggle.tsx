'use client'

import { useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  initialEnabled: boolean
}

export function MaintenanceToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const next = !enabled
    if (next && !confirm('Zapnout údržbový režim? Web bude nedostupný pro návštěvníky.')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) throw new Error(await res.text())
      setEnabled(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-xl border p-5 ${enabled ? 'border-red-200 bg-red-50' : 'border-off2 bg-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={18}
            className={`mt-0.5 shrink-0 ${enabled ? 'text-red-500' : 'text-text3'}`}
          />
          <div>
            <div className="text-[14px] font-semibold text-text">
              Údržbový režim
              {enabled && (
                <span className="ml-2 text-[11px] font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  AKTIVNÍ
                </span>
              )}
            </div>
            <div className="text-[12px] text-text2 mt-0.5">
              {enabled
                ? 'Web vrací 503. Emaily pozastaveny. Crawler chráněn Retry-After: 86400.'
                : 'Web je živý. Zapnutím zobrazíš návštěvníkům stránku údržby (503).'}
            </div>
            {error && (
              <div className="text-[12px] text-red-600 mt-1">{error}</div>
            )}
          </div>
        </div>

        <button
          onClick={toggle}
          disabled={loading}
          className={[
            'shrink-0 flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60',
            enabled
              ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
              : 'bg-red-600 text-white hover:bg-red-700',
          ].join(' ')}
        >
          {loading && <RefreshCw size={13} className="animate-spin" />}
          {enabled ? 'Vypnout údržbu' : 'Zapnout údržbu'}
        </button>
      </div>

      {enabled && (
        <div className="mt-4 pt-4 border-t border-red-100 text-[11px] text-red-400 leading-relaxed">
          Výjimky: <code>/admin/*</code> a <code>/api/health</code> fungují normálně. Reverze: klikni Vypnout — změna se projeví do 30 s.
        </div>
      )}
    </div>
  )
}
