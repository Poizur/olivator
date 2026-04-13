import Link from 'next/link'

export const metadata = {
  title: 'Metodika — Jak počítáme Olivator Score',
  description: 'Transparentní metodika hodnocení olivových olejů. 4 komponenty, váhy a výpočet.',
}

const COMPONENTS = [
  {
    name: 'Kyselost',
    weight: '35 %',
    description: 'Nižší kyselost = vyšší kvalita. Pod 0,2 % = maximální skóre. Kyselost je hlavní indikátor čerstvosti a správného zpracování oleje.',
    scale: 'Pod 0,2 % → 35 bodů | 0,2–0,4 % → 25–34 | 0,4–0,8 % → 15–24 | Nad 0,8 % → pod 15',
  },
  {
    name: 'Certifikace',
    weight: '25 %',
    description: 'DOP/CHOP + BIO = maximální skóre. Certifikace garantují původ, metody zpracování a nezávislou kontrolu.',
    scale: 'DOP + BIO → 25 | DOP nebo BIO → 18–22 | NYIOOC/PGP → 15–20 | Bez certifikace → 0',
  },
  {
    name: 'Polyfenoly + chemická kvalita',
    weight: '25 %',
    description: 'Polyfenoly jsou klíčem ke zdravotním benefitům. Hodnotíme i peroxidové číslo a obsah kyseliny olejové.',
    scale: 'Nad 300 mg/kg → 20–25 | 200–300 → 15–19 | 100–200 → 8–14 | Pod 100 → pod 8',
  },
  {
    name: 'Cena / kvalita',
    weight: '15 %',
    description: 'Poměr kvality k ceně za 100 ml. Dražší olej musí nabídnout odpovídající kvalitu.',
    scale: 'Výjimečná hodnota → 12–15 | Dobrá → 8–11 | Průměrná → 4–7 | Podprůměrná → pod 4',
  },
]

export default function MetodikaPage() {
  return (
    <div className="max-w-[800px] mx-auto px-10 py-10">
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivator</Link>
        {' › '}
        Metodika
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-3 leading-tight">
        Jak počítáme Olivator Score
      </h1>
      <p className="text-[15px] text-text2 font-light leading-relaxed mb-10">
        Olivator Score je objektivní metrika od 0 do 100, která kombinuje 4 měřitelné komponenty.
        Žádné subjektivní hodnocení — pouze data, certifikace a chemické parametry.
      </p>

      <div className="flex gap-2 mb-10">
        {['✓ Nezávislé hodnocení', '✓ Reálná data', '✓ Žádná reklama'].map(t => (
          <span key={t} className="text-xs text-olive bg-olive-bg px-3 py-1.5 rounded-full font-medium">
            {t}
          </span>
        ))}
      </div>

      {/* Score bar visual */}
      <div className="bg-off rounded-[var(--radius-card)] p-6 mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text">Příklad: 87 / 100</span>
          <span className="text-2xl font-bold text-terra">87</span>
        </div>
        <div className="h-3 bg-off2 rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full bg-terra" style={{ width: '87%' }} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Kyselost', score: 33, max: 35 },
            { label: 'Certifikace', score: 25, max: 25 },
            { label: 'Kvalita', score: 18, max: 25 },
            { label: 'Hodnota', score: 11, max: 15 },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-lg p-3 text-center">
              <div className="text-[10px] text-text3 uppercase tracking-wider mb-1">{c.label}</div>
              <div className="text-lg font-bold text-terra">{c.score}</div>
              <div className="text-[10px] text-text3">z {c.max}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Components detail */}
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-6">
        4 komponenty Score
      </h2>

      <div className="space-y-6">
        {COMPONENTS.map((comp, i) => (
          <div key={comp.name} className="border border-off2 rounded-[var(--radius-card)] p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-terra text-white flex items-center justify-center text-sm font-bold">
                {i + 1}
              </span>
              <div>
                <div className="text-base font-medium text-text">{comp.name}</div>
                <div className="text-xs text-terra font-semibold">{comp.weight}</div>
              </div>
            </div>
            <p className="text-[13px] text-text2 leading-relaxed mb-3">{comp.description}</p>
            <div className="bg-off rounded-lg p-3 text-xs text-text2 font-mono">
              {comp.scale}
            </div>
          </div>
        ))}
      </div>

      {/* Trust section */}
      <div className="mt-12 bg-olive-bg rounded-[var(--radius-card)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-normal text-text mb-3">
          Proč věřit Olivator Score?
        </h2>
        <ul className="space-y-2 text-[13px] text-text2 leading-relaxed">
          <li>• <strong>Nezávislost:</strong> Žádný výrobce ani prodejce nemůže ovlivnit Score</li>
          <li>• <strong>Transparentnost:</strong> Každá složka Score je viditelná na produktové kartě</li>
          <li>• <strong>Data-driven:</strong> Vycházíme z certifikací, chemických analýz a reálných cen</li>
          <li>• <strong>Aktualizace:</strong> Score se přepočítává při každé změně ceny nebo certifikace</li>
        </ul>
      </div>
    </div>
  )
}
