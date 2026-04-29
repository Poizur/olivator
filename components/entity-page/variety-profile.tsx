// Blok 6 pro odrůdu: chuťový profil + porovnání polyfenolů + použití.

interface FlavorBars {
  pikantnost?: number
  horkost?: number
  travnate?: number
  ovocne?: number
  mandlove?: number
}

interface PolyComparison {
  cultivarSlug: string
  cultivarName: string
  avgPolyphenols: number
  isCurrent: boolean
}

interface Props {
  cultivarName: string
  flavorProfile: FlavorBars | null
  /** Auto-fill timestamp — jen vizuální nota "auto-fill 2026-04-29". Null = ručně. */
  autoFilledAt?: string | null
  polyphenolComparison: PolyComparison[]
  pairingPros: string[]
  pairingCons: string[]
  countriesGrown: string[]   // ['Itálie', 'Řecko'] — pro mini mapu jako labels
}

const FLAVOR_LABELS: Record<keyof FlavorBars, string> = {
  pikantnost: 'Pikantnost',
  horkost: 'Hořkost',
  travnate: 'Travnaté tóny',
  ovocne: 'Ovocné tóny',
  mandlove: 'Mandlové tóny',
}

function FlavorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(10, value)) * 10
  return (
    <div className="flex items-center gap-3">
      <div className="text-[13px] text-text2 w-32 shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-off rounded-full overflow-hidden">
        <div
          className="h-full bg-olive rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[12px] text-text font-medium tabular-nums w-10 text-right">
        {value.toFixed(1)}
      </div>
    </div>
  )
}

export function VarietyProfile({
  cultivarName,
  flavorProfile,
  autoFilledAt,
  polyphenolComparison,
  pairingPros,
  pairingCons,
  countriesGrown,
}: Props) {
  const hasFlavor =
    flavorProfile &&
    Object.values(flavorProfile).some((v) => typeof v === 'number' && v > 0)
  const hasComparison = polyphenolComparison.length > 1
  const hasPairing = pairingPros.length > 0 || pairingCons.length > 0
  const hasCountries = countriesGrown.length > 0

  if (!hasFlavor && !hasComparison && !hasPairing && !hasCountries) return null

  const maxPoly = Math.max(...polyphenolComparison.map((p) => p.avgPolyphenols), 1)

  return (
    <section className="px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto bg-olive-bg/40 rounded-[var(--radius-card)] p-6 md:p-8 space-y-8">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-3">
            — Chuť, srovnání, použití
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-normal text-text">
            Jak chutná {cultivarName}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chuťový profil */}
          {hasFlavor && flavorProfile && (
            <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive mb-4">
                Chuťový profil
              </h3>
              <div className="space-y-3">
                {(Object.keys(FLAVOR_LABELS) as Array<keyof FlavorBars>).map((key) => {
                  const v = flavorProfile[key]
                  if (typeof v !== 'number' || v <= 0) return null
                  return <FlavorBar key={key} label={FLAVOR_LABELS[key]} value={v} />
                })}
              </div>
              {autoFilledAt && (
                <p className="text-[10px] text-text3 mt-4 italic">
                  Auto-fill z průměru produktů této odrůdy.
                </p>
              )}
            </div>
          )}

          {/* Polyfenol comparison */}
          {hasComparison && (
            <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive mb-4">
                Polyfenoly vs. ostatní odrůdy
              </h3>
              <div className="space-y-2.5">
                {polyphenolComparison.map((p) => {
                  const pct = (p.avgPolyphenols / maxPoly) * 100
                  return (
                    <div key={p.cultivarSlug} className="flex items-center gap-3">
                      <div
                        className={`text-[12px] w-24 shrink-0 ${
                          p.isCurrent ? 'text-olive font-semibold' : 'text-text2'
                        }`}
                      >
                        {p.cultivarName}
                      </div>
                      <div className="flex-1 h-2 bg-off rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            p.isCurrent ? 'bg-olive' : 'bg-text3/60'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-text2 tabular-nums w-14 text-right">
                        {Math.round(p.avgPolyphenols)} mg/kg
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pairing — kam se hodí / spíš ne */}
        {hasPairing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-olive" aria-label="Hodí se" />
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive">
                  Hodí se k
                </h3>
              </div>
              {pairingPros.length > 0 ? (
                <ul className="space-y-1.5">
                  {pairingPros.map((p, i) => (
                    <li key={i} className="text-[14px] text-text2 leading-snug font-light flex gap-2">
                      <span className="text-olive shrink-0">+</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text3 italic font-light">Doplníme.</p>
              )}
            </div>
            <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-terra" aria-label="Spíš ne" />
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-terra">
                  Spíš ne k
                </h3>
              </div>
              {pairingCons.length > 0 ? (
                <ul className="space-y-1.5">
                  {pairingCons.map((p, i) => (
                    <li key={i} className="text-[14px] text-text2 leading-snug font-light flex gap-2">
                      <span className="text-terra shrink-0">−</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text3 italic font-light">Doplníme.</p>
              )}
            </div>
          </div>
        )}

        {/* Mini mapa — kde se pěstuje */}
        {hasCountries && (
          <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-olive mb-3">
              Kde se odrůda pěstuje
            </h3>
            <div className="flex flex-wrap gap-2">
              {countriesGrown.map((c) => (
                <span
                  key={c}
                  className="text-[13px] px-3 py-1.5 rounded-full bg-olive-bg border border-olive-border text-olive-dark"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
