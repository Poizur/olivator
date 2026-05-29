# VALIDATION-REPORT.md — Produktová integrita v článcích
*Vygenerováno: 2026-05-29 | Validator: scripts/validate-article-products.ts v1.1*

---

## Výsledek finálního scanu

**24 článků — 24 ✅ OK — 0 ERRORů — 0 WARNINGů**

Scan spuštěn po opravách ze dne 2026-05-28 a 2026-05-29.

---

## Co se opravilo v průběhu testování (chronologie)

### 2026-05-28 — AKCE 1 (živá DB oprava)
Článek `nejlepsi-olivovy-olej-2026` — 4 problémy v top-10 listu:

| Pozice | Produkt | Oprava |
|:---:|---|---|
| **3** | BIO Extra panenský Elixír | Score 92→86, přidán link `/olej/bio-extra-panensky-olivovy-olej-elixir-500-ml` |
| **7** | Koroneiki Early Harvest BIO 500 ml | ❌ NEEXISTUJE → smazán, nahrazen reálným produktem |
| **8** | Coratina Apulia DOP 750 ml | ❌ NEEXISTUJE → smazán, nahrazen reálným produktem |
| **10** | Arbequina Katalánsko DOP 500 ml | ❌ NEEXISTUJE → smazán, nahrazen reálným produktem |

Kyselost Picual 5L Bag-In-Box: 0,18 % → 0,15 % (shoduje se s DB).

### 2026-05-29 — Bugfix validátoru (validator v1.1)
**Problém:** Kontext 300 znaků přeskakoval přes `\n\n` a `\n` do textu jiných produktů.
**Dvě generace false positives opraveny:**

1. `\n\n` split (v1.0): eliminoval přeskakování přes odstavce (fix: `rawCtx.split('\n\n')[0]`)
2. First-line scan (v1.1): eliminoval přeskakování přes `\n` v číslovaných listinách a bullet listech:
   - kyselost + polyfenoly: scan pouze na první řádek po linku
   - Požaduje klíčové slovo `kyselost` pro detekci kyselosti (eliminuje shody v názvech produktů)
   - score + cena: scan na celý kontext do `\n\n` (distinktivní vzory, nízké riziko false positive)

### 2026-05-29 — ČÁST B (DB oprava zkrácených slugů)
Článek `polyfenoly-proc-na-nich-zalezi` — 2 zkrácené slugy vedoucí na 404:

| Zkrácený slug v článku | Správný slug v DB |
|---|---|
| `evolia-platinum-2777-...-olivovy-olej-2` | `evolia-platinum-2777-...-olivovy-olej-250-ml-extremne-vzacna-sklizen` |
| `premiovy-...-centenarium-premium-annivers` | `premiovy-...-centenarium-premium-anniversary-500-ml-v-darkovem-baleni` |

**Příčina truncation:** jednorázová AI chyba při generování (Content Agent ořízl dlouhý slug). `generate-articles.ts` žádný slug-cutoff neobsahuje — není systémový bug.

### 2026-05-29 — ČÁST C (vysvětlení, žádná oprava)
Varování `jak-vybrat-olivovy-olej`, cena Stamatakos 5L: 350 Kč vs DB 1990 Kč.
**Nebyl false positive v datech — 350 Kč je kalkulační příklad** v sekci "Cena za 100 ml":
> *"250ml × 350 Kč = 140 Kč/100ml. 5l × 1990 Kč = 40 Kč/100ml."*
Cena 1990 Kč (správná) je v témže odstavci. Obsah článku je v pořádku; warning po v1.1 fix zmizel.

---

## Přehled coverage 24 článků

Podle auditu z 2026-05-28 (`ARTICLES-AUDIT.md`):

| Slug | Linked produkty | Status |
|------|:-:|:---:|
| nejlepsi-olivovy-olej-2026 ⭐ | 10 | ✅ opraveno |
| jak-vybrat-olivovy-olej | 12 | ✅ OK |
| polyfenoly-proc-na-nich-zalezi | 10 | ✅ opraveno |
| premium-olivovy-olej-ma-smysl | 4 | ✅ OK |
| olivovy-olej-do-200-kc | 5 | ✅ OK |
| darkove-baleni-olivovy-olej | 5 | ✅ OK |
| recky-vs-italsky | 5 | ✅ OK |
| sklizen-oliv-early-vs-late-harvest | 5 | ✅ OK |
| extra-panensky-vs-panensky-vs-rafinovany | 5 | ✅ OK |
| kde-koupit-olivovy-olej-cr | 5 | ✅ OK |
| falesny-olivovy-olej-jak-rozeznat | 5 | ✅ OK |
| dop-pgi-bio-certifikace | 5 | ✅ OK |
| degustace-olivoveho-oleje-doma | 5 | ✅ OK |
| otevrena-lahev-jak-rychle-spotrebovat | 4 | ✅ OK |
| olivovy-olej-do-salatu-vs-na-vareni | 3 | ✅ OK |
| polyfenoly-kolik-je-dost | 5 | ✅ OK |
| jak-cist-etiketu-olivoveho-oleje | 4 | ✅ OK |
| jak-skladovat-olivovy-olej-doma | 4 | ✅ OK |
| filtrovany-vs-nefiltrovany-olivovy-olej | 4 | ✅ OK |
| olivovy-olej-pro-deti | 4 | ✅ OK |
| stredomorska-strava-olivovy-olej | 5 | ✅ OK |
| olivovy-olej-a-zdravi-veda-2026 | 5 | ✅ OK |
| olivovy-olej-na-smazeni-bod-zakoureni | 0 | ✅ OK (žádné linky) |
| recky-italsky-spanelsky-olej | 0 | ✅ OK (žádné linky) |

**2 články bez produktových odkazů** (`smazeni`, `recky-italsky-spanelsky`) — dříve identifikovaná priorita pro FÁZE 2 (přidat affiliate linky).

---

## Co validator detekuje (a co ne)

### Detekuje
- ❌ `/olej/slug` odkaz na neexistující produkt (status ≠ active nebo slug chybí)
- ❌ Score v textu se liší od DB (tolerance ±0)
- ❌ Kyselost v textu se liší o >0,02 % od DB (jen pokud `kyselost X,XX %` na stejném řádku)
- ⚠️ Polyfenoly v textu se liší o >50 mg/kg (jen `XXX mg/kg` na stejném řádku)
- ⚠️ Cena v textu se liší o >100 Kč od nejlevnější DB nabídky

### Záměrně nedetekuje
- Hardcoded hodnoty bez produktového linku (čistě textové zmínky — žádný anchor)
- Kyselost/polyfenoly v jiném řádku než link (konzervativní přístup, zabraňuje false positives)
- Produkty z externích zdrojů bez `/olej/` prefixu

---

## Jak spustit manuálně

```bash
# Jeden článek
npx tsx --env-file=.env.local scripts/validate-article-products.ts --slug=nejlepsi-olivovy-olej-2026

# Všechny články (24)
npx tsx --env-file=.env.local scripts/validate-article-products.ts --all

# Exit code: 0 = OK, 1 = má ERRORy
```

Admin blokace: `PATCH /api/admin/articles/[slug]` s `{status: "active"}` vrátí HTTP 422
pokud validace najde ERRORy.

---

*Aktualizuj tento soubor po každé vlně oprav.*
*Validator: `lib/article-validator.ts` v1.1 | CLI: `scripts/validate-article-products.ts`*
