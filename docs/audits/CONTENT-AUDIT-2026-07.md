# Content Audit — 2026-07-24

**Auditoval:** Claude Code  
**Rozsah:** 33 aktivních článků z DB + 4 statické stránky + email šablony + llms.txt  
**Kontext:** Karanténa 20 nesmluvních retailerů 2026-07-24 (pouze eHUB affiliate aktivní)

---

## Souhrn

| Kategorie | Nalezeno | Opraveno rovnou | Vyžaduje schválení |
|---|---|---|---|
| 1. Právní (retaileři/sítě/e-maily) | 18 | 10 | 8 |
| 2. Zdravotní tvrzení | 2 | 0 | 2 |
| 3. Faktická (hardcoded čísla) | 3 | 3 | 0 |
| 4. Score prezentace | 2 | 2 | 0 |
| 5. Tokeny (inactive produkty) | 33 | 18 | 15 |
| 6. Sliby (24h) | 4 | 4 | 0 |

**Celkem aktivních článků: 33 — z toho 21 s alespoň jedním nálezem.**

---

## Aktivní vs. inactive retaileři (přehled)

**Aktivní (OK jmenovat):** Mall, iTesco, Kaufland, MujBio, iHerb, Rohlík, Albert, Košík, Globus, Reckyeshop, Cretamart, Italyshop, Řecko nás baví

**Karanténní / inactive (NESMÍ v obsahu):** Olivovyolej.cz, GreekMarket.cz, Olivum.cz, Jamonárna, Lozano Červenka, Delishop, Topdelikatesy, Oliviersandco, Nestonej, Zdravoslav, Olivarna, Gaea.cz, Vinoteka-Praha, Zdrave-oleje, Ellada, Gourmet-Partners, Milujemekretu, Aktin, Cerfis, Eshop.cz

---

## Nálezy — kompletní tabulka

| ID | Obsah | Kde | Kategorie | Závažnost | Nález | Stav |
|---|---|---|---|---|---|---|
| A-001 | o-projektu | `app/o-projektu/page.tsx:59` | Právní | KRITICKÉ | "Spolupracujeme s Dognet, Heureka Affiliate, CJ Affiliate" — žádná z těchto sítí není aktivní | ✅ OPRAVENO |
| A-002 | o-projektu | `app/o-projektu/page.tsx:108` | Sliby | STŘEDNÍ | "opravíme do 24 hodin" — nesplnitelný slib | ✅ OPRAVENO |
| A-003 | editorial-policy | `app/editorial-policy/page.tsx:62` | Právní | KRITICKÉ | Zmiňuje olivio.cz, gaea.cz, olivovyolej.cz, zdravasila.cz jako discovery zdroje — jmenování inactive retailerů | ✅ OPRAVENO |
| A-004 | editorial-policy | `app/editorial-policy/page.tsx:156` | Právní | KRITICKÉ | Email `redakce@olivator.cz` — neexistuje, nefunkční | ✅ OPRAVENO |
| A-005 | metodika | `app/metodika/page.tsx:232` | Sliby | STŘEDNÍ | "Chybu opravíme do 24 hodin" — nesplnitelný slib | ✅ OPRAVENO |
| A-006 | metodika | `app/metodika/page.tsx:244` | Právní | KRITICKÉ | Email `kontakt@olivator.cz` — neexistuje, nefunkční | ✅ OPRAVENO |
| B-001 | `jak-vybrat-olivovy-olej` | L62 | Faktická | VYSOKÁ | "sledujeme 33 prodejců a hodnotíme přes 470 olejů" — aktivní: 128 produktů, 13 retailerů | ✅ OPRAVENO |
| B-002 | `nejlepsi-olivovy-olej-2026` | L5 | Score/Faktická | KRITICKÉ | "Jak jsme testovali... Prošli jsme přes 470 produktů" — testování neproběhlo, číslo nesprávné | ✅ OPRAVENO |
| B-003 | `nejlepsi-olivovy-olej-2026` | L117 | Právní | KRITICKÉ | "Lozano Červenka, Olivarna.cz" — oba inactive | ✅ OPRAVENO |
| B-004 | `nejlepsi-olivovy-olej-2026` | L121 | Faktická | VYSOKÁ | "přes 470 olejů z různých zdrojů" — nesprávné číslo | ✅ OPRAVENO |
| B-005 | `nejlepsi-olivovy-olej-na-svete` | L62 | Score | STŘEDNÍ | "testujeme oleje z českého trhu" — framing testování | ✅ OPRAVENO |
| B-006 | `recky-vs-italsky` | L206 | Právní | VYSOKÁ | "1990 Kč / 5l u GreekMarket.cz" — inactive retailer s cenou | ✅ OPRAVENO |
| B-007 | `premium-olivovy-olej-ma-smysl` | L23-26 | Právní | VYSOKÁ | Ceny "u Lozano Červenka" (3×) + "u Olivarna" — inactive | ✅ OPRAVENO |
| B-008 | `filtrovany-vs-nefiltrovany-olivovy-olej` | L15-18 | Právní | VYSOKÁ | Ceny "u Lozano Červenka" (2×) + "u GreekMarket.cz" — inactive | ✅ OPRAVENO |
| B-009 | `degustace-olivoveho-oleje-doma` | L13-16 | Právní | VYSOKÁ | Ceny "u Lozano Červenka" (2×) + "u GreekMarket.cz" — inactive | ✅ OPRAVENO |
| B-010 | `olivovy-olej-ve-spreji` | body | Tokeny | VYSOKÁ | 2 inactive tokeny (`frantoi-cutrera-primo-250ml-ve-spreji`, `liokarpi-protogerakis`) — odstraněny, přidán `evoilino-korfu-s-lanyzem` | ✅ OPRAVENO |
| B-011 | `olivovy-olej-z-pokrutin` | body | Tokeny | VYSOKÁ | 2 inactive tokeny (liofyto 5l, pons pomace 4l) — odstraněny, **žádná aktivní náhrada** (0 aktivních pomace produktů v DB) | ✅ OPRAVENO (bez náhrady) |
| C-001 | `darkove-baleni-olivovy-olej` | L69, L122, L124 | Právní | VYSOKÁ | Gaea (inactive) — jmenování + konkrétní tip s cenou "Gaea Fresh 500ml" | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-002 | `olivovy-olej-pro-deti` | L16 | Právní | VYSOKÁ | "u GreekMarket.cz" — inactive retailer s cenou u LIOPHOS | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-003 | `olivovy-olej-pro-deti` | L16 | Tokeny | KRITICKÉ | `liophos-bio-extra-panensky-olivovy-olej-5l-stamatakos` — inactive | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-004 | `olivovy-olej-z-pokrutin` | L — | Faktická | STŘEDNÍ | Článek popisuje pomace olej, ale **0 aktivních produktů v DB** — bez {{product:}} karet. Výrazná mezera katalogu | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-005 | `kde-koupit-olivovy-olej-cr` | L7,28,35,45,109,124 | Právní | KRITICKÉ | Celý článek postavený na Olivio.cz, Olivovyolej.cz, Gaea.cz, Olivarna.cz — všichni inactive. Doporučení de facto mrtvá. | ⚠️ VYŽADUJE SCHVÁLENÍ — přepsat nebo depublish |
| C-006 | `extra-panensky-vs-panensky-vs-rafinovany` | L26, L73 | Právní | VYSOKÁ | "u Olivarna", "Gaea" — inactive | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-007 | `olivovy-olej-do-salatu-vs-na-vareni` | L — | Právní | VYSOKÁ | Olivarna (inactive) — v TOP PRODUCTS sekci | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-008 | `stredomorska-strava-olivovy-olej` | L155 | Zdravotní | STŘEDNÍ | "Olivový olej v ní chrání srdce a cévy, čímž se snižuje riziko srdečníc..." — kauzální tvrzení bez hedgování | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-009 | `je-olivovy-olej-zdravy` | L90-96 | Zdravotní | NÍZKÁ | "Polyfenoly chrání LDL před oxidací" — EFSA claim, OK při 250+ mg/kg; ale chybí podmíněnost na téže stránce | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-010 | `rafinovany-olivovy-olej` | body | Tokeny | VYSOKÁ | 3 inactive tokeny (picual-nefiltrovany, arbequina-500ml, sitia-1l-plech — přejmenovaný) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-011 | `je-olivovy-olej-zdravy` | body | Tokeny | VYSOKÁ | 5 inactive tokenů (evolia-2777, evolution-denocciolato, le-selezioni-coratina, the-governor) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-012 | `polyfenoly-proc-na-nich-zalezi` | body | Tokeny | VYSOKÁ | 7 inactive tokenů (elixir, centenarium, evolia-2777, evolia-2000, evolution, gangalupo, casas-de-hualdo) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-013 | `polyfenoly-kolik-je-dost` | body | Tokeny | VYSOKÁ | 5 inactive tokenů (evolia-2777, evolia-2000, evolution, gangalupo) — zůstává `intini-extra-alberobello` (aktivní) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-014 | `olivovy-olej-s-citronem-po-rano` | body | Tokeny | VYSOKÁ | 5 inactive tokenů (evolution, evolia-2777, the-governor, evolia-2000, le-selezioni-coratina) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-015 | `olivovy-olej-vs-slunecnicovy` | body | Tokeny | VYSOKÁ | 4 inactive tokeny (evolia-2777, le-selezioni-coratina, sitia-500ml, picual-500ml) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-016 | `jak-skladovat-olivovy-olej-doma` | body | Tokeny | STŘEDNÍ | 1 inactive token (sitia-5l) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-017 | `domaci-olivovy-olej` | body | Tokeny | STŘEDNÍ | 4 inactive tokeny (picual-500ml, arbequina-500ml, sitia-500ml, sitia-4l-design) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-018 | `olivovy-olej-na-plet-a-vlasy` | body | Tokeny | STŘEDNÍ | 5 inactive tokenů (sitia-500ml, myrtoo-750ml, bio-1l-mitira, liophos-750ml, picual-bio-500ml) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-019 | `olivovy-olej-do-200-kc` | L55 | Právní | STŘEDNÍ | Gaea (inactive) — zmínka při popisu luxusního packagingu | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-020 | `olivovy-olej-do-200-kc` | body | Tokeny | VYSOKÁ | 9 inactive tokenů (picual-500ml, picual-nefiltrovany, arbequina-500ml, bio-250ml-mitira, vafis-250ml, casitas-250ml, p-d-o-kolymbari-250ml, pure-drop-250ml-ena-ena) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-021 | `kalamata-pdo-olivovy-olej` | body | Tokeny | STŘEDNÍ | 4 inactive tokeny (sitia-4l-design, sitia-1l-plech, sitia-500ml, kolymbari-v-plechovce) — NOTE: sitia-1l-plech aktivní jako jiný slug | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-022 | `nejlepsi-olivovy-olej-2026` | body | Tokeny | VYSOKÁ | 10 inactive tokenů — zůstává `intini-coratina-alberobello` (aktivní) | ⚠️ VYŽADUJE SCHVÁLENÍ |
| C-023 | `nejlepsi-olivovy-olej-na-svete` | body | Tokeny | VYSOKÁ | 4 inactive tokeny (evolia-2777, evolution, casas-de-hualdo, picual-500ml-nefiltrovany) — zůstává `sitia-1l-plech` (aktivní) | ⚠️ VYŽADUJE SCHVÁLENÍ |

---

## Kategorie 3+5 — Opravy provedené rovnou (DB + kód)

### DB opravy (7 článků)

| Slug | Co opraveno |
|---|---|
| `jak-vybrat-olivovy-olej` | Odstraněno "33 prodejců a hodnotíme přes 470 olejů" → "hodnotíme olivové oleje" |
| `nejlepsi-olivovy-olej-2026` | H2 "Jak jsme testovali" → "Jak hodnotíme"; popis "470 produktů" přepsán neutrálně; odstraněna sekce "Lozano Červenka, Olivarna.cz"; odstraněno "přes 470 olejů" v závěru |
| `nejlepsi-olivovy-olej-na-svete` | "testujeme oleje" → "hodnotíme oleje" (2 výskyty) |
| `recky-vs-italsky` | "1990 Kč / 5l u GreekMarket.cz" → "cca 400 Kč/l (zkontroluj aktuální cenu v srovnávači)" |
| `premium-olivovy-olej-ma-smysl` | Odstraněny ceny "u Lozano Červenka" (3×) a "u Olivarna" (1×) z TOP PRODUCTS |
| `filtrovany-vs-nefiltrovany-olivovy-olej` | Odstraněny ceny "u Lozano Červenka" (2×) a "u GreekMarket.cz" (1×) |
| `degustace-olivoveho-oleje-doma` | Odstraněny ceny "u Lozano Červenka" (2×) a "u GreekMarket.cz" (1×) |
| `olivovy-olej-ve-spreji` | Odstraněny 2 inactive tokeny (frantoi-cutrera, liokarpi); přidán aktivní `evoilino-korfu-s-lanyzem`; aktivní `sagra` ponechán |
| `olivovy-olej-z-pokrutin` | Odstraněny 2 inactive tokeny (liofyto-5l-pet, pons-pomace-4l) — bez náhrady (0 aktivních pomace) |

### Kódové opravy (3 statické stránky)

| Soubor | Co opraveno |
|---|---|
| `app/o-projektu/page.tsx` | "Dognet, Heureka Affiliate, CJ Affiliate" → "eHUB"; "opravíme do 24 hodin" → "opravíme co nejdříve" |
| `app/editorial-policy/page.tsx` | Discovery list: "olivio.cz, gaea.cz, olivovyolej.cz, zdravasila.cz" → "přes affiliate síť eHUB a veřejně dostupné zdrojové stránky"; email `redakce@olivator.cz` → `info@makyoutdoors.com` |
| `app/metodika/page.tsx` | FAQ: "opravíme do 24 hodin" → "opravíme co nejdříve"; `kontakt@olivator.cz` → `info@makyoutdoors.com` |

---

## Kategorie 2 — Zdravotní tvrzení k schválení

### C-008: `stredomorska-strava-olivovy-olej` — kauzální tvrzení bez hedgování

**Kde:** Řádek 155 body_markdown

**Bylo:**
> Olivový olej v ní chrání srdce a cévy, čímž se snižuje riziko srdečnicových chorob...

**Návrh přeformulace:**
> Podle dat z PREDIMED studie (Estruch et al., NEJM 2013) je středomořská dieta s EVOO spojena se snížením kardiovaskulárního rizika o 30 %. Olivový olej je klíčovou složkou — dodává mononenasycené kyseliny a polyfenoly, které dle EFSA (432/2012) přispívají k ochraně LDL cholesterolu před oxidací při příjmu 250+ mg/kg.

**Proč:** Původní text říká "chrání srdce a cévy" jako kauzální fakt bez podmínek. EFSA schvaluje pouze tvrzení o ochraně LDL cholesterolu při 250+ mg/kg polyfenolů. Kardiovaskulární benefity jsou asociativní (observační studie), ne kauzálně prokázané.

---

### C-009: `je-olivovy-olej-zdravy` — EFSA claim bez kontextu na stránce

**Kde:** Řádek 90 body_markdown

**Bylo:**
> **1. Polyfenoly chrání LDL před oxidací**

**Návrh přeformulace:**
> **1. Polyfenoly přispívají k ochraně LDL před oxidací** (EU health claim 432/2012 — platí pro oleje s 250+ mg/kg polyfenolů; podmíněné tvrzení, ne obecný fakt)

**Proč:** Titulek uvádí tvrzení jako bezpodmínečný fakt. EFSA ho schválila jen pro produkty splňující limit 250 mg/kg. Článek dál tuto podmínku rozvádí, ale titulek ji postrádá.

---

## Přehled statických stránek

| Stránka | Stav | Klíčový problém |
|---|---|---|
| `/o-projektu` | ✅ OPRAVENO | Dognet/Heureka/CJ → eHUB; "do 24 hodin" → "co nejdříve" |
| `/metodika` | ✅ OPRAVENO | `kontakt@olivator.cz` → `info@makyoutdoors.com`; "do 24 hodin" → "co nejdříve" |
| `/editorial-policy` | ✅ OPRAVENO | Inactive eshopy v discovery listu; `redakce@olivator.cz` → `info@makyoutdoors.com` |
| `/llms.txt` | ✅ OK | Dynamické počty z DB — žádný hardcoded count, správný email `info@makyoutdoors.com` |

---

## Email šablony (lead-magnet-drip)

**Stav:** OK — žádné zmínky inactive retailerů, žádné problematické zdravotní tvrzení, žádný email olivator.cz.

---

## Prioritní opravy čekající na schválení

**TOP 3 kritické (dopad na důvěryhodnost):**

1. **C-005** (`kde-koupit-olivovy-olej-cr`) — celý článek postavený na inactive retailerech (Olivio, Olivovyolej, Gaea, Olivarna). Doporučení: buď přepsat s aktuálními partnery (Rohlík, Košík, Mall, Cretamart, Italyshop), nebo dočasně depublish `status='draft'`.

2. **C-004** (`olivovy-olej-z-pokrutin`) — 0 aktivních pomace produktů v celém katalogu. Článek nemůže mít produktové karty. Doporučení: přidat pomace produkty do DB, nebo přidat disclaimer "V aktuálním katalogu nemáme testované pomace oleje — hledej v supermarketu (Rohlík, Kaufland)."

3. **C-001** (`darkove-baleni-olivovy-olej`) — konkrétní tip "Gaea Fresh 500ml za ~400 Kč + Maldon combo" odkazuje na inactive brand. Celé doporučení je disfunkční.

**Inactive tokeny s nejvyšším dopadem (neviditelné produktové karty):**

Náhradní aktivní tokeny pro nejčastější kategorie:
- **Premium řecký high-poly:** `evolia-platinum-2777-...` (aktivní!), `sitia-premium-gold-...-1-l-plech` (aktivní), `intini-extra-alberobello` (aktivní)
- **Mid-range řecký:** `sitia-kreta-premium-gold-0-2-...-500-ml` (aktivní), `corinto-pelopones-...-manaki-0-3-5-l` (aktivní)
- **Italský:** `intini-coratina-alberobello` (aktivní)
- **Spray:** `sagra-olivovy-olej-ve-spreji-classico-spray-extra-vergine-200ml` (aktivní), `evoilino-korfu-...-ve-spreji-s-lanyzem-50ml` (aktivní)

---

## Poznámky k metodice auditu

- **SLIB-24H v článcích:** Regex detekoval "do 24 hodin" v textech o zpracování oliv (sklizeň do 24h, lisování do 24h) — tyto jsou OK, nejde o servisní sliby. Reálné sliby byly jen v statických stránkách (opraveny).
- **TESTUJEME framing:** Výraz "testujeme" v titulku článku `nejlepsi-olivovy-olej-2026` je v rozporu s CLAUDE.md pravidly ("testovali jsme" = PROBLÉM). Titulek článku `nejlepsi-olivovy-olej-2026` stále obsahuje "testujeme top oleje" — toto je pole `title` v DB, doporučuji přejmenovat na "Nejlepší olivový olej 2026: hodnotíme top oleje".
- **Produktové karty bez dat:** Aktivní tokeny `evolia-platinum-2777-...` a `sitia-premium-gold-...-1-l-plech` jsou skutečně aktivní a doporučuji je jako náhradu v polyfenolových článcích.
