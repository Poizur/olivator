# Pravdivostní audit obsahu — červenec 2026

**Datum auditu:** 2026-07-23  
**Rozsah:** 33 aktivních článků, 16 žebříčků, klíčové statické stránky, PDF průvodce  
**Metodologie:** Live DB dotazy + grep article bodies + čtení klíčových pasáží  
**Status:** Katalog nálezů. Žádné opravy nebyly provedeny.

---

## Závažnost

| Symbol | Úroveň | Popis |
|--------|---------|-------|
| 🔴 KRITICKÁ | Opravit co nejdříve | Živá stránka s falešnými/zastaralými daty viditelná v Google |
| 🟠 VYSOKÁ | Opravit tento týden | Číslo je prokazatelně špatně, uživatel to může ověřit |
| 🟡 STŘEDNÍ | Opravit do měsíce | Šedá zóna — diskutabilní, ale je potřeba rozhodnutí |
| 🟢 OK | Validováno | Claim ověřen, žádná akce |

---

## Live DB baseline (2026-07-23, 14:00)

| Metrika | Počet |
|---------|-------|
| Active products | **477** |
| Active retailers | **33** |
| Products with Score | 279 |
| Products with polyphenols | 129 |
| Products with acidity | 280 |
| In-stock offers | 489 |
| Affiliate offer URLs | 129 |
| Active articles | 33 |
| Active rankings | 16 |
| Active brands | 99 |
| Origin countries | 8 (CZ, ES, EU, GR, HR, IT, PT, TN) |

---

## VRSTVA 1 — Tvrdá čísla vs. DB

### Kritické

| ID | Claim | Kde | Skutečnost | Typ problému |
|----|-------|-----|------------|--------------|
| **N-01** | 3 phantom produkty s vymyšlenými Score | `premium-olivovy-olej-ma-smysl` | Produkty neexistují v DB | Fake data |
| **N-02** | `"ze 18 prodejců"` | `app/srovnavac/page.tsx` meta description | 33 active retailers | Zastaralé číslo |
| **N-03** | `"u 18 prodejců"` | `app/pruvodce/[slug]/page.tsx` layout text | 33 active retailers | Zastaralé číslo |

#### N-01 detail — `premium-olivovy-olej-ma-smysl`

Článek je **STATUS=ACTIVE a indexován Googlem**. Obsahuje sekci s explicitní placeholder poznámkou:

```
## Tři prémiové volby z Olivator katalogu

*(Poznámka: konkrétní odkazy/scores vložit z reálné DB — níže ilustrativní příklady)*

### 1. **Sitia Kréta 0.3 Extra Virgin** (Score 84)
- Cena: ~580 Kč/L, polyfenoly 520 mg/kg, DOP Sitia, BIO

### 2. **Coratina Puglia DOP Single Estate** (Score 87)
- Cena: ~720 Kč/L, polyfenoly 680 mg/kg, DOP Terre di Bari

### 3. **Manaki Messinia Premium** (Score 89)
- (data not shown in excerpt but present)
```

**DB check:**
- `sitia-kreta-03-extra-virgin` → ❌ NOT IN DB  
- `coratina-puglia-dop-single-estate` → ❌ NOT IN DB  
- `manaki-messinia-premium` → ❌ NOT IN DB  

Článek zároveň **správně** odkazuje na 4 reálné produkty ve spodní sekci:  
picual-5l (score=95), callejas-coupage-5l (score=94), picual-2l (score=91), arbequina-5l (score=88) ✓

**Riziko:** Uživatel přijde z Google, přečte sekci s illustrativními produkty jako by byly reálné doporučení, score a ceny jsou smyšlené. Identická situace jako incident z května 2026 (nejlepsi-olivovy-olej-2026 fake products).

#### N-02 a N-03 detail — `"18 prodejců"` v kódu

```tsx
// app/srovnavac/page.tsx — meta description:
"Porovnejte 450+ olivových olejů. Olivator Score hodnotí kyselost, polyfenoly a certifikace. 
Aktuální ceny ze 18 prodejců..."

// app/pruvodce/[slug]/page.tsx — layout text (viditelný na každém článku):
"...olejů v ČR. Sledujeme reálné ceny u 18 prodejců..."
```

DB real: 33 active retailers. Číslo "18" pochází z CLAUDE.md popisu (historická hodnota před expanzí retailerů). Kód nepoužívá dynamické `retailerCount` jako metodika/page.tsx.

---

### Vysoké

| ID | Claim | Kde | Skutečnost |
|----|-------|-----|------------|
| **N-04** | `"hodnotíme 439 olejů"` | `jak-vybrat-olivovy-olej` body | 477 active |
| **N-05** | `"prošli jsme celkem 439 produktů"` | `nejlepsi-olivovy-olej-2026` body (2×) | 477 active |

Rozdíl ~8%. Čísla pravděpodobně vznikla při generaci článků (tehdy bylo ~439 produktů). Nezakrývá intent, ale uživatel s databázovým přístupem to může prověřit.

---

### Validováno ✓

| ID | Claim | Kde | Ověřeno |
|----|-------|-----|---------|
| N-06 | `"450+ olivových olejů"` | srovnavac meta | 477 — OK |
| N-07 | `"přes 400 olejů"` | nejlepsi-2026 meta | 477 — OK |
| N-08 | `"30+ zemí"` v DOP článku | `dop-pgi-bio-certifikace` | Kontext NYIOOC soutěže (globální) — OK |
| N-09 | Scores v rankings meta | nejlepsi-{bio/italsky/recky}-olej | Všechny 3 ověřeny vs DB — OK |
| N-10 | Ceny v rankings meta | nejlepsi-{premiovy/italsky/bio}-olej | Shodují se s live offers (0 Kč diff) — OK |
| N-11 | Score 95 na obálce PDF | pruvodce-olivovy-olej.pdf | Picual 5L BIB — DB score=95 — OK |
| N-12 | `"33 prodejců"` | `jak-vybrat-olivovy-olej` body | 33 — OK |
| N-13 | Score 94, Callejas Coupage | `jak-vybrat-olivovy-olej` | DB score=94 — OK |
| N-14 | Score 86, Liophos BIO | `jak-vybrat-olivovy-olej` | DB score=86 — OK |
| N-15 | Score 86, BIO Elixír 459Kč | `nejlepsi-bio-olivovy-olej` meta | DB score=86, live 459Kč — OK |
| N-16 | Score 83, Intini 639Kč | `nejlepsi-italsky-olej` meta | DB score=83, live 639Kč — OK |

---

## VRSTVA 2 — Zdravotní a právní tvrzení

### Nízká (diskutabilní zjednodušení)

| ID | Claim | Kde | Hodnocení |
|----|-------|-----|-----------|
| **H-01** | `"50–800 mg/kg polyfenolů běžně"` | `olivovy-olej-vs-slunecnicovy` | 800 mg/kg není "běžné" — je to exceptional early harvest. Medián EVOO v DB je ~320 mg/kg. "Běžně" přehání horní hranici. |
| **H-02** | `"rozdíl 15–20×"` SPF | `olivovy-olej-na-plet-a-vlasy` | SPF 2÷30=15×, ale SPF 8÷30=3,75×. Článek cherry-pickuje nejhorší případ (SPF 2) bez zmínky, že horní odhad (SPF 8) dává rozdíl 3,75×. |
| **H-03** | `"polyfenoly se rozloží při 180+ °C"` | `olivovy-olej-z-pokrutin` | Správně: degradace začíná kolem 180°C, je postupná, ne úplná. "Rozloží" implikuje kompletní destrukci — přesnější by bylo "degradují". |

### Validováno ✓

| ID | Claim | Kde | Ověřeno |
|----|-------|-----|---------|
| H-04 | EFSA 432/2012, 250 mg/kg threshold | `je-olivovy-olej-zdravy` | Správně: "5 mg hydroxytyrosolu na 20 g oleje ≈ 250 mg/kg" — přesné znění ✓ |
| H-05 | Harvard studie demence, "28 % nižší riziko" | `je-olivovy-olej-zdravy` | Studie NEJM Evidence 2023 (Tessier et al.) — číslo správné ✓ |
| H-06 | `"SPF cca 2–8"` pro olivový olej | `olivovy-olej-na-plet-a-vlasy` | Publikované studie (Kaur & Saraf 2010) uvádějí SPF 2–8 ✓ |
| H-07 | `"olivový olej NENÍ sunscreen"` framing | `olivovy-olej-na-plet-a-vlasy` | Dermatologicky správné, formulace je poctivá ✓ |
| H-08 | Sitia "400–600 mg/kg" polyfenolů | `olivovy-olej-na-smazeni` | DB: SITIA 5L má 646 mg/kg — "400–600" je konzervativní odhad ✓ |
| H-09 | "polyfenoly jsou nulové" u pomace | `olivovy-olej-z-pokrutin` | Technicky přesné pro rafinovaný pomace ✓ |

---

## VRSTVA 3 — Sliby o nás samých

### Střední

| ID | Claim | Kde | Hodnocení |
|----|-------|-----|-----------|
| **S-01** | `"Žádná reklama"` trust signal | Nav, footer, titulní stránka | Affiliate linky jsou obchodní vztah — uživatel "klikne a kupuje" a Olivátor dostane provizi. Technicky to není display reklama, ale "žádná reklama" je zavádějící vůči lidem, kteří neznají affiliate model. |
| **S-02** | Chybí affiliate disclaimer v článcích | Všechny 33 článků | 0 z 33 aktivních článků obsahuje informaci o affiliate vztahu. Czech Consumer Protection Act (§ 5a ZOS) i GDPR vyžadují disclosure komerčního vztahu u obchodního sdělení. |

**Poznámka k S-01/S-02:** Toto není okamžitý právní risk — affiliate bez disclaimeru je běžné v ČR a dozorové orgány (ČOI) se zaměřují na flagrantní případy. Ale při growth fázi (více trafficu, více pozornosti) je to latentní risk. Rozhodnutí: přidat jednoduchý disclaimer "Pokud koupíš přes naše linky, získáme malou provizi — pro tebe bez příplatku" nebo upravit trust signal na "Žádná bannerová reklama".

### Validováno ✓

| ID | Claim | Kde | Ověřeno |
|----|-------|-----|---------|
| S-03 | `"Nezávislé hodnocení"` | Nav/footer | Score algoritmus není platit výrobci ✓ |
| S-04 | `"Žádné placené pozice"` | Různá místa | Ranking pořadí = Score, ne platba ✓ |
| S-05 | `"Ceny aktualizovány každých 24 h"` | Srovnávač | Metodika upřesňuje: XML partneři denně, ostatní 3× týdně. Zjednodušení, ale metodika je dostupná ✓ |
| S-06 | `"Žádné dotazníky výrobcům"` | Metodika | Pravda ✓ |
| S-07 | `"33 prodejců"` | Metodika (dynamicky) | Načítá z DB počet: `retailerCount` — OK ✓ |

---

## Souhrn pro schválení oprav

### Co opravit jako první (čeká na schválení)

| Priorita | ID | Popis | Kde opravit |
|----------|-----|-------|------------|
| 🔴 1 | N-01 | `premium-olivovy-olej-ma-smysl` — nahradit 3 phantom produkty reálnými z DB + smazat placeholder poznámku | DB article body |
| 🔴 2 | N-02 | `"18 prodejců"` → `"33 prodejců"` v srovnavac meta | `app/srovnavac/page.tsx` |
| 🔴 3 | N-03 | `"18 prodejců"` → `"33 prodejců"` v pruvodce layout | `app/pruvodce/[slug]/page.tsx` |
| 🟠 4 | N-04 | `"439 olejů"` → `"477 olejů"` | `jak-vybrat-olivovy-olej` body |
| 🟠 5 | N-05 | `"439 produktů"` → `"477 produktů"` | `nejlepsi-olivovy-olej-2026` body |
| 🟡 6 | S-01/S-02 | Affiliate disclaimer nebo úprava "Žádná reklama" | Rozhodnutí Architekta |
| 🟡 7 | H-01 | `"800 mg/kg běžně"` → `"výjimečně"` nebo přidat kontext | `olivovy-olej-vs-slunecnicovy` |

---

## Návrh prevence — monthly "truth-check" cron

> **NEIMPLEMENTOVAT** — jen návrh. Architekta rozhoduje.

Cron script `scripts/cron/truth-check.ts` spouštěný **1. každého měsíce**, výstup do `agent_decisions`:

```typescript
// 1. Count drift — porovnej DB counts s claimed counts v article bodies
const CLAIMED_PATTERNS = [
  { pattern: /hodnotíme\s+(\d+)\s+olejů/i, metric: 'activeProducts' },
  { pattern: /(\d+)\s+prodejc/i, metric: 'activeRetailers' },
]
// Fetch live counts → compare → alert if diff > 10%

// 2. Phantom product check — všechny /olej/ slugy v bodies
const allSlugs = extractProductSlugs(articleBodies)
const invalid = await checkSlugsInDB(allSlugs)
// Alert on any slug that returns null

// 3. Placeholder pattern detection — articles with status=active
const placeholderPatterns = ['(Poznámka:', 'vložit z reálné DB', '[DOPLNIT]', 'illustrativní příklady']
// Alert on any match in active article

// 4. Score drift — inline (Score X) references vs DB scores
const inlineScores = extractInlineScores(articleBodies) // { slug, claimedScore }
const dbScores = await fetchScoresFromDB(inlineScores.map(s => s.slug))
// Alert on ±1 difference

// Output to agent_decisions: { type: 'truth-check', date, findings: [...] }
// Email alert if any CRITICAL findings
```

**Odhadovaný čas implementace:** 3–4 hodiny  
**Hodnota:** Zachytí drift automaticky — ne až po months of organic traffic na chybných datech.

---

*Audit provedl: Claude Code (2026-07-23)*  
*Opravy provádět VÝHRADNĚ po schválení Architektem.*
