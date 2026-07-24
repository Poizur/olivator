import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Ochrana osobních údajů — Olivátor',
  description: 'Informace o zpracování osobních údajů dle čl. 13 GDPR. Správce: Maky Outdoors s.r.o., IČO 09520074.',
  alternates: { canonical: 'https://olivator.cz/ochrana-osobnich-udaju' },
  robots: { index: true, follow: false },
}

export default function OchranaOsobnichUdajuPage() {
  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-10 py-12">
      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>{' › '}
        <span>Ochrana osobních údajů</span>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-2">
        Ochrana osobních údajů
      </h1>
      <p className="text-[14px] text-text3 mb-10">
        Informace dle čl.&nbsp;13 nařízení GDPR (EU) 2016/679 · platné od&nbsp;24.&nbsp;7.&nbsp;2026
      </p>

      {/* ── 1. Správce ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          1. Správce osobních údajů
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
        <p className="text-[14px] text-text2 mt-3 leading-relaxed">
          Provozujeme informační službu <strong>olivator.cz</strong> — nezávislý srovnávač
          olivových olejů. Nejsme e-shop, neprovozujeme prodej zboží ani nemáme zákazníky ve
          smyslu obchodního vztahu. Zpracování osobních údajů je proto rozsahem omezené.
        </p>
      </section>

      {/* ── 2. Přehled zpracování ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          2. Přehled zpracování osobních údajů
        </h2>

        {/* Newsletter */}
        <div className="mb-6 border border-off2 rounded-xl overflow-hidden">
          <div className="bg-off px-5 py-3 border-b border-off2">
            <h3 className="text-[15px] font-semibold text-text">Newsletter a e-mailový digest</h3>
          </div>
          <div className="px-5 py-4 text-[13px] text-text2 space-y-2">
            <p><strong className="text-text">Jaké údaje:</strong> e-mailová adresa, preferované typy obsahu (týdenní souhrn, slevy, sezónní sklizeň, cenové alerty).</p>
            <p><strong className="text-text">Účel:</strong> zasílání newsletteru a informačního digestu o olivových olejích.</p>
            <p><strong className="text-text">Právní základ:</strong> souhlas subjektu údajů — čl. 6 odst. 1 písm. a) GDPR. Souhlas lze kdykoliv odvolat kliknutím na odkaz v každém e-mailu.</p>
            <p><strong className="text-text">Doba uchování:</strong> po dobu odběru newsletteru + 3 měsíce (pro případ reklamací). Po odhlášení jsou údaje anonymizovány.</p>
            <p><strong className="text-text">Zpracovatel:</strong> Resend, Inc. (e-mailová infrastruktura); Supabase, Inc. (databáze).</p>
          </div>
        </div>

        {/* Lead magnet */}
        <div className="mb-6 border border-off2 rounded-xl overflow-hidden">
          <div className="bg-off px-5 py-3 border-b border-off2">
            <h3 className="text-[15px] font-semibold text-text">Průvodce olivovými oleji (lead magnet)</h3>
          </div>
          <div className="px-5 py-4 text-[13px] text-text2 space-y-2">
            <p><strong className="text-text">Jaké údaje:</strong> e-mailová adresa.</p>
            <p><strong className="text-text">Účel:</strong> zaslání PDF průvodce a navazující e-mailové série (4 e-maily o výběru olivového oleje).</p>
            <p><strong className="text-text">Právní základ:</strong> souhlas subjektu údajů — čl. 6 odst. 1 písm. a) GDPR. Souhlas je vyjádřen zaškrtnutím pole před odesláním formuláře.</p>
            <p><strong className="text-text">Doba uchování:</strong> po dobu zasílání série + 3 měsíce. Poté anonymizace.</p>
            <p><strong className="text-text">Zpracovatel:</strong> Resend, Inc.; Supabase, Inc.</p>
          </div>
        </div>

        {/* Cenové alerty / Price Watch */}
        <div className="mb-6 border border-off2 rounded-xl overflow-hidden">
          <div className="bg-off px-5 py-3 border-b border-off2">
            <h3 className="text-[15px] font-semibold text-text">Cenové alerty (Price Watch)</h3>
          </div>
          <div className="px-5 py-4 text-[13px] text-text2 space-y-2">
            <p><strong className="text-text">Jaké údaje:</strong> e-mailová adresa, sledovaný produkt a cenový limit.</p>
            <p><strong className="text-text">Účel:</strong> jednorázové upozornění na pokles ceny sledovaného oleje pod zadanou hranici.</p>
            <p><strong className="text-text">Právní základ:</strong> souhlas subjektu údajů — čl. 6 odst. 1 písm. a) GDPR.</p>
            <p><strong className="text-text">Doba uchování:</strong> do odvolání alertu nebo do odhlášení, nejdéle 12 měsíců.</p>
            <p><strong className="text-text">Zpracovatel:</strong> Resend, Inc.; Supabase, Inc.</p>
          </div>
        </div>

        {/* Affiliate prokliky */}
        <div className="mb-6 border border-off2 rounded-xl overflow-hidden">
          <div className="bg-off px-5 py-3 border-b border-off2">
            <h3 className="text-[15px] font-semibold text-text">Logování affiliate prokliků</h3>
          </div>
          <div className="px-5 py-4 text-[13px] text-text2 space-y-2">
            <p><strong className="text-text">Jaké údaje:</strong> hash IP adresy (SHA-256, nevratný), ID relace (náhodný řetězec bez vazby na osobu), odkazující produkt a prodejce, časová značka, User-Agent.</p>
            <p><strong className="text-text">Co NEZPRACOVÁVÁME:</strong> samotnou IP adresu v čitelné podobě — ukládáme pouze jednosměrný hash, ze kterého IP nelze rekonstruovat.</p>
            <p><strong className="text-text">Účel:</strong> měření výkonu affiliate spolupráce, zamezení duplicitních provizí, analytika prodejů.</p>
            <p><strong className="text-text">Právní základ:</strong> oprávněný zájem správce — čl. 6 odst. 1 písm. f) GDPR. Oprávněný zájem spočívá v zajištění správnosti výpočtu affiliate provizí a ochraně před podvodnými prokliky.</p>
            <p><strong className="text-text">Doba uchování:</strong> 24 měsíců od záznamu kliku.</p>
            <p><strong className="text-text">Zpracovatel:</strong> Supabase, Inc.</p>
          </div>
        </div>

        {/* Olík chat */}
        <div className="mb-6 border border-off2 rounded-xl overflow-hidden">
          <div className="bg-off px-5 py-3 border-b border-off2">
            <h3 className="text-[15px] font-semibold text-text">Olík — AI chat sommelier</h3>
          </div>
          <div className="px-5 py-4 text-[13px] text-text2 space-y-2">
            <p><strong className="text-text">Jaké údaje:</strong> obsah chatové konverzace (dotazy a odpovědi). E-mailová adresa pouze pokud ji uživatel dobrovolně uvede v textu.</p>
            <p><strong className="text-text">Účel:</strong> poskytnutí personalizovaného doporučení olivového oleje prostřednictvím AI asistenta.</p>
            <p><strong className="text-text">Právní základ:</strong> souhlas subjektu údajů vyjádřený zahájením konverzace — čl. 6 odst. 1 písm. a) GDPR.</p>
            <p><strong className="text-text">Upozornění:</strong> obsah konverzace je zpracován AI modelem třetí strany (Anthropic, PBC). Nevkládejte do chatu citlivé osobní údaje (rodné číslo, platební informace).</p>
            <p><strong className="text-text">Doba uchování:</strong> 30 dnů (pro zajištění kontinuity konverzace), poté automatické smazání.</p>
            <p><strong className="text-text">Zpracovatel:</strong> Anthropic, PBC (AI model); Supabase, Inc. (dočasné uložení).</p>
          </div>
        </div>

        {/* GA4 */}
        <div className="mb-6 border border-off2 rounded-xl overflow-hidden">
          <div className="bg-off px-5 py-3 border-b border-off2">
            <h3 className="text-[15px] font-semibold text-text">Google Analytics 4 (analytika)</h3>
          </div>
          <div className="px-5 py-4 text-[13px] text-text2 space-y-2">
            <p><strong className="text-text">Jaké údaje:</strong> pseudonymizovaná data o návštěvnosti — typ zařízení, zobrazené stránky, délka návštěvy, geolokace na úrovni státu, zdroj návštěvy. IP adresa je anonymizována ještě před uložením.</p>
            <p><strong className="text-text">Účel:</strong> měření návštěvnosti a zlepšování obsahu webu.</p>
            <p><strong className="text-text">Právní základ:</strong> souhlas subjektu údajů — čl. 6 odst. 1 písm. a) GDPR. <strong>GA4 se nespustí, dokud neudělíte souhlas v cookie banneru.</strong> Pokud zvolíte „Jen nezbytné", GA4 se nenačte vůbec.</p>
            <p><strong className="text-text">Přenos do třetích zemí:</strong> Google LLC sídlí v USA. Přenos je zajištěn standardními smluvními doložkami (SCC) dle čl. 46 GDPR.</p>
            <p><strong className="text-text">Doba uchování:</strong> 14 měsíců (výchozí nastavení GA4 s anonymizací IP).</p>
            <p><strong className="text-text">Zpracovatel:</strong> Google LLC.</p>
          </div>
        </div>
      </section>

      {/* ── 3. Zpracovatelé ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          3. Zpracovatelé osobních údajů
        </h2>
        <p className="text-[14px] text-text2 mb-4 leading-relaxed">
          Uzavřeli jsme smlouvy o zpracování údajů (DPA) se všemi níže uvedenými zpracovateli.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-off border-b border-off2">
                <th className="text-left px-4 py-2.5 font-semibold text-text">Zpracovatel</th>
                <th className="text-left px-4 py-2.5 font-semibold text-text">Účel</th>
                <th className="text-left px-4 py-2.5 font-semibold text-text">Umístění</th>
              </tr>
            </thead>
            <tbody className="text-text2">
              <tr className="border-b border-off2">
                <td className="px-4 py-2.5 font-medium text-text">Supabase, Inc.</td>
                <td className="px-4 py-2.5">Databáze a datové úložiště</td>
                <td className="px-4 py-2.5">EU (AWS Frankfurt) — ověřte v Supabase dashboard</td>
              </tr>
              <tr className="border-b border-off2">
                <td className="px-4 py-2.5 font-medium text-text">Resend, Inc.</td>
                <td className="px-4 py-2.5">Odesílání transakčních e-mailů</td>
                <td className="px-4 py-2.5">USA (přenos krytý SCC)</td>
              </tr>
              <tr className="border-b border-off2">
                <td className="px-4 py-2.5 font-medium text-text">Google LLC</td>
                <td className="px-4 py-2.5">Google Analytics 4 — analytika návštěvnosti</td>
                <td className="px-4 py-2.5">USA (přenos krytý SCC)</td>
              </tr>
              <tr className="border-b border-off2">
                <td className="px-4 py-2.5 font-medium text-text">Railway Corp.</td>
                <td className="px-4 py-2.5">Hosting webové aplikace</td>
                <td className="px-4 py-2.5">USA (přenos krytý SCC)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-text">Anthropic, PBC</td>
                <td className="px-4 py-2.5">AI model pro Olík chat (pouze po souhlasu)</td>
                <td className="px-4 py-2.5">USA (přenos krytý SCC)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. Práva subjektů ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          4. Vaše práva
        </h2>
        <p className="text-[14px] text-text2 mb-4 leading-relaxed">
          Jako subjekt údajů máte dle GDPR následující práva. Žádost uplatněte na{' '}
          <a href="mailto:info@makyoutdoors.com" className="text-olive underline decoration-dotted">
            info@makyoutdoors.com
          </a>{' '}
          — odpovíme do 30 dnů.
        </p>
        <ul className="text-[14px] text-text2 space-y-2 list-disc pl-5 leading-relaxed">
          <li><strong className="text-text">Právo na přístup</strong> — právo získat potvrzení, zda zpracováváme vaše údaje, a kopii těchto údajů.</li>
          <li><strong className="text-text">Právo na opravu</strong> — právo požadovat opravu nesprávných nebo doplnění neúplných údajů.</li>
          <li><strong className="text-text">Právo na výmaz („být zapomenut")</strong> — právo požadovat smazání vašich údajů, pokud odpadl účel nebo odvoláváte souhlas a neexistuje jiný právní základ.</li>
          <li><strong className="text-text">Právo na přenositelnost</strong> — právo obdržet vaše údaje ve strojově čitelném formátu (JSON/CSV) a předat je jinému správci.</li>
          <li><strong className="text-text">Právo vznést námitku</strong> — právo vznést námitku proti zpracování na základě oprávněného zájmu (affiliate logování).</li>
          <li><strong className="text-text">Právo odvolat souhlas</strong> — souhlas se zasíláním e-mailů lze odvolat kdykoliv kliknutím na odkaz pro odhlášení v každém e-mailu, nebo na adrese výše. Odvolání nemá vliv na zákonnost zpracování před odvoláním.</li>
        </ul>
        <div className="mt-5 bg-off rounded-xl px-5 py-4 border border-off2 text-[13px] text-text2">
          <strong className="text-text block mb-1">Právo podat stížnost</strong>
          Máte právo podat stížnost u dozorového úřadu:{' '}
          <strong>Úřad pro ochranu osobních údajů</strong>, Pplk. Sochora&nbsp;27, 170&nbsp;00 Praha&nbsp;7,{' '}
          <a href="https://www.uoou.cz" className="text-olive underline decoration-dotted" target="_blank" rel="noopener noreferrer">
            uoou.cz
          </a>.
        </div>
      </section>

      {/* ── 5. Cookies ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          5. Cookies
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed">
          Podrobné informace o jednotlivých cookies a možnost změnit souhlas naleznete na stránce{' '}
          <Link href="/cookies" className="text-olive underline decoration-dotted">
            /cookies
          </Link>.
        </p>
      </section>

      {/* ── 6. Kontakt / DPO ── */}
      <section className="mb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mb-3">
          6. Kontakt
        </h2>
        <p className="text-[14px] text-text2 leading-relaxed">
          Dotazy k ochraně osobních údajů směřujte na{' '}
          <a href="mailto:info@makyoutdoors.com" className="text-olive underline decoration-dotted">
            info@makyoutdoors.com
          </a>.
          Odpovídáme do 5 pracovních dnů, na práva subjektů do 30 dnů dle GDPR.
        </p>
        <p className="text-[14px] text-text2 mt-2 leading-relaxed">
          Subjekt nemá zákonnou povinnost jmenovat DPO (správce neprovozuje rozsáhlé sledování subjektů
          ani nezpracovává zvláštní kategorie osobních údajů ve smyslu čl. 9 GDPR).
        </p>
      </section>

      <div className="mt-12 pt-6 border-t border-off2 text-[12px] text-text3">
        Tyto zásady jsou platné od 24. července 2026. Při podstatných změnách informujeme odběratele e-mailem.
      </div>
    </div>
  )
}
