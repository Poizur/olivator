# WEAK-KEYWORDS.md — Analýza slabě pokrytých keywords
*Vygenerováno: 2026-05-28 | Zdroj: keyword_mapping (status=weak), 45 keywords, 9 710 vol/měs*

---

## Souhrn

| Skupina (target URL) | KW | Vol combined | Akt. kategorie |
|---|---:|---:|---|
| `/srovnavac` | 19 | ~1 100 | B — chybí landing pages |
| `/slevy` | 8 | ~2 400 | A — title fix |
| `/pruvodce/extra-panensky-vs-panensky-vs-rafinovany` | 8 | ~900 | A + C mix |
| `/` (homepage) | 3 | 4 360 | B — H1 SSR problém |
| `/pruvodce/olivovy-olej-a-zdravi-veda-2026` | 4 | ~270 | C — obsah rozšířit |
| `/pruvodce/jak-vybrat-olivovy-olej` | 1 | 340 | A — intent mismatch |
| `/olivovy-olej-5l` | 1 | 120 | B — špatný mapping |
| `/pruvodce/otevrena-lahev-...` | 1 | 60 | B — špatný mapping |

**Celkový potenciál oprav:** ~4 150 vol/měs dosažitelných rychlými fixy (kategorie A + B snadno)

---

## 1. Plná tabulka — 45 weak keywords

*Seřazení: volume DESC. Kategorie: A = title fix stačí | B = potřebuje landing/URL | C = rozšíření obsahu*

| keyword | vol | cena/klik | comp | yoy% | target_url | proč je weak | kat. |
|---|---:|---:|---:|---:|---|---|:---:|
| olivový olej | 2 700 | 4,59 | 10 | +129 | `/` | H1 jen v client komponentě (`'use client'`), meta_title neobsahuje keyword jako standalone | B |
| olivovy olej | 1 500 | 7,31 | 10 | −29 | `/` | stejný problém jako výše, navíc bez diakritiky | B |
| olivový olej akce | 1 400 | 2,92 | 19 | +222 | `/slevy` | title: „v akci" ≠ „akce"; "akce" nikde v `<title>` ani H1 | **A** |
| olivový olej v akci | 480 | 4,76 | 20 | +47 | `/slevy` | "v akci" je v title, ale keyword tam je až za em-dash | **A** |
| olivový olej z pokrutin | 370 | 3,36 | 27 | −4 | `/pruvodce/extra-panensky-...` | title: „…vs rafinovaný"; „z pokrutin" ani „pomace" v title není | **A** |
| olivový olej kvalita | 370 | 0,83 | 0 | 0 | `/srovnavac` | title: „Katalog olivových olejů" — „kvalita" chybí, stránka je jen listing | B |
| jaký olivový olej | 340 | — | 0 | −15 | `/pruvodce/jak-vybrat-olivovy-olej` | title: „Jak vybrat…" (instrukce) vs dotaz „jaký" (doporučení) — intent mismatch | **A** |
| panenský olivový olej | 300 | — | 0 | −19 | `/pruvodce/extra-panensky-...` | „panenský" je v title, ale pozice je sekundární; meta_title „…Co opravdu kupuješ" ho nevyzdvihuje | **A** |
| kvalitní olivový olej | 300 | — | 0 | +37 | `/srovnavac` | „kvalitní" v title chybí; generic srovnavac landing nestačí | B |
| proti zácpě olivový olej | 200 | 3,10 | 23 | 0 | `/pruvodce/olivovy-olej-a-zdravi-...` | keyword zcela mimo title, chybí H2 sekce pro digestivní téma | C |
| olivový olej cena | 180 | 4,76 | 10 | +1 | `/srovnavac` | „cena" v title chybí; srovnavac nemá ceno-focusovaný H1 | B |
| akce olivový olej | 170 | 3,93 | 0 | +44 | `/slevy` | varianta „akce olivový olej" (obrácené pořadí); title to nepokrývá | **A** |
| olivovy olej akce | 170 | 3,93 | 0 | 0 | `/slevy` | přepis bez diakritiky — totéž | **A** |
| olej olivový | 160 | 6,62 | 0 | +17 | `/` | obrácené pořadí, homepage na to neoptimalizovaná | B |
| olivový olej 1l | 120 | — | — | — | `/olivovy-olej-5l` | **špatný mapping**: stránka je čistě o 5L, „1l" nikde | B |
| extra panenský olivový olej akce | 120 | — | — | — | `/slevy` | „extra panenský" v title chybí | **A** |
| lahev na olivový olej | 60 | — | — | — | `/pruvodce/otevrena-lahev-...` | **špatný mapping**: dotaz je o nádobě/konvičce, stránka je o trvanlivosti po otevření | B |
| olivový olej albert | 50 | — | — | — | `/srovnavac` | navigační dotaz, srovnavac neobsahuje H2 pro Albert sortiment | B |
| olivový olej kaufland | 50 | — | — | — | `/srovnavac` | totéž pro Kaufland | B |
| olivovy olej pomace | 40 | — | — | — | `/pruvodce/extra-panensky-...` | „pomace" v title chybí | **A** |
| albert olivový olej | 40 | — | — | — | `/srovnavac` | duplikát „olivový olej albert" (obrácené pořadí) | B |
| olivový olej pomace | 40 | — | — | — | `/pruvodce/extra-panensky-...` | „pomace" v title chybí | **A** |
| albert olivovy olej | 40 | — | — | — | `/srovnavac` | duplikát bez diakritiky | B |
| olivovy olej na lacno ucinky | 30 | — | — | — | `/pruvodce/olivovy-olej-a-zdravi-...` | „nalačno", „účinky" v title chybí; niche poddotaz | C |
| billa olivovy olej | 30 | — | — | — | `/srovnavac` | navigační brand dotaz | B |
| dtest olivový olej | 30 | — | — | — | `/srovnavac` | dotaz na nezávislý test/recenzi; srovnavac není recenzní stránka | C |
| tesco olivový olej | 30 | — | — | — | `/srovnavac` | navigační; duplikáty viz níže | B |
| tesco olivovy olej | 30 | — | — | — | `/srovnavac` | duplikát bez diakritiky | B |
| olivový olej tesco | 30 | — | — | — | `/srovnavac` | duplikát obrácené pořadí | B |
| olivovy olej tesco | 30 | — | — | — | `/srovnavac` | duplikát × 2 | B |
| billa olivový olej | 20 | — | — | — | `/srovnavac` | navigační brand dotaz | B |
| ballester olivový olej recenze | 20 | — | — | — | `/srovnavac` | dotaz na recenzi konkrétní značky; srovnavac recenzi nemá | C |
| kaufland olivový olej | 20 | — | — | — | `/srovnavac` | navigační; duplikát kaufland | B |
| co obsahuje olivový olej | 20 | — | — | — | `/pruvodce/olivovy-olej-a-zdravi-...` | složení/nutriční info; title to neadresuje | C |
| olivový olej franz josef akce | 20 | — | — | — | `/slevy` | navigační brand + sleva; brand stránka neexistuje | B |
| pokrutiny olivový olej | 20 | — | — | — | `/pruvodce/extra-panensky-...` | varianta „pokrutiny" místo „z pokrutin" | **A** |
| olivový olej cholesterol | 20 | — | — | — | `/pruvodce/olivovy-olej-a-zdravi-...` | specifické zdravotní téma, chybí H2 | C |
| olivový olej sleva | 20 | — | — | — | `/slevy` | „sleva" IS v title; marginální | **A** |
| olivový olej panenský | 20 | — | — | — | `/pruvodce/extra-panensky-...` | varianta „panenský" na konci | **A** |
| olivový olej recenze | 20 | — | — | — | `/srovnavac` | „recenze" chybí v title; srovnavac recenzní obsah nemá | C |
| pomace olivovy olej | 20 | — | — | — | `/pruvodce/extra-panensky-...` | varianta pořadí | **A** |
| olivový olej san fabio recenze | 20 | — | — | — | `/srovnavac` | specifická brand recenze; lepší `/olej/[slug]` | C |
| monini olivový olej akce | 20 | — | — | — | `/slevy` | brand + akce; brand stránka neexistuje | B |
| olivový olej billa | 20 | — | — | — | `/srovnavac` | navigační brand | B |
| olivový olej z pokrutin na smažení | 20 | — | — | — | `/pruvodce/extra-panensky-...` | kombinovaný dotaz, typ + smažení; menší verze A | **A** |

---

## 2. Kategorie A — „Title/H1 fix stačí" (16 keywords, ~3 720 vol)

Stránka má obsah, keyword je jen potřeba napasovat. Každý fix = editace v DB nebo kódu, ≤ 15 min.

### `/slevy` — 6 keywords, ~2 400 vol
**Problém:** title: `Olivový olej v akci — denně aktualizované slevy | Olivátor`  
H1: `Slevy na olivový olej`  
Keyword „**olivový olej akce**" (1 400 vol, #1 komerční díra v celé DB) — „akce" se v title ani H1 nevyskytuje. Google vidí „v akci" a „slevy", ale ne přesnou frázi „akce".

| Keyword | Vol | Problém |
|---|---:|---|
| olivový olej akce | 1 400 | „akce" zcela chybí v title/H1 |
| olivový olej v akci | 480 | partial match, uprostřed titulu |
| akce olivový olej | 170 | obrácené pořadí, nepokryto |
| olivovy olej akce | 170 | bez diakritiky |
| extra panenský olivový olej akce | 120 | „extra panenský" chybí v title |
| olivový olej sleva | 20 | „sleva" je v title, marginální |

**Navrhovaný titulek:**  
`title`: `Olivový olej akce a slevy — denně ověřené nabídky | Olivátor`  
`H1`: `Olivový olej akce a slevy`  

---

### `/pruvodce/extra-panensky-vs-panensky-vs-rafinovany` — 8 keywords, ~900 vol
**Problém:** title/H1: `Extra panenský vs panenský vs rafinovaný olivový olej`  
meta_title: `Extra panenský vs panenský olivový olej: Co opravdu kupuješ`

„**Olivový olej z pokrutin**" (370 vol) a „**pomace**" (40+40+20+20 vol) — pomace = rafinovaný z pokrutin, ale title explicitně říká jen „rafinovaný". Google nezměřuje synonyma spolehlivě.

| Keyword | Vol | Problém |
|---|---:|---|
| olivový olej z pokrutin | 370 | „pokrutin" chybí v title |
| panenský olivový olej | 300 | v title je, ale H1 ho nevyzdvihuje |
| olivovy olej pomace | 40 | „pomace" chybí |
| olivový olej pomace | 40 | totéž |
| pokrutiny olivový olej | 20 | varianta |
| olivový olej panenský | 20 | varianta |
| pomace olivovy olej | 20 | varianta |
| olivový olej z pokrutin na smažení | 20 | kombinovaný |

**Navrhovaný titulek:**  
`title/H1`: `Extra panenský, panenský, rafinovaný a z pokrutin: jaký olivový olej kupuješ`  
`meta_title`: `Druhy olivového oleje: extra panenský, panenský, pomace — rozdíly`  

---

### `/pruvodce/jak-vybrat-olivovy-olej` — 1 keyword, 340 vol
**Problém:** title `Jak vybrat olivový olej: na co opravdu záleží`  
Keyword „**jaký olivový olej**" (340 vol) — intent „jaký" = doporučení konkrétního produktu; „jak vybrat" = edukace o kritériích. Různý intent, ale nejbližší stránka, která existuje.

**Navrhovaný titulek:**  
`meta_title`: `Jaký olivový olej vybrat? Průvodce pro každý typ kuchaře`  
(H1 ponechat — „Jak vybrat" je správné pro informational část)

---

## 3. Kategorie B — „Potřebuje landing/filter URL" (21 keywords, ~5 180 vol)

Keyword míří na stránku, která ho nemůže dobře pokrýt svou povahou.

### B1: Homepage — 3 keywords, 4 360 vol *(pozor: ultra-konkurenční)*
**URL:** `/`  
**Problém:** „olivový olej" (2 700) je generický root keyword s comp 10 — pro nový web nereálné rankovat na 1. stránce. Navíc H1 je v client componentě (`SommelierHero` — `'use client'`), Google vidí prázdné `<h1>` při SSR.  
**Akce:** Vyřešit H1 SSR (viz SEO-AUDIT kritika #7) — ale ranking na „olivový olej" je dlouhodobá hra, ne rychlá výhra.  
**Alternativa:** Přijmout, že homepage bude rankovat na branded dotaz „olivátor" + long-tail varianty.

### B2: `/srovnavac` — retailer brand dotazy, ~500 vol
**Keywords:** albert (130 vol combined), tesco (120 vol combined), billa (70 vol), kaufland (70 vol)  
**Problém:** Navigační intent — uživatel hledá olivový olej dostupný v konkrétním obchodě. `/srovnavac` nemá žádný H2 ani text zmiňující tyto retailery.  
**Možnosti:**
- *Krátkodobě:* Přidat sekci „Kde u nás najdeš olivový olej" v /srovnavac s logy/linky na Rohlík, Kaufland, Tesco, Albert a Billa.
- *Dlouhodobě:* Pokud mají retaileři stránky v `/znacka/`, interní prolinkování z těchto stránek.
- **Nenavrhovat** indexovatelné filter URL pro brand — srovnavac má canonical bez params a navíc retaileři nejsou `origin` ani `cert` parametry.

### B3: `/srovnavac` — kvalita a cena, ~850 vol
**Keywords:** „olivový olej kvalita" (370), „kvalitní olivový olej" (300), „olivový olej cena" (180)  
**Problém:** Commercial intent — uživatel chce koupit, ne si číst. /srovnavac je správná cílová stránka, ale title „Katalog olivových olejů" neodráží klíčové slovo.  
**Navrhovaná úprava titulu `/srovnavac`:**  
`title`: `Srovnání olivových olejů — ceny, kvalita, Olivator Score | Olivátor`  
`H1`: `Katalog olivových olejů` (ponechat pro UX) + přidat `<p>` pod H1: *„Srovnáváme ceny a kvalitu…"*

### B4: `/olivovy-olej-5l` — špatný mapping pro 1L
**Keyword:** „olivový olej 1l" (120 vol)  
**Problém:** Stránka `/olivovy-olej-5l` je čistě o velkých baleních 5L+. Keyword „1l" by potřeboval `/srovnavac?maxPrice=…` nebo `/olivovy-olej-1l` landing.  
**Doporučení:** Přidat odkaz na `/srovnavac` přímo ze stránky `/olivovy-olej-5l`: *„Hledáš 1L balení? → srovnat 1L lahve"*. Plná landing pro 1L je Fáze 2.

### B5: `/pruvodce/otevrena-lahev` — špatný mapping pro „lahev na olivový olej"
**Keyword:** „lahev na olivový olej" (60 vol)  
**Problém:** Dotaz = hledání nádoby/konvičky na přelití olivového oleje (accessories). Stránka = jak rychle spotřebovat otevřenou lahev. Zcela jiný intent.  
**Doporučení:** Neexistuje dobrá cílová stránka. Přidat affiliate odkaz na vhodné konvičky/nádoby z jednoho z průvodců (dárkové balení?), nebo vytvořit krátkou stránku v `/pruvodce/` (nízká priorita).

---

## 4. Kategorie C — „Potřebuje rozšíření obsahu" (8 keywords, ~390 vol)

Stránka existuje a je tematicky relevantní, ale keyword nemá vlastní H2 sekci.

### `/pruvodce/olivovy-olej-a-zdravi-veda-2026` — 4 keywords
Stránka má silný základ (PREDIMED, oleocanthal). Chybí H2 pro tyto specifické dotazy:

| Keyword | Vol | Chybí |
|---|---:|---|
| proti zácpě olivový olej | 200 | H2 „Olivový olej a trávení / zácpa" |
| olivovy olej na lacno ucinky | 30 | H2 „Olivový olej nalačno: co říká výzkum" |
| olivový olej cholesterol | 20 | H2 „Olivový olej a cholesterol: LDL vs HDL" |
| co obsahuje olivový olej | 20 | Nutrica/složení sekce |

### `/srovnavac` — 4 keywords (recenze dotazy)

| Keyword | Vol | Chybí |
|---|---:|---|
| dtest olivový olej | 30 | Odkaz na dTest nebo vlastní test sekce |
| olivový olej recenze | 20 | „recenze" v meta_description; nebo link na průvodce |
| ballester olivový olej recenze | 20 | Produktová karta `/olej/ballester-*` |
| olivový olej san fabio recenze | 20 | Produktová karta `/olej/san-fabio-*` |

Pro brand recenze: správná cílová stránka je `/olej/[slug]` produktové karty — pokud tyto produkty v DB jsou, mapping je špatný. Pokud nejsou, jsou to obsahové díry.

---

## 5. Top 5 „udělat hned"

*Skóre = vol × rychlost (A=3, B=2, C=1) / relativní obtížnost*

| # | Akce | Target | Keywords | Vol | Čas | Proč |
|---|---|---|---|---:|---:|---|
| 🔥 1 | **Title fix `/slevy`** | `/slevy` (kód) | 6 kw | 2 400 | 15 min | „olivový olej akce" 1400 vol; nejjednodušší A-fix s největším dopadem. Jeden řádek v kódu. |
| 🔥 2 | **Title fix `/extra-panensky`** | DB articles | 8 kw | ~900 | 10 min | „z pokrutin" 370 vol; „pomace" 4× 20–40 vol; čistý A-fix, keyword stačí přidat do title. |
| 🔥 3 | **`/srovnavac` title fix** | kód | 3 kw | ~850 | 10 min | „kvalita/kvalitní/cena" 850 vol combined; title „Katalog olivových olejů" je slabý, stačí přejmenovat. |
| 🔥 4 | **meta_title `/jak-vybrat`** | DB articles | 1 kw | 340 | 5 min | „jaký olivový olej" 340 vol; meta_title swap, žádný obsah. |
| 5 | **H2 sekce v zdraví článku** | DB body_markdown | 4 kw | ~270 | 45 min | „proti zácpě" 200 vol; C-fix ale comp=23, reálná šance pro nový web. |

---

## 6. Kanibalizace — duplicitní keyword skupiny

Žádná stránka-vs-stránka kanibalizace (každý keyword míří na jednu URL). Ale existují intrapage duplicity — více variant stejného dotazu na stejné URL. Ošetřit výběrem primárního:

| Skupina | Primární keyword | Duplikáty (sloučit) | URL |
|---|---|---|---|
| Akce cluster | **olivový olej akce** (1 400) | olivový olej v akci, akce olivový olej, olivovy olej akce | `/slevy` |
| Tesco cluster | **tesco olivový olej** (30) | olivovy olej tesco, olivový olej tesco, tesco olivovy olej | `/srovnavac` |
| Billa cluster | **billa olivový olej** (30) | olivový olej billa, billa olivovy olej | `/srovnavac` |
| Albert cluster | **olivový olej albert** (50) | albert olivový olej, albert olivovy olej | `/srovnavac` |
| Pomace cluster | **olivový olej z pokrutin** (370) | pomace, pokrutiny — 5 variant | `/pruvodce/extra-panensky-...` |

**Doporučení:** Při optimalizaci `/slevy` cíl na „olivový olej akce" (1 400) jako primární — ostatní varianty se zachytí automaticky přes natural language matching.

---

## Reference

| Metrika | Hodnota |
|---|---|
| Celkem weak keywords | 45 |
| Celkový vol | 9 710 hledání/měs |
| Kategorie A (title fix) | 16 kw, ~3 720 vol |
| Kategorie B (landing/fix mapping) | 21 kw, ~5 180 vol |
| Kategorie C (obsah rozšířit) | 8 kw, ~390 vol |
| Top 5 okamžitých výher | ~4 490 vol/měs |

*Poznámka: Homepage keywords (olivový olej 2 700 + 1 500 vol) jsou technicky B-kategorie, ale pro nový web je rankování na tyto ultra-generické dotazy 12–24 měsíční hra. Prioritizovat long-tail a conversion-oriented keywords.*

---

*Report: NEUPRAVUJ. Slouží jako podklad pro KROK C (implementace).*
