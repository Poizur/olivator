import type { Metadata } from 'next'
import Link from 'next/link'
import { ScoreCalculator } from '@/components/score-calculator'
import { MetodikaToc } from '@/components/metodika-toc'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Olivator Score — Jak hodnotíme olivový olej | Olivator',
  description: 'Transparentní metodika Olivator Score. Vážený průměr 4 měřitelných složek: kyselost, certifikace, polyfenoly, hodnota. Data z EU databází, lab reportů a reálných cen.',
  alternates: { canonical: 'https://olivator.cz/metodika' },
  openGraph: {
    type: 'article',
    url: 'https://olivator.cz/metodika',
    title: 'Olivator Score — Jak hodnotíme olivový olej',
    description: 'Vážený průměr 4 měřitelných složek. Žádné dojmy — pouze data z certifikací, lab reportů a reálných cen.',
    images: [{ url: 'https://images.unsplash.com/photo-1751440033950-71236e893284?crop=entropy&cs=tinysrgb&w=1200', width: 1200, height: 630 }],
  },
}

// Přesné texty z SCORE_EXPLANATION_STRATEGY.md
const COMPONENTS = [
  {
    id: 'kyselost',
    name: 'Kyselost',
    weight: '35 %',
    max: 35,
    img: 'https://images.unsplash.com/photo-1574785289548-b6604d39125d?crop=entropy&cs=tinysrgb&w=800&q=80',
    imgAlt: 'Olivový olej se lije z lahve — čistota a čerstvost oleje se pozná kyselostí',
    level1: 'Kyselost ukazuje jak je olej čerstvý. Čím nižší, tím lepší.',
    level2: 'Kyselost měří kolik volných mastných kyselin olej obsahuje. Vzniká když se olivy špatně zpracují nebo když olej dlouho stojí ve špatných podmínkách. Extra panenský olej musí mít kyselost pod 0,8 %. Ty nejlepší mají pod 0,2 % — to je důkaz čerstvosti a precizní výroby.',
    level3Sections: [
      {
        heading: 'Co se děje na chemické úrovni',
        body: 'Olivový olej tvoří převážně triglyceridy — molekuly kyseliny olejové vázané na glycerolu. Když se olivy poškodí, kvasí nebo se olej oxiduje, enzym lipáza začne triglyceridy rozkládat. Volné mastné kyseliny (Free Fatty Acids — FFA) jsou produktem tohoto rozpadu. Měříme je jako % volné kyseliny olejové dle IOC normy COI/T.20/Doc. No 26.',
      },
      {
        heading: 'Co způsobuje vyšší kyselost',
        body: '1. Pozdní sklizeň — přezrálé olivy mají větší enzymovou aktivitu.\n2. Poškozené olivy — zlomené, nahnilé, napadené olivovou muškou.\n3. Pomalé zpracování — více než 24 hodin od sklizně do lisu.\n4. Vysoká teplota při lisování — nad 27 °C aktivuje enzymy.\n5. Špatné skladování — kyslík, teplo, světlo.',
      },
      {
        heading: 'EU standardy (Nařízení EHS č. 2568/91 + IOC Trade Standards)',
        body: 'Extra panenský (EVOO): max 0,8 % | Panenský: max 2,0 % | Lampante (na rafinaci): nad 2,0 %',
        table: [
          ['Kyselost', 'Body'],
          ['Pod 0,2 %', '35/35 (maximum)'],
          ['0,2–0,3 %', '30–34'],
          ['0,3–0,5 %', '22–29'],
          ['0,5–0,8 %', '15–21'],
          ['Nad 0,8 %', '0 — není EVOO'],
        ],
      },
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
    id: 'certifikace',
    name: 'Certifikace',
    weight: '25 %',
    max: 25,
    img: 'https://images.unsplash.com/photo-1775813716943-856cc25d1edd?crop=entropy&cs=tinysrgb&w=800&q=80',
    imgAlt: 'Certifikační razítko na produktu — nezávislé ověření kvality třetí stranou',
    level1: 'Certifikáty = razítka která potvrzují kvalitu nezávislí kontroloři.',
    level2: 'Certifikáty dávají třetí strany, ne výrobce. Nejdůležitější jsou DOP (Chráněné označení původu — olej z přesné oblasti dle tradičních metod), BIO (bez pesticidů), a NYIOOC (vítězství na světové soutěži v New Yorku). Čím víc certifikátů, tím spolehlivější kvalita.',
    level3Sections: [
      {
        heading: 'Proč certifikace váží 25 % v Score',
        body: 'Certifikace je nezávislá ověřitelná informace. Výrobce může tvrdit cokoli — "premium", "z nejlepších oliv", "ručně vyráběný". Certifikaci musí získat od regulátora po fyzické kontrole. DOP/PGP kontrolují akreditované úřady (ICEA v Itálii, ELOG v Řecku). BIO kontroluje certifikační orgán každý rok (ABCERT, KEZ, Soil Association). NYIOOC je slepá soutěž s 600+ panelisty.',
      },
      {
        heading: 'Kde certifikace ověřit',
        body: 'DOP/PGP: EU eAmbrosia Register (ec.europa.eu) | BIO: certifikační orgán na etiketě (CZ-BIO-001, IT-BIO-008 atd.) | NYIOOC: bestoliveoils.com',
        table: [
          ['Kombinace', 'Body'],
          ['DOP + BIO + NYIOOC Gold', '25/25'],
          ['DOP + BIO', '23–24'],
          ['DOP nebo BIO + ocenění', '18–22'],
          ['Jen DOP nebo BIO', '15–18'],
          ['NYIOOC Gold/Silver', '12–16'],
          ['Žádné certifikace', '0'],
        ],
      },
    ],
    scales: [
      { label: 'DOP + BIO + NYIOOC', desc: '25 bodů (maximum)', color: 'green' },
      { label: 'DOP + BIO', desc: '23–24 bodů', color: 'green' },
      { label: 'DOP nebo BIO', desc: '15–22 bodů', color: 'yellow' },
      { label: 'NYIOOC / PGI', desc: '10–16 bodů', color: 'yellow' },
      { label: 'Bez certifikace', desc: '0 bodů', color: 'red' },
    ],
  },
  {
    id: 'polyfenoly',
    name: 'Polyfenoly',
    weight: '25 %',
    max: 25,
    img: 'https://images.unsplash.com/photo-1634736482829-e2d431eda121?crop=entropy&cs=tinysrgb&w=800&q=80',
    imgAlt: 'Zelené olivy zblízka — čím zelenější, tím více polyfenolů v oleji',
    level1: 'Polyfenoly jsou přírodní antioxidanty které dělají olej zdravým. Čím víc, tím lepší.',
    level2: 'Polyfenoly jsou skupina rostlinných látek které dělají olej zároveň zdravým, chuťově bohatým a trvanlivým. Když cítíš v krku to pálení po doušku kvalitního EVOO — to jsou polyfenoly. EU schválila zdravotní tvrzení: olej s 250+ mg/kg polyfenolů chrání tělo před oxidačním stresem. Top oleje mají 400–800 mg/kg.',
    level3Sections: [
      {
        heading: 'Tři klíčové polyfenoly',
        body: 'Oleokantal — zodpovědný za pálivost a "kop v krku". Strukturálně podobný ibuprofenu. 50 g EVOO s vysokým obsahem oleokantalu = ~10 % protizánětlivého efektu ibuprofenu (Beauchamp et al., Nature, 2005).\n\nOleocein — nejsilnější antioxidant v EVOO. Inhibuje oxidaci LDL cholesterolu.\n\nHydroxytyrosol — mocnější antioxidant než vitamin E. EFSA schválila zdravotní tvrzení 432/2012: "Hydroxytyrosol a jeho deriváty chrání LDL cholesterol před oxidací." Minimum pro tvrzení: 250 mg/kg polyfenolů.',
      },
      {
        heading: 'Co ovlivňuje obsah polyfenolů',
        body: 'Odrůda: Coratina, Picual = vysoký obsah. Arbequina = nižší.\nDoba sklizně: Early harvest (zelené olivy) má 2–3× více než pozdní.\nZpracování: Cold pressed do 30 minut zachová maximum.\nSkladování: Polyfenoly klesají ~20 % za rok — tmavá lahev, pod 18 °C.',
        table: [
          ['Polyfenoly', 'Body'],
          ['Nad 500 mg/kg', '22–25'],
          ['400–500 mg/kg', '18–22'],
          ['300–400 mg/kg', '14–18'],
          ['250–300 mg/kg', '10–14'],
          ['150–250 mg/kg', '5–10'],
          ['Pod 150 mg/kg', '0–4'],
        ],
      },
      {
        heading: 'Senzorické rozpoznání bez lab rozboru',
        body: 'Hořkost na jazyku (Coratina, Picual) | Pálivost v krku po několika sekundách | Zelenkavá barva (chlorofyl koreluje s polyfenoly) | Vůně po čerstvě sečené trávě (early harvest).\n\nMírný olej (Arbequina) má méně polyfenolů, ale ne nutně nižší kvalitu — záleží na použití.',
      },
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
    id: 'hodnota',
    name: 'Cena / kvalita',
    weight: '15 %',
    max: 15,
    img: 'https://images.unsplash.com/photo-1612819052787-618023ea329f?crop=entropy&cs=tinysrgb&w=800&q=80',
    imgAlt: 'Srovnání produktů — měříme hodnotu, ne cenu samotnou',
    level1: 'Měříme jestli platíš za chuť a kvalitu, ne za marketing a krásnou láhev.',
    level2: 'Některé oleje mají skvělé Score a stojí 200 Kč. Jiné stejně dobré stojí 800 Kč — rozdíl je v značce, balení a marketingu. Naše hodnota počítá kolik kvality dostaneš za sto korun. Pomáhá ti najít olej s nejlepším poměrem cena/kvalita pro tvůj rozpočet.',
    level3Sections: [
      {
        heading: 'Vzorec',
        body: 'Hodnota = (Kyselost_body + Certifikace_body + Polyfenoly_body) / cena_za_100ml\n\nVýsledek se normalizuje na škálu 0–15.\n\nPříklad vysoké hodnoty: Picual BIO 500 ml za 249 Kč (Score 82) → cena 49,80 Kč/100ml → poměr 1,43 → 13/15 bodů.\n\nPříklad slabší hodnoty: Premium značka 250 ml za 599 Kč → 239 Kč/100ml → stejná kvalita, 6× dražší → 3/15 bodů.',
      },
      {
        heading: 'Co neměříme do hodnoty',
        body: 'Estetiku obalu — krásná lahev neznamená lepší olej.\nBrand premium — značka sama o sobě.\nDárkové balení — okolnosti prodeje.\nMarketing claims bez certifikace.\n\nCílem hodnoty NENÍ "nejlevnější vyhrává". Olej za 100 Kč s polyfenoly 150 mg/kg má nižší skóre než olej za 300 Kč s 500 mg/kg. Hodnota pomáhá rozlišit dva podobné oleje.',
        table: [
          ['Poměr Score/100 Kč', 'Body'],
          ['> 1,5', '15/15 (maximum)'],
          ['1,2–1,5', '13'],
          ['1,0–1,2', '11'],
          ['0,7–1,0', '8'],
          ['0,5–0,7', '5'],
          ['< 0,5', '0–4'],
        ],
      },
    ],
    scales: [
      { label: 'Poměr > 1,5', desc: 'Vynikající hodnota', color: 'green' },
      { label: '1,2–1,5', desc: 'Výborná hodnota', color: 'green' },
      { label: '1,0–1,2', desc: 'Standardní hodnota', color: 'yellow' },
      { label: '0,5–1,0', desc: 'Slabší hodnota', color: 'yellow' },
      { label: '< 0,5', desc: 'Platíš hlavně za značku', color: 'red' },
    ],
  },
]

const COLOR_DOT: Record<string, string> = {
  green: 'bg-olive',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
}

async function getPageData() {
  const [topRes, retailerRes, allProductsRes, affiliateOffersRes] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('slug, name, olivator_score')
      .eq('status', 'active')
      .not('olivator_score', 'is', null)
      .gt('olivator_score', 0)
      .order('olivator_score', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('retailers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabaseAdmin
      .from('products')
      .select('id, olivator_score')
      .eq('status', 'active')
      .not('olivator_score', 'is', null)
      .gt('olivator_score', 0),
    supabaseAdmin
      .from('product_offers')
      .select('product_id')
      .not('affiliate_url', 'is', null),
  ])

  const productsWithScore = (allProductsRes.data ?? []) as { id: string; olivator_score: number }[]
  const affiliateIds = new Set((affiliateOffersRes.data ?? []).map((o: { product_id: string }) => o.product_id))
  const withAffiliate = productsWithScore.filter(p => affiliateIds.has(p.id))
  const withoutAffiliate = productsWithScore.filter(p => !affiliateIds.has(p.id))
  const avg = (arr: { olivator_score: number }[]) =>
    arr.length ? Math.round(arr.reduce((s, p) => s + p.olivator_score, 0) / arr.length) : 0

  return {
    topProducts: (topRes.data ?? []) as { slug: string; name: string; olivator_score: number }[],
    retailerCount: retailerRes.count ?? 33,
    independenceCheck: {
      affiliateAvg: avg(withAffiliate),
      affiliateCount: withAffiliate.length,
      noAffiliateAvg: avg(withoutAffiliate),
      noAffiliateCount: withoutAffiliate.length,
      checkedAt: new Date().toISOString().slice(0, 10),
    },
  }
}

const SCORE_BRACKETS = [
  { range: '90–100', label: 'Top tier', emoji: '🏆', note: 'Top 5 % katalogu', bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  { range: '80–89', label: 'Vynikající', emoji: '🥇', note: 'Skvělá volba', bg: '#d8f3dc', border: '#b7e4c7', text: '#1b4332' },
  { range: '70–79', label: 'Velmi dobré', emoji: '🥈', note: 'Nad průměrem', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12' },
  { range: '60–69', label: 'Dobré', emoji: '🥉', note: 'Standardní kvalita', bg: '#f5f5f7', border: '#e8e8ed', text: '#6e6e73' },
  { range: '50–59', label: 'Průměrné', emoji: '⚪', note: 'Chybí část dat', bg: '#f5f5f7', border: '#e8e8ed', text: '#9ca3af' },
  { range: 'Pod 50', label: 'Slabší', emoji: '🔴', note: 'Nízká kvalita nebo chybí data', bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
]

const FAQ_ITEMS = [
  {
    q: 'Proč nemají polyfenoly 100 % váhu, když jsou nejzdravější?',
    a: 'Polyfenoly jsou klíčové, ale nejsou jediné. Olej s 800 mg/kg polyfenolů ale kyselostí 0,7 % a bez certifikací je objektivně horší než olej s 400 mg/kg, kyselostí 0,15 % a DOP+BIO certifikací. Score měří celkovou kvalitu, ne jeden parametr.',
  },
  {
    q: 'Co když výrobce neuvádí polyfenoly na etiketě?',
    a: 'Polyfenolová složka (25 %) dostane 0 bodů, ale Score se přepočítá proporcionálně z dostupných dat — kyselost, certifikace a cena. Výsledné číslo je validní pro to, co víme, ale neodráží zdravotní profil oleje. Aktivně oslovujeme výrobce a prosíme je o technické listy.',
  },
  {
    q: 'Jak často se Score mění?',
    a: 'Cena a výpočet hodnoty se aktualizují u XML partnerů denně, u ostatních prodejců 3× týdně. Kyselost a polyfenoly zůstávají stejné dokud nepřijde nový lab report. Certifikace kontrolujeme 1× měsíčně přes EU registry.',
  },
  {
    q: 'Mohu Score získat 100/100?',
    a: 'Teoreticky ano. V praxi to znamená: kyselost pod 0,2 %, DOP+BIO+NYIOOC Gold certifikace, polyfenoly nad 500 mg/kg a zároveň cena pod 50 Kč/100 ml. Takový olej zatím v ČR trhu neexistuje — nejlepší naše oleje dosahují 90–95.',
  },
  {
    q: 'Co dělat když najdu chybu v datech?',
    a: 'Napiš na info@makyoutdoors.com s odkazem na produkt a chybný údaj. Chybu opravíme co nejdříve.',
  },
  {
    q: 'Funguje Score i pro ochucené oleje s lanýžem nebo chilli?',
    a: 'Ne. Ochucené oleje (aromatizované) hodnotíme jinou metrikou — EVOO škála by nebyla férová. Na produktové kartě jsou označeny jako "Aromatizovaný".',
  },
  {
    q: 'Proč některé oleje v katalogu nemají Score?',
    a: 'Score vyžaduje dostatečnou kombinaci dat — potřebujeme pokrýt alespoň 50 % celkové váhy složek (kyselost 35 %, certifikace 25 %, polyfenoly 25 %, cena 15 %). Například kyselost + certifikace (60 %) nebo kyselost + cena (50 %) stačí; samotná kyselost (35 %) nestačí. Oleje s nedostatkem dat jsou označeny "čekáme na analytická data" a do žebříčků nejsou zařazeny.',
  },
  {
    q: 'Jsem výrobce nebo prodejce — mohu dodat analytická data?',
    a: 'Ano a velmi to uvítáme. Stačí poslat technický list (PDF nebo link) s kyselostí a polyfenoly na info@makyoutdoors.com. Data ověříme, doplníme do systému a ohodnotíme olej co nejdříve. Žádné poplatky.',
  },
]

export default async function MetodikaPage() {
  const { topProducts, retailerCount, independenceCheck } = await getPageData()
  const dateModified = new Date().toISOString().slice(0, 10)

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Olivator Score — Jak hodnotíme olivový olej',
    description: 'Transparentní metodika Olivator Score. Vážený průměr 4 měřitelných složek: kyselost, certifikace, polyfenoly, hodnota.',
    author: { '@type': 'Organization', name: 'Olivator', url: 'https://olivator.cz' },
    publisher: { '@type': 'Organization', name: 'Olivator', url: 'https://olivator.cz' },
    datePublished: '2026-05-01',
    dateModified,
    url: 'https://olivator.cz/metodika',
    image: 'https://images.unsplash.com/photo-1751440033950-71236e893284?crop=entropy&cs=tinysrgb&w=1200',
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <div className="relative overflow-hidden mb-0" style={{ minHeight: 320 }}>
        <img
          src="https://images.unsplash.com/photo-1751440033950-71236e893284?crop=entropy&cs=tinysrgb&w=1400&q=80"
          alt="Kapky olivového oleje v detailu — vědecká analýza kvality"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(27,67,50,0.88) 0%, rgba(27,67,50,0.65) 100%)' }} />
        <div className="relative max-w-[1100px] mx-auto px-6 md:px-10 py-16 md:py-20">
          <div className="text-xs text-white/50 mb-5">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">Olivator</Link>
            {' › '}Metodika
          </div>
          <div className="max-w-[620px]">
            <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-normal text-white mb-4 leading-tight">
              Jak počítáme<br />
              <em className="not-italic text-white/80">Olivator Score</em>
            </h1>
            <p className="text-[16px] text-white/75 leading-relaxed mb-6 font-light">
              Číslo 0–100. Vážený průměr 4 měřitelných složek. Žádné dojmy, žádný marketing —
              jenom data z EU databází, lab reportů a reálných cen.
            </p>
            <div className="flex flex-wrap gap-2">
              {['✓ Nezávislé hodnocení', '✓ Reálná data', '✓ Žádná placená umístění'].map(t => (
                <span key={t} className="text-xs text-white bg-white/15 px-3 py-1.5 rounded-full font-medium backdrop-blur-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hlavní obsah se sticky TOC */}
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-12">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-14">

          {/* Sticky TOC — desktop only */}
          <aside className="hidden lg:block">
            <MetodikaToc />
          </aside>

          {/* Hlavní obsah */}
          <main className="min-w-0">

            {/* ── SEKCE 1: Co je Score ─────────────────────────── */}
            <section id="score" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal text-text mb-4 leading-tight">
                Score 0–100, vážený průměr 4 složek
              </h2>
              <p className="text-[15px] text-text2 leading-relaxed mb-6 font-light">
                Olivator Score říká jak kvalitní olej je. Každá složka má svou váhu —
                protože ne všechny mají stejný vliv na kvalitu. Score se přepočítává
                automaticky při každé změně ceny nebo lab dat.
              </p>

              {/* Score vizuál */}
              <div className="bg-off rounded-2xl p-6 mb-6">
                <div className="text-[11px] text-text3 uppercase tracking-wider mb-4">
                  Příklad: olej se Score 84
                </div>
                <div className="flex items-end gap-4 mb-4">
                  <div className="text-5xl font-bold" style={{ color: '#2d6a4f' }}>84</div>
                  <div className="text-[13px] text-text2 leading-snug pb-1">
                    🥇 Vynikající<br />
                    <span className="text-text3">z 100 bodů</span>
                  </div>
                </div>
                <div className="h-2.5 bg-off2 rounded-full overflow-hidden mb-5">
                  <div className="h-full rounded-full" style={{ width: '84%', background: '#2d6a4f' }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Kyselost', score: 33, max: 35, note: '0,15 %' },
                    { label: 'Certifikace', score: 19, max: 25, note: 'DOP + BIO' },
                    { label: 'Polyfenoly', score: 21, max: 25, note: '420 mg/kg' },
                    { label: 'Hodnota', score: 11, max: 15, note: '68 Kč/100ml' },
                  ].map(c => (
                    <div key={c.label} className="bg-white rounded-xl p-3 text-center">
                      <div className="text-[10px] text-text3 uppercase tracking-wider mb-1">{c.label}</div>
                      <div className="text-xl font-bold text-terra">{c.score}</div>
                      <div className="text-[10px] text-text3">z {c.max}</div>
                      <div className="text-[10px] text-olive mt-1">{c.note}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-text3 mt-4 text-center">
                  Score = (Kyselost × 0,35) + (Certifikace × 0,25) + (Polyfenoly × 0,25) + (Hodnota × 0,15)
                </p>
              </div>

              {/* Top produkty */}
              <div className="bg-olive-bg rounded-2xl p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-3">
                  Oleje s nejvyšším Score v katalogu
                </div>
                <div className="space-y-2">
                  {topProducts.map(p => (
                    <Link
                      key={p.slug}
                      href={`/olej/${p.slug}`}
                      className="flex items-center justify-between py-1.5 group"
                    >
                      <span className="text-[13px] text-text2 group-hover:text-olive transition-colors truncate pr-2">{p.name}</span>
                      <span
                        className="text-[13px] font-bold rounded-full px-2 py-0.5 text-white shrink-0"
                        style={{ background: p.olivator_score >= 90 ? '#b5860d' : '#2d6a4f' }}
                      >
                        {p.olivator_score}
                      </span>
                    </Link>
                  ))}
                </div>
                <Link href="/srovnavac" className="inline-block mt-3 text-[12px] text-olive underline decoration-dotted">
                  Prohlédnout celý katalog →
                </Link>
              </div>
            </section>

            {/* ── SEKCE 2: Brackets ───────────────────────────── */}
            <section id="brackets" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Co číslo znamená
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Oleje rozdělujeme do šesti kategorií podle Score. Barva badge na produktové kartě odpovídá kategorii.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SCORE_BRACKETS.map(b => (
                  <div key={b.range} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: b.bg, border: `1px solid ${b.border}` }}>
                    <span className="text-2xl">{b.emoji}</span>
                    <div>
                      <div className="text-[16px] font-bold leading-none mb-0.5" style={{ color: b.text }}>{b.range}</div>
                      <div className="text-[12px]" style={{ color: b.text }}>{b.label} — {b.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SEKCE 3: 4 složky ──────────────────────────── */}
            <section id="slozky" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                4 složky Score
              </h2>
              <p className="text-[14px] text-text2 font-light mb-6">
                Každá složka vychází z ověřitelných dat. Žádná nevzniká z dojmů nebo hodnocení editora.
              </p>

              <div className="space-y-5">
                {COMPONENTS.map((comp, i) => (
                  <div key={comp.id} className="border border-off2 rounded-2xl overflow-hidden">
                    {/* Obrázek sekce */}
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={comp.img}
                        alt={comp.imgAlt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(27,67,50,0.75) 0%, rgba(27,67,50,0.3) 60%, transparent 100%)' }} />
                      <div className="absolute inset-0 flex items-center px-6">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">{comp.weight} váha</span>
                          </div>
                          <div className="text-[22px] font-semibold text-white leading-none">{comp.name}</div>
                        </div>
                      </div>
                    </div>

                    {/* Level 1 — vždy viditelné */}
                    <div className="px-5 pt-4 pb-2">
                      <p className="text-[15px] font-medium text-olive-dark leading-snug">
                        {comp.level1}
                      </p>
                    </div>

                    {/* Accordion Level 2 + stupnice */}
                    <details className="group border-t border-off2">
                      <summary className="flex items-center justify-between px-5 py-3 cursor-pointer list-none text-[12px] text-olive font-medium hover:bg-olive-bg/30 transition-colors">
                        Přečíst více
                        <span className="text-text3 group-open:rotate-180 transition-transform duration-200">▾</span>
                      </summary>
                      <div className="px-5 pb-5">
                        <p className="text-[14px] text-text2 leading-relaxed mb-4">{comp.level2}</p>

                        {/* Stupnice */}
                        <div className="space-y-1.5 mb-5">
                          {comp.scales.map(s => (
                            <div key={s.label} className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT[s.color]}`} />
                              <span className="text-[12px] font-medium text-text w-32 shrink-0">{s.label}</span>
                              <span className="text-[12px] text-text2">{s.desc}</span>
                            </div>
                          ))}
                        </div>

                        {/* Accordion Level 3 — vědecké vysvětlení */}
                        <details className="group/inner">
                          <summary className="flex items-center gap-2 cursor-pointer list-none text-[11px] text-text3 hover:text-text2 font-medium transition-colors">
                            <span className="group-open/inner:rotate-90 transition-transform duration-200 text-[10px]">▶</span>
                            Vědecké vysvětlení
                          </summary>
                          <div className="mt-4 space-y-5">
                            {comp.level3Sections.map((sec, j) => (
                              <div key={j}>
                                <h4 className="text-[12px] font-semibold text-text uppercase tracking-wider mb-2">{sec.heading}</h4>
                                <p className="text-[13px] text-text2 leading-relaxed whitespace-pre-line">{sec.body}</p>
                                {sec.table && (
                                  <div className="mt-3 overflow-x-auto">
                                    <table className="w-full text-[12px]">
                                      <tbody>
                                        {sec.table.map((row, ri) => (
                                          <tr key={ri} className={ri === 0 ? 'bg-off2 font-semibold' : ri % 2 === 0 ? 'bg-off/50' : ''}>
                                            {row.map((cell, ci) => (
                                              <td key={ci} className="px-3 py-1.5 text-text2">{cell}</td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SEKCE 3b: Bonus pro funkční oleje ──────────── */}
            <section id="bonus" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Bonus pro funkční oleje
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Oleje s extrémním obsahem polyfenolů (nad 1 500 mg/kg) překračují standardní škálu
                naší polyfenolové složky — dostávají aditivní bonus přičtený ke Score.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-3">
                  Jak se bonus počítá
                </div>
                <p className="text-[13px] text-amber-900 leading-relaxed mb-4">
                  Za každých 200 mg/kg polyfenolů nad hranici 1 500 mg/kg dostane olej +1 bod.
                  Bonus je omezen na +10 bodů a výsledné Score nepřekročí 100.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <tbody>
                      {[
                        ['Polyfenoly', 'Bonus', 'Příklad'],
                        ['Pod 1 500 mg/kg', '+0', 'Standardní výpočet'],
                        ['1 500–1 700 mg/kg', '+1', '—'],
                        ['1 700–1 900 mg/kg', '+2', '—'],
                        ['1 900–2 100 mg/kg', '+3', '—'],
                        ['2 100–2 300 mg/kg', '+4', '—'],
                        ['2 300–2 500 mg/kg', '+5', '—'],
                        ['2 500–2 700 mg/kg', '+6', 'EVOLIA 2 500 mg/kg'],
                        ['2 700–2 900 mg/kg', '+6 (zaokr.)', 'EVOLIA 2 777 mg/kg → +6'],
                        ['Nad 3 500 mg/kg', '+10 (max)', 'Strop'],
                      ].map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? 'bg-amber-100 font-semibold' : ri % 2 === 0 ? 'bg-amber-50/50' : ''}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-1.5 text-amber-900">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-off rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text3 mb-2">
                  Proč bonus a ne vyšší základ?
                </div>
                <p className="text-[13px] text-text2 leading-relaxed">
                  Standardní polyfenolová složka je kalibrována na reálný rozsah trhu (0–500 mg/kg)
                  a je součástí váženého průměru. Hodnoty nad 1 500 mg/kg jsou výjimečné —
                  bonus je spravedlivější než přepočítávání celé škály, které by zkreslilo
                  hodnocení ostatních produktů.
                </p>
              </div>
            </section>

            {/* ── SEKCE 4: Kalkulačka ─────────────────────────── */}
            <section id="kalkulator" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Spočítej si Score sám
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Zadej parametry libovolného oleje a uvidíš orientační Score v reálném čase.
              </p>
              <ScoreCalculator />
            </section>

            {/* ── SEKCE 5: Odkud bereme data ──────────────────── */}
            <section id="data" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Odkud bereme data
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Žádné odhady. Když data chybí — Score je nižší nebo skryté.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { title: 'Etiketa produktu', body: 'Kyselost, harvest year, BIO/DOP značky — primární zdroj. Foto ze stránky výrobce nebo prodejce.', freq: 'Dle dostupnosti' },
                  { title: 'Lab reporty výrobce', body: 'Polyfenoly, peroxidové číslo, oleic acid — z dokumentů výrobce nebo NYIOOC databáze.', freq: 'Při novém produktu' },
                  { title: 'EU databáze', body: 'DOP/CHOP a CHZO ověřujeme přes EU eAmbrosia Register. BIO přes certifikační orgán na etiketě.', freq: 'Audit 1× měsíčně' },
                  { title: 'Ceny u prodejců', body: `Scraper ${retailerCount} prodejců v ČR. Cena za 100 ml jako srovnávací benchmark.`, freq: 'XML partneři denně, ostatní 3× týdně' },
                ].map(d => (
                  <div key={d.title} className="bg-off rounded-xl p-4">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <div className="text-[12px] font-semibold uppercase tracking-wider text-olive">{d.title}</div>
                      <div className="text-[10px] text-text3 shrink-0">{d.freq}</div>
                    </div>
                    <p className="text-[13px] text-text2 leading-relaxed">{d.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SEKCE 6: Vědecké základy ────────────────────── */}
            <section id="veda" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Vědecké základy
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Olivator Score nevznikl v marketingovém oddělení. Vychází z regulačního rámce EU a recenzovaných studií.
              </p>

              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="border border-off2 rounded-xl p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-3">Regulační rámec</div>
                  <ul className="space-y-1.5 text-[13px] text-text2">
                    <li>• IOC Trade Standards (International Olive Council)</li>
                    <li>• EU Regulation 432/2012 — Health Claims</li>
                    <li>• EU Regulation 2568/91 — EVOO kategorizace</li>
                    <li>• ISO 660:2009 — stanovení kyselosti</li>
                  </ul>
                </div>
                <div className="border border-off2 rounded-xl p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-3">Klíčové studie</div>
                  <ul className="space-y-2 text-[13px] text-text2">
                    <li>
                      <strong className="text-text">Beauchamp et al. (Nature, 2005)</strong><br />
                      Objev oleokantalu jako protizánětlivého agentu s ibuprofen-like aktivitou.
                    </li>
                    <li>
                      <strong className="text-text">Estruch et al. PREDIMED (NEJM, 2013)</strong><br />
                      Středomořská dieta s EVOO snižuje kardiovaskulární riziko o 30 %.
                    </li>
                    <li>
                      <strong className="text-text">EFSA Panel 432/2012</strong><br />
                      Schválení zdravotního tvrzení: 250+ mg/kg polyfenolů = ochrana LDL před oxidací.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="relative h-44 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1761106082516-61d4c6883f59?crop=entropy&cs=tinysrgb&w=900&q=80"
                  alt="Vědecké vybavení laboratoře — analýza olivového oleje"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: 'rgba(27,67,50,0.6)' }} />
                <div className="absolute inset-0 flex items-center px-6">
                  <p className="text-white text-[14px] max-w-md font-light leading-relaxed">
                    "Výrobci nám neplatí za lepší umístění. Nemáme sponzorované pozice.
                    Score je nezávislé — proto ho dostaneš rovnou bez příkras."
                  </p>
                </div>
              </div>
            </section>

            {/* ── SEKCE 7: Co Score neměří ────────────────────── */}
            <section id="nezmeri" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Co Score nezahrnuje
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Olivator Score je objektivní, ale není všezahrnující. Transparentně říkáme, co neměříme.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: 'Subjektivní chuť', body: 'Někomu sedí jemný Arbequina, jiný preferuje pálivou Coratinu. To je preference, ne kvalita. Chuťový profil měříme samostatně.' },
                  { title: 'Sezónní degradace', body: 'Score odráží aktuální data. Olivový olej je živý produkt — otevřená lahev ztrácí polyfenoly každý měsíc.' },
                  { title: 'Dostupnost', body: 'Skvělý DOP olej z malé farmy ve 300 lahvích/rok dostane vysoké Score, ale málokdo ho sežene. Hodnotíme produkt, ne dostupnost.' },
                  { title: 'Etika producenta', body: 'Fairtrade, životní prostředí, podmínky zaměstnanců — měříme je certifikací Fairtrade nebo Demeter, ne samostatně.' },
                  { title: 'Ochucené oleje', body: 'Lanýž, chilli, česnek, citron — ochucené oleje hodnotíme jinou metrikou. Nejsou EVOO ve standardním slova smyslu.' },
                  { title: 'Estetika obalu', body: 'Krásná keramická lahev nebo dárkové balení nemá vliv na Score. Měříme co je uvnitř.' },
                ].map(item => (
                  <div key={item.title} className="bg-off rounded-xl p-4">
                    <div className="text-[13px] font-semibold text-text mb-1.5">{item.title}</div>
                    <p className="text-[13px] text-text2 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SEKCE 7b: JE / NENÍ blok ────────────────────── */}
            <section id="je-neni" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Co máme a co nemáme
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Olivator zobrazuje výhradně ověřitelná data. Kde data chybí, říkáme to přímo.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-olive/30 bg-olive-bg/40 p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-4">
                    ✓ Data která máme
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      { label: 'Kyselost', note: 'z etikety nebo tech listu výrobce' },
                      { label: 'DOP / PGI certifikace', note: 'ověřeno v EU eAmbrosia registru' },
                      { label: 'BIO certifikace', note: 'ověřeno přes číslo certifikačního orgánu' },
                      { label: 'NYIOOC ocenění', note: 'z veřejné databáze bestoliveoils.com' },
                      { label: 'Ceny u prodejců', note: `scraper ${retailerCount} prodejců, XML nebo Playwright` },
                      { label: 'Olivator Score', note: 'vypočítaný z výše uvedených složek' },
                    ].map(item => (
                      <li key={item.label} className="flex items-start gap-2.5">
                        <span className="text-olive text-[14px] mt-0.5 shrink-0">✓</span>
                        <div>
                          <span className="text-[13px] font-medium text-text">{item.label}</span>
                          <span className="text-[12px] text-text3 ml-1.5">{item.note}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-off2 bg-off p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text3 mb-4">
                    ✗ Data která nemáme (a říkáme to)
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      { label: 'Polyfenoly bez dokladu', note: 'zobrazujeme NULL, ne odhad' },
                      { label: 'Rok sklizně', note: 'výrobci ho zřídka uvádí na etiketě' },
                      { label: 'Senzorické hodnocení', note: 'nezávislý panel pro ČR neexistuje' },
                      { label: 'Etika producenta', note: 'pouze kde je Fairtrade/Demeter certifikace' },
                      { label: 'Lab report kyselosti', note: 'u neanotovaných produktů etiketa = primární zdroj' },
                      { label: 'Fyzická dostupnost', note: 'zásoby u prodejce v reálném čase' },
                    ].map(item => (
                      <li key={item.label} className="flex items-start gap-2.5">
                        <span className="text-text3 text-[14px] mt-0.5 shrink-0">✗</span>
                        <div>
                          <span className="text-[13px] font-medium text-text">{item.label}</span>
                          <span className="text-[12px] text-text3 ml-1.5">{item.note}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* ── SEKCE 7c: Kontrola nezávislosti ─────────────── */}
            <section id="nezavislost" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Kontrola nezávislosti
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Affiliate partnerství nesmí ovlivňovat Score. Každý měsíc porovnáváme průměrné
                Score produktů s affiliate URL a bez — výsledek je živý z databáze.
              </p>
              <div className="bg-off rounded-2xl p-5 mb-4">
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-olive mb-1">{independenceCheck.affiliateAvg}</div>
                    <div className="text-[12px] text-text3">průměrné Score</div>
                    <div className="text-[11px] font-medium text-text mt-1">s affiliate URL</div>
                    <div className="text-[10px] text-text3">({independenceCheck.affiliateCount} produktů)</div>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    <div>
                      <div className="text-2xl font-bold mb-1" style={{
                        color: Math.abs(independenceCheck.affiliateAvg - independenceCheck.noAffiliateAvg) <= 5
                          ? '#2d6a4f' : '#c4711a'
                      }}>
                        {independenceCheck.affiliateAvg === independenceCheck.noAffiliateAvg
                          ? '= stejné'
                          : `${independenceCheck.affiliateAvg > independenceCheck.noAffiliateAvg ? '+' : ''}${independenceCheck.affiliateAvg - independenceCheck.noAffiliateAvg}`
                        }
                      </div>
                      <div className="text-[11px] text-text3">rozdíl</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-text mb-1">{independenceCheck.noAffiliateAvg}</div>
                    <div className="text-[12px] text-text3">průměrné Score</div>
                    <div className="text-[11px] font-medium text-text mt-1">bez affiliate URL</div>
                    <div className="text-[10px] text-text3">({independenceCheck.noAffiliateCount} produktů)</div>
                  </div>
                </div>
                <div className="text-center text-[12px] text-text3 border-t border-off2 pt-3">
                  {Math.abs(independenceCheck.affiliateAvg - independenceCheck.noAffiliateAvg) <= 5
                    ? '✓ Rozdíl do 5 bodů — affiliate status nekoreluje se Score přiřazením'
                    : `⚠ Rozdíl ${Math.abs(independenceCheck.affiliateAvg - independenceCheck.noAffiliateAvg)} bodů — prověřujeme příčinu`
                  }
                  {' · '}Ověřeno: {independenceCheck.checkedAt}
                </div>
              </div>
              <p className="text-[13px] text-text3 leading-relaxed">
                Score vychází výhradně z kyselosti, certifikací, polyfenolů a ceny — affiliate URL
                do vzorce nevstupuje. Výrobci a prodejci nemohou zaplatit za vyšší Score.
              </p>
            </section>

            {/* ── SEKCE 7d: Changelog metodiky ────────────────── */}
            <section id="changelog" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-2">
                Changelog metodiky
              </h2>
              <p className="text-[14px] text-text2 font-light mb-5">
                Transparentní záznam změn — kdy a proč jsme upravili způsob výpočtu.
              </p>
              <div className="space-y-3">
                {[
                  {
                    date: '2026-07-24',
                    version: 'v1.3',
                    change: 'Zdroj-tagy na produktové kartě — kyselost a polyfenoly nově zobrazují odkud data pochází (dle výrobce / dle prodejce / zdroj ověřujeme).',
                  },
                  {
                    date: '2026-06-15',
                    version: 'v1.2',
                    change: 'Funkční bonus pro oleje s polyfenoly nad 1 500 mg/kg — +1 bod za každých 200 mg/kg nad tuto hranici, max +10 bodů.',
                  },
                  {
                    date: '2026-05-28',
                    version: 'v1.1',
                    change: 'Spec-guard: polyfenoly bez doložených dat nastaveny na NULL místo interpolovaného odhadu. Ovlivněno ~30 % katalogu — Score rekalkulovány.',
                  },
                  {
                    date: '2026-04-15',
                    version: 'v1.0',
                    change: 'Spuštění Olivator Score — vážený průměr 4 složek: kyselost (35 %), certifikace (25 %), polyfenoly (25 %), hodnota (15 %).',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 border-l-2 border-olive/20 pl-4">
                    <div className="shrink-0 w-20">
                      <div className="text-[10px] text-text3">{item.date}</div>
                      <div className="text-[11px] font-semibold text-olive">{item.version}</div>
                    </div>
                    <p className="text-[13px] text-text2 leading-relaxed">{item.change}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SEKCE 7e: Opt-out pro výrobce ───────────────── */}
            <section id="oprava" className="scroll-mt-20 mb-14">
              <div className="bg-olive-bg/50 border border-olive/20 rounded-2xl p-6">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-olive mb-3">
                  Jste výrobce nebo prodejce?
                </div>
                <h3 className="text-[18px] font-medium text-text mb-2 leading-snug">
                  Opravíme chybná data do 48 hodin
                </h3>
                <p className="text-[14px] text-text2 leading-relaxed mb-4">
                  Máte technický list, lab report nebo novější analytická data? Pošlete odkaz nebo PDF —
                  data ověříme a aktualizujeme. Bez poplatků.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <a
                    href="mailto:info@makyoutdoors.com?subject=Oprava dat — Olivator&body=Produkt: %0AChybný údaj: %0ASpravný údaj / zdroj: "
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-olive text-white text-[13px] font-medium rounded-full hover:bg-olive2 transition-colors"
                  >
                    Napsat e-mail →
                  </a>
                  <span className="text-[12px] text-text3">info@makyoutdoors.com · odpovídáme do 48 h</span>
                </div>
              </div>
            </section>

            {/* ── SEKCE 8: FAQ ────────────────────────────────── */}
            <section id="faq" className="scroll-mt-20 mb-14">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-5">
                Časté otázky
              </h2>
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <details key={i} className="group border border-off2 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                      <span className="text-[14px] font-medium text-text pr-4">{item.q}</span>
                      <span className="text-text3 group-open:rotate-180 transition-transform duration-200 shrink-0">▾</span>
                    </summary>
                    <div className="px-5 pb-4">
                      <p className="text-[13px] text-text2 leading-relaxed">{item.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Footer links */}
            <div className="pt-6 border-t border-off2 text-[13px] text-text2 leading-relaxed">
              Více o Olivatoru:{' '}
              <Link href="/o-projektu" className="text-olive underline decoration-dotted">O projektu</Link>
              {' · '}<Link href="/pruvodce/jak-vybrat-olivovy-olej" className="text-olive underline decoration-dotted">Jak vybrat olivový olej</Link>
              {' · '}<Link href="/srovnavac" className="text-olive underline decoration-dotted">Celý katalog</Link>
            </div>

          </main>
        </div>
      </div>
    </>
  )
}
