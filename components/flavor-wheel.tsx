import type { FlavorProfile } from '@/lib/types'

const LABELS: Record<keyof FlavorProfile, string> = {
  fruity: 'Ovocnost',
  herbal: 'Byliny',
  bitter: 'Hořkost',
  spicy: 'Pálivost',
  mild: 'Jemnost',
  nutty: 'Oříšky',
  buttery: 'Máslový',
}

// Barevné kódování per kategorii (CLAUDE.md design systém,
// mapováno na Tailwind 4 tokens v globals.css):
//   teplé = olivový brand (ovocnost, byliny, jemnost, máslový)
//   akcentní terra = intenzitní osy (hořkost, pálivost)
//   neutrální = oříšky (jiný profil, ne tone)
const AXIS_COLORS: Record<keyof FlavorProfile, { bar: string; track: string }> = {
  fruity:  { bar: 'bg-olive-light',  track: 'bg-olive-bg' },
  herbal:  { bar: 'bg-olive-light',  track: 'bg-olive-bg' },
  mild:    { bar: 'bg-olive-light',  track: 'bg-olive-bg' },
  buttery: { bar: 'bg-olive-light',  track: 'bg-olive-bg' },
  bitter:  { bar: 'bg-terra',        track: 'bg-terra-bg' },
  spicy:   { bar: 'bg-terra',        track: 'bg-terra-bg' },
  nutty:   { bar: 'bg-text3',        track: 'bg-off2' },
}

// Vysvětlivky pro hover tooltipy.
// User pozn.: pálivost a jemnost jsou OPAČNÉ osy — vysoká pálivost znamená
// nízkou jemnost a naopak. Tooltipy to musí zpřesnit.
const HINTS: Record<keyof FlavorProfile, string> = {
  fruity:
    'Intenzita ovocných tónů — jablko, banán, zelená rajčata, tropické ovoce. Vyšší hodnota = výraznější aroma čerstvého ovoce.',
  herbal:
    'Travnaté a bylinné tóny — čerstvá tráva, listové bylinky, artyčok, rajčatová nať. Typické pro early-harvest oleje.',
  bitter:
    'Hořkost způsobená polyfenoly. Vyšší hořkost = více antioxidantů (zdravější), ale silnější chuť. Znak kvalitního EVOO.',
  spicy:
    'Štiplavost v krku po polknutí (oleocanthal polyfenol). Olej "zaštípe" v krku. Znak vysoké kvality EVOO. Opak jemnosti.',
  mild:
    'Hladkost a lehkost. Vysoká jemnost = mírný, sametový olej bez výrazné palčivosti či hořkosti. Pro citlivou chuť, saláty, ryby. Opak pálivosti a hořkosti.',
  nutty:
    'Oříškové tóny — mandle, lískové oříšky, vlašák. Typické pro zralejší olivy a pozdní sklizeň.',
  buttery:
    'Máslová, krémová, sametová textura v ústech. Vyhlazená chuť bez ostrých vrcholů.',
}

export function FlavorWheel({ profile }: { profile: FlavorProfile }) {
  const entries = (Object.entries(LABELS) as [keyof FlavorProfile, string][])
    .filter(([key]) => profile[key] > 0)

  return (
    <div className="bg-off rounded-xl p-5 mt-5">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[13px] font-semibold text-text">Chuťový profil</h2>
        <span className="text-[11px] text-text3">7 chuťových os</span>
      </div>
      <div className="flex flex-col gap-2">
        {entries.map(([key, label]) => (
          <div key={key} className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 w-[90px] shrink-0">
              <span className="text-xs text-text2">{label}</span>
              {/* "?" tooltip — pure CSS hover, žádný JS */}
              <span className="group relative inline-flex">
                <span
                  tabIndex={0}
                  aria-label={`Vysvětlivka: ${label}`}
                  className="w-3.5 h-3.5 inline-flex items-center justify-center bg-off2 text-text3 hover:bg-olive-bg hover:text-olive rounded-full text-[9px] font-bold cursor-help transition-colors"
                >
                  ?
                </span>
                <span
                  role="tooltip"
                  className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-56 bg-text text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-opacity"
                >
                  {HINTS[key]}
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-text rotate-45" />
                </span>
              </span>
            </div>
            <div className={`flex-1 h-2 rounded-full overflow-hidden ${AXIS_COLORS[key].track}`}>
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${AXIS_COLORS[key].bar}`}
                style={{ width: `${profile[key]}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-text2 w-8 text-right tabular-nums">
              {profile[key]}%
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text3 mt-3 leading-relaxed">
        Pálivost a jemnost jsou opačné osy. Výrazný olej má vysokou pálivost a nízkou jemnost.
      </p>
    </div>
  )
}
