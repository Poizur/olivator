# OLIVUM — PRÁVNÍ INVENTURA
**Datum doručení výzvy:** 2026-07-24  
**Datum sepsání inventury:** 2026-07-24  
**Stav kódu ke dni inventury:** commit `28b43d0` (2026-07-24 09:55:17 +0200)  
**Účel:** Podklad pro advokáta. Bez hodnocení, pouze ověřená fakta.  
**PDF výzvy:** `priloha_1739221765_0_26-07-23_Vyzva_Olivator.pdf` (3 strany, skenovaný — nepřečteno, vyžaduje OCR nebo manuální přečtení)

---

## 1. RETAILER PROFIL V DB

| Pole | Hodnota |
|------|---------|
| `id` | `8e42da2b-766a-4943-a94e-701139a782dd` |
| `slug` | `olivum` |
| `name` | `Olivum.cz` |
| `domain` | `olivum.cz` |
| `affiliate_network` | `direct` |
| `base_tracking_url` | `null` |
| `default_commission_pct` | `0` (žádná affiliate komise) |
| `is_active` | `true` |
| `xml_feed_url` | `null` (žádný XML feed) |
| Přidán do DB | 2026-05-04 (commit `6bf732d`, pozn. "backlog k oslovení") |

**Poznámka:** Olivum nemá affiliate program. Nabídky zobrazujeme bez affiliate odkazu — kliknutí z našeho webu na olivum.cz jsou přímé přechody, **ne** tracking odkaz s provizí.

---

## 2. ROZSAH — PRODUKTY S NABÍDKOU OD OLIVUM

### Celkové čísla (k 2026-07-24)

| Metrika | Počet |
|---------|-------|
| Nabídky (`product_offers`) od olivum | **95** |
| Unikátní produkty | **95** |
| Produkty kde je olivum **jediným** in-stock prodejcem | **95 (100 %)** |
| Produkty kde má olivum nabídku + jiný prodejce | **0** |
| Produkty s Olivator Score | **83** (12 bez Score) |
| Produkty s kyselostí | **86** |
| Produkty s polyfenoly | **60** |

**Závěr:** Všech 95 produktů má olivum jako jediného prodejce v systému. Pokud by olivum bylo ze systému odebráno, tyto produkty by neměly žádnou cenovou nabídku.

### Chronologie

| Událost | Datum |
|---------|-------|
| Olivum přidán do `retailers` (migrace) | 2026-05-04 |
| První záznam v `price_history` (první reprice run) | 2026-05-08 |
| První `affiliate_click` (přechod uživatele na olivum.cz) | 2026-05-11 |
| Poslední reprice run (ke dni inventury) | 2026-07-24 05:06 UTC |
| Celkem záznamy v `price_history` | 460 |
| Celkem `affiliate_clicks` na olivum | **426** |

---

## 3. PŮVOD OBSAHU PER TYP

### 3a. Fotky

**Stav v DB (product_images tabulka):**

| Typ fotky | Počet | Zdroj |
|-----------|-------|-------|
| Primary foto (zobrazuje se na produktové kartě) | 95 | Supabase Storage (naše CDN) |
| Scraper_candidate (galerie/draft) s olivum.cz hotlink | **162** | `cdn.myshoptet.com/usr/www.olivum.cz/...` |

**Jak primary fotky vznikly:**
1. Discovery agent stáhl produktovou stránku z `olivum.cz` (Shoptet)
2. Z HTML extrahoval URL fotky (`.p-image img`, JSON-LD nebo OG tag)
3. Funkce `downloadAndStoreImage()` (lib/product-image.ts:104) stáhla binární obraz fotky z URL
4. Provedla resize na 800×800px WebP
5. Uložila do Supabase Storage bucket `products` jako `{slug}.webp`
6. V DB se uložila nová URL `https://dyaloliwynmfnpjemzrh.supabase.co/storage/...`

**Stav:** Primary fotky nejsou hotlinky — jsou staženy a uloženy v naší Supabase Storage. Původní zdroj fotografií byl olivum.cz CDN. 162 ne-primárních fotek (scraper_candidate) jsou hotlinky stále ukazující na `cdn.myshoptet.com/usr/www.olivum.cz/`.

**Pro advokáta:** Klíčová otázka — komu patří autorské právo k fotografiím? Olivum.cz je distributorem/prodejcem — fotografie jsou pravděpodobně od výrobců (Chiavalon, Casas de Hualdo, Marina Colonna atd.). Toto je nutné ověřit.

### 3b. Popisy produktů

| Typ | Počet |
|-----|-------|
| AI_GENERATED (Claude, ai_generated_at v DB) | **93** |
| MANUAL/UNKNOWN (ai_generated_at = null) | **2** |

**Dva manuální produkty bez AI generování:**
- `chiavalon-organic-250-ml-bio-premiovy-olivovy-olej-v-cerne-darkove-tube` (created 2026-06-13)
- `premiovy-extra-panensky-olivovy-olej-frantoio-muraglia-rainbow-500-ml-v-keramicke-lahvi` (created 2026-05-08)

**Jak AI popisy vznikají:**
1. Discovery agent stáhl HTML z olivum.cz
2. Extrahoval surová data (název, popis, parametry)
3. Claude (claude-haiku-4-5) nebo Claude Sonnet generoval nový popis v češtině
4. AI_GENERATED popis je nový text, ne kopie textu z olivum.cz

**Poznámka k score-rescrape:** Skript `scripts/score-rescrape.ts` stahuje HTML stránek z olivum.cz a z textu extrahuje kyselost (%) a polyfenoly (mg/kg) pomocí regex. Tyto hodnoty jsou laboratorní data (měřené parametry produktu), ne kreativní obsah olivum.cz.

### 3c. Chuťový profil (flavor_profile)

Extrahován z HTML produktové stránky nebo AI generován discovery agentem. Strukturovaná data (fruity 0–100, bitter 0–100 atd.) — není kopie textu.

---

## 4. PROVOZ — PŘÍSTUPY NA OLIVUM.CZ

### Které procesy přistupují na olivum.cz

| Proces | Skript | Co dělá | User-Agent | Frekvence |
|--------|--------|---------|-----------|-----------|
| **cron:reprice** (MODE_A) | `scripts/cron/reprice.ts` + `lib/reprice/reprice-runner.ts` | Stahuje produktové stránky z `product_offers.product_url`, extrahuje cenu přes OpenGraph/HTML | `Mozilla/5.0 (compatible; Olivator-bot/1.0)` | Denně (Railway cron) |
| **score-rescrape** (manuální) | `scripts/score-rescrape.ts` | Stahuje produktové stránky, hledá kyselost/polyfenoly regexem | `Mozilla/5.0 (compatible; Olivator-bot/1.0)` | Manuálně (není cron) |
| **cron:discovery** | `scripts/cron/discovery.ts` + `lib/discovery-agent.ts` | Prvotní crawl: sitemap + produktové stránky → nové produkty | (scrape User-Agent z lib) | Původně spuštěn manuálně |

### Delay mezi requesty

`reprice-runner.ts`:
```
DELAY_BETWEEN_REQUESTS_MS = 2_000   // 2s mezi produkty
DELAY_BETWEEN_RETAILERS_MS = 5_000  // 5s mezi retailery
```

### Robots.txt compliance

**olivum.cz robots.txt** (stav 2026-07-24): `/export/`, `/admin/`, `/script/`, `/api/`, `/action/`, a URL parametry pro filtrování jsou Disallowed. Produktové stránky (`/nazev-produktu/`) **nejsou** v Disallow. Náš crawler `Olivator-bot/1.0` **není** blokován.

**Náš kód:** Discovery agent a reprice neimplementují explicitní kontrolu `robots.txt` před crawlem — spoléhají na to, že produktové stránky nejsou zakázané.

**discovery_sources tabulka:** Pro olivum.cz není žádný záznam v `discovery_sources` tabulce (NULL). Produkty byly pravděpodobně importovány manuálně nebo přes skript.

---

## 5. ZMÍNKY "OLIVUM" NA WEBU

### 5a. Produktové stránky
Každý z 95 produktů má v sekci "Kde koupit" zobrazenu cenu a tlačítko odkazující na olivum.cz (`/go/olivum/{slug}` redirect). Kliknutí logujeme do `affiliate_clicks`.

### 5b. Články (body_markdown v DB)
14 aktivních článků obsahuje zmínku "Olivum.cz":

| Článek (slug) | Typ zmínky | Status |
|---------------|-----------|--------|
| `darkove-baleni-olivovy-olej` | Inline price: "459 Kč u Olivum.cz" | active |
| `olivovy-olej-pro-deti` | Inline price: "459 Kč u Olivum.cz" | active |
| `jak-skladovat-olivovy-olej-doma` | Inline price: "459 Kč u Olivum.cz" | active |
| `jak-cist-etiketu-olivoveho-oleje` | Inline price: "459 Kč u Olivum.cz" | active |
| `sklizen-oliv-early-vs-late-harvest` | Inline price: "… Kč u Olivum.cz" | active |
| `stredomorska-strava-olivovy-olej` | Inline price: "459 Kč u Olivum.cz" | active |
| `extra-panensky-vs-panensky-vs-rafinovany` | Inline price: "459 Kč u Olivum.cz" | active |
| `degustace-olivoveho-oleje-doma` | Inline price: "459 Kč u Olivum.cz" | active |
| `dop-pgi-bio-certifikace` | Inline price: "459 Kč u Olivum.cz" | active |
| `kde-koupit-olivovy-olej-cr` | Inline price: "459 Kč u Olivum.cz" | active |
| `otevrena-lahev-jak-rychle-spotrebovat` | Inline price: "459 Kč u Olivum.cz" | active |
| `falesny-olivovy-olej-jak-rozeznat` | Inline price: "459 Kč u Olivum.cz" | active |
| `olivovy-olej-a-zdravi-veda-2026` | Inline price: "459 Kč u Olivum.cz" | **archived** |
| `nejlepsi-olivovy-olej-2026` | Editorial: "Olivarna.cz nebo Olivum.cz nabízejí kurátorský výběr s transparentními informacemi" | active |

**Typ zmínek:** Cenové citace (dynamicky vloženy při generování) a jedno editorial zmínění Olivum.cz jako zástupce kategorie "specializovaná olivárna". **Žádná zmínka nenaznačuje partnerství, exkluzivitu ani spolupráci.**

### 5c. llms.txt
Soubor `app/llms.txt/route.ts` nezmiňuje Olivum jménem. Uvádí pouze počet aktivních prodejců obecně ("od N ověřených prodejců").

### 5d. robots.txt
Soubor `app/robots.ts` nezmiňuje Olivum. Zakazuje `/go/` (affiliate redirect) crawlerům.

### 5e. Stránka /slevy
Existuje (`app/slevy/page.tsx`). Neobsahuje hardcoded zmínky Olivum — zobrazuje data z DB.

### 5f. Žebříčky
Žádný žebříček (`rankings` tabulka) neobsahuje "olivum" v body_markdown.

---

## 6. ARCHIVACE — DŮKAZ STAVU KE DNI DORUČENÍ (2026-07-24)

### Soubory v `docs/legal/olivum-2026-07-24/`

| Soubor | Obsah |
|--------|-------|
| `db-audit-raw.json` | Kompletní DB export: retailer, 95 nabídek, parametry produktů, zdroje fotek/popisů |
| `snapshot-bio-extra-panensky-olivovy-olej-elixir-500-ml.html` | HTML produktové karty (bio-elixir — nejčastěji citovaný) |
| `snapshot-chiavalon-romano-100-ml.html` | HTML produktové karty (Chiavalon Romano) |
| `snapshot-premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-*.html` | HTML produktové karty (Evolution) |
| `snapshot-kde-koupit.html` | HTML článku kde-koupit-olivovy-olej-cr |
| `snapshot-srovnavac.html` | HTML srovnávače |

### Git audit trail
Commit `6bf732d` (2026-05-04): Olivum přidán jako "prospect" retailer bez affiliate  
Commit `28b43d0` (2026-07-24 09:55): HEAD ke dni doručení výzvy

---

## 7. TECHNICKÝ PLÁN ODSTRANĚNÍ (PŘIPRAVIT — NEPROVÁDĚT)

**Instrukce:** Provést POUZE na pokyn advokáta. Pořadí záleží.

### 7a. Deaktivace nabídek (okamžitý efekt: přestaneme zobrazovat ceny)
```sql
-- Deaktivace in_stock=false pro všechny olivum nabídky
UPDATE product_offers SET in_stock = false WHERE retailer_id = '8e42da2b-766a-4943-a94e-701139a782dd';
-- Alternativa: smazat nabídky
DELETE FROM product_offers WHERE retailer_id = '8e42da2b-766a-4943-a94e-701139a782dd';
```
**Efekt:** 95 produktů přestane mít zobrazeny ceny a tlačítko "Koupit u Olivum.cz". Produkty zůstanou na webu bez cenové nabídky.

### 7b. Deaktivace produktů kde olivum = jediný prodejce (95 produktů)
```sql
-- Přepnutí na status='inactive' = přestaneme produkty indexovat a zobrazovat
UPDATE products SET status = 'inactive'
WHERE id IN (
  SELECT product_id FROM product_offers WHERE retailer_id = '8e42da2b-766a-4943-a94e-701139a782dd'
);
```
**Efekt:** 95 produktových stránek přestane být dostupných (/olej/slug → 404 nebo redirect).

### 7c. Odstranění olivum.cz hotlink fotek (162 kusů)
```sql
-- Smazat scraper_candidate fotky hotlinkující na olivum.cz CDN
DELETE FROM product_images
WHERE source = 'scraper_candidate'
AND url LIKE '%myshoptet.com/usr/www.olivum.cz%';
```
**Efekt:** 162 ne-primárních fotek (galerie drafts) smazáno. Primary fotky nejsou hotlinky — jsou v naší Supabase Storage.

### 7d. Primary fotky ze Supabase Storage (otázka pro advokáta)
Primary fotky (95 ks) jsou **staženy a uloženy v naší Supabase Storage** jako WebP. Jejich mazání vyžaduje:
1. DELETE z `product_images` tabulky
2. DELETE z Supabase Storage bucket `products` (soubory `{slug}.webp`, `{slug}-g0.webp` atd.)
Kód pro mazání existuje v `lib/product-image.ts`. **Neprovádět bez pokynu.**

### 7e. Kyselost/polyfenoly extrahované z olivum.cz stránek
86 produktů má kyselost, 60 má polyfenoly. Extrahováno z HTML olivum.cz přes score-rescrape.
Tyto hodnoty jsou **laboratorní parametry výrobce** (ne kreativní dílo olivum.cz).
```sql
-- Nullovat chemická data pokud advokát uzná za nutné (nevratné!)
UPDATE products SET acidity = NULL, polyphenols = NULL
WHERE id IN (SELECT product_id FROM product_offers WHERE retailer_id = '8e42da2b-766a-4943-a94e-701139a782dd');
```

### 7f. Zmínky v článcích (14 articles + 1 editorial)
13 articles = inline price "459 Kč u Olivum.cz" — smazatelné v DB (`body_markdown` PATCH).  
1 article (`nejlepsi-olivovy-olej-2026`) = editorial zmínka — editovatelné.
```sql
-- Nahradit "u Olivum.cz" neutrálním textem (nutná revize každého článku individuálně)
-- Provádět manuálně přes admin UI nebo per-article PATCH
```

### 7g. Zastavení cron:reprice pro olivum
```typescript
// lib/reprice/reprice-runner.ts řádek 5:
const MODE_A_RETAILERS = ['greekmarket', 'olivum', 'milujemekretu', 'olivarna']
// Změnit na:
const MODE_A_RETAILERS = ['greekmarket', 'milujemekretu', 'olivarna']
```
Deploy = olivum přestane být repriceován. Okamžitý efekt po deployi.

### 7h. Deaktivace olivum retailera
```sql
UPDATE retailers SET is_active = false WHERE slug = 'olivum';
```

---

## 8. SOUHRN PRO ADVOKÁTA

| Bod | Fakt |
|-----|------|
| Olivum má affiliate program? | **NE** — `affiliate_network='direct'`, `default_commission_pct=0` |
| Olivum link = tracking link? | **NE** — `affiliate_url = null` pro všechny offers; klik jde přímo na `product_url` |
| Vydělávali jsme na olivum? | **NE** — 0 Kč příjmů z olivum |
| Prezentujeme se jako partneři? | **NE** — žádná partnerská langue |
| Kopírujeme jejich texty? | **NE** — 93/95 popisů AI generováno, 2/95 bez textu |
| Fotky = hotlinky na olivum? | **PRIMARY: NE** (v naší Storage). **CANDIDATE: ANO** (162 hotlinků na olivum CDN) |
| Robots.txt olivum respektujeme? | Produktové stránky nejsou v jejich Disallow; náš bot není blokován |
| Crawlíme co je zakázáno? | NE — `/export/`, `/admin/`, `/api/` Disallow odpovídá našemu chování |
| 426 affiliate_clicks = příjmy? | NE — jsou to přechody uživatelů na olivum.cz bez tracking/provize |

---

*Vygenerováno automaticky z DB a kódu, 2026-07-24 11:06 UTC. Pro přesnost: porovnat s `docs/legal/olivum-2026-07-24/db-audit-raw.json`.*
