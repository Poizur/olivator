// Editorial guidelines — E-E-A-T trust signal pro Google.
// Vysvětluje jak vybíráme produkty, jak hodnotíme, transparentnost affiliate.

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Redakční zásady',
  description:
    'Jak vybíráme produkty, jak je hodnotíme, jak řešíme konflikty zájmů. Transparentnost olivator.cz.',
  alternates: { canonical: 'https://olivator.cz/editorial-policy' },
}

export default function EditorialPolicyPage() {
  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-10 py-12">
      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <span>Redakční zásady</span>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
        Redakční zásady
      </h1>
      <p className="text-[15px] text-text2 font-light mb-10">
        Jak vybíráme produkty, hodnotíme je a řešíme konflikty zájmů.
      </p>

      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Nezávislost
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          Olivator je <strong>nezávislý srovnávač</strong>. Žádný výrobce
          ani prodejce si u nás nemůže koupit lepší pozici v žebříčku, lepší
          Score nebo doporučení. Pořadí v žebříčcích řídí výhradně{' '}
          <Link href="/metodika" className="text-olive underline decoration-dotted">
            Olivator Score
          </Link>{' '}
          — algoritmický výpočet z objektivních dat (kyselost, polyfenoly,
          certifikace, cena).
        </p>
        <p className="text-[15px] text-text2 leading-relaxed">
          Pokud výrobce dodá novou várku s lepšími parametry, Score se přepočítá
          při dalším pravidelném update. Pokud klesne, klesne i Score. Žádný
          marketingový tlak nemůže Score přepsat.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Výběr produktů
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          Cílíme na <strong>kompletní pokrytí</strong> českého trhu — všechny
          olivové oleje dostupné v ČR, ne jen ty placené nebo prestižní. Náš
          discovery agent pravidelně skenuje:
        </p>
        <ul className="text-[15px] text-text2 leading-relaxed mb-3 list-disc pl-5 space-y-1">
          <li>Tier 1 supermarkety (Rohlík, Košík, Tesco, Albert, Kaufland, Globus, Mall)</li>
          <li>Specializované eshopy (olivio.cz, gaea.cz, olivovyolej.cz, zdravasila.cz)</li>
          <li>Heureka XML feedy a partnerské sítě</li>
          <li>Stránky výrobců (přes RSS / Open Food Facts API)</li>
        </ul>
        <p className="text-[15px] text-text2 leading-relaxed">
          Produkt přidáme i bez aktivního partnerství s prodejcem, pokud má
          dostatek veřejně dostupných dat.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Hodnocení
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          Olivator Score (0–100) má 4 transparentní komponenty:
        </p>
        <ul className="text-[15px] text-text2 leading-relaxed mb-3 list-disc pl-5 space-y-1">
          <li><strong>Kyselost (35 %)</strong> — nižší = lepší. Pod 0,2 % = max body.</li>
          <li><strong>Certifikace (25 %)</strong> — DOP + BIO + NYIOOC = max body.</li>
          <li><strong>Polyfenoly + chemická kvalita (25 %)</strong> — vysoké antioxidanty.</li>
          <li><strong>Cena za 100 ml (15 %)</strong> — vyvažuje extrémně drahé prémium.</li>
        </ul>
        <p className="text-[15px] text-text2 leading-relaxed">
          Vzorec a váhy jsou stabilní. Pokud chybí 2+ klíčové parametry pro
          férové hodnocení, Score se nepočítá (zobrazujeme „—").
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Affiliate transparentnost
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          Provozujeme <strong>affiliate program</strong> s prodejci. Když
          klikneš na &bdquo;Koupit u Rohlíka&ldquo; a olej koupíš, dostaneme z prodeje
          provizi (typicky 3–15 %). Tato provize <strong>NIJAK neovlivňuje</strong>:
        </p>
        <ul className="text-[15px] text-text2 leading-relaxed mb-3 list-disc pl-5 space-y-1">
          <li>Pořadí v žebříčcích (řídí Score)</li>
          <li>Doporučení v Comparatoru</li>
          <li>Kvalitu hodnocení v článcích</li>
        </ul>
        <p className="text-[15px] text-text2 leading-relaxed">
          Pokud při dvou srovnatelných nabídkách vybíráme &bdquo;preferovaný&ldquo;
          prodejce, prioritu má cena pro zákazníka, ne výše naší provize.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Zdroje dat
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          Pro chemické parametry (kyselost, polyfenoly, peroxidové číslo) čerpáme:
        </p>
        <ul className="text-[15px] text-text2 leading-relaxed mb-3 list-disc pl-5 space-y-1">
          <li>Etiketu produktu (oficiální deklarace výrobce)</li>
          <li>Lab reports vydané výrobcem nebo nezávislou autoritou</li>
          <li>NYIOOC, EVOO World, DOP/IGP databáze</li>
          <li>Open Food Facts API</li>
        </ul>
        <p className="text-[15px] text-text2 leading-relaxed">
          Pokud parametr není veřejně dohledatelný, neuvádíme ho. Žádné odhady,
          žádné &bdquo;průměry&ldquo; jako náhrada za chybějící data.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Editorial standardy obsahu
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          Každý článek v sekci{' '}
          <Link href="/pruvodce" className="text-olive underline decoration-dotted">
            Průvodce
          </Link>{' '}
          podléhá stejným pravidlům:
        </p>
        <ul className="text-[15px] text-text2 leading-relaxed mb-3 list-disc pl-5 space-y-1">
          <li>Aktivní hlas, přítomný čas, konkrétní data</li>
          <li>Žádné fráze typu &bdquo;skvělý&ldquo;, &bdquo;prémiový&ldquo;, &bdquo;výjimečný&ldquo; bez podpory daty</li>
          <li>Citace zdrojů u odborných tvrzení (PREDIMED, EFSA, Beauchamp et al., …)</li>
          <li>Datum publikace a poslední aktualizace v hlavičce</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          Opravy a námitky
        </h2>
        <p className="text-[15px] text-text2 leading-relaxed mb-3">
          Pokud najdeš na Olivátoru chybu — špatný parametr, neaktuální cenu,
          chybějící produkt — napiš nám na{' '}
          <a href="mailto:redakce@olivator.cz" className="text-olive underline decoration-dotted">
            redakce@olivator.cz
          </a>
          . Opravu zaznamenáme do 48 hodin.
        </p>
        <p className="text-[15px] text-text2 leading-relaxed">
          Stejnou cestou se mohou ozvat i výrobci s námitkami k hodnocení.
          Pokud doloží lepší/aktuálnější data, Score přepočítáme.
        </p>
      </section>

      <div className="mt-12 pt-6 border-t border-off2 text-[12px] text-text3">
        Tyto zásady jsou platné od 1. května 2026. Updaty zveřejníme v changelogu
        v této stránce.
      </div>
    </div>
  )
}
