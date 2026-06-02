'use client'

import { useState } from 'react'

// Průměrná cena/litr z aktuálního katalogu (Duben 2026):
// 0.5–1 L balení EVOO: ~250 Kč/litr (median dobrých olejů)
// 5 L balení EVOO: ~140 Kč/litr (median 5L olejů ve stejné kvalitní třídě)
const PRICE_SMALL = 250
const PRICE_BULK  = 140

interface Props {
  compact?: boolean
}

export function SavingsCalculator({ compact = false }: Props) {
  const [liters, setLiters] = useState(1.5)

  const yearlySmall  = Math.round(liters * 12 * PRICE_SMALL)
  const yearlyBulk   = Math.round(liters * 12 * PRICE_BULK)
  const savings      = yearlySmall - yearlyBulk
  const savingsPct   = Math.round((savings / yearlySmall) * 100)

  if (compact) {
    return (
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5 shadow-sm">
        <p className="text-[13px] font-semibold text-text mb-1">Kolik ušetříte ročně?</p>
        <p className="text-[12px] text-text3 mb-4">Porovnání z katalogu olivator.cz · duben 2026</p>

        <div className="flex items-center gap-3 mb-5">
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.5}
            value={liters}
            onChange={e => setLiters(parseFloat(e.target.value))}
            className="flex-1 accent-olive h-1.5"
          />
          <span className="text-[18px] font-bold text-text tabular-nums w-[76px] text-right shrink-0">
            {liters} L<span className="text-[11px] font-normal text-text3">/měs</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-off rounded-xl p-3 text-center">
            <div className="text-[10px] text-text3 uppercase tracking-wide mb-1">0,5L / rok</div>
            <div className="text-[17px] font-bold text-text tabular-nums">{yearlySmall.toLocaleString('cs-CZ')} Kč</div>
          </div>
          <div className="bg-olive-bg border border-olive-border rounded-xl p-3 text-center">
            <div className="text-[10px] text-olive uppercase tracking-wide mb-1">5L / rok</div>
            <div className="text-[17px] font-bold text-olive-dark tabular-nums">{yearlyBulk.toLocaleString('cs-CZ')} Kč</div>
          </div>
        </div>

        <div className="bg-terra-bg border border-terra/20 rounded-xl p-3 flex items-center justify-between mb-4">
          <span className="text-[13px] text-terra font-semibold">Úspora ročně</span>
          <div className="text-right leading-none">
            <div className="text-[21px] font-bold text-terra tabular-nums">
              {savings.toLocaleString('cs-CZ')} Kč
            </div>
            <div className="text-[11px] text-terra/70 mt-0.5">−{savingsPct} %</div>
          </div>
        </div>

        <a
          href="#produkty"
          className="block text-center bg-olive text-white text-[14px] font-semibold py-2.5 rounded-lg hover:bg-olive2 transition-colors"
        >
          Najít nejlevnější 5L olej →
        </a>
      </div>
    )
  }

  return (
    <section id="kalkulacka" className="px-6 md:px-10 py-16 bg-off/40 border-y border-off2">
      <div className="max-w-[780px] mx-auto">
        <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
          — Kalkulačka úspor
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal text-text mb-2 leading-tight">
          Kolik ušetříte s 5L balením?
        </h2>
        <p className="text-[14px] text-text2 mb-8">
          Porovnání vychází z reálných cen v katalogu olivator.cz (duben 2026).
        </p>

        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-6 md:p-8">
          <label className="block text-[13px] font-semibold text-text mb-3">
            Kolik olivového oleje spotřebujete měsíčně?
          </label>

          <div className="flex items-center gap-4 mb-6">
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.5}
              value={liters}
              onChange={e => setLiters(parseFloat(e.target.value))}
              className="flex-1 accent-olive h-1.5"
            />
            <span className="text-[22px] font-bold text-text tabular-nums w-[60px] text-right">
              {liters} L
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-off rounded-xl p-4 text-center">
              <div className="text-[11px] text-text3 uppercase tracking-wider mb-1">S 0,5L balením / rok</div>
              <div className="text-[22px] font-bold text-text tabular-nums">
                {yearlySmall.toLocaleString('cs-CZ')} Kč
              </div>
            </div>
            <div className="bg-olive-bg border border-olive-border rounded-xl p-4 text-center">
              <div className="text-[11px] text-olive uppercase tracking-wider mb-1">S 5L balením / rok</div>
              <div className="text-[22px] font-bold text-olive-dark tabular-nums">
                {yearlyBulk.toLocaleString('cs-CZ')} Kč
              </div>
            </div>
            <div className="bg-terra-bg border border-terra/20 rounded-xl p-4 text-center">
              <div className="text-[11px] text-terra uppercase tracking-wider mb-1">Úspora ročně</div>
              <div className="text-[22px] font-bold text-terra tabular-nums">
                {savings.toLocaleString('cs-CZ')} Kč
              </div>
              <div className="text-[12px] text-terra/80 mt-0.5">−{savingsPct} %</div>
            </div>
          </div>

          <a
            href="#produkty"
            className="block text-center bg-olive text-white text-[14px] font-semibold py-3 px-6 rounded-lg hover:bg-olive2 transition-colors"
          >
            Najít nejlevnější 5L olej →
          </a>

          <p className="text-[11px] text-text3 text-center mt-3">
            Kalkulace: průměrná cena/litr v kategorii EVOO. Reálná úspora závisí na konkrétních produktech.
          </p>
        </div>
      </div>
    </section>
  )
}
