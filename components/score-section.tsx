'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Product } from '@/lib/types'

// Texty převzaty doslova z SCORE_EXPLANATION_STRATEGY.md
const SCORE_DATA = [
  {
    key: 'acidity' as const,
    label: 'Kyselost',
    max: 35,
    level1: 'Kyselost ukazuje jak je olej čerstvý. Čím nižší, tím lepší.',
    level2: 'Kyselost měří kolik volných mastných kyselin olej obsahuje. Vzniká když se olivy špatně zpracují nebo když olej dlouho stojí ve špatných podmínkách. Extra panenský olej musí mít kyselost pod 0,8 %. Ty nejlepší mají pod 0,2 % — to je důkaz čerstvosti a precizní výroby.',
  },
  {
    key: 'certifications' as const,
    label: 'Certifikace',
    max: 25,
    level1: 'Certifikáty = razítka která potvrzují kvalitu nezávislí kontroloři.',
    level2: 'Certifikáty dávají třetí strany, ne výrobce. Nejdůležitější jsou DOP (Chráněné označení původu — olej z přesné oblasti dle tradičních metod), BIO (bez pesticidů), a NYIOOC (vítězství na světové soutěži v New Yorku). Čím víc certifikátů, tím spolehlivější kvalita.',
  },
  {
    key: 'quality' as const,
    label: 'Polyfenoly',
    max: 25,
    level1: 'Polyfenoly jsou přírodní antioxidanty které dělají olej zdravým. Čím víc, tím lepší.',
    level2: 'Polyfenoly jsou skupina rostlinných látek které dělají olej zároveň zdravým, chuťově bohatým a trvanlivým. Když cítíš v krku to pálení po doušku kvalitního EVOO — to jsou polyfenoly. EU schválila zdravotní tvrzení: olej s 250+ mg/kg polyfenolů chrání tělo před oxidačním stresem. Top oleje mají 400–800 mg/kg.',
  },
  {
    key: 'value' as const,
    label: 'Cena / kvalita',
    max: 15,
    level1: 'Měříme jestli platíš za chuť a kvalitu, ne za marketing a krásnou láhev.',
    level2: 'Některé oleje mají skvělé Score a stojí 200 Kč. Jiné stejně dobré stojí 800 Kč — rozdíl je v značce, balení a marketingu. Naše hodnota počítá kolik kvality dostaneš za sto korun. Pomáhá ti najít olej s nejlepším poměrem cena/kvalita pro tvůj rozpočet.',
  },
]

export function ScoreSection({ product }: { product: Product }) {
  const [modalOpen, setModalOpen] = useState(false)
  const { scoreBreakdown } = product
  const total = product.olivatorScore
  const isFlavored = product.type === 'flavored'
  const hasScore = !isFlavored && total != null && total > 0

  useEffect(() => {
    if (!modalOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [modalOpen])

  if (isFlavored) {
    return (
      <div className="bg-off rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-medium text-text">Olivator Score</h2>
          <span className="text-[14px] font-bold text-terra uppercase tracking-wider">Aromatizovaný</span>
        </div>
        <p className="text-[12px] text-text2 leading-relaxed mt-2">
          Tento olej obsahuje přidané aromata (lanýž, bylinky, citrus apod.).
          Naše metrika je navržená pro čisté EVOO — u aromatizovaných olejů by srovnání nebylo férové.
        </p>
      </div>
    )
  }

  if (!hasScore) {
    const missing: string[] = []
    if (product.acidity == null) missing.push('kyselost')
    if (product.polyphenols == null) missing.push('polyfenoly')
    if (product.certifications.length === 0) missing.push('certifikace')
    return (
      <div className="bg-off rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-medium text-text">Olivator Score</h2>
          <span className="text-[14px] font-medium text-text3">Připravujeme</span>
        </div>
        <p className="text-[12px] text-text2 leading-relaxed mt-2">
          Hodnocení {missing.length > 0 ? `tohoto oleje připravujeme — chybí ${missing.join(', ')}.` : 'tohoto oleje připravujeme.'}
          {' '}Doplníme jakmile získáme lab data od výrobce.
        </p>
      </div>
    )
  }

  const rows = [
    {
      ...SCORE_DATA[0],
      displayValue: product.acidity != null ? `${product.acidity} %` : '— chybí',
      missing: product.acidity == null,
      subScore: Math.round(scoreBreakdown.acidity),
    },
    {
      ...SCORE_DATA[1],
      displayValue: product.certifications.length > 0
        ? product.certifications.map(c => c.toUpperCase()).join(' + ')
        : 'Žádné',
      missing: false,
      subScore: Math.round(scoreBreakdown.certifications),
    },
    {
      ...SCORE_DATA[2],
      displayValue: product.polyphenols != null ? `${product.polyphenols} mg/kg` : '— chybí',
      missing: product.polyphenols == null,
      subScore: Math.round(scoreBreakdown.quality),
    },
    {
      ...SCORE_DATA[3],
      displayValue: scoreBreakdown.value >= 12 ? 'Výborná' : scoreBreakdown.value >= 8 ? 'Dobrá' : 'Průměrná',
      missing: false,
      subScore: Math.round(scoreBreakdown.value),
    },
  ]

  return (
    <>
      <div className="bg-off rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-medium text-text">Olivator Score</h2>
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-bold text-terra tracking-tight">{total} / 100</span>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-[11px] text-olive border border-olive-border rounded-full px-2 py-0.5 hover:bg-olive-bg transition-colors whitespace-nowrap"
            >
              Jak to počítáme?
            </button>
          </div>
        </div>

        <div className="h-1.5 bg-off2 rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full bg-terra animate-score-fill" style={{ width: `${total}%` }} />
        </div>

        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.key} className="relative group flex items-center gap-2 bg-white rounded-lg px-3 py-2">
              {/* Level 1 tooltip on hover */}
              <div className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:block z-30">
                <div className="bg-text text-white text-[11px] rounded-lg px-3 py-2 w-56 leading-snug shadow-lg">
                  {row.level1}
                </div>
                <div className="w-2 h-2 bg-text rotate-45 ml-4 -mt-1" />
              </div>

              <span className="text-[11px] text-text3 uppercase tracking-wider w-[72px] shrink-0">
                {row.label}
              </span>
              <span className={`text-[13px] font-medium flex-1 truncate ${row.missing ? 'text-text3 italic' : 'text-text'}`}>
                {row.displayValue}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-14 h-1.5 bg-off2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-olive"
                    style={{ width: `${(row.subScore / row.max) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-text3 tabular-nums w-9 text-right">
                  {row.subScore}/{row.max}
                </span>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 bg-olive-bg border border-olive-border rounded-lg px-3 py-2">
            <span className="text-[11px] font-semibold text-olive uppercase tracking-wider flex-1">
              Olivator Score
            </span>
            <span className="text-[14px] font-bold text-terra tabular-nums">{total}/100</span>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-[500px] w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[17px] font-semibold text-text">Jak počítáme Olivator Score</h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-off hover:bg-off2 flex items-center justify-center text-text3 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-[12px] text-text3 mb-5">
                Vážený průměr 4 složek. 100 = perfektní olej. Pod 50 = slabý.
              </p>

              <div className="space-y-5">
                {SCORE_DATA.map((item) => (
                  <div key={item.key} className="border-b border-off pb-5 last:border-b-0 last:pb-0">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[14px] font-semibold text-text">{item.label}</span>
                      <span className="text-[11px] font-semibold text-olive bg-olive-bg rounded-full px-2 py-0.5">
                        váha {item.max} %
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-olive-dark mb-1.5 leading-snug">{item.level1}</p>
                    <p className="text-[12px] text-text2 leading-relaxed">{item.level2}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/metodika"
                className="block text-center mt-6 bg-olive text-white rounded-full py-2.5 text-[13px] font-medium hover:bg-olive-dark transition-colors"
              >
                Celá metodika s vědeckým vysvětlením →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
