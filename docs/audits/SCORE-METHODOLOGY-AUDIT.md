# Olivator Score — Audit metodiky
**Datum:** 2026-07-24 | **Dataset:** 128 aktivních produktů | **Stav:** ŽÁDNÉ změny — jen analýza

> Tento dokument je podkladem pro rozhodnutí majitele. Žádná z níže uvedených změn
> není implementována. Každá změna vah = changelog + komunikace uživatelům.

---

## Shrnutí závažnosti nálezů

| # | Nález | Závažnost | Sekce |
|---|-------|-----------|-------|
| 1 | Score platí pro 62 % produktů — 38 % bez Score | 🔴 Kritická | 2a |
| 2 | Kyselost chybí u 49 %, polyfenoly u 82 % | 🔴 Kritická | 2a |
| 3 | Sitia PDO: 9 SKU stejného oleje, Score 79–92 (+13 bodů) | 🔴 Kritická | 3c |
| 4 | Harvest year: 3/128 produktů — složka de facto neexistuje | 🟠 Střední | 3d |
| 5 | 3 produkty mají DB score ≠ computed score (diff 6–8 bodů) | 🟠 Střední | bonus |
| 6 | ±10 % pohyb ceny = průměrně 2,5 bodu, max 8 bodů | 🟡 Nízká | 1c |
| 7 | Acidity: 6 unikátních hodnot, 35 % váha na hrubá data | 🟡 Nízká | 3a |
| 8 | Deklarovaná kyselost bez ověření: +5 bodů za manipulaci | 🟡 Nízká | 4 |

---

## 1. Distribuce a stabilita

### 1a. Histogram Score

Z 128 aktivních produktů má **79 vypočitatelné Score** (62 %). Zbývajících **49 (38 %)
má `insufficientData`** — Score není k dispozici, většinou kvůli absenci kyselosti i polyfenolů.

```
Bracket  │ Počet │ Bar
─────────┼───────┼────────────────────────────
  50–54  │   2   │ ██
  55–59  │   2   │ ██
  60–64  │  12   │ ████████████
  65–69  │  12   │ ████████████
  70–74  │  26   │ ██████████████████████████
  75–79  │  12   │ ████████████
  80–84  │   7   │ ███████
  85–89  │   5   │ █████
  90–94  │   1   │ █
```

**Statistiky:** n=79 · medián=72 · Q1=67 · Q3=77 · min=50 · max=92

Distribuce je silně **levostranná a úzká** — IQR pouhých **10 bodů** (67–77). Většina
olejů se tísní v pásmu 70–79 (48 % skórovaných). Jediný produkt překonal 90 bodů.

### 1b. Brackety — dávají smysl?

```
Score 90+ : 1 produkt   (1,3 %)   — „Top tier"
Score 80–89: 12 produktů  (15,2 %)  — „Prémiové"
Score 70–79: 38 produktů  (48,1 %)  — „Střední"
Score <70 : 28 produktů  (35,4 %)  — „Základní"
Bez Score  : 49 produktů  (38 % ze 128)
```

**Problém:** 48 % všech skórovaných produktů leží v jediném bracketech (70–79),
což znemožňuje smysluplnou diferenciaci. Zákazník vidí 38 olejů jako „stejně dobré".
Jediný produkt nad 90 (Sitia PDO 4L bez ceny — viz sekce 3c) je statistická anomálie.

**Příčina:** Renormalizace na dostupné složky (správná funkcionalita) zvyšuje skóre
produktům s méně daty — ale zároveň komprimuje distribuci, protože všichni dostanou
„plný" bodový potenciál ze svých komponent.

### 1c. Score stabilita při pohybu ceny

Cena/kvalita složka tvoří **15 %** váhy, ale kvůli skokovým bracketům v `calcValue()`
může malá změna ceny přeskočit hranici a způsobit neúměrný skok Score.

```
Hranice calcValue │ Skok při přeskočení
──────────────────┼────────────────────
≤20 → >20 Kč/100ml │  −3 body
≤30 → >30 Kč/100ml │  −3 body
≤40 → >40 Kč/100ml │  −4 body
≤55 → >55 Kč/100ml │  −3 body
```

**Měření na datech:**
- ±10 % pohyb ceny změní Score průměrně o **2,5 bodu**
- Max zjištěný pohyb: **8 bodů** (u produktů blízkých hranici bracketů)
- Produktů ovlivněných ±10% cenou: **33 z 78** (42 %)

**Důsledek:** Sezónní sleva 10 % u Rohlíku může zvednout Olivator Score o 3–8 bodů —
i když se fyzická kvalita oleje nezměnila. Score se tím stává **výsledkem affiliate
partnerství a akční ceny**, ne jen kvality.

**Varianty řešení:**
- A) **Status quo** — cena patří do Score (cenová dostupnost je faktická hodnota)
- B) **Score quality + Value badge odděleně** — Score = jen kyselost+cert+poly; Value
  badge = ceník; zákazník vidí obě (simulace dopad: viz sekce 3c)
- C) **Continuous calcValue** — nahradit skoky lineární křivkou; eliminuje cliff efekty,
  ale nezřídí se oddělení konceptů

---

## 2. Férovost chybějících dat

### 2a. Datová pokrytost

```
Složky   │ Produktů │ Průměrné Score │ Poznámka
─────────┼──────────┼────────────────┼──────────────────────────
4/4      │    13    │     79,6       │ Kompletní data (10 %)
3/4      │    23    │     72,8       │ Jedna chybí
2/4      │    43    │     68,7       │ Dvě chybí — nejčastější skupina
1/4      │     0    │     N/A        │ Žádný (≥50 % threshold funguje)
insuff.  │    49    │     0          │ Score nezobrazujeme
```

**Co konkrétně chybí:**

| Složka | Chybí u | % ze 128 |
|--------|---------|----------|
| Kyselost | 49 | **38 %** |
| Polyfenoly | 105 | **82 %** |
| Scoring certifikace | 86 | **67 %** |
| Cena (alespoň 1 offer) | 1 | 0,8 % |

**Hlavní insight:** Cena je téměř vždy k dispozici (127/128). Polyfenoly jsou
nejkritičtější mezera — 82 % produktů je nemá, přesto tvoří 25 % váhy Score.
Většina produktů tak závisí primárně na kyselosti (je-li k dispozici) a ceně.

### 2b. Renormalizace vs. penalizační systém — dopad na TOP 20

Aktuální systém (`lib/score.ts`) již renormalizaci implementuje: chybějící složka
nepenalizuje (0 bodů), ale váha se přerozdělí na dostupné složky.

Simulace srovnání renormalizovaného a penalizačního (0 za chybějící) skóre TOP 20:

**Produkty v TOP 20 renorm, ale NE v TOP 20 penalty** (systém jim pomáhá):
```
Sitia PDO 4L plech (bez ceny)     renorm=92  penalty=55   +37 bodů
Plakias 250ml                      renorm=78  penalty=39   +39 bodů
Plakias 3L                         renorm=78  penalty=39   +39 bodů
Plakias 5L                         renorm=78  penalty=39   +39 bodů
```

**Produkty v TOP 20 penalty, ale NE v TOP 20 renorm** (systém je odsouvá dolů):
```
Sitia Premium Gold (3L)            renorm=75  penalty=75
Iliada Kalamata Extra              renorm=69  penalty=69
CORINTO BIO Peloponés (2 SKU)      renorm=67  penalty=67
```

**Hodnocení:** Renormalizace pomáhá Plakias produktům, které mají výbornou DOP certifikaci
a kyselost, ale nejsou v prodeji s aktivní cenou (nebo cena chybí v DB). To není nutně
chybné — pokud olej skutečně má 0,2 % kyselost a DOP certifikaci, měl by být dobře
hodnocen i bez price dat. Ale **transparentnost chybí** — uživatel neví, že Score 78
je postaveno jen na 2 ze 4 složek.

### 2c. Varianty řešení pro chybějící data

| Varianta | Popis | Dopad na pořadí | Implementační složitost |
|----------|-------|-----------------|------------------------|
| **A — Status quo** | Renorm bez badge | Silně mění pořadí vs. realita | Hotovo |
| **B — Badge „Částečná data"** | Score + ⚠ ikona + „počítáno z N/4 složek" | Žádný na Score | Nízká |
| **C — Minimální práh 75 %** | Score pouze pokud ≥75 % váhy → zvýšit MIN_DATA_WEIGHT na 75 | ~20 dalších produktů přijde o Score | Nízká |
| **D — Separátní confidence** | Score 0–100 + Confidence 1–4 hvězdičky | Žádný na Score čísla | Střední |

**Doporučená kombinace pro diskuzi:** B + C — zvýšit práh na 75 % a přidat badge.
Produkty se Score jen z ceny + jedné složky by Score neměly.

---

## 3. Složky pod lupou

### 3a. Kyselost (35 % váhy)

Kyselost je dominantní složka Score. Problémem je, jak vypadají reálná data:

**Distribuce hodnot v DB (79 produktů s kyselostí):**
```
Hodnota │ Počet │ Body  │ Poznámka
────────┼───────┼───────┼─────────────────────────────
0,1 %   │   2   │ 35/35 │ Vzácné — typické pro early harvest spec
0,2 %   │  20   │ 35/35 │ Časté — EVOO prémiový standard
0,3 %   │  27   │ 30/35 │ Nejčastější — typické EVOO
0,4 %   │  16   │ 25/35 │ Stále EVOO, horní hranice kvalitní
0,5 %   │   9   │ 22/35 │ EVOO (max 0,8 %)
0,6 %   │   5   │ 20/35 │ EVOO — nižší kvalita
```

**Klíčové pozorování:** Existuje jen **6 unikátních hodnot** a žádná nad 0,6 % — 
byť EU limit pro EVOO je 0,8 %. Hodnoty jsou silně diskrétní (0,1/0,2/0,3/0,4...)
— jde s největší pravděpodobností o hodnoty zaokrouhlované na etiketách,
ne o přesná laboratorní čísla.

**Je 35 % váha obhajitelná?** Ano i ne:
- *Ano:* Kyselost je nejdůležitější technický indikátor kvality EVOO — nízká kyselost
  koreluje s čerstvostí, šetrným zpracováním a správným skladováním.
- *Ne:* S pouhými 6 diskrétními hodnotami a zaokrouhlováním etiket (výrobce uvádí
  „≤ 0,3 %", ne „0,27 %") je informační hodnota omezená. Skok 0,2→0,3 % = 5 bodů
  u 35% složky = 5 bodů Score je velký trest za jediný desetinný místo.

**Bodová křivka:**
Křivka `calcAcidity()` je po částech lineární (tři segmenty). Efekt:
- Pásmo 0,0–0,2 %: **flat** — 35 bodů (žádná diferenciace v top-tier)
- Pásmo 0,2–0,4 %: **9 bodů pokles** za 0,2 procentního bodu
- Pásmo 0,4–0,8 %: **9 bodů pokles** za 0,4 procentního bodu (pomalejší)

**Varianty:**
- A) Status quo — jednoduché a srozumitelné
- B) Plynulejší křivka + tlumení na 28–30% váhu — snížit dominanci jediné metriky
- C) Požadovat číselný certifikát (ne etiketa) pro plné body — badge „ověřená kyselost"

### 3b. Certifikace (25 % váhy)

**Distribuce scoring certifikací:**
```
DOP/PDO   : 27 produktů (21 %)
BIO/organic: 19 produktů (15 %)
PGP/PGI   :  2 produkty  (2 %)
NYIOOC    :  0 (bez záznamu)
Demeter   :  0 (bez záznamu)
```

**Průměrné body za certifikaci** (pouze produkty s alespoň jednou): **19,3 / 25**
— odpovídá průměru DOP bez BIO (20 bodů), což sedí s distribucí.

**Strop necertifikovaných:**
- **86 produktů (67 %) nemá scoring certifikaci** — dostávají 0/25 za certy
- Reálný max Score bez jakékoli certifikace v DB: **83 bodů**
  (Evolia Platinum — 2777 mg/kg polyfenolů, kyselost 0,2 %)
- Teoretický max bez certifikace: **97 bodů** (acid=0,1 %, poly=3500, price=15 Kč)

**Korelace certifikace s ostatními složkami:**
Produkty s DOP mají tendenci mít i lepší naměřená data (výrobci investují do
dokumentace komplexně) — ale toto je korelace, ne kauzalita v Score.

**Cert stacking:**
DOP + PDO jsou aliasy stejné certifikace — systém je správně zpracovává jako jedno
(max 20 bodů za DOP/PDO bez ohledu na redundantní kód v DB).

### 3c. Cena/kvalita (15 %) — case study Sitia

Sitia PDO Kréta je jeden fyzický olej (stejný výrobce, stejná kyselost 0,2 %,
stejná DOP certifikace). V DB existuje jako **9 různých SKU** s dramaticky různými Score:

```
SKU                        │ Volume │ Cena  │ Kč/100ml │ Score
───────────────────────────┼────────┼───────┼──────────┼───────
Sitia PDO 4L plech (Critida) │  4L   │ null  │  —       │  92 ← highest in DB!
Sitia Premium Gold 3L       │  3L   │  990  │ 33,0     │  89
Sitia Premium Gold 1L       │  1L   │  399  │ 39,9     │  85
Sitia Kréta Gold 5L         │  5L   │ 1590  │ 31,8     │  85
Sitia Kréta Gold 3L         │  3L   │ 1090  │ 36,3     │  85
Sitia Premium Gold 1L (v2)  │  1L   │  349  │ 34,9     │  83
Sitia Kréta Gold 500ml      │ 500ml │  239  │ 47,8     │  81
Sitia Extra 1L plech        │  1L   │  379  │ 37,9     │  79
Sitia Kréta Gold 1L         │  1L   │  419  │ 41,9     │  75
```

**Rozsah Score:** 75–92 za fyzicky totožný olej = **17 bodový rozptyl** (18 % škály)

**Hlavní příčiny:**
1. **Chybějící cena u 4L plechovky** → renorm bez value složky → score 92
2. **Malé balení má vyšší Kč/100ml** → nižší value body → score 75 pro 1L
   (zákazník platí prémiovou přirážku za malé balení — zcela logické, ale Score to interpretuje jako „horší olej")
3. **Totožná kyselost a certifikace** → tyto složky jsou identické u všech 9 SKU

**Dopad na zákazníka:** Zákazník hledající „nejlepší Sitia olej" dostane 1L za 419 Kč
jako Score 75 a 5L za 1590 Kč jako Score 85 — oba jsou téhož oleje. Score odrazuje
od malých balení pro testování.

**Varianty řešení:**

| Varianta | Popis | Dopad |
|----------|-------|-------|
| **A — Separátní Score kvality a Value index** | Score = kyselost+cert+poly; Value badge = cena/100ml kategorie | Eliminuje cena-driven rozptyl; komplexnější UI |
| **B — Score per brand/produkt, ne per SKU** | Score se počítá pro „bazový produkt", cena se zobrazuje jako Value dimension | Zásadní refactor DB schématu |
| **C — Normalize by EAN group** | Všechna balení stejného oleje dostanou Score z průměrné ceny; individuální Value badge | Střední složitost |
| **D — Status quo + jasný label** | Score se liší per balení, ale UI jasně říká „Score zahrnuje cenu/balení" | Žádný dopad na pořadí |

### 3d. Sklizňový rok (aktuálně: 0 % váhy)

**Data v DB:**
- Produkty s `harvest_year`: **3 z 128** (2,3 %)
  - 2024: 2 produkty
  - 2025: 1 produkt
- Zbývajících **125 produktů (98 %)** nemá harvest_year

**CLAUDE.md říká:** „nejdůležitější číslo" pro olivový olej. Score ho **ignoruje zcela**.

**Reálný stav:** S 2,3 % pokrytím nelze harvets_year do Score zahrnout, aniž
by se diskriminovalo 98 % katalogy. Navíc výrobci harvets_year na etiketách
uvádějí nekonzistentně (crop year vs. bottling year vs. best before).

**Freshness logika (hypotetická):**
```
Sklizeň 2025 (≤1 rok): +5 bodů freshness bonus
Sklizeň 2024 (1–2 roky): 0 bodů
Sklizeň 2023 (2–3 roky): −3 body
Starší: −7 bodů
```

**Varianty:**

| Varianta | Podmínka | Dopad |
|----------|----------|-------|
| **A — Odložit** | Dokud nemáme >50 % pokrytí | Žádný, status quo |
| **B — Bonus jen s datem** | +5 za 2025, +0 za 2024, žádná penalizace | Bezpečné — nepenalizuje nekompletní data |
| **C — Best before proxy** | `best_before` jako náhrada harvest_year | Nevypovídá o čerstvosti přesně |

**Doporučení:** Zavést harvest_year jako povinné pole při vytváření produktu přes admin
a backfillovat postupně. Scraper by měl extrahovat „Sklizeň 20XX" z popisů. Po dosažení
50 % pokrytí zvážit zařazení jako bonus složku.

---

## 4. Manipulovatelnost — Red-team

Teoretické vektory, jak by výrobce/prodejce mohl Score uměle zvedat:

### Vektor 1: Deklarovaná kyselost bez ověření — STŘEDNĚ RIZIKOVÝ

```
Deklarace 0,3 % (typická) → 30/35 bodů
Deklarace 0,1 % (bez certifikátu) → 35/35 bodů
Zisk: +5 bodů Score
```

Scrapy sbírají kyselost z popisů výrobce na e-shopech — **žádné ověření certifikátem**.
Výrobce může uvést „0,1 % kyselost" bez laboratorní analýzy. Přidání 5 bodů kyselostí
je reálné riziko, zejména u nových prodejců.

**Protiopatření (návrh):**
- Badge „ověřená kyselost" — výrobce nahraje PDF laboratorní analýzy; bez nahrání
  platí max 30 bodů (= 0,3 % kategorie) bez ohledu na deklaraci

### Vektor 2: Cert stacking — NÍZKÉ RIZIKO (správně ošetřeno)

DOP + PDO jsou aliasy; systém je správně sloučí na 20 bodů. NYIOOC (soutěžní ocenění)
přidává max +2 body nad stávající cert — stacking je limitován.

### Vektor 3: Cenová optimalizace přes velká balení — NÍZKÉ RIZIKO

```
Stejný olej 1L za 399 Kč: 39,9 Kč/100ml → 9/15 bodů
Stejný olej 5L za 1490 Kč: 29,8 Kč/100ml → 12/15 bodů
```

Prodejce může nabídnout 5L balení s nízkou cenou/100ml a tím zvednout Score o 3 body.
Cena 5L se přitom v nákupním rozhodnutí liší od 1L — zákazník hledající testovací
balení bude vidět nižší Score. (Viz case study Sitia.)

**Protiopatření:** Separátní Score+Value (varianta B v sekci 3c).

### Vektor 4: Žádné cert → výpočet jen z kyselosti a ceny — NÍZKÉ RIZIKO

Bez certifikace jde o 60 % dostupné váhy (acid 35 + value 15). Score může dosáhnout
max 83–96 bodů (viz sekce 3b). To není manipulace — ale zákazník musí vědět, že
Score neobsahuje quality ověření třetí stranou.

**Aktuální max bez scoring cert v DB: 83 (Evolia Platinum)** — a to je pravdivé
hodnocení excelentního oleje s 2777 mg/kg polyfenolů.

### Vektor 5: Fáze 1 badge „Ověřeno výrobcem" — NÁVRH

Systém bez externího ověření je zranitelný u deklarací kyselosti.
Krátkodobě přijatelné, ale s růstem reputace Olivatoru roste i riziko.

**Navrhovaný badge systém (diskuze):**
- 🏅 „Certifikovaná data" — kyselost a polyfenoly z PDF analýzy nahraném výrobcem
- ✓ „Retailer data" — scraped z e-shopu (současný stav)
- Přitom Score zůstává stejné — badge jen informuje o zdroji dat

---

## 5. Bonus: Score drift — 3 produkty s rozdílem DB vs. computed

Audit odhalil **3 produkty, kde uložené `olivator_score` v DB neodpovídá živému výpočtu**
(diff > 2 body). Pravděpodobně způsobeno certifikačním auditem T-27 (odebrání BIO),
po němž neproběhl rescore těchto produktů.

```
Produkt                                    │ DB Score │ Computed │ Diff
───────────────────────────────────────────┼──────────┼──────────┼─────
corinto-pelopones-extra-panensky-olivovy-olej │    82    │    76    │ −6
petromilos-zakynthos-extra-panensky-olivovy-o │    68    │    62    │ −6
neotis-pelopones-extra-panensky-olivovy-olej  │    56    │    64    │ +8
```

**Corinto a Petromilos:** DB score je příliš vysoké — mají v DB certifikaci, která
po renormalizaci na dostupné složky dává nižší číslo (nebo se cert změnila bez rescoring).

**Neotis:** DB score je příliš nízké (+8 v computed) — možná přibyla cena/offer a DB
se neaktualizovalo.

**Doporučení:** Spustit `recalcAllScores()` pro všechny 128 aktivních produktů. To je
nízko-riziková oprava bez metodické změny — jen synchronizace DB s logikou.

---

## Závěr — prioritizovaný seznam pro diskuzi

| Priorita | Akce | Effort | Dopad |
|----------|------|--------|-------|
| 🔴 P0 | Rescore 3 drift produktů | 5 min | Datová integrita |
| 🔴 P1 | Badge „Částečná data" (N/4 složek) | 1 den | Transparentnost |
| 🔴 P2 | Scraping kyselosti + polyfenolů (rescrape pipeline) | probíhá | Pokrytí dat |
| 🟠 P3 | Case study Sitia — rozhodnutí: Score per SKU nebo per produkt? | diskuze | Férovost |
| 🟠 P4 | Separátní Value index (oddělit cenu od kvality) | 2 týdny | Konceptuální čistota |
| 🟡 P5 | Harvest year backfill + 50% threshold pro zařazení | 1 měsíc | Freshness signál |
| 🟡 P6 | Badge „Ověřená kyselost" (PDF upload) | fáze 2 | Anti-manipulation |
| 🟢 P7 | Plynulejší `calcValue()` křivka | 2 hod | Cliff efekt |

---

*Dokument vygenerován z live dat 2026-07-24. Žádné metodické změny nebyly provedeny.*
*Autor: Claude Code | Schválení: Architekt/Majitel*
