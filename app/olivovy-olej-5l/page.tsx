import type { Metadata } from 'next'
import Link from 'next/link'
import { get5LProducts } from '@/lib/data'
import { TopProductCard } from '@/components/home/top-product-card'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { SavingsCalculator } from './savings-calculator'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Olivový olej 5L — velké balení od 118 Kč/litr | Olivator',
  description:
    '51 prověřených olivových olejů v 5L balení od 118 Kč/litr. Ušetřete až 44 % oproti malým lahvím. Nezávislé hodnocení, reálné ceny ze 30+ prodejen.',
  alternates: { canonical: 'https://olivator.cz/olivovy-olej-5l' },
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: 'https://olivator.cz/olivovy-olej-5l',
    siteName: 'Olivator',
    title: 'Olivový olej 5L — velké balení od 118 Kč/litr',
    description: '51 prověřených 5L olejů, nejlevnější nabídky, kalkulačka úspor.',
  },
}

const FAQ_ITEMS = [
  {
    q: 'Jak dlouho vydrží otevřený 5L olej?',
    a: 'Maximálně 3 měsíce ve tmě při pokojové teplotě (15–25 °C). Doporučujeme přelít do menších tmavých skleněných lahví hned po otevření — zpomalí to oxidaci.',
  },
  {
    q: 'Je kvalita 5L balení stejná jako u malých lahví?',
    a: 'Ano. Velká plechovka nebo bag-in-box obsahuje stejný olej jako 0,5L lahev — liší se pouze obal. Všechny produkty v katalogu mají dostupné lab testy nebo certifikace.',
  },
  {
    q: 'Kde 5L balení skladovat doma?',
    a: 'Tmavá spíž nebo skříňka při pokojové teplotě. Není vhodná lednice (olej houstne a ztrácí aromata) ani místo u sporáku (teplo urychluje oxidaci).',
  },
  {
    q: 'Pro koho je 5L balení nejvhodnější?',
    a: 'Rodiny 3+ lidí, které spotřebují 1–2 litry měsíčně, restaurace, catering nebo každodenní kuchaři. Průměrná domácnost spořetelné 4 osoby spotřebuje 5L za 3–5 měsíců.',
  },
  {
    q: 'Jaký 5L olej koupím poprvé?',
    a: 'Řecký extra panenský EVOO s Olivator Score 85+ a cenou do 150 Kč/litr. Řecko má v katalogu 34 ze 51 produktů — je to nejlépe zastoupená kategorie s nejlepším poměrem cena/kvalita.',
  },
  {
    q: 'Je plechovka lepší než plastová láhev nebo bag-in-box?',
    a: 'Plechovka a bag-in-box (víno-balení) chrání před světlem nejlépe. Bag-in-box navíc zamezuje kontaktu se vzduchem po každém výtoku — ideální pro rodiny. Průhledný PET nejméně vhodný pro delší skladování.',
  },
]

export default async function BulkOilPage() {
  const products = await get5LProducts()
  const total = products.length

  // Seřadit od nejlevnějšího po nejdražší (cena/litr)
  const calcPpl = (p: typeof products[0]) =>
    p.cheapestOffer ? p.cheapestOffer.price / ((p.volumeMl ?? 5000) / 1000) : 9999

  const sorted = [...products].sort((a, b) => calcPpl(a) - calcPpl(b))

  // Rozdělit: extra panenský (non-pomace) vs pokrutiny (pomace)
  const evooList    = sorted.filter(p => p.type !== 'pomace')
  const pomaceList  = sorted.filter(p => p.type === 'pomace')

  const minPpl = sorted.length > 0 && sorted[0].cheapestOffer
    ? Math.round(calcPpl(sorted[0]))
    : 118

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Olivový olej 5L',
    description: 'Velká balení olivového oleje — porovnání cen, nezávislé hodnocení.',
    numberOfItems: total,
    url: 'https://olivator.cz/olivovy-olej-5l',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── HERO — kalkulačka vpravo ──────────────────────────────── */}
      <section className="px-6 md:px-10 pt-14 pb-12">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-start">

          {/* Levý sloupec */}
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-2">
              — Velká balení
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-[56px] font-normal text-text leading-[1.1] mb-4 max-w-[700px]">
              Olivový olej 5L —<br />
              <em className="text-olive italic">velké balení, malá cena.</em>
            </h1>
            <p className="text-[16px] text-text2 max-w-[520px] leading-relaxed mb-7">
              {total} prověřených olejů v 5L balení. Od {minPpl} Kč/litr.
              Nezávislé Olivator Score, reálné ceny ze srovnání 30+ prodejen.
            </p>

            <a
              href="#produkty"
              className="inline-block bg-olive text-white text-[14px] font-semibold px-5 py-2.5 rounded-lg hover:bg-olive2 transition-colors mb-8"
            >
              Zobrazit {total} olejů ↓
            </a>

            <div className="flex flex-wrap gap-3">
              {[
                { v: `${total}`, l: 'produktů v katalogu' },
                { v: `od ${minPpl} Kč`, l: 'cena za litr' },
                { v: '−44 %', l: 'průměrná úspora vs 0,5L' },
                { v: '3 země', l: 'Řecko, Španělsko, Itálie' },
              ].map(s => (
                <div key={s.l} className="flex items-center gap-2 bg-off border border-off2 rounded-full px-4 py-1.5">
                  <span className="text-[15px] font-bold text-text tabular-nums">{s.v}</span>
                  <span className="text-[12px] text-text3">{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pravý sloupec: kalkulačka */}
          <SavingsCalculator compact />
        </div>
      </section>

      {/* ── VALUE PROPS — kompaktní pruh ─────────────────────────── */}
      <section className="px-6 md:px-10 py-5 border-t border-off2 bg-off/30">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: '💰',
              title: 'Průměrná úspora −44 %',
              text: '140 Kč/litr u 5L vs 250 Kč u 0,5L. Při 1,5L/měs to je přes 1 900 Kč ročně.',
            },
            {
              icon: '📦',
              title: 'Jedna plechovka = 10 lahví',
              text: 'Bag-in-box nebo plechovka zachová kvalitu. Stejný olej, méně obalového odpadu.',
            },
            {
              icon: '✓',
              title: 'Olivator Score na každém oleji',
              text: 'Nezávislé hodnocení 0–100 z kyselosti, polyfenolů a certifikací. Bez marketingu.',
            },
          ].map(p => (
            <div key={p.title} className="flex items-start gap-3 bg-white border border-off2 rounded-xl p-4">
              <span className="text-[22px] shrink-0 leading-none mt-0.5">{p.icon}</span>
              <div>
                <div className="text-[13px] font-semibold text-text">{p.title}</div>
                <div className="text-[12px] text-text2 leading-relaxed mt-0.5">{p.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUKTY — seřazeno od nejlevnějšího, rozděleno ─────── */}
      <section id="produkty" className="px-6 md:px-10 py-16">
        <div className="max-w-[1280px] mx-auto">

          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
                — Nejlevnější
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[40px] font-normal text-text leading-tight">
                Nejlevnější 5L olivové oleje.
              </h2>
              <p className="text-[14px] text-text2 mt-1.5 max-w-[460px]">
                Seřazeno od nejnižší ceny za litr. Ceny aktualizovány každých 24 h.
              </p>
            </div>
            <Link
              href="/srovnavac"
              className="text-[13px] text-olive border-b border-olive-border hover:text-olive2 whitespace-nowrap"
            >
              Celý katalog ({total}) →
            </Link>
          </div>

          {/* Extra panenský olivový olej */}
          <div className="flex items-center gap-3 mb-5">
            <span className="bg-olive text-white text-[12px] font-semibold px-3.5 py-1.5 rounded-full">
              Extra panenský olivový olej
            </span>
            <span className="text-[12px] text-text3">{evooList.length} produktů</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
            {evooList.map((p, i) => (
              <TopProductCard key={p.id} product={p} rank={i + 1} />
            ))}
          </div>

          {/* Divider + pokrutiny */}
          {pomaceList.length > 0 && (
            <>
              <div className="flex items-center gap-4 mt-10 mb-3">
                <div className="flex-1 h-px bg-off2" />
                <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 shrink-0">
                  <span className="text-[12px] font-semibold text-amber-900">
                    Olivový olej z pokrutin (Pomace)
                  </span>
                  <span className="text-[11px] text-amber-500 font-medium">{pomaceList.length} produkty</span>
                </div>
                <div className="flex-1 h-px bg-off2" />
              </div>
              <p className="text-[12px] text-text3 text-center mb-6">
                Vyráběn extrakcí z výlisků · méně polyfenolů · vhodný pro smažení a vaření ve větším množství
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
                {pomaceList.map((p, i) => (
                  <TopProductCard key={p.id} product={p} rank={i + 1} />
                ))}
              </div>
            </>
          )}

          {total > 15 && (
            <div className="mt-8 text-center">
              <Link
                href="/srovnavac"
                className="inline-block border border-olive-border text-olive text-[14px] font-medium px-6 py-2.5 rounded-lg hover:bg-olive-bg transition-colors"
              >
                Zobrazit všech {total} produktů ve srovnávači →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── PRŮVODCE VÝBĚREM ─────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 border-t border-off2 bg-off/30">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
              — Jak vybrat
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal text-text mb-6 leading-tight">
              Průvodce výběrem 5L oleje.
            </h2>

            <div className="space-y-5">
              <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
                <h3 className="text-[14px] font-semibold text-text mb-2">Pro koho je 5L balení?</h3>
                <ul className="text-[13px] text-text2 space-y-1.5">
                  {[
                    'Rodina 3+ osob (spotřeba 1–2 L/měs.)',
                    'Každodenní vaření, smažení, salátové dresinky',
                    'Restaurace a catering',
                    'Kdo chce mít zásobu na 3–5 měsíců',
                  ].map(t => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="text-olive mt-0.5">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-5">
                <h3 className="text-[14px] font-semibold text-text mb-2">Co zkontrolovat před koupí</h3>
                <ul className="text-[13px] text-text2 space-y-1.5">
                  {[
                    'Datum sklizně — ne starší než 18 měsíců',
                    'PDO/PGI certifikát — záruka původu',
                    'Polyfenoly 250+ mg/kg — pro zdravotní benefity',
                    'Plechovka nebo bag-in-box — chrání před světlem',
                  ].map(t => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="text-olive mt-0.5">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal text-text mb-6 leading-tight lg:mt-7">
              0,5L vs 5L — přehled.
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-off2">
                    <th className="text-left py-2 pr-4 text-text3 font-medium text-[11px] uppercase tracking-wider"></th>
                    <th className="text-right py-2 px-3 text-text3 font-medium text-[11px] uppercase tracking-wider">0,5 L</th>
                    <th className="text-right py-2 px-3 text-text3 font-medium text-[11px] uppercase tracking-wider">1 L</th>
                    <th className="text-right py-2 px-3 text-olive font-bold text-[11px] uppercase tracking-wider bg-olive-bg/50 rounded-t">5 L ✓</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Cena balení', v05: '~125 Kč', v1: '~230 Kč', v5: '~700 Kč', highlight: false },
                    { label: 'Cena / litr', v05: '250 Kč', v1: '230 Kč', v5: '140 Kč', highlight: true },
                    { label: 'Úspora vs 0,5L', v05: '—', v1: '−8 %', v5: '−44 %', highlight: true },
                    { label: 'Vydrží (4 osoby)', v05: '1–2 týdny', v1: '3–4 týdny', v5: '3–5 měsíců', highlight: false },
                    { label: 'Ekologie obalů', v05: '❌', v1: '⚠️', v5: '✅', highlight: false },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-off">
                      <td className="py-3 pr-4 text-text3 font-medium">{row.label}</td>
                      <td className="py-3 px-3 text-right text-text2">{row.v05}</td>
                      <td className="py-3 px-3 text-right text-text2">{row.v1}</td>
                      <td className={`py-3 px-3 text-right font-semibold ${row.highlight ? 'text-olive' : 'text-text'} bg-olive-bg/30`}>
                        {row.v5}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-text3 mt-3">
              Průměrné ceny z olivator.cz katalogu, duben 2026. Reálné ceny se liší dle produktu.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 border-t border-off2">
        <div className="max-w-[780px] mx-auto">
          <div className="text-[10px] font-bold tracking-widest uppercase text-olive mb-1.5">
            — Časté otázky
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal text-text mb-8 leading-tight">
            Olivový olej 5L — FAQ.
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-[14px] font-semibold text-text list-none select-none hover:bg-off/50 transition-colors">
                  {item.q}
                  <span className="text-text3 text-[18px] font-light ml-3 shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="px-5 pb-4 pt-0 text-[13px] text-text2 leading-relaxed border-t border-off">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER CTA ───────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 border-t border-off2 bg-olive-dark">
        <div className="max-w-[780px] mx-auto text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-normal text-white mb-2 leading-tight">
            Slevy na 5L balení do emailu.
          </h2>
          <p className="text-white/60 text-[14px] mb-6">
            Každý čtvrtek nejlepší akce z katalogu — nová 5L balení, cenové propady, tipy od Olíka.
          </p>
          <div className="max-w-[420px] mx-auto">
            <NewsletterSignup source="homepage" variant="dark" />
          </div>
          <div className="flex justify-center gap-6 mt-5 text-white/50 text-[12px]">
            {['Slevy až −30 %', 'Nové 5L produkty', 'Tipy na skladování'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="text-olive3">✓</span>{t}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
