'use client'

import { useState, useCallback } from 'react'

const CERTS = [
  { id: 'dop', label: 'DOP / PDO', pts: 10 },
  { id: 'bio', label: 'BIO / Organic', pts: 8 },
  { id: 'nyiooc_gold', label: 'NYIOOC Gold', pts: 7 },
  { id: 'nyiooc_silver', label: 'NYIOOC Silver', pts: 5 },
  { id: 'pgi', label: 'PGI / IGP', pts: 4 },
  { id: 'demeter', label: 'Demeter', pts: 3 },
]

function calcAcidity(v: number): number {
  if (v <= 0.2) return 35
  if (v <= 0.3) return Math.round(30 + (0.3 - v) / 0.1 * 5)
  if (v <= 0.5) return Math.round(22 + (0.5 - v) / 0.2 * 8)
  if (v <= 0.8) return Math.round(15 + (0.8 - v) / 0.3 * 7)
  return 0
}

function calcCerts(selected: Set<string>): number {
  const has = (id: string) => selected.has(id)
  if (has('dop') && has('bio') && has('nyiooc_gold')) return 25
  if (has('dop') && has('bio')) return 23
  if ((has('dop') || has('bio')) && (has('nyiooc_gold') || has('nyiooc_silver'))) return 20
  if (has('dop') || has('bio')) return 17
  if (has('nyiooc_gold')) return 16
  if (has('nyiooc_silver')) return 13
  if (has('pgi')) return 10
  if (has('demeter')) return 8
  return 0
}

function calcPolyphenols(pp: number): number {
  if (pp >= 500) return 25
  if (pp >= 400) return Math.round(18 + (pp - 400) / 100 * 7)
  if (pp >= 300) return Math.round(14 + (pp - 300) / 100 * 4)
  if (pp >= 250) return Math.round(10 + (pp - 250) / 50 * 4)
  if (pp >= 150) return Math.round(5 + (pp - 150) / 100 * 5)
  return Math.max(0, Math.round(pp / 150 * 5))
}

function calcValue(aS: number, cS: number, pS: number, price: number): number {
  if (price <= 0) return 0
  const ratio = (aS + cS + pS) / price
  if (ratio >= 1.5) return 15
  if (ratio >= 1.2) return 13
  if (ratio >= 1.0) return 11
  if (ratio >= 0.7) return 8
  if (ratio >= 0.5) return 5
  return Math.max(0, Math.round(ratio / 0.5 * 5))
}

function bracketLabel(score: number) {
  if (score >= 90) return { label: '🏆 Top tier', color: '#b5860d' }
  if (score >= 80) return { label: '🥇 Vynikající', color: '#2d6a4f' }
  if (score >= 70) return { label: '🥈 Velmi dobré', color: '#c4711a' }
  if (score >= 60) return { label: '🥉 Dobré', color: '#6e6e73' }
  if (score >= 50) return { label: '⚪ Průměrné', color: '#9ca3af' }
  return { label: '🔴 Slabší', color: '#dc2626' }
}

export function ScoreCalculator() {
  const [acidity, setAcidity] = useState(0.3)
  const [certs, setCerts] = useState<Set<string>>(new Set())
  const [polyphenols, setPolyphenols] = useState(300)
  const [price, setPrice] = useState(60)

  const toggleCert = useCallback((id: string) => {
    setCerts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const aS = calcAcidity(acidity)
  const cS = calcCerts(certs)
  const pS = calcPolyphenols(polyphenols)
  const vS = calcValue(aS, cS, pS, price)
  const total = aS + cS + pS + vS
  const bracket = bracketLabel(total)

  const rows = [
    { label: 'Kyselost', score: aS, max: 35 },
    { label: 'Certifikace', score: cS, max: 25 },
    { label: 'Polyfenoly', score: pS, max: 25 },
    { label: 'Hodnota', score: vS, max: 15 },
  ]

  return (
    <div className="bg-off rounded-2xl p-6">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-olive mb-2">
              Kyselost — {acidity.toFixed(1)} %
            </label>
            <input
              type="range" min={0.1} max={1.0} step={0.1}
              value={acidity}
              onChange={e => setAcidity(Number(e.target.value))}
              className="w-full accent-olive"
            />
            <div className="flex justify-between text-[10px] text-text3 mt-1">
              <span>0,1 % (top)</span><span>1,0 % (špatné)</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-olive mb-2">
              Certifikace
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CERTS.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={certs.has(c.id)}
                    onChange={() => toggleCert(c.id)}
                    className="accent-olive rounded"
                  />
                  <span className="text-[13px] text-text2">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-olive mb-2">
              Polyfenoly — {polyphenols} mg/kg
            </label>
            <input
              type="range" min={0} max={800} step={10}
              value={polyphenols}
              onChange={e => setPolyphenols(Number(e.target.value))}
              className="w-full accent-olive"
            />
            <div className="flex justify-between text-[10px] text-text3 mt-1">
              <span>0</span><span>250 (EU Health Claim)</span><span>800+</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-olive mb-2">
              Cena za 100 ml — {price} Kč
            </label>
            <input
              type="range" min={10} max={300} step={5}
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              className="w-full accent-olive"
            />
            <div className="flex justify-between text-[10px] text-text3 mt-1">
              <span>10 Kč (levné)</span><span>300 Kč (luxus)</span>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="flex flex-col justify-center">
          <div className="text-center mb-6">
            <div
              className="text-6xl font-bold tabular-nums mb-1"
              style={{ color: bracket.color }}
            >
              {total}
            </div>
            <div className="text-[13px] font-medium" style={{ color: bracket.color }}>
              {bracket.label}
            </div>
            <div className="text-[11px] text-text3 mt-1">z 100 bodů</div>
          </div>

          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-[11px] text-text3 uppercase tracking-wider w-[80px] shrink-0">
                  {r.label}
                </span>
                <div className="flex-1 h-1.5 bg-off2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-olive transition-all duration-300"
                    style={{ width: `${(r.score / r.max) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-text3 tabular-nums w-10 text-right">
                  {r.score}/{r.max}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-off2">
              <span className="text-[11px] font-semibold text-olive uppercase tracking-wider flex-1">
                Olivator Score
              </span>
              <span className="text-[14px] font-bold tabular-nums" style={{ color: bracket.color }}>
                {total}/100
              </span>
            </div>
          </div>

          <p className="text-[11px] text-text3 mt-4 leading-relaxed">
            Výsledek je orientační — skutečný Score závisí na přesném vzorci a aktuálních datech v naší DB.
          </p>
        </div>
      </div>
    </div>
  )
}
