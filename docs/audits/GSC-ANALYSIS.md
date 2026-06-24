# GSC-ANALYSIS.md — Google Search Console, 28denní okno

*Vygenerováno: 2026-06-23 | Data: 2026-05-26 až 2026-06-23 (sc-domain:olivator.cz) | Žádné změny kódu/obsahu — jen analýza a doporučení.*

Pozn. k metodice: souhrnná čísla počítána z `date`-dimenze (28 řádků, bez ořezu) — ne ze top-30 queries, kde long tail desítek nízko-objemových dotazů celkový součet podhoduje zhruba 6×.

---

## 1. SUMMARY (28 dní)

| Metrika | Hodnota |
|---|---|
| **Celkem kliků** | **155** |
| **Celkem zobrazení** | **5 929** |
| **Průměrný CTR** | **2,61 %** |
| **Průměrná pozice** (váženo zobrazeními) | **9,38** |

Pro srovnání: device breakdown (mobile+desktop+tablet = 98+56+1 = 155) a daily breakdown se přesně shodují — čísla jsou interně konzistentní. Country breakdown dává nižší total (5 483 zobrazení) — to je očekávaný Google threshold/anonymizační efekt u nízko-objemových zemí, ne chyba v datech.

---

## 2. KEY FINDINGS

1. **Web má reálnou, byť malou, organickou viditelnost — a je zdravě indexovaný.** Všech 8 článků Vlny 2 (publikováno 31.5.–3.6.) má zobrazení v GSC do týdne od publikace. Indexační pipeline funguje.

2. **Nejviditelnější stránka celého webu prodává nejhůř.** `/pruvodce/olivovy-olej-s-citronem-po-rano` má 364 zobrazení (nejvíc z celého webu) ale jen 4 kliky (1,1 % CTR) — to je hluboko pod tím, co pozice ~10,7 typicky dává (běžně 3–5 %).

3. **Jeden Vlna-1 článek má nulová zobrazení po 7+ týdnech.** `polyfenoly-proc-na-nich-zalezi` — 0 impressions, 0 clicks za celých 28 dní. Tohle je přesně ten článek, který byl podle `project_learnings` (L-007) zapleten v title-prefix kanibalizaci se svým sourozencem `polyfenoly-kolik-je-dost` (ten naopak má aspoň 15 zobrazení). Možné, že Google ho po konsolidaci v podstatě vyřadil z indexu.

4. **Mobil táhne 63 % kliků (98/155), desktop 36 % (56/155).** Mobilní UX kvalita má přímý dopad na většinu provozu — relevantní vzhledem k dnešní opravě Olíka v hero sekci (i když data v tomto okně to ještě nezachycují, fix proběhl až dnes).

5. **Nečekaný signál: lidi hledají "test olivových olejů 2026"** (pozice 5,2, 2 kliky) — to nebylo cílené klíčové slovo z CLAUDE.md prioritní listiny, ale validuje to hodnotu comparator/žebříček formátu, který už web má.

---

## 3. TOP 10 AKČNÍ ÚKOLY

Seřazeno podle ROI (dopad/práce), quick winy první.

| # | Akce | ROI | Proč |
|---|---|---|---|
| 1 | **Přepsat title+meta description pro `/pruvodce/olivovy-olej-s-citronem-po-rano`** | **HIGH** | 364 zobrazení/28d (nejvíc na webu), jen 1,1 % CTR na pozici 10,7. I posun na 3 % CTR = ~11 klik/měs navíc, bez psaní nového obsahu — čistě title/meta práce. |
| 2 | **Přepsat title+meta description pro `/pruvodce/olivovy-olej-z-pokrutin`** | **HIGH** | 247 zobrazení, 0,8 % CTR — nejhorší CTR/objem poměr v datasetu. Pozice 9,8 (hranice první strany) — meta text pravděpodobně nesedí na search intent. |
| 3 | **Prověřit indexaci `polyfenoly-proc-na-nich-zalezi` přes URL Inspection v GSC** | **HIGH** | 0 impressions za 28 dní po 7+ týdnech od publikace — možný důsledek L-007 kanibalizace se sesterským článkem. Pokud Google stránku vyřadil/nekanonikalizoval pryč, je potřeba rozhodnutí (re-optimalizovat, sloučit, nebo necílit). |
| 4 | **Striking distance: "kde koupit kvalitní olivový olej"** (pozice 11,6, 46 zobrazení, 1 klik) | MEDIUM | Těsně mimo první stránku, solidní objem. Posílit interní linky + ověřit, že cílová stránka (`/pruvodce/kde-koupit-olivovy-olej-cr` — už má 268 zobrazení/6 kliků na pozici 9,9) je nejrelevantnější kandidát. |
| 5 | **Brand-adjacent low-CTR: "aristeon" (poz. 8,1, 0 kliků, 23 zobr.) + "aristeon olivový olej" (poz. 6,8, 1 klik, 41 zobr.)** | MEDIUM | ~64 zobrazení dohromady téměř bez konverze na klik navzdory dobré pozici — ověřit, jestli `/znacka/aristeon` existuje a je optimalizovaná na přesně tyto dotazy. |
| 6 | **`/znacka/evoilino` — meta description review** | MEDIUM | Pozice 7,9 (těsně před první stránkou top 10), 170 zobrazení, jen 1,18 % CTR. Solidní pozice si zaslouží lepší prodejní text ve snippetu. |
| 7 | **`/pruvodce/kde-koupit-olivovy-olej-cr` — meta description review** | MEDIUM | 268 zobrazení (2. nejvíc na webu), 2,24 % CTR na pozici 9,9 — podobný vzor jako #1/#2, jen o stupeň méně urgentní. |
| 8 | **Zvážit dedikovaný "test/srovnání" obsahový úhel** | LOW-MEDIUM | "test olivových olejů 2026" (poz. 5,2) je necílený organický nález — možnost posílit existující comparator/žebříček interním linkem nebo novým úhlem na již silné téma. |
| 9 | **Vlna 2 články s 0 kliky ale slušnými zobrazeními — NESÁHAT, jen sledovat** (`rafinovany-olivovy-olej` 161 zobr., `olivovy-olej-vs-slunecnicovy` 75, `domaci-olivovy-olej` 65, `kalamata-pdo-olivovy-olej` 63) | LOW | Publikováno teprve 20 dní zpátky — 4–12 týdnů na vyzrání rankingu je normální. Optimalizace teď by byla hádání bez dostatku dat. Re-check za 2–4 týdny. |
| 10 | **Country mix (Řecko 213 zobr., Slovensko 191 zobr.) — informativní, ne akční** | LOW | Web je čistě český, řecká zobrazení jsou nejspíš shody na názvy značek (Aristeon, Vafis, Corinto). Nezakládat na tom rozhodnutí o expanzi — jen vědět, že to tak je. |

---

## 4. APPENDIX — raw data

### 4.1 Top 30 queries (28 dní, dle kliků)

| Query | Klики | Zobr. | CTR | Pozice |
|---|---|---|---|---|
| evolia platinum 2000+ | 3 | 6 | 50,0 % | 6,3 |
| corinto | 2 | 5 | 40,0 % | 4,0 |
| extra panenský olivový olej 5l | 2 | 2 | 100,0 % | 19,5 |
| motakis kréta extra panenský olivový olej | 2 | 18 | 11,1 % | 5,1 |
| test olivových olejů 2026 | 2 | 6 | 33,3 % | 5,2 |
| vafis olive oil | 2 | 7 | 28,6 % | 3,1 |
| aristeon olivový olej | 1 | 41 | 2,4 % | 6,8 |
| chiavalon mlado | 1 | 14 | 7,1 % | 4,8 |
| corinto olive oil | 1 | 1 | 100,0 % | 15,0 |
| domaci olivovy olej | 1 | 5 | 20,0 % | 8,6 |
| evoilino olej | 1 | 22 | 4,5 % | 9,8 |
| ganga lupo | 1 | 4 | 25,0 % | 6,8 |
| kde koupit kvalitní olivový olej | 1 | 46 | 2,2 % | 11,6 |
| olivator | 1 | 1 | 100,0 % | 2,0 |
| olivovník chalkidiki | 1 | 10 | 10,0 % | 11,2 |
| olivový olej ze sardinie | 1 | 5 | 20,0 % | 7,4 |
| sitia premium gold olive oil | 1 | 3 | 33,3 % | 12,3 |
| aristeon | 0 | 23 | 0 % | 8,1 |
| agia triada olej | 0 | 6 | 0 % | 12,3 |
| arbequina | 0 | 2 | 0 % | 28,0 |
| arbequina vs picual | 0 | 1 | 0 % | 10,0 |
| *(+9 dalších s 0 kliky, 1–2 zobrazení)* | 0 | — | — | — |

### 4.2 Top 30 pages (28 dní, dle kliků)

| Stránka | Kliky | Zobr. | CTR | Pozice |
|---|---|---|---|---|
| /znacka/corinto | 10 | 68 | 14,7 % | 5,9 |
| /olej/motakis-kreta-extra-panensky-olivovy-olej-5-l | 7 | 114 | 6,1 % | 7,3 |
| /pruvodce/kde-koupit-olivovy-olej-cr | 6 | 268 | 2,2 % | 9,9 |
| /pruvodce/olivovy-olej-na-plet-a-vlasy | 6 | 211 | 2,8 % | 11,3 |
| /olej/evolia-platinum-2000-polyfenolu... | 4 | 25 | 16,0 % | 6,5 |
| /pruvodce/olivovy-olej-s-citronem-po-rano | 4 | 379 | 1,1 % | 10,8 |
| /zebricek/nejlepsi-italsky-olej | 4 | 87 | 4,6 % | 8,3 |
| /znacka/vafis | 4 | 71 | 5,6 % | 8,8 |
| /nejprodavanejsi | 3 | 31 | 9,7 % | 12,4 |
| /olej/bio-planete-olej-olivovy-extra-panensky-bio-500-ml | 3 | 90 | 3,3 % | 7,2 |
| /pruvodce/nejlepsi-olivovy-olej-2026 | 3 | 26 | 11,5 % | 7,5 |
| /znacka/neotis | 3 | 37 | 8,1 % | 8,7 |
| /pruvodce/olivovy-olej-z-pokrutin | 2 | 247 | 0,8 % | 9,8 |
| /znacka/evoilino | 2 | 170 | 1,2 % | 7,9 |
| /znacka/sitia-kreta | 2 | 93 | 2,2 % | 11,0 |
| /olej/theikos-kreta-extra-panensky-olivovy-olej-0-3-1-l | 2 | 173 | 1,2 % | 13,2 |
| /olej/petromilos-zakynthos-extra-panensky-olivovy-olej-0-3-500-ml | 2 | 118 | 1,7 % | 8,1 |
| /olej/sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l | 2 | 91 | 2,2 % | 10,4 |
| /pruvodce/jak-vybrat-olivovy-olej | 2 | 75 | 2,7 % | 14,0 |
| /pruvodce/filtrovany-vs-nefiltrovany-olivovy-olej | 2 | 49 | 4,1 % | 10,7 |
| /recept/tapenade | 2 | 34 | 5,9 % | 5,2 |
| /olej/extra-panensky-olivovy-olej-250-ml-p-d-o-kolymbari | 2 | 31 | 6,5 % | 16,8 |
| /olej/olivovy-olej-z-pokrutin-liofyto-5-l-pet | 2 | 27 | 7,4 % | 10,0 |
| /olej/corinto-pelopones-bio-extra-panensky-olivovy-olej-manaki-0-4-500-ml | 2 | 21 | 9,5 % | 5,7 |
| /olej/iberitos-olivovy-olej-10-ml | 2 | 10 | 20,0 % | 4,3 |
| *(+5 dalších s 1 klikem)* | — | — | — | — |

### 4.3 Daily trend (28 dní)

| Datum | Kliky | Zobr. |
|---|---|---|
| 05-26 | 5 | 216 |
| 05-27 | 1 | 126 |
| 05-28 | 8 | 148 |
| 05-29 | 0 | 111 |
| 05-30 | 5 | 172 |
| 05-31 | 7 | 172 |
| 06-01 | 5 | 239 |
| 06-02 | 6 | 209 |
| 06-03 | 8 | 209 |
| 06-04 | 5 | 233 |
| 06-05 | 3 | 216 |
| 06-06 | 3 | 179 |
| 06-07 | 5 | 205 |
| 06-08 | 5 | 258 |
| 06-09 | 11 | 295 |
| 06-10 | 6 | 256 |
| 06-11 | 4 | 212 |
| 06-12 | 5 | 199 |
| 06-13 | 8 | 223 |
| 06-14 | 9 | 228 |
| 06-15 | 8 | 240 |
| 06-16 | 9 | 211 |
| 06-17 | 8 | 228 |
| 06-18 | 1 | 224 |
| 06-19 | 5 | 177 |
| 06-20 | 3 | 221 |
| 06-21 | 10 | 292 |
| 06-22 | 2 | 230 |

Vzor: zobrazení relativně stabilní (~150–300/den), kliky kolísají 0–11/den bez jasného trendu nahoru/dolů v rámci 28 dní — na pozorování delšího trendu je potřeba víc než 4 týdny dat.

### 4.4 Country breakdown (top 10)

| Země | Kliky | Zobr. | CTR | Pozice |
|---|---|---|---|---|
| Česko (cze) | 135 | 4 763 | 2,8 % | 9,9 |
| Řecko (grc) | 7 | 213 | 3,3 % | 6,7 |
| Itálie (ita) | 4 | 89 | 4,5 % | 7,0 |
| Chorvatsko (hrv) | 2 | 47 | 4,3 % | 7,1 |
| Slovensko (svk) | 2 | 191 | 1,0 % | 8,4 |
| Německo (deu) | 1 | 65 | 1,5 % | 6,4 |
| Španělsko (esp) | 1 | 30 | 3,3 % | 6,7 |
| UK (gbr) | 1 | 18 | 5,6 % | 11,6 |
| Rusko (rus) | 1 | 10 | 10,0 % | 6,7 |
| Tunisko (tun) | 1 | 57 | 1,8 % | 6,8 |

### 4.5 Device breakdown

| Zařízení | Kliky | Zobr. | CTR | Pozice |
|---|---|---|---|---|
| Mobil | 98 | 3 099 | 3,16 % | 7,6 |
| Desktop | 56 | 2 766 | 2,02 % | 11,5 |
| Tablet | 1 | 64 | 1,56 % | 7,8 |

### 4.6 Vlna 1/2 article status (přesná page-level kontrola)

| Článek | Publikováno | Kliky | Zobr. | CTR | Pozice |
|---|---|---|---|---|---|
| olivovy-olej-na-plet-a-vlasy | 2026-06-01 | 6 | 202 | 3,0 % | 11,3 |
| olivovy-olej-s-citronem-po-rano | 2026-06-01 | 4 | 364 | 1,1 % | 10,7 |
| je-olivovy-olej-zdravy | 2026-05-31 | 1 | 86 | 1,2 % | 6,8 |
| olivovy-olej-ve-spreji | 2026-06-02 | 1 | 65 | 1,5 % | 4,6 |
| rafinovany-olivovy-olej | 2026-06-02 | 0 | 161 | 0 % | 11,3 |
| domaci-olivovy-olej | 2026-06-03 | 0 | 65 | 0 % | 6,4 |
| olivovy-olej-vs-slunecnicovy | 2026-06-03 | 0 | 75 | 0 % | 7,3 |
| kalamata-pdo-olivovy-olej | 2026-06-03 | 0 | 63 | 0 % | 11,3 |
| extra-panensky-vs-panensky-vs-rafinovany (Vlna 1) | 2026-05-07 | 1 | 67 | 1,5 % | 10,7 |
| polyfenoly-kolik-je-dost (Vlna 1) | 2026-05-07 | 0 | 15 | 0 % | 10,6 |
| polyfenoly-proc-na-nich-zalezi (Vlna 1) | 2026-05-03 | **0** | **0** | — | — |
| olivovy-olej-z-pokrutin (starší) | — | 2 | 241 | 0,8 % | 9,8 |

---

*Zdrojová data: `scripts/gsc-snapshot.ts` (28d summary/queries/pages/daily/country/device) + `scripts/gsc-check-pages.ts` (per-URL kontrola Vlny 1/2). Raw JSON snapshot: `/tmp/gsc-snapshot.json` (lokální, ne v repu).*
