import Link from 'next/link'

export const metadata = {
  title: 'Metodika — Jak počítáme Olivator Score',
  description: 'Transparentní metodika hodnocení olivových olejů. 4 komponenty, váhy a výpočet Olivator Score.',
  alternates: { canonical: 'https://olivator.cz/metodika' },
}

// Texty Level 1/2/3 převzaty doslova z SCORE_EXPLANATION_STRATEGY.md
const COMPONENTS = [
  {
    name: 'Kyselost',
    weight: '35 %',
    max: 35,
    level1: 'Kyselost ukazuje jak je olej čerstvý. Čím nižší, tím lepší.',
    level2: 'Kyselost měří kolik volných mastných kyselin olej obsahuje. Vzniká když se olivy špatně zpracují nebo když olej dlouho stojí ve špatných podmínkách. Extra panenský olej musí mít kyselost pod 0,8 %. Ty nejlepší mají pod 0,2 % — to je důkaz čerstvosti a precizní výroby.',
    level3: [
      'Co jsou volné mastné kyseliny (FFA — Free Fatty Acids): produkty hydrolýzy triglyceridů. Vznikají enzymatickou aktivitou při poškození buněk oliv nebo špatným skladováním.',
      'Jak se měří: titrace (chemická analýza) v certifikovaných laboratořích dle IOC normy COI/T.20/Doc. No 26.',
      'Proč nízká kyselost = lepší: méně FFA = méně oxidace = delší trvanlivost a čistší chuť.',
      'Mezinárodní normy IOC: EVOO max 0,8 %, Virgin max 2,0 %, Lampante (technický) nad 2,0 %.',
    ],
    scales: [
      { label: 'Pod 0,2 %', desc: 'Vynikající', color: 'green' },
      { label: '0,2–0,3 %', desc: 'Výborná', color: 'green' },
      { label: '0,3–0,5 %', desc: 'Dobrá', color: 'yellow' },
      { label: '0,5–0,8 %', desc: 'Akceptovatelná (stále EVOO)', color: 'yellow' },
      { label: 'Nad 0,8 %', desc: 'Není EVOO', color: 'red' },
    ],
  },
  {
    name: 'Certifikace',
    weight: '25 %',
    max: 25,
    level1: 'Certifikáty = razítka která potvrzují kvalitu nezávislí kontroloři.',
    level2: 'Certifikáty dávají třetí strany, ne výrobce. Nejdůležitější jsou DOP (Chráněné označení původu — olej z přesné oblasti dle tradičních metod), BIO (bez pesticidů), a NYIOOC (vítězství na světové soutěži v New Yorku). Čím víc certifikátů, tím spolehlivější kvalita.',
    level3: [
      'DOP (Denominazione di Origine Protetta) / PDO: olej musí pocházet z přesné oblasti, odrůdy oliv jsou pevně dané, metody výroby dle tradice, kontroluje státem akreditovaný úřad. Příklady: Sitia PDO (Kréta), Toscano IGP (Toskánsko).',
      'BIO / Organic: bez syntetických pesticidů a hnojiv, půda a olivovníky kontrolované 3 roky, kontroluje certifikační orgán (např. ABCERT, KEZ).',
      'NYIOOC (New York International Olive Oil Competition): největší světová slepá soutěž, hodnoceno mistrovskými degustátory, Gold/Silver/Bronze — Gold = top 5 % světové produkce.',
      'PGI (Protected Geographical Indication): méně přísné než DOP, aspoň jedna fáze výroby v dané oblasti.',
    ],
    scales: [
      { label: 'DOP + BIO', desc: '25 bodů (maximum)', color: 'green' },
      { label: 'DOP nebo BIO', desc: '18–22 bodů', color: 'green' },
      { label: 'NYIOOC / PGI', desc: '15–20 bodů', color: 'yellow' },
      { label: 'Bez certifikace', desc: '0 bodů', color: 'red' },
    ],
  },
  {
    name: 'Polyfenoly',
    weight: '25 %',
    max: 25,
    level1: 'Polyfenoly jsou přírodní antioxidanty které dělají olej zdravým. Čím víc, tím lepší.',
    level2: 'Polyfenoly jsou skupina rostlinných látek které dělají olej zároveň zdravým, chuťově bohatým a trvanlivým. Když cítíš v krku to pálení po doušku kvalitního EVOO — to jsou polyfenoly. EU schválila zdravotní tvrzení: olej s 250+ mg/kg polyfenolů chrání tělo před oxidačním stresem. Top oleje mají 400–800 mg/kg.',
    level3: [
      'Hlavní polyfenoly: oleokantal, oleocein, hydroxytyrosol, tyrosol. Vznikají v olivách jako obrana proti škůdcům, přenášejí se do oleje při lisování.',
      'Zdravotní benefity: antioxidanty (chrání buňky), protizánětlivé (oleokantal = "tekutý ibuprofen"), snižují kardiovaskulární riziko.',
      'EU Health Claim 432/2012: olej s 250+ mg/kg polyfenolů může nést tvrzení o ochraně před oxidačním stresem.',
      'Vliv na chuť a trvanlivost: více polyfenolů = více pálivosti a hořkosti, pomalejší žluknutí. Early harvest oleje mají typicky nejvyšší hodnoty.',
    ],
    scales: [
      { label: 'Nad 500 mg/kg', desc: 'Vynikající', color: 'green' },
      { label: '300–500 mg/kg', desc: 'Výborná', color: 'green' },
      { label: '250–300 mg/kg', desc: 'Splňuje EU Health Claim', color: 'yellow' },
      { label: '150–250 mg/kg', desc: 'Standardní', color: 'yellow' },
      { label: 'Pod 150 mg/kg', desc: 'Slabší antioxidační efekt', color: 'red' },
    ],
  },
  {
    name: 'Cena / kvalita',
    weight: '15 %',
    max: 15,
    level1: 'Měříme jestli platíš za chuť a kvalitu, ne za marketing a krásnou láhev.',
    level2: 'Některé oleje mají skvělé Score a stojí 200 Kč. Jiné stejně dobré stojí 800 Kč — rozdíl je v značce, balení a marketingu. Naše hodnota počítá kolik kvality dostaneš za sto korun. Pomáhá ti najít olej s nejlepším poměrem cena/kvalita pro tvůj rozpočet.',
    level3: [
      'Vzorec: Cena/kvalita = (Kyselost_score + Certifikace_score + Polyfenoly_score) / cena_za_100ml.',
      'Příklad vysoké hodnoty: olej za 199 Kč/250ml se Score 75 → výborný poměr.',
      'Příklad nízké hodnoty: olej za 599 Kč/250ml se Score 80 → jen 5 bodů navíc za 400 Kč = platíš za značku.',
      'Co neměříme: subjektivní hodnota (krásná láhev, dárkové balení), brand premium, marketing claims bez certifikace.',
    ],
    scales: [
      { label: 'Score/100 Kč > 25', desc: 'Vynikající hodnota', color: 'green' },
      { label: '20–25', desc: 'Výborná hodnota', color: 'green' },
      { label: '15–20', desc: 'Standardní hodnota', color: 'yellow' },
      { label: '10–15', desc: 'Slabší hodnota', color: 'yellow' },
      { label: 'Pod 10', desc: 'Platíš hlavně za značku', color: 'red' },
    ],
  },
]

const COLOR_DOT: Record<string, string> = {
  green: 'bg-olive',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
}

export default function MetodikaPage() {
  return (
    <div className="max-w-[800px] mx-auto px-6 md:px-10 py-10">
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivator</Link>
        {' › '}Metodika
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-3 leading-tight">
        Jak počítáme Olivator Score
      </h1>
      <p className="text-[15px] text-text2 font-light leading-relaxed mb-6">
        Olivator Score je objektivní metrika od 0 do 100, kombinující 4 měřitelné složky.
        Žádné subjektivní hodnocení — pouze data, certifikace a chemické parametry.
      </p>

      <div className="flex flex-wrap gap-2 mb-10">
        {['✓ Nezávislé hodnocení', '✓ Reálná data', '✓ Žádná reklama'].map(t => (
          <span key={t} className="text-xs text-olive bg-olive-bg px-3 py-1.5 rounded-full font-medium">
            {t}
          </span>
        ))}
      </div>

      {/* Score bar vizuál */}
      <div className="bg-off rounded-[var(--radius-card)] p-6 mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text">Příklad: 84 / 100</span>
          <span className="text-2xl font-bold" style={{ color: '#2d6a4f' }}>84</span>
        </div>
        <div className="h-3 bg-off2 rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full" style={{ width: '84%', background: '#2d6a4f' }} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Kyselost', score: 33, max: 35 },
            { label: 'Certifikace', score: 19, max: 25 },
            { label: 'Polyfenoly', score: 21, max: 25 },
            { label: 'Hodnota', score: 11, max: 15 },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-lg p-3 text-center">
              <div className="text-[10px] text-text3 uppercase tracking-wider mb-1">{c.label}</div>
              <div className="text-lg font-bold text-terra">{c.score}</div>
              <div className="text-[10px] text-text3">z {c.max}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-text3 mt-3 text-center">
          Olivator Score = (Kyselost × 0,35) + (Certifikace × 0,25) + (Polyfenoly × 0,25) + (Hodnota × 0,15)
        </p>
      </div>

      {/* Score brackets */}
      <div className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-4">
          Co číslo znamená
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { range: '90–100', label: 'Top tier', emoji: '🏆', note: 'Top 5 % katalogu', bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
            { range: '80–89', label: 'Vynikající', emoji: '🥇', note: 'Skvělá volba', bg: '#d8f3dc', border: '#b7e4c7', text: '#1b4332' },
            { range: '70–79', label: 'Velmi dobré', emoji: '🥈', note: 'Nad průměrem', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' },
            { range: '60–69', label: 'Dobré', emoji: '🥉', note: 'Standardní kvalita', bg: '#f5f5f7', border: '#e8e8ed', text: '#6e6e73' },
            { range: '50–59', label: 'Průměrné', emoji: '⚪', note: 'Chybí část dat', bg: '#f5f5f7', border: '#e8e8ed', text: '#9ca3af' },
            { range: 'Pod 50', label: 'Slabší', emoji: '🔴', note: 'Nízká kvalita nebo chybí data', bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
          ].map(b => (
            <div key={b.range} className="flex items-center gap-3 rounded-xl p-3" style={{ background: b.bg, border: `1px solid ${b.border}` }}>
              <span className="text-2xl">{b.emoji}</span>
              <div>
                <div className="text-[15px] font-bold" style={{ color: b.text }}>{b.range}</div>
                <div className="text-[12px]" style={{ color: b.text }}>{b.label} — {b.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4 komponenty — accordion Level 1/2/3 */}
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-6">
        4 složky Score
      </h2>

      <div className="space-y-4 mb-12">
        {COMPONENTS.map((comp, i) => (
          <div key={comp.name} className="border border-off2 rounded-[var(--radius-card)] overflow-hidden">
            {/* Vždy viditelné: Level 1 */}
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-terra text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <div className="text-base font-semibold text-text">{comp.name}</div>
                  <div className="text-xs text-terra font-semibold">{comp.weight}</div>
                </div>
              </div>
              <p className="text-[14px] font-medium text-olive-dark leading-snug mb-0">
                {comp.level1}
              </p>
            </div>

            {/* Accordion Level 2 */}
            <details className="group border-t border-off2">
              <summary className="flex items-center justify-between px-5 py-3 cursor-pointer list-none text-[12px] text-olive font-medium hover:bg-olive-bg/30 transition-colors">
                Přečíst více
                <span className="text-text3 group-open:rotate-180 transition-transform duration-200">▾</span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-[13px] text-text2 leading-relaxed mb-4">{comp.level2}</p>

                {/* Stupnice */}
                <div className="space-y-1.5 mb-4">
                  {comp.scales.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT[s.color]}`} />
                      <span className="text-[12px] font-medium text-text w-28 shrink-0">{s.label}</span>
                      <span className="text-[12px] text-text2">{s.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Accordion Level 3 */}
                <details className="group/inner">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-[11px] text-text3 hover:text-text2 font-medium transition-colors">
                    Vědecké vysvětlení
                    <span className="group-open/inner:rotate-180 transition-transform duration-200">▾</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {comp.level3.map((item, j) => (
                      <p key={j} className="text-[12px] text-text2 leading-relaxed pl-3 border-l-2 border-off2">
                        {item}
                      </p>
                    ))}
                  </div>
                </details>
              </div>
            </details>
          </div>
        ))}
      </div>

      {/* Certifikace glossary */}
      <div id="certifikace" className="mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
          Co znamenají certifikace
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed mb-6 font-light">
          Certifikace tvoří <strong>25 % Olivator Score</strong>. Nejsou rovnocenné — některé
          garantují chuť a původ (DOP), jiné způsob produkce (BIO), další jsou soutěžní ocenění (NYIOOC).
        </p>
        <div className="space-y-4">
          <div className="border border-off2 rounded-[var(--radius-card)] p-5">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-olive mb-3">EU regulační značky</div>
            <div className="grid gap-4 md:grid-cols-2">
              <CertCard code="DOP / CHOP" fullName="Chráněné označení původu" summary="Nejpřísnější EU značka. Celá produkce v regionu, místní odrůdy, dlouhá tradice." examples="DOP Kalamata (Řecko), DOP Terra di Bari (Itálie)" tier="Zlatý standard" />
              <CertCard code="PGP / CHZO / IGP" fullName="Chráněné zeměpisné označení" summary="Mírnější než DOP. Alespoň jedna fáze produkce v regionu." examples="IGP Toscano, IGP Sicilia" tier="Premium regional" />
            </div>
          </div>
          <div className="border border-off2 rounded-[var(--radius-card)] p-5">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-olive mb-3">Bio a organické</div>
            <div className="grid gap-4 md:grid-cols-3">
              <CertCard code="BIO" fullName="EU bio certifikace" summary="Zelený lístek na etiketě. Bez syntetických pesticidů, umělých hnojiv, GMO. Roční kontrola certifikační autoritou." tier="EU standard" />
              <CertCard code="Organické" fullName="Non-EU bio ekvivalent" summary="Stejné principy jako BIO, ale ze zemí mimo EU (USDA Organic, JAS)." tier="Ekvivalent k BIO" />
              <CertCard code="Demeter" fullName="Biodynamické pěstování" summary="Přísnější než BIO. Zohledňuje lunární cykly, rostlinné preparáty místo chemie." tier="Nad BIO" />
            </div>
          </div>
          <div className="border border-off2 rounded-[var(--radius-card)] p-5">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-olive mb-3">Mezinárodní ocenění kvality</div>
            <CertCard code="NYIOOC" fullName="New York International Olive Oil Competition" summary="Nejprestižnější světová soutěž. Slepé hodnocení panelem expertů. Gold = top 5 % světové produkce." tier="Soutěžní ocenění" />
          </div>
        </div>
        <div className="mt-6 bg-off rounded-lg p-4 text-[13px] text-text2 leading-relaxed">
          <strong className="text-text">Pro tip:</strong> Kombinace <strong>DOP + BIO</strong> dává maximum 25 bodů z 25 ve složce Certifikace. Pokud má olej k tomu ještě NYIOOC Gold, je v top kategorii světové produkce.
        </div>
      </div>

      {/* Odkud bereme data */}
      <div className="mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Odkud bereme data
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-off/40 rounded-lg p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-1">Etiketa produktu</div>
            <p className="text-[13px] text-text2">Kyselost, harvest year, BIO/DOP značky — primární zdroj. Foto ze stránky výrobce nebo prodejce.</p>
          </div>
          <div className="bg-off/40 rounded-lg p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-1">Lab reporty</div>
            <p className="text-[13px] text-text2">Polyfenoly, peroxidové číslo, oleic acid — z dokumentů výrobce nebo NYIOOC databáze.</p>
          </div>
          <div className="bg-off/40 rounded-lg p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-1">EU databáze</div>
            <p className="text-[13px] text-text2">DOP/CHOP a CHZO ověřujeme přes EU eAmbrosia Register.</p>
          </div>
          <div className="bg-off/40 rounded-lg p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-1">Ceny u prodejců</div>
            <p className="text-[13px] text-text2">Aktualizované 1× za 24 h scraperem. 18+ prodejců v ČR. Cena za 100 ml jako benchmark.</p>
          </div>
        </div>
      </div>

      {/* Trust */}
      <div className="bg-olive-bg rounded-[var(--radius-card)] p-6 mb-10">
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

      <div className="pt-6 border-t border-off2 text-[13px] text-text2 leading-relaxed">
        Více o tom, jak fungujeme:{' '}
        <Link href="/editorial-policy" className="text-olive underline decoration-dotted">Redakční zásady</Link>
        {' · '}<Link href="/o-projektu" className="text-olive underline decoration-dotted">O projektu</Link>
        {' · '}<Link href="/pro-novinare" className="text-olive underline decoration-dotted">Pro novináře (mediakit)</Link>
      </div>
    </div>
  )
}

function CertCard({ code, fullName, summary, examples, tier }: {
  code: string; fullName: string; summary: string; examples?: string; tier?: string
}) {
  return (
    <div className="bg-off rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[15px] font-semibold text-olive-dark">{code}</span>
        {tier && <span className="text-[10px] text-text3 uppercase tracking-wider">{tier}</span>}
      </div>
      <div className="text-xs text-text3 mb-2">{fullName}</div>
      <p className="text-[13px] text-text2 leading-relaxed">{summary}</p>
      {examples && <div className="text-[11px] text-text3 mt-2 italic">Př.: {examples}</div>}
    </div>
  )
}
