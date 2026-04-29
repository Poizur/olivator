// Blok 5: Důvěra — TL;DR + metodika + affiliate disclosure.
// Recenze byly z MVP vyhozeny — místo nich krátké redakční shrnutí.

import Link from 'next/link'

interface Props {
  /** Krátké shrnutí entity (1-3 věty). Zobrazí se v levém boxu. */
  tldr?: string | null
  /** Volitelný název entity pro lepší formulaci ("Tato značka...", "Tato odrůda..."). */
  entityKind: 'oblast' | 'značka' | 'odrůda'
}

export function EntityTrustRow({ tldr, entityKind }: Props) {
  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Levý: TL;DR / co o entitě tvrdíme */}
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
            — Pohled redakce
          </div>
          {tldr ? (
            <p className="text-[14px] text-text leading-relaxed font-light">{tldr}</p>
          ) : (
            <p className="text-[14px] text-text3 italic font-light">
              Shrnutí pro tuto {entityKind === 'oblast' ? 'oblast' : entityKind === 'značka' ? 'značku' : 'odrůdu'} se připravuje.
            </p>
          )}
        </div>

        {/* Pravý: jak hodnotíme + affiliate disclosure */}
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
          <div className="text-[10px] font-bold tracking-widest uppercase text-text2 mb-2">
            — Jak hodnotíme
          </div>
          <p className="text-[13px] text-text2 leading-relaxed font-light mb-3">
            Olivator Score (0-100) kombinuje kyselost, polyfenoly, certifikace a poměr cena/kvalita.
            Žádné placené pozice, žádné dotazníky producentů.{' '}
            <Link href="/metodika" className="text-olive border-b border-olive-border hover:border-olive">
              Plná metodika →
            </Link>
          </p>
          <p className="text-[11px] text-text3 leading-snug pt-3 border-t border-off">
            Některé odkazy na prodejce jsou affiliate. Cena pro vás zůstává stejná, my dostaneme
            provizi a pokrýváme tím provoz.
          </p>
        </div>
      </div>
    </section>
  )
}
