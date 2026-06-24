# PHASE-0-FINDINGS.md — Vyjasnění 4 kritických nejasností

*Vygenerováno: 2026-06-15 | Navazuje na PROJECT-INVENTORY.md sekci 7. Žádné změny kódu — fakta + doporučení.*

---

## OTÁZKA 1 — AFFILIATE URL STRATEGIE

### Jak routing reálně funguje

`app/go/[retailer]/[slug]/route.ts` — funkce `resolveUrl()` (řádky 32-66), priorita 4 úrovní:
1. `offer.affiliate_url` — explicitní override
2. `retailer.base_tracking_url` — template s placeholdery `{product_url}`, `{product_slug}`, `{ean}`
3. `offer.product_url` — přímý link na produkt u prodejce (**žádná komise**)
4. `https://{retailer.domain}` — homepage fallback (**žádná komise, špatná stránka**)

Mechanismus je implementovaný správně a nekrachuje — vždy něco vrátí (nebo 502 při neplatné URL). To potvrzuje novější memory ("route to řeší za runtime") jako technicky pravdivé.

### Live čísla

- **Celkem 492 product_offers, 0 (nula) má `affiliate_url IS NOT NULL`.** To je hůř než "78 % chybí" ze staré memory — je to 100 %.
- **4 retaileři mají `base_tracking_url` template** — všichni přes síť **eHUB**: Reckyeshop, Cretamart, Italyshop.cz, Řecko nás baví. Pokrývají **131 z 492 offers (27 %)** — pro tyto routing reálně funguje a NULL `affiliate_url` je v pořádku.
- **361 offers (73 %) padá na fallback #3** (přímý `product_url` — všech 361 ho má, nikdo nepadá až na homepage fallback #4). Tj. link funguje, vede na správnou stránku, ale **bez komise**.

### Důležitá nuance — proč "361 chybějících URL" není totéž jako "361× ztracené peníze"

Zkontroloval jsem `affiliate_network`/`default_commission_pct` u těch 16 retailerů, kam těch 361 offers patří:

| Network | Retaileři | Offers | Realita |
|---|---|---|---|
| `direct`, **0,00 %** komise | GreekMarket, Olivum.cz, Jamonárna.cz, Lozano Červenka | 94+81+29+6 = 210 | **Žádná komisní dohoda neexistuje** — "direct" + 0 % znamená produkt je v katalogu pro srovnání ceny, ne pro affiliate výdělek |
| `NULL` (nic nastaveno) | Vinoteka-praha, Zdrave-oleje, Ellada, Gourmet-partners, Milujemekretu, Cerfis, Topdelikatesy, Oliviersandco, Nestonej, Zdravoslav, Olivarna, Eshop | 151 | **Žádná affiliate vazba vůbec** |

Takže těch 361 "chybějících URL" by **nevygenerovalo žádnou komisi ani po doplnění** — protože u těchto retailerů dnes neexistuje obchodní dohoda. To je byznysová mezera (sjednat affiliate program), ne technický bug.

### Skutečný nález — kde reálně leží peníze na zemi

Zkontroloval jsem retailery s **opravdovou** komisní dohodou (`affiliate_network` = Dognet/CJ/Heureka, nebo direct s reálným %):

| Retailer | Network | Komise | Live offers |
|---|---|---|---|
| Mall.cz | CJ | 5,0 % | **0** |
| iHerb.com | CJ | 5,0 % | **0** |
| iTesco.cz | Dognet | 3,0 % | **0** |
| Kaufland.cz | Dognet | 3,0 % | **0** |
| Rohlík.cz | Dognet | 4,0 % | **0** |
| Košík.cz | Dognet | 3,5 % | **0** |
| Globus.cz | Dognet | 3,0 % | **0** |
| Albert.cz | Dognet | 3,0 % | **0** |
| MujBio.cz | Heureka | 8,0 % | **0** |
| Olivovyolej.cz | direct | 15,0 % | **0** |
| Gaea.cz | direct | 10,0 % | **0** |

**Všech 11 retailerů s reálnou komisní dohodou (3–15 %) má nula nabídek v `product_offers`.** Tohle potvrzuje starší memory poznámku ("Rohlik/Košík/Mall/iHerb/Mujbio = 0 offers vůbec — chybí discovery_sources") — a je to stále aktuální. Affiliate URL routing mechanismus je v pořádku; problém je, že **discovery/scraping pro tyto vysoce-komisní retailery vůbec nenašel/nenaskenoval žádný produkt.**

### Doporučení (priorita podle dopadu)

1. **Nejvyšší ROI:** zprovoznit discovery pro těch 11 retailerů s reálnou 3–15% komisí (chybí `discovery_sources` záznamy nebo XML feed napojení) — tohle je reálné "peníze na zemi", ne těch 361 offers bez dohody.
2. **Nízká priorita / business task pro Architekta:** sjednat affiliate program pro 16 retailerů, kde dnes není žádná dohoda (`direct 0%` nebo `NULL`) — než to půjde, doplňování jejich `affiliate_url` nemá finanční smysl.
3. Rozpor mezi starou a novou memory je tímto **vyřešen** — obě měly částečně pravdu (mechanismus funguje, ale affiliate_url skutečně chybí), obě se ale dívaly na špatnou podmnožinu dat.

---

## OTÁZKA 2 — GSC INTEGRACE STAV

### Auth implementace

`lib/gsc.ts:31-43` — `getAuth()` čte `process.env.GSC_SERVICE_ACCOUNT_KEY` (JSON string), pokud chybí nebo se neparsuje → vrací `null`. `fetchGscSummary()`/`fetchGscDailyTrend()` při `!auth || !siteUrl` vrací `null` (graceful, žádný throw).

### Co se zobrazí v adminu bez env vars

`app/admin/(protected)/gsc/page.tsx:72,98` — `isConfigured = !!(GSC_SERVICE_ACCOUNT_KEY && GSC_SITE_URL)`. Bez nich se zobrazí žlutý box **"GSC není nakonfigurováno"** s instrukcí co nastavit (řádky 50-64). **Žádný crash, žádná tichá prázdná stránka** — UX je čistě řešený.

### Stav env vars
- **Lokálně (`.env.local`): potvrzeno 0 výskytů `GSC_`** — ani `GSC_SERVICE_ACCOUNT_KEY`, ani `GSC_SITE_URL`.
- **Na Railow: nemohu bezpečně ověřit.** Pokusil jsem se dotázat Railway GraphQL `variables` query, ale bezpečnostní vrstva to zablokovala — ta query vrací *všechny* hodnoty proměnných najednou (ne jen existenci jedné), což by риskovalo dostat produkční secrets do tohoto reportu. **Potřebuješ ověřit přímo v Railway dashboardu** (Service → Variables → hledat `GSC_`), já to bezpečně nemůžu udělat za tebe.

### Live stav DB tabulek

| Tabulka | Řádků | Nejnovější | Kdo zapisuje |
|---|---|---|---|
| `seo_metric_snapshots` | 774 | aktivní, několikrát denně | `scripts/cron/seo-snapshot.ts`, `scripts/cron/auto-audit.ts` |
| `seo_activity_log` | 169 | aktivní, několikrát denně (`source:"cron"`) | stejné crony + `lib/seo-activity.ts` |
| `gsc_keyword_metrics` | **0** | nikdy | **nikdo — žádný writer nikde v kódu** (grep potvrzuje jediný výskyt je v `scripts/check-seo-tables.ts`, který jen kontroluje existenci) |

**Důležité rozlišení:** `seo_metric_snapshots`/`seo_activity_log` běží skvěle a nezávisle na GSC — to jsou interní audity (chybějící meta_title, schema.org coverage atd.), ne data z Google API. Jejich aktivita **neznamená, že GSC funguje**.

`gsc_keyword_metrics` je naproti tomu tabulka, která by GSC datům dávat smysl — ale **nikdy do ní nikdo nezapsal, protože pro to neexistuje žádný kód.** `lib/gsc.ts` čte živě z Google API jen pro zobrazení na stránce, nikam to neperzistuje. Nulová data v této tabulce tedy nejsou důkaz, že GSC integrace "spadla" — je to důkaz, že **persistence vrstva pro GSC data nikdy nebyla postavena**, nezávisle na tom, jestli by live API volání fungovalo.

### Závěr: běží GSC nebo ne?

**Lokálně jistě neběží** (chybí oba env vars). Na produkci nevím s jistotou (nemůžu bezpečně zkontrolovat), ale nepřímé důkazy (žádná historie v `gsc_keyword_metrics`, byť ta tabulka beztak nikdy nebyla napojena) tomu neodporují ani to nepotvrzují — je to jednoduše nerozhodnuto bez tvého pohledu do Railway dashboardu.

### Odhad práce na oživení

- Pokud Service Account JSON klíč z Google Cloud existuje odjinud (CLAUDE.md sekce 24 zmiňuje `only5l-agent@only5l-agent.iam.gserviceaccount.com` jako uživatele co je třeba přidat do GSC property) → **stačí doplnit 2 env vars do `.env.local` + Railway**, kód je hotový a graceful. Cca 15-30 min včetně ověření v GSC, že má service account přístup k `olivator.cz` property.
- Pokud chceš i historické trendy (ne jen live 28denní okno) → potřeba postavit writer do `gsc_keyword_metrics` (nový cron nebo rozšíření `seo-snapshot.ts`). To je dodatečná práce v řádu hodin, ne minut — **a nebyla součástí zadání této fáze, jen ji zmiňuji jako navazující rozhodnutí.**

---

## OTÁZKA 3 — PLAYWRIGHT/PUPPETEER STACK

### Failed discovery_candidates — pattern

- **Za posledních 30 dní: 0 failed.**
- **Celkem historicky (bez časového limitu): 28** — všechny z **2026-05-07 až 2026-05-17** (stará, přes měsíc neaktuální).
- Všech 28 pochází ze **2 domén**: `www.lozanocervenka.cz` (24) a `www.nestonej.cz` (4).
- **`lozanocervenka` je dnes aktivní retailer se 29 živými offers** — tedy stejná doména dnes prokazatelně funguje. Tehdejší selhání bylo přechodné, ne trvalá JS-rendering bariéra.
- Nahlédnutí do `candidate_data` u failed záznamů: obsahuje **plně vyplněnou strukturu** (`ean`, `k232`, `k270`, `acidity`, `polyphenols`, `parameterTable`, `galleryImages`...). To je silný signál, že **cheerio extrakci z HTML úspěšně zvládl** — selhání nastalo později v pipeline (matching/persist krok), ne na úrovni "stránka se nenačetla bez JS".
- `discovery_sources`: **0 zdrojů má status `failing`** dnes (breakdown: 56 rejected, 21 enabled, 8 suggested, 1 disabled). Nic není aktuálně systematicky blokované.

### Závěr

**Žádný současný důkaz, že Playwright/Puppeteer chybí jako blokující problém.** Cheerio+fetch stack zvládá extrakci i strukturovaných dat (parametrické tabulky, JSON-LD). Jediných 28 historických selhání je přes měsíc starých, izolovaných na 2 domény, a ani ona nevypadají jako JS-rendering bariéra (extrakce dat v nich uspěla).

**Doporučení:** CLAUDE.md sekce 11 (Playwright na Railway, BUG-016) je zastaralá dokumentace popisující stack, který se nikdy nedostal do `package.json`, nebo byl nahrazen v rané fázi vývoje. Navrhuju ji buď smazat, nebo přepsat na popis reálného cheerio+fetch přístupu — ne implementovat Playwright kvůli problému, který dnes neexistuje.

---

## OTÁZKA 4 — MANAGER REPORTS RELIABILITY

### Stav jediného řádku

`manager_reports` má přesně **1 řádek**: `generated_at: 2026-05-11T17:53:39Z`, období `2026-05-04` až `2026-05-11`, `status: "sent"`. Obsahuje plně vyplněné metriky (125 kliků, 452 offers, atd.) a AI analýzu.

**Zajímavé:** ten jediný report už tehdy (5. týden zpátky) sám identifikoval přesně problém z Otázky 1 — citace `ai_analysis`: *"Kritický problém: 100% offers nemá affiliate URL, což znamená ztrátu všech 125 potenciálních komisí."* a navrhovaná akce *"Implementovat affiliate URLs pro top 5 produktů"*. Tj. systém na to upozornil už 11. května — nic se s tím nestalo, a o měsíc později je stav identický (0/492).

### Proč jen 1 řádek — kód vs infrastruktura

- `scripts/cron/manager.ts` má kill timer 15 min + `main().catch → exit(1)` — pokud `runManagerAgent()` shodí výjimku, proces spadne, ale **nikam se to neloguje trvale** (jen Railway deploy log).
- `lib/manager-agent.ts:runManagerAgent()` — sled je `gatherMetrics()` → `callClaude()` → **teprve pak** try/catch kolem DB save (řádky 320-337, "gracefully skip if table doesn't exist"). Ale **`callClaude()` samo (řádek 292-308) dělá `JSON.parse(cleaned)` BEZ try/catch.** Pokud Claude vrátí cokoli, co nejde čistě naparsovat jako JSON (např. obalí odpověď textem navzdory instrukci "Vrať POUZE JSON"), `JSON.parse` vyhodí, **`runManagerAgent()` shodí výjimku ještě PŘED tím, než se dostane k DB save kroku** — report se neuloží vůbec, ani neúspěšný záznam.
- **Klíčový nález:** v živém seznamu 15 Railway cron služeb (zjištěno v rámci PROJECT-INVENTORY.md auditu) **`manager` ani `cron-manager` neexistuje.** Existuje jen `npm run cron:manager` script + manuální admin trigger (`app/api/admin/manager/run/route.ts`). To silně nasvědčuje, že **žádný pravidelný týdenní běh na Railow vůbec nikdy nebyl nastaven** — ten jediný řádek z 11. května nejspíš vznikl jedním manuálním spuštěním (lokálně nebo přes admin tlačítko), ne opakovaným cronem.

### Závěr

"Proč jen 1 řádek" má pravděpodobně **infrastrukturní příčinu, ne (jen) bug v kódu**: cron služba pro `manager` zřejmě nikdy nebyla v Railow založena jako plánovaná služba — chybí v živém seznamu služeb. I kdyby byla, kód má jedno reálné fragility místo (`JSON.parse` bez ošetření), které by občasně celý report ztratilo beze stopy.

**Doporučení (až budeš plánovat, ne teď):**
1. Ověř v Railway dashboardu, jestli `manager` cron služba existuje pod jiným názvem, nebo jestli ji je potřeba založit od nuly (5 min založení, stejně jako ostatní cron služby).
2. Až se do kódu sáhne, `JSON.parse(cleaned)` v `lib/manager-agent.ts:300` by měl mít try/catch s fallbackem (stejný pattern jako `validateCzechStyle` retry jinde v projektu) — ať selhání Claude formátu nezpůsobí ztracený report.

---

## Shrnutí pro rozhodování

| Otázka | Stav | Závažnost | Akce |
|---|---|---|---|
| Affiliate URL | Routing mechanismus **funguje správně**. Skutečná mezera: 11 retailerů s reálnou 3-15% komisí má 0 offers (discovery gap, ne URL gap). | Vysoká (přímý $ dopad) | Priorita: discovery pro Dognet/CJ/Heureka retailery |
| GSC | Lokálně potvrzeně nenastaveno. Na produkci nelze bezpečně ověřit odtud — nutná tvoje kontrola v Railway dashboardu. | Střední (SEO viditelnost) | Ty: zkontroluj Railway Variables; pokud chybí, doplnění je rychlé (klíč pravděpodobně existuje z only5l projektu) |
| Playwright | Žádný současný důkaz potřeby. CLAUDE.md je zastaralý. | Nízká | Doporučuju opravit dokumentaci, ne stavět Playwright |
| Manager reports | Pravděpodobně chybí Railway cron služba (infra gap), + 1 drobné fragility místo v kódu. | Střední (chybí týdenní vhled) | Ověř Railway services, pak zvaž JSON.parse hardening |

Žádná z těchto čtyř věcí nebyla v rámci této fáze opravena — to je na další rozhodnutí.
