# OLIVATOR — Articles Audit
**Datum:** 2026-05-12 | **Audit only — žádné změny**

---

## 1. INVENTARIZACE

| Metrika | Hodnota |
|---|---|
| **Celkem článků** | 23 |
| **Status** | 23× aktivní (0 draft, 0 inactive) |
| **Datum vzniku** | Všechny 2026-05-07 (batch generace) |
| **AI-generated** | 19 (`source='ai_generated'`) |
| **Static legacy** | 4 (`source='static_legacy'`) |
| **Author** | Jeden autor (70fbf5dd) — AI agent |

### Per kategorie
| Kategorie | Počet |
|---|---|
| vzdelavani | 11 |
| pruvodce | 6 |
| srovnani | 5 |
| zebricek | 1 |

### Všechny slugy
```
[srovnani]    olivovy-olej-do-200-kc
[srovnani]    premium-olivovy-olej-ma-smysl
[srovnani]    olivovy-olej-do-salatu-vs-na-vareni
[srovnani]    darkove-baleni-olivovy-olej
[srovnani]    recky-vs-italsky
[pruvodce]    kde-koupit-olivovy-olej-cr
[pruvodce]    falesny-olivovy-olej-jak-rozeznat
[pruvodce]    degustace-olivoveho-oleje-doma
[pruvodce]    jak-skladovat-olivovy-olej-doma
[pruvodce]    otevrena-lahev-jak-rychle-spotrebovat
[pruvodce]    jak-vybrat-olivovy-olej
[vzdelavani]  dop-pgi-bio-certifikace
[vzdelavani]  olivovy-olej-na-smazeni-bod-zakoureni
[vzdelavani]  jak-cist-etiketu-olivoveho-oleje
[vzdelavani]  polyfenoly-kolik-je-dost
[vzdelavani]  extra-panensky-vs-panensky-vs-rafinovany
[vzdelavani]  olivovy-olej-a-zdravi-veda-2026
[vzdelavani]  sklizen-oliv-early-vs-late-harvest
[vzdelavani]  filtrovany-vs-nefiltrovany-olivovy-olej
[vzdelavani]  stredomorska-strava-olivovy-olej
[vzdelavani]  olivovy-olej-pro-deti
[vzdelavani]  polyfenoly-proc-na-nich-zalezi
[zebricek]    nejlepsi-olivovy-olej-2026
```

---

## 2. KVALITA OBSAHU

### Délka obsahu (body_markdown)
| Metrika | Hodnota |
|---|---|
| Průměr | **7 829 znaků** (dobrý — odpovídá 1 500–2 000 slovům) |
| Minimum | 1 334 znaků (`nejlepsi-olivovy-olej-2026`) |
| Maximum | 11 345 znaků (`sklizen-oliv-early-vs-late-harvest`) |
| Příliš krátké (<1 000 ch) | 0 |
| Střední (1 000–3 000 ch) | 4 |
| Long-form (>3 000 ch) | **19** |

→ **Délka OK.** 19 z 23 článků jsou long-form (5+ min čtení).

### AI fráze detekce
- Detekovaných článků s AI frázemi: **1 z 23** (4 %)
- Výsledek: **Velmi dobrý** — obsah nepůsobí roboticky.

### SEO metadata
| Metrika | Počet |
|---|---|
| Chybějící meta_description | **4** |
| Krátká meta_description (<120 ch) | **2** |
| Příliš dlouhá (>160 ch) | 0 |
| Chybějící hero image | 0 |

→ **6 článků má problém s meta_description** — nutno doplnit.

---

## 3. VZORKY OBSAHU

### Nejkratší: `nejlepsi-olivovy-olej-2026` [1 334 ch] — ⚠️ KRITICKÝ BUG
- H2: ✓ (3), H3: ✓ (4), seznam: ✓
- Interní /olej/ link: ✗ | Ext. zdroje: ✗
- Meta description: **CHYBÍ**
- **KRITICKÁ CHYBA: Obsahuje nevyplněné template proměnné:**
  ```
  {{date.year}} — mělo být aktuální rok
  {{products.count}} — mělo být číslo produktů v DB
  ```
  Článek je živý na webu (`status=active`) a zobrazuje tuto hrubou chybu!

### Střední: `kde-koupit-olivovy-olej-cr` [8 607 ch]
- H2: ✓ (8), H3: ✗, seznam: ✓
- Interní /olej/ link: ✗ | Ext. zdroje: ✗
- Meta (136 ch): "Hledáš kvalitní olivový olej? Seznami se se všemi nákupními kanály..."
- Hodnocení: Dobrý průvodce s přehlednou strukturou. Chybí ale konkrétní product linky na testované oleje.

### Nejdelší: `sklizen-oliv-early-vs-late-harvest` [11 345 ch]
- H2: ✓ (7), H3: ✗, seznam: ✓
- Interní /olej/ link: ✗ | Ext. zdroje: ✗
- Meta (127 ch): "Sklizeň olivového oleje se liší měsícem a dramaticky ovlivňuje chuť..."
- Hodnocení: Nejkvalitnější článek v kolekci. Konkrétní data (ceny, procenta polyfenolů), příklady. Chybí affiliate linky na early harvest oleje.

---

## 4. SEO INDEXING STATUS

### Sitemap
```
curl https://olivator.cz/sitemap.xml | grep -c "/pruvodce/" → 4
```
**KRITICKÝ PROBLÉM: Sitemap obsahuje jen 4 články z 23 aktivních.**

Příčina: `app/sitemap.ts` generuje `/pruvodce/` URLs přes `getArticles()` z `lib/static-content.ts` — statický seznam. DB články tam nejsou.

Dodatečný problém: `generateStaticParams()` v `app/pruvodce/[slug]/page.tsx` taky používá `getArticles()` → 19 DB článků není pre-buildováno (ISR při první návštěvě).

### Robots.txt
```
User-Agent: *
Allow: /
Disallow: /admin, /api/, /go/
```
→ Články nejsou blokované. ✓

### URL struktura
Všechny DB články jsou na `/pruvodce/[slug]` — konzistentní. ✓

---

## 5. INTERNÍ LINKING

- Články s `/olej/[slug]` produktovým linkem: **0 z 23**
- Články s externími autoritativními zdroji: **1 z 23**

→ **KRITICKÁ mezera.** Žádný článek neodkazuje na konkrétní produkt v katalogu.
Každý článek by měl mít 2–4 affiliate linky na relevantní oleje — to je primární příjmový kanál.

---

## 6. GENERATION SOURCE

Sloupec `generation_source` v DB neexistuje. Použit sloupec `source`:

| Source | Počet |
|---|---|
| `ai_generated` | 19 |
| `static_legacy` | 4 |

→ Skript `scripts/generate-articles.ts` existuje — používá Content Agent.
→ Žádné info o quality review před publikací (batch publish stejný den).

---

## 7. ADMIN UI STATE

- **URL:** `/admin/articles`
- **Zobrazeno:** 23 článků, všechny aktivní
- **Funkce:** Upravit článek → (inline editor), Náhled (link na live URL)
- **Tlačítko "+ Nový článek":** Existuje ✓
- **"Generate article" tlačítko:** ✗ neexistuje — generace jen přes skripty
- **Batch akce:** ✗ žádné (nešlo hromadně deaktivovat/smazat)
- **Filtry:** ✗ žádné filtry (status, kategorie)
- **Celkový stav:** Čistý, bez duplicit nebo draftů

---

## 8. POKRYTÍ TÉMAT

### Pokrytá témata ✓
| Téma | Článek |
|---|---|
| Jak vybrat olivový olej | `jak-vybrat-olivovy-olej` |
| DOP / PDO / PGI / BIO certifikace | `dop-pgi-bio-certifikace` |
| Polyfenoly | `polyfenoly-kolik-je-dost` + `polyfenoly-proc-na-nich-zalezi` |
| IT vs GR vs ES srovnání | `recky-vs-italsky` |
| Vaření vs studené použití | `olivovy-olej-do-salatu-vs-na-vareni` |
| Skladování | `jak-skladovat-olivovy-olej-doma` |
| Fritování / bod zakouření | `olivovy-olej-na-smazeni-bod-zakoureni` |
| Early vs late harvest | `sklizen-oliv-early-vs-late-harvest` |
| Zdraví a věda | `olivovy-olej-a-zdravi-veda-2026` |
| Olej pro děti | `olivovy-olej-pro-deti` |
| Falešný olej jak rozeznat | `falesny-olivovy-olej-jak-rozeznat` |
| Jak číst etiketu | `jak-cist-etiketu-olivoveho-oleje` |
| Filtrovaný vs nefiltrovaný | `filtrovany-vs-nefiltrovany-olivovy-olej` |
| Středomořská strava | `stredomorska-strava-olivovy-olej` |

### Chybějící témata ✗ (prioritizováno)
| Priorita | Téma | Poznámka |
|---|---|---|
| 🔴 HIGH | **Oleokantal** | Klíčová látka, protizánětlivé účinky, "tekutý ibuprofen" — core EVOO téma |
| 🔴 HIGH | **Kyselost — dedikovaný článek** | Máme vysvětlení ve Score, ale ne standalone SEO článek |
| 🟡 MED | **Olivový olej pro pleť a vlasy** | Populární vyhledávací dotaz, nízká konkurence |
| 🟡 MED | **Olivový olej a kardiovaskulární zdraví** | Vědecky podložené, SEO potenciál |
| 🟡 MED | **Sklizňová sezóna — kalendář** (kdy kupovat) | `early-harvest` existuje, ale ne "kdy je nejlepší čas nakoupit v Čechách" |
| 🟡 MED | **Organický vs konvenční** (nad rámec BIO certifikace) | |
| 🟢 LOW | **Olivový olej do těstovin** (recept-driven průvodce) | |
| 🟢 LOW | **Dárkový průvodce olivovými oleji** | Existuje `darkove-baleni`, možná stačí |

---

## 9. DOPORUČENÍ — CO S EXISTUJÍCÍMI ČLÁNKY

### 🔴 OKAMŽITĚ OPRAVIT (před dalším deployem)

**1. `nejlepsi-olivovy-olej-2026` — unfilled template variables**
- Obsahuje `{{date.year}}` a `{{products.count}}` živě na produkci
- Akce: Opravit ručně nebo regenerovat

**2. Sitemap — přidat DB články**
- `app/sitemap.ts` přepsat aby načítala z DB místo static-content
- Dopad: 19 článků není indexováno Googlem → 0 organický traffic

**3. Interní product linky — VŠECHNY články**
- 0/23 odkazuje na konkrétní olej
- Akce: Content Agent pass — přidat 2–4 affiliate linky per článek
- Potenciál: hlavní revenue kanál

### 🟡 DOPLNIT (do 2 týdnů)

**4. Meta descriptions — 6 článků**
- 4 chybějící + 2 příliš krátké
- Akce: Batch regenerace metadat (quick + levné)

**5. `generateStaticParams()` — přidat DB články**
- Aktuálně 19 DB článků se builduje on-demand (ISR)
- Akce: Přidat DB query do `generateStaticParams()` (Next.js fetch + `revalidate`)

**6. Autoritativní zdroje — alespoň 50 % článků**
- 1/23 má ext. zdroje (IOC, EFSA, vědecké studie)
- Akce: Content Agent pass při regeneraci

### 🟢 NECHAT (obsah je OK)

- Délka: 83 % je long-form (>3 000 ch) ✓
- AI fráze: jen 4 % ✓  
- Kategorizace: konzistentní ✓
- Hero images: všechny mají ✓
- Struktura H2/H3: většina má ✓

### 🔵 NOVÉ ČLÁNKY (prioritizovaně)

1. Oleokantal — co to je a proč záleží (HIGH SEO)
2. Kyselost olivového oleje — průvodce
3. Olivový olej pro pleť (nízká konkurence, vlak hledaný dotaz)

---

## SUMMARY

| Oblast | Stav | Akce |
|---|---|---|
| Počet článků | 23 active ✓ | Chybí 3–5 klíčových témat |
| Délka obsahu | avg 7 829 ch ✓ | — |
| AI kvalita | 96 % bez AI frází ✓ | — |
| **Template bug** | `{{date.year}}` live | **OPRAVIT IHNED** |
| **Sitemap** | 4/23 indexováno | **OPRAVIT — bez toho 0 traffic** |
| **Interní linky** | 0/23 ✗ | **KRITICKÉ pro revenue** |
| Meta descriptions | 6/23 chybí/krátké | Batch opravit |
| generateStaticParams | jen 4 statické | Přidat DB query |
| Admin UI | Čistý, funkční ✓ | Přidat batch akce a filtry |

**Celkové hodnocení:** Obsah je kvalitní, ale technická infrastruktura (sitemap, static params, interní linky) brání tomu, aby Google články viděl a aby články vydělávaly.

---
*Audit: 2026-05-12 | Bez změn — pouze diagnostika*
