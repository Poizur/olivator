import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Podmínky užití — Olivátor',
  description: 'Podmínky užití informační služby Olivátor.cz. Provozovatel: Maky Outdoors s.r.o., IČO 09520074.',
  alternates: { canonical: 'https://olivator.cz/podminky-uziti' },
  robots: { index: true, follow: false },
}

export default function PodminkyUzitiPage() {
  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-10 py-12">
      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>{' › '}
        <span>Podmínky užití</span>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
        Podmínky užití
      </h1>
      <p className="text-[14px] text-text3 mb-10">
        Podmínky užití informační služby olivator.cz · platné od&nbsp;24.&nbsp;7.&nbsp;2026
      </p>

      {/* ── 1. Provozovatel ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          1. Provozovatel
        </h2>
        <div className="bg-off rounded-xl px-5 py-4 border border-off2 text-[14px] text-text2 space-y-0.5">
          <div><strong className="text-text">Maky Outdoors s.r.o.</strong></div>
          <div>IČO: 09520074</div>
          <div>Sídlo: Lidická 700/19, 602&nbsp;00 Brno</div>
          <div>
            Kontakt:{' '}
            <a href="mailto:info@makyoutdoors.com" className="text-olive underline decoration-dotted">
              info@makyoutdoors.com
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Popis služby ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          2. Co je Olivátor
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Olivátor.cz je <strong>nezávislá informační služba</strong> — srovnávač olivových olejů
          dostupných v České republice. Web sbírá a zpracovává veřejně dostupná data o produktech
          (ceny, parametry, certifikace) a přiřazuje jim vlastní hodnoticí metriku (Olivator Score).
        </p>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          <strong>Olivátor není e-shop.</strong> Neprodáváme zboží, nepřijímáme platby, neuzavíráme
          kupní smlouvy. Veškeré nákupy probíhají výhradně na webech partnerských prodejců,
          na které uživatele přesměrováváme prostřednictvím affiliate odkazů.
        </p>
        <p className="text-[14px] text-text2 leading-relaxed">
          Obsah webu má výhradně <strong>informační charakter</strong>. Neposkytujeme poradenství
          v oblasti zdraví, výživy ani investic.
        </p>
      </section>

      {/* ── 3. Affiliate transparentnost ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          3. Affiliate spolupráce
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Olivátor generuje příjmy výhradně prostřednictvím <strong>affiliate programů</strong>.
          Spolupracujeme s affiliate sítěmi <strong>Dognet</strong>, <strong>Heureka Affiliate</strong>{' '}
          a <strong>CJ Affiliate</strong>.
        </p>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Když kliknete na tlačítko „Koupit" nebo „Zobrazit u prodejce", budete přesměrováni
          na web partnera prostřednictvím sledovacího odkazu. Pokud na partnerském webu nakoupíte,
          obdržíme z prodeje provizi (obvykle 3–15&nbsp;%). <strong>Cena pro vás zůstává stejná</strong>{' '}
          jako bez affiliate odkazu.
        </p>
        <p className="text-[14px] text-text2 leading-relaxed">
          Výše provize <strong>neovlivňuje</strong> pořadí produktů v žebříčcích ani doporučení
          v comparatoru — ta jsou řízena výhradně Olivator Score (objektivní výpočet z parametrů
          produktu). Podrobně viz{' '}
          <Link href="/metodika" className="text-olive underline decoration-dotted">metodika</Link>{' '}
          a{' '}
          <Link href="/editorial-policy" className="text-olive underline decoration-dotted">
            redakční zásady
          </Link>.
        </p>
      </section>

      {/* ── 4. Ceny a dostupnost ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          4. Ceny a dostupnost produktů
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Ceny zobrazené na Olivátoru mají <strong>informativní charakter</strong> a jsou
          aktualizovány automaticky z veřejných zdrojů (XML feedy, webscrapery). Aktualizace
          probíhá denně, u některých zdrojů 3× týdně.
        </p>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Olivátor <strong>nezaručuje</strong> aktuálnost, úplnost ani přesnost cen a dostupnosti.
          Závazná cena a dostupnost platí výhradně na webu prodejce v okamžiku objednávky.
        </p>
        <p className="text-[14px] text-text2 leading-relaxed">
          Pokud narazíte na výrazný rozdíl mezi cenou na Olivátoru a u prodejce, dejte nám vědět na{' '}
          <a href="mailto:info@makyoutdoors.com" className="text-olive underline decoration-dotted">
            info@makyoutdoors.com
          </a>.
        </p>
      </section>

      {/* ── 5. Omezení odpovědnosti ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          5. Omezení odpovědnosti
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Olivátor vynakládá přiměřené úsilí k zajištění přesnosti zobrazených dat. Přesto
          <strong> neodpovídáme za škody</strong> vzniklé v důsledku:
        </p>
        <ul className="text-[14px] text-text2 space-y-1.5 list-disc pl-5 leading-relaxed mb-3">
          <li>neaktuálních nebo nesprávných cen či parametrů produktů,</li>
          <li>nedostupnosti produktu u partnera po kliknutí na affiliate odkaz,</li>
          <li>rozhodnutí učiněných na základě informací z Olivátoru (nákup, zdravotní volby),</li>
          <li>výpadku nebo nedostupnosti webu.</li>
        </ul>
        <p className="text-[14px] text-text2 leading-relaxed">
          Olivator Score je vlastní metrika vycházející z dostupných dat. Nepředstavuje lékařské,
          dietologické ani jiné odborné doporučení.
        </p>
      </section>

      {/* ── 6. Duševní vlastnictví ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          6. Duševní vlastnictví
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Obsah webu — texty, grafika, metodika Olivator Score, zdrojový kód — jsou chráněny
          autorským právem. Obsah je určen k osobnímu, nekomerčnímu použití.
        </p>
        <p className="text-[14px] text-text2 leading-relaxed mb-3">
          Je zakázáno obsah systematicky strojově stahovat (scraping) za účelem budování
          konkurenčních srovnávačů nebo redistribuce dat bez předchozího písemného souhlasu.
          Výzkumné a vzdělávací účely jsou povoleny s řádnou citací zdroje.
        </p>
        <p className="text-[14px] text-text2 leading-relaxed">
          Fotografie produktů pocházejí od výrobců a partnerských prodejců v rámci affiliate
          spolupráce. Práva k nim náleží příslušným vlastníkům.
        </p>
      </section>

      {/* ── 7. Zpracování osobních údajů ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          7. Osobní údaje a cookies
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed">
          Informace o zpracování osobních údajů jsou obsaženy v{' '}
          <Link href="/ochrana-osobnich-udaju" className="text-olive underline decoration-dotted">
            Zásadách ochrany osobních údajů
          </Link>.
          Informace o cookies naleznete na stránce{' '}
          <Link href="/cookies" className="text-olive underline decoration-dotted">Cookies</Link>.
        </p>
      </section>

      {/* ── 8. Změny podmínek ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          8. Změny podmínek
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed">
          Podmínky mohou být jednostranně změněny. O podstatných změnách informujeme odběratele
          newsletteru e-mailem nejméně 14 dnů předem. Aktuální verze je vždy dostupná na
          této stránce s datem platnosti.
        </p>
      </section>

      {/* ── 9. Rozhodné právo ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          9. Rozhodné právo a spory
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed">
          Tyto podmínky se řídí právem České republiky. Případné spory budou řešeny příslušnými
          českými soudy. Pro mimosoudní řešení sporů je příslušná Česká obchodní inspekce
          (<a href="https://www.coi.cz" className="text-olive underline decoration-dotted" target="_blank" rel="noopener noreferrer">coi.cz</a>).
        </p>
      </section>

      {/* ── 10. Kontakt ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          10. Kontakt
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed">
          Dotazy, námitky nebo žádosti o opravu dat adresujte na{' '}
          <a href="mailto:info@makyoutdoors.com" className="text-olive underline decoration-dotted">
            info@makyoutdoors.com
          </a>.
        </p>
      </section>

      <div className="mt-12 pt-6 border-t border-off2 text-[12px] text-text3">
        Podmínky užití platné od 24. července 2026.
      </div>
    </div>
  )
}
