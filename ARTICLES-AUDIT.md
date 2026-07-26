# ARTICLES-AUDIT.md — Audit produktových karet a dat v článcích
*Vygenerováno: 2026-05-28 | Cíl: /pruvodce/nejlepsi-olivovy-olej-2026 jako vzor pro live produktové karty*

---

## 0. Jak funguje produktová karta na homepage (pro netechnika)

### Co je ta karta?
Je to malý box s obrázkem lahve, číslem pozice, barevným Score odznáčkem, názvem produktu, vlajkou původu a cenou. Na homepage je vidíš v sekcích „Bestsellery" a „Top oleje podle země".

### Odkud bere data?
Karta neobsahuje žádná pevně zapsaná čísla. Při každém načtení stránky si Next.js server sáhne do Supabase databáze a stáhne:
- aktuální seznam produktů (název, score, kyselost, polyfenoly, obrázek…)
- aktuální nejlevnější cenu z nabídek u retailerů

Proto když se cena u Rohlik.cz změní, na webu se automaticky zobrazí nová cena — bez jakékoliv ruční úpravy.

### Jde to použít v článcích?
**Ne přímo.** Tady je proč, a co k tomu chybí:

Tělo článku je uloženo v DB jako prostý text (Markdown — stejný formát jako tento soubor). Renderer, který ho zobrazuje (`ArticleBody`), umí zobrazit nadpisy, odstavce, tučné texty, tabulky, odrůdkové seznamy a klasické textové odkazy. **Neví nic o produktech ani kartách.**

Homepage karta funguje proto, že server nejdřív načte produktová data z DB a pak je "předá" komponentě, která kartu vykreslí. V článcích tento průchod chybí.

### Co přesně chybí (3 kroky pro FÁZE 2):
1. **Speciální token v textu** — v markdown těle článku napsat `{{product:slug-produktu}}` jako zástupný symbol (jako placeholder).
2. **Resolver** — logika v server části (`template-vars.ts`), která tento token rozpozná, sáhne do DB pro daný produkt a jeho aktuální cenu, a předá data rendereru.
3. **Nový blok v rendereru** — `ArticleBody` musí umět vykreslit nový typ bloku `product-card` (podobný `TopProductCard` z homepage, ale přizpůsobený pro inline použití v textu).

Výsledek: editor napíše `{{product:picual-5-l-extra-panensky-nefiltrovany-olivovy-olej-bag-in-box}}` do DB textu, web automaticky stáhne aktuální cenu a zobrazí plnou kartu — vždy živá data.

---

## 1. KRITICKÉ — Vymyšlené produkty v `nejlepsi-olivovy-olej-2026`

Článek uvádí „Top 10 extra panenských olivových olejů 2026" se konkrétními čísly (Score, kyselost, polyfenoly, ceny, prodejce). **4 z 10 pozic jsou buď vymyšlené nebo mají špatná data.**

| Pozice | Název v článku | Status v DB | Problém |
|:---:|---|:---:|---|
| 1 | Picual 5L Bag-In-Box (Lozano) | ✅ DB, score 95 | OK, správný link |
| 2 | Callejas coupage 5L | ✅ DB, score 94 | OK, správný link |
| **3** | **BIO Extra panenský Elixír 500 ml** | ⚠️ EXISTS, score 86 | **ŠPATNÝ score** (artikel: 92, DB: 86). Link chybí. Cena může být zastaralá. |
| 4 | Picual 2L (Lozano) | ✅ DB, score 91 | OK, správný link |
| 5 | Sitia PDO 0.2 Critida 4L | ✅ DB, score 92 | OK, správný link (DB score 92, shoda) |
| 6 | Picual 500ml nefiltrovaný | ✅ DB, score 91 | OK, správný link |
| **7** | **Koroneiki Early Harvest BIO 500 ml** | ❌ NEEXISTUJE | Vymyšlený produkt. Score 88, polyfenoly 620 mg/kg, 499 Kč — žádný záznam v DB. |
| **8** | **Coratina Apulia DOP 750 ml** | ❌ NEEXISTUJE | Vymyšlený produkt. Coratina produkty v DB jsou (Intini score 83, Le Selezioni 81), ale "Coratina Apulia DOP 750ml" se score 87 a poly 780 mg/kg není v DB. |
| 9 | Picual 5L (Lozano klasik) | ✅ DB, score 95 | OK, správný link |
| **10** | **Arbequina Katalánsko DOP 500 ml** | ❌ NEEXISTUJE | Vymyšlený produkt. Arbequina produkty v DB jsou (5L score 88, 2L score 84, 500ml v karafě score 79), ale "Arbequina Katalánsko DOP 500ml" se score 85 a cenou 349 Kč v DB není. |

### Závěr pro FÁZE 2:
- **Pozice 3** (Elixír): nahradit hardcoded text živou kartou z DB (správný slug: `bio-extra-panensky-olivovy-olej-elixir-500-ml`)
- **Pozice 7** (Koroneiki Early Harvest): odebrat nebo nahradit nejbližším reálným produktem z DB (možný náhradník: `evolia-platinum-2777-polyfenolu-bio-extra-panensky` — BIO, high poly, score 85)
- **Pozice 8** (Coratina Apulia DOP): nahradit nejlepším Coratina z DB (`intini-coratina-alberobello`, score 83, poly 623) nebo `premiovy-extra-panensky-olivovy-olej-le-selezioni-...` (score 81, poly 966)
- **Pozice 10** (Arbequina Katalánsko DOP): nahradit reálným Arbequina produktem (`arbequina-2-l-extra-panensky-olivovy-olej` score 84 nebo `arbequina-500-ml-v-karafe` score 79)

---

## 2. Přehled všech 24 článků v /pruvodce

### Legenda
- **Linked** = počet odkazů na `/olej/slug` v textu
- **HC ceny** = hardcoded ceny (Kč) v textu — zastarají bez aktualizace
- **HC score** = hardcoded čísla Olivator Score v textu
- **HC poly** = hardcoded polyfenoly (mg/kg) v textu
- **HC acid** = hardcoded kyselost (x,xx %) v textu
- **Karty** = React produktové karty v těle článku (žádný článek je nemá)
- **Hero** = cover obrázek

| Slug | Linked | HC ceny | HC score | HC poly | HC acid | Karty | Hero |
|------|:------:|:-------:|:--------:|:-------:|:-------:|:-----:|:----:|
| **nejlepsi-olivovy-olej-2026** ⭐ | 10 | 33 | **10** | 9 | 22 | ❌ | ✅ |
| jak-vybrat-olivovy-olej | 12 | 20 | 0 | 7 | 6 | ❌ | ✅ |
| polyfenoly-proc-na-nich-zalezi | 10 | 6 | 0 | 16 | 1 | ❌ | ✅ |
| premium-olivovy-olej-ma-smysl | 4 | 36 | 0 | 16 | 15 | ❌ | ✅ |
| olivovy-olej-do-200-kc | 5 | **43** | 0 | 10 | 12 | ❌ | ✅ |
| darkove-baleni-olivovy-olej | 5 | 35 | 0 | 0 | 0 | ❌ | ✅ |
| recky-vs-italsky | 5 | 21 | 0 | 15 | 24 | ❌ | ✅ |
| sklizen-oliv-early-vs-late-harvest | 5 | 21 | 0 | 19 | 0 | ❌ | ✅ |
| extra-panensky-vs-panensky-vs-rafinovany | 5 | 21 | 0 | 0 | 11 | ❌ | ✅ |
| kde-koupit-olivovy-olej-cr | 5 | 22 | 0 | 0 | 5 | ❌ | ✅ |
| falesny-olivovy-olej-jak-rozeznat | 5 | 18 | 0 | 2 | 3 | ❌ | ✅ |
| dop-pgi-bio-certifikace | 5 | 18 | 1 | 2 | 5 | ❌ | ✅ |
| degustace-olivoveho-oleje-doma | 5 | 16 | 0 | 0 | 0 | ❌ | ✅ |
| otevrena-lahev-jak-rychle-spotrebovat | 4 | 9 | 0 | 7 | 0 | ❌ | ✅ |
| olivovy-olej-do-salatu-vs-na-vareni | 3 | 28 | 0 | 7 | 9 | ❌ | ✅ |
| polyfenoly-kolik-je-dost | 5 | 8 | 0 | 23 | 1 | ❌ | ✅ |
| jak-cist-etiketu-olivoveho-oleje | 4 | 7 | 0 | 8 | 15 | ❌ | ✅ |
| jak-skladovat-olivovy-olej-doma | 4 | 5 | 0 | 0 | 0 | ❌ | ✅ |
| filtrovany-vs-nefiltrovany-olivovy-olej | 4 | 7 | 0 | 0 | 0 | ❌ | ✅ |
| olivovy-olej-pro-deti | 4 | 7 | **4** | 1 | 2 | ❌ | ✅ |
| stredomorska-strava-olivovy-olej | 5 | 7 | 0 | 0 | 0 | ❌ | ✅ |
| olivovy-olej-a-zdravi-veda-2026 | 5 | 6 | 0 | 2 | 0 | ❌ | ✅ |
| olivovy-olej-na-smazeni-bod-zakoureni | **0** | 2 | 0 | 2 | 4 | ❌ | ✅ |
| recky-italsky-spanelsky-olej | **0** | 7 | 0 | 0 | 3 | ❌ | ✅ |

⭐ = primární cíl pro FÁZE 2

### Klíčové zjištění

**Žádný článek nemá produktové karty** — všechny fungují čistě přes textové zmínky s hardcoded čísly.

**Největší rizika zastarání** (hardcoded ceny + score):
1. `olivovy-olej-do-200-kc` — 43 hardcoded cen (ceny pod 200 Kč se mění nejčastěji)
2. `nejlepsi-olivovy-olej-2026` — 10 hardcoded score + 33 cen + 4 vymyšlené produkty
3. `premium-olivovy-olej-ma-smysl` — 36 hardcoded cen + 16 hardcoded poly hodnot

**Nulové produktové linky** (kritické pro affiliate):
- `olivovy-olej-na-smazeni-bod-zakoureni` — 0 odkazů na produkty (article má dobrou pozici pro smažení queries)
- `recky-italsky-spanelsky-olej` — 0 odkazů na produkty

**Správně linkující články** (5+ produktových odkazů na reálné DB záznamy):
- `jak-vybrat-olivovy-olej` — 12 odkazů, vše ověřeno v DB ✅
- `polyfenoly-proc-na-nich-zalezi` — 10 odkazů ✅
- `nejlepsi-olivovy-olej-2026` — 10 odkazů (ale 4 chybí/špatné, viz sekce 1) ⚠️

---

## 3. Návrh architektury pro FÁZE 2

### Token systém (doporučené řešení)

Editoru (nebo skriptu) stačí do markdown textu napsat:
```
{{product:picual-5-l-extra-panensky-nefiltrovany-olivovy-olej-bag-in-box}}
```

Technicky to funguje takto:
1. **Server načte článek** z DB (jako teď)
2. **Resolver** (`lib/template-vars.ts`) najde `{{product:slug}}` tokeny, pro každý sáhne do DB pro aktuální produkt + nejlevnější cenu
3. **ArticleBody** (`components/article-body.tsx`) dostane výsledek a zobrazí nový blok `product-card` — karta s obrázkem, score, kyselostí, polyfenoly, cenou/100ml a CTA tlačítkem
4. **Ceny jsou vždy živé** — DB se ptáme při každém request (force-dynamic je zapnuté)

### Vzhled karty v článku (návrh)

```
┌─────────────────────────────────────────────┐
│  [obrázek]  Picual 5L Bag-In-Box            │
│   lahve     ████ Score 95/100               │
│             🇪🇸 Španělsko · Kyselost 0,18 % │
│             Polyfenoly: 580 mg/kg           │
│             💶 1 499 Kč (29,98 Kč/100 ml)  │
│             [→ Zobrazit produkt]            │
└─────────────────────────────────────────────┘
```

Šířka: full-width v textu (720px max), responsivní. CTA tlačítko odkazuje na `/olej/slug`, který pak ukazuje affiliate link u nejlevnějšího retailera.

### Rozsah změn pro FÁZE 2 (jen jeden článek jako vzor)

| Soubor | Změna |
|--------|-------|
| `lib/template-vars.ts` | +30 řádků: rozpoznat `{{product:slug}}`, fetchnout produkt z DB, vrátit speciální marker |
| `components/article-body.tsx` | +50 řádků: nový blok `product-card`, import `ArticleProductCard` |
| `components/article/article-product-card.tsx` | Nová komponenta ~60 řádků (adaptace `TopProductCard`) |
| `app/pruvodce/[slug]/page.tsx` | +10 řádků: předat product map do `ArticleBody` |
| DB: `articles.body_markdown` (nejlepsi-2026) | Nahradit textové position 1–10 za `{{product:slug}}` tokeny + opravit/odebrat vymyšlené |

**Celkový odhad: 150–200 řádků kódu + DB editace 1 článku.**

---

## 4. Prioritizace oprav

| # | Akce | Urgence | Dopad |
|---|------|:-------:|:-----:|
| 1 | Odebrat vymyšlené produkty z `nejlepsi-2026` (pozice 7, 8, 10) | 🔴 Kritická | Reputace + YMYL |
| 2 | Opravit Elixír (pozice 3) — správný score + přidat link | 🔴 Kritická | Správnost dat |
| 3 | Implementovat `{{product:slug}}` token + ArticleBody rozšíření | 🟡 FÁZE 2 | Konverze + živé ceny |
| 4 | Přidat produkt linky do `smazeni` a `recky-italsky-spanelsky` (0 odkazů) | 🟡 Střední | Affiliate |
| 5 | Přepisový pass pro `olivovy-olej-do-200-kc` (43 HC cen) | 🟢 Nízká | Data freshness |

---

*Čeká na schválení před FÁZE 2 implementací.*
