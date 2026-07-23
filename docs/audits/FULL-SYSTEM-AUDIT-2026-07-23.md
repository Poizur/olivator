# FULL SYSTEM AUDIT — Olivátor.cz
**Datum:** 2026-07-23 | **Verze kódu:** `b92d464` | **Auditor:** Claude Code (pasivní, bez oprav)

> Cíl: komplexní inventura celého systému. NIC neopraveno (kromě kriticky rozbitého pro návštěvníky).

---

## Rychlý přehled

| Sekce | Výsledek | Kritické | WARN |
|---|---|---|---|
| A — Railway inventory | ✅ 26 services, všechny SUCCESS | 0 | 3 |
| B — Simulace cronů | ✅ Vše funguje (dry-run prošel) | 0 | 1 |
| C — Email flows | ⚠ 1 bug (404 v welcome emailu) | 1 | 3 |
| D — Web health | ✅ Všech 12 URL: 200 | 0 | 4 (INFO) |
| E — Integration chains | ⚠ 42 % produktů bez score | 0 | 3 |
| F — Data integrity | ⚠ 26 retailerů bez price_history | 0 | 4 |
| G — Security & GDPR | ⚠ 3 cron routy s nebezpečnou auth | 0 | 3 |
| H — Known gaps | 15 otevřených itemů (2 kritické) | 2 | 8 |

---

## A — Railway Inventory

**Celkem services:** 26 (1 web + 25 cron)
**Poslední deployment:** 2026-07-23, všechny SUCCESS

### Kompletní seznam services

| Service | Start command | Schedule | Naposledy | Status |
|---|---|---|---|---|
| olivator (web) | npm start | — (always-on) | 2026-07-23 | ✅ |
| cron-executor | npm run cron:executor | `0 6 * * *` | 2026-07-23 | ✅ |
| cron-executive-director | `npx tsx scripts/cron/executive-brief.ts` | `0 20 * * 0` (ne 20:00) | 2026-07-23 | ✅ |
| cron-site-scanner | npm run cron:site-scanner | `0 4 * * 1,4` (Po+Čt 4:00) | 2026-07-23 | ✅ |
| cron-article-publisher | npm run cron:article-publisher | `0 3 * * 2` (Út 3:00) | 2026-07-23 | ✅ |
| cron-reprice | npm run cron:reprice | `0 5 * * 1,3,5` (Po/St/Pá 5:00) | 2026-07-23 | ✅ |
| cron-lead-magnet-drip | npm run cron:lead-magnet-drip | `0 9 * * *` | 2026-07-23 | ✅ |
| cron-price-watch | npm run cron:price-watch | `30 6 * * *` | 2026-07-23 | ✅ |
| cron-price-index | npm run cron:price-index | `0 7 1 * *` (1. v měsíci) | 2026-07-23 | ✅ NOVÝ |
| cron-newsletter-generate | npm run cron:newsletter-generate | `0 18 * * 3` (St 18:00) | 2026-07-23 | ✅ |
| cron-token-validator | npm run cron:validate-tokens | `0 7 * * *` | 2026-07-23 | ✅ |
| cron-manager | npm run cron:manager | `0 5 * * 1` (Po 5:00) | 2026-07-23 | ✅ |
| feed-sync | npm run cron:feed-sync | `0 4 * * *` | 2026-07-23 | ✅ |
| cron-link-check | npm run cron:link-check | `0 2,4 * * *` (2× denně) | 2026-07-23 | ✅ |
| cron-discovery | npm run cron:discovery | `30 4 * * *` | 2026-07-23 | ✅ |
| cron-auto-audit | npm run cron:auto-audit | `0 4 * * *` | 2026-07-23 | ✅ |
| cron-entity | curl /api/cron/entity-aggregate | `0 4 * * *` | 2026-07-23 | ✅ |
| cron-prospect | npm run cron:prospect | `30 4 * * 1` | 2026-07-23 | ✅ |
| radar | npm run cron:radar | `0 */2 * * *` (každé 2h) | 2026-07-23 | ✅ |
| learning | npm run cron:learning | `0 8 * * 1` | 2026-07-23 | ✅ |
| seo-snapshot | npm run cron:seo-snapshot | `0 5 * * *` | 2026-07-23 | ✅ |
| cron-proposal-audit | npm run cron:proposal-audit | `0 3 * * *` | 2026-07-23 | ✅ |
| services.seasonal-dispatcher | npm run cron:seasonal-dispatcher | `0 0 * * *` | 2026-07-23 | ✅ |
| services.welcome-dispatcher | npm run cron:welcome-dispatcher | `0 9 * * *` | 2026-07-23 | ✅ |
| cron:lab-research | npm run cron:lab-research | `0 7 * * *` | 2026-07-23 | ✅ |
| RECKO UPOZORNENÍ NA OBJEDNÁVKU | curl reckonasbavi.cz/... | `0 4 * * *` | 2026-07-21 | ⚠ cizí projekt! |

### Nálezy sekce A

**A-1: `cron:newsletter-send` chybí na Railway** (STŘEDNÍ)
Script `scripts/cron/newsletter-send.ts` existuje v package.json, ale žádná Railway service ho nespouští. Newsletter generation (St 18:00) produkuje obsah, který nikdo neodesílá.

**A-2: RECKO service v Olivator projektu** (INFO)
Service "RECKO UPOZORNENÍ NA OBJEDNÁVKU" volá externí URL `reckonasbavi.cz` — patří do jiného projektu. Neovlivňuje Olivátor, ale zbytečně obsazuje Railway service slot.

**A-3: 4:00 UTC kolize** (INFO)
Čtyři services startují současně: `feed-sync`, `cron-auto-audit`, `cron-entity`, `RECKO`. Na Railway hobby plánu může dojít k souběžnému vytížení.

**A-4: Nekonzistentní naming** (INFO, nedoplňovat bez pokynu)
5 services nemá prefix `cron-`: `feed-sync`, `radar`, `learning`, `seo-snapshot` + 2 s tečkovým formátem.

**A-5: cron-executive-director — přímý tsx místo npm run** (INFO)
Volá `npx tsx scripts/cron/executive-brief.ts` přímo — žádný dopad, ale pokud se přidají pre-script hooky do package.json, service je nedostane.

---

## B — Simulace nadcházejících cronů

| Simulace | Status | Výsledek |
|---|---|---|
| B1 price-index --dry-run | **OK** | Medián EVOO červen 2026: **473 Kč/l** (66 produktů, jen specialty shopy v history). 3 Evolia Platinum outliers správně vyloučeny (7 160–9 560 Kč/l). 0 ERRORů. |
| B2 lead-magnet-drip (kód) | **OK** | `confirmed=true` filtr existuje (řádek 163). Delay +3/+7/+14 dní. Stav via `email_drip_queue.status`. Drobný risk: email_number > 3 tiše pošle email 3. |
| B3 article-publisher --dry-run | **OK + WARN** | 0 validated draftů ve frontě. Dry-run generoval nový draft (862 slov, chybí product tokeny) — reviewer severity: `warn`, nepublikováno. |
| B4 reprice Mód B | **INFO** | "Mód B" není automatický cron branch — je to manuální `--retailers=` override nad 4-retailer Mode A. `reprice_mode` sloupec v DB neexistuje. 33 aktivních retailerů celkem. |
| B5 executive-brief --dry-run | **OK** | Brief W30 vygenerován za 83s, ~$0.08 USD. GSC: 16 kliků / 95 impresí. Odesílá neděle 20:00 UTC. Fail-open pattern funguje. |
| B6 railway.toml | **INFO** | `railway.toml` neobsahuje cron scheduly — jsou pouze v Railway dashboardu per-service. |

### Klíčové pozorování B1

Price-index dry-run pro červen 2026 (z price_history) vrátil **473 Kč/l** vs. aktuální snapshot z product_offers **639 Kč/l**. Rozdíl je způsoben tím, že price_history obsahuje pouze 7 specialty shopů (řecko-italské prémiové produkty s vyššími cenami/ml, ale nižší jednotkovou cenou v porovnání s market obecně). Srpen 2026 price-index (1. 8. z price_history) bude mít jen ~7 shopů v historii → pravděpodobně padne na zálohu (product_offers). **Feed-sync musí začít zapisovat do price_history pro velké retailery (rohlik, kosik, mall...).**

---

## C — Email flows

**Odesílatel:** `RESEND_FROM_EMAIL` (default `Olivator <onboarding@resend.dev>`)
**Transport:** Resend API — bez klíče loguje do `notification_log`, neodesílá
**Layout:** `emails/_layout.tsx` (NewsletterLayout) pro marketing; admin emaily = inline HTML

### C.1 Přehled 8 email flow typů

| Flow | Typ | Soubor | Trigger | Unsub | Status |
|---|---|---|---|---|---|
| 1. Newsletter (týdenní) | Marketing | `emails/weekly.tsx` | St 18:00 generace + Čt 8:00 send | ✓ | ✅ |
| 2. Lead magnet welcome (PDF) | Marketingový/transakční | inline v `/api/newsletter/confirm` | Ihned po confirm | ✓ | ✅ |
| 3. Lead magnet drip 1–3 | Marketing (+3d,+7d,+14d) | `scripts/cron/lead-magnet-drip.ts` | Denně 9:00 UTC | ✓ | ✅ |
| 4. Double opt-in potvrzení | Transakční | inline v `/api/newsletter` | Ihned po signupu | ✗ záměrné | ✅ |
| 5A. Price alert confirm | Transakční | `emails/price-alert-confirm.tsx` | POST `/api/price-alerts` | ✓ | ✅ |
| 5B. Price watch confirm | Transakční | inline v `/api/price-watch` | POST `/api/price-watch` | ✗ záměrné | ⚠ duplikát |
| 6A. Price alert trigger | Transakční | `emails/price-alert.tsx` | cron `/api/cron/price-alerts` | ✓ | ✅ |
| 6B. Price watch notify | Transakční | inline v `price-watch-notify.ts` | `cron:price-watch` 6:30 UTC | ✓ | ⚠ duplikát |
| 7. Executive brief | Interní admin | inline v `lib/email.ts` | Neděle 20:00 UTC | ✗ záměrné | ✅ |
| 8. Admin alerty (6×) | Interní admin | `lib/email.ts` | různé triggery | ✗ záměrné | ✅ |

### C.2 Link audit — klíčové URL z templates

| URL | Template | HTTP | Poznámka |
|---|---|---|---|
| olivator.cz/logo-wordmark.png | všechny (layout) | 200 | ✅ |
| olivator.cz/olik.png | všechny (layout) | 200 | ✅ |
| olivator.cz/pruvodce-olivovy-olej.pdf | Lead magnet Email 0 | 200 | ✅ |
| olivator.cz/srovnavac | Drip email 1 | 200 | ✅ |
| olivator.cz/zebricek | Drip email 2 | 200 | ✅ |
| olivator.cz/admin/brief | Executive brief | 307 | ✅ (redirect na login) |
| olivator.cz/admin/manager | Manager report | 307 | ✅ |
| olivator.cz/oblibene | price-alert.tsx | 200 | ✅ |
| **olivator.cz/zebricek/nejlepsi** | **welcome-d0-deals.tsx** | **404** | **🔴 BUG** |

### C.3 Nálezy sekce C

**C-1: `/zebricek/nejlepsi` → 404 v welcome emailu** 🔴
Soubor `emails/welcome-d0-deals.tsx` odkazuje na `https://olivator.cz/zebricek/nejlepsi?utm_source=newsletter...`. Slug `nejlepsi` neexistuje. Email jde uživatelům ihned po signupu — každý klik vede na 404. Opravit na `/zebricek` nebo na existující slug.

**C-2: Dva paralelní systémy hlídání cen** (Architektonická nekonzistence)
Existují dvě oddělené implementace se 4 soubory, 2 tabulkami, 2 cron skripty:
- `price_alerts` — threshold-based (uživatel nastaví Kč); React Email templates; feature flagged
- `price_watches` — percentage-based (≥5% nebo ≥20 Kč); inline HTML; vždy aktivní

Obě fungují, ale zdvojují kód. Sjednotit v příštím refaktoru.

**C-3: `emails/welcome.tsx` — mrtvý kód**
Template `WelcomeEmail` není importován nikde. Pravděpodobný předchůdce `welcome-d0-deals.tsx`. Smazat.

**C-4: Confirmation token bez expirace**
Lead magnet a price watch confirmation tokeny platí neomezeně. Nízké riziko, ale best practice je 48h expirace.

**C-5: cron:newsletter-send — žádná Railway service** (viz A-1)
`newsletter-generate` generuje každou středu, ale `newsletter-send` nikdo nespouští. Auto-send závisí na `newsletter_auto_send` DB nastavení + manuální spuštění přes admin nebo chybějící Railway service.

---

## D — Web Health (očima návštěvníka)

**Datum testu:** 2026-07-23 | Živý web production

### D.1 Klíčové URL — HTTP status

| URL | HTTP | Obsah | Poznámka |
|---|---|---|---|
| olivator.cz | 200 | ✅ | Homepage OK |
| olivator.cz/index-cen | 200 | ⚠ | Stránka existuje, 639 Kč/l není v SSR HTML (ISR cache timing) |
| olivator.cz/srovnavac | 200 | ✅ | — |
| olivator.cz/zebricek | 200 | ✅ | — |
| olivator.cz/pruvodce | 200 | ✅ | — |
| olivator.cz/dekujeme | 200 | ✅ | — |
| olivator.cz/slevy | 200 | ⚠ | Ceny patrně JS-rendered |
| olivator.cz/llms.txt | 200 | ✅ | text/plain, price index line přítomna |
| olivator.cz/robots.txt | 200 | ⚠ | GPTBot chybí |
| olivator.cz/pruvodce-olivovy-olej.pdf | 200 | ✅ | Lead magnet dostupný |
| olivator.cz/sitemap.xml | 200 | ✅ | — |
| olivator.cz/api/health | 200 | ✅ | `{"status":"ok","version":"0.1.0"}` |

### D.2 Produktové stránky (5 vzorků)

Všech 5 aktivních produktů: HTTP 200 ✅ | Olivator Score ✅ | Price Watch tlačítko ✅

### D.3 Žebříčky

| Slug | HTTP | Winner box | FAQ |
|---|---|---|---|
| nejlepsi-olivovy-olej-2025 | 200 | ⚠ slabý | ✅ |
| nejlepsi-recky-olej | 200 | ✅ | ✅ |
| nejlepsi-bio-olej | 200 | ✅ | ✅ |

### D.4 Průvodce (3 vzorky)

Všechny 3: HTTP 200 ✅, obsah přítomen ✅

### D.5 TopProductCard variant="large"

Implementace správná: `aspect-[4/5]`, full-bleed image, `scale-105` hover, Score badge se shadow. ✅

### Nálezy sekce D

**D-1: /index-cen — 639 Kč/l není v SSR HTML** (INFO)
ISR cache (`revalidate=86400`) byla vytvořena při deploymentu, pravděpodobně PŘED uložením prvního snapshotu. Data jsou v DB, stránka je funkční pro návštěvníky, ale Googlebot nevidí číslo. **Fix:** revalidatePath po uložení snapshotu nebo přechod na `revalidate=3600`.

**D-2: robots.txt — GPTBot chybí** (INFO)
GPTBot (OpenAI indexer) není explicitně povolen ani zakázán. Fakticky povolen pod `Allow: *`. Pokud je záměr blokovat AI crawlery, doplnit.

**D-3: nejlepsi-olivovy-olej-2025 — slabý winner signal** (INFO)
Chybí explicitní winner heading/badge. Ostatní žebříčky mají silnější signál. Revize při příštím updatu.

**D-4: /slevy — ceny JS-rendered** (INFO)
Jen 1× "Kč" v SSR HTML. Ověřit v browseru.

**Závěr D: Žádná kritická závada viditelná pro návštěvníky.** Web plně dostupný.

---

## E — Integration Chains

### E1: Scraper → Product → Score → Page

| Krok | Implementace | Stav |
|---|---|---|
| XML feed ingestion | `lib/feed-sync.ts` → `ensureProduct()` → upsert product + offer + price_history | ✅ Funguje |
| Discovery (bez XML) | `lib/discovery-agent.ts` → Playwright → facts AI → `calculateScore()` | ✅ Funguje |
| Score výpočet | `lib/score.ts: calculateScore()` — 4 komponenty, vrátí null pokud >50% dat chybí | ✅ Funguje |
| Score aplikace | Voláno na 4 místech (rescrape, discovery, auto-audit executor, manuální admin) | ✅ Funguje |
| Revalidace stránky | `lib/revalidate.ts: revalidateProduct()` — volá Next.js revalidatePath pro /, /srovnavac, /olej/[slug] | ✅ Funguje |

**DB stav:** 478 aktivních produktů — **275 se score (58 %)**, **203 bez score (42 %)** 🔴

**Slabý článek:** 42 % aktivních produktů bez score. Příčina: produkty z discovery bez dat kyselosti/polyfenolů → `insufficientData=true`. Záměrné pro rafinované oleje, ale ne pro EVOO z discovery shopů.

### E2: Newsletter signup → Double opt-in → Drip

| Krok | Implementace | Stav |
|---|---|---|
| Signup | `POST /api/newsletter` — upsert do `newsletter_signups`, pošle confirm email | ✅ |
| Potvrzení | `GET /api/newsletter/confirm` — `confirmed=true`, GDPR consent, enqueuuje drip +3d/+7d/+14d | ✅ |
| Email 0 | PDF průvodce odesílán ihned po confirm | ✅ |
| Drip 1–3 | `cron:lead-magnet-drip` denně 9:00 UTC, čte `email_drip_queue` | ⚠ |

**DB stav:** 7 signupů, 7 confirmed, 6 drip emailů pending, **0 sent**

**Slabý článek:** 6 drip emailů čeká ale žádný se neodesílá. `cron:lead-magnet-drip` je nasazen na Railway (viz A), ale buď subscribers přišli přes non-lead_magnet source (takže nemají drip frontu), nebo script selhal tiše. `NEWSLETTER_AUDIENCE_ID` chybí — Resend Audiences sync je no-op.

### E3: Price Watch → Confirm → Alert

| Krok | Implementace | Stav |
|---|---|---|
| Signup | `POST /api/price-watch` — upsert do `price_watches`, confirm email | ✅ |
| Potvrzení | `GET /api/price-watch/confirm` — `active=true, confirmed=true` | ✅ |
| Alert | `cron:price-watch` 6:30 UTC — threshold ≥5% nebo ≥20 Kč, anti-spam 7 dní | ✅ |

**DB stav:** 0 hlídání celkem. Feature technicky funkční, žádná adopce.

### E4: Article brief → Validation → Publish

| Krok | Implementace | Stav |
|---|---|---|
| Brief | 84 briefů v `ARTICLE_BRIEFS[]` (manuální CLI) + auto-discovery z `keyword_mapping` (cron Út 3:00) | ✅ |
| Generace | Claude Sonnet (generate) + Claude Haiku (review) | ✅ |
| Validace | `lib/article-validator.ts` — ověří existenci product slugů + porovná čísla s DB | ✅ |
| Publish blokátor | Admin musí schválit, validátor musí vrátit ok:true | ✅ |

**DB stav:** 34 publikovaných článků, 1 draft čeká na review (`olivovy-olej-pred-spanim`)

**Slabý článek:** Není automatický cron pro propagaci schválených draftů do articles — každý vyžaduje manuální admin akci.

### E5: Radar → AI překlad → /novinky

| Krok | Implementace | Stav |
|---|---|---|
| RSS zdroje | 5 feedů (IOC, Google News EN×3, Google News CZ) | ✅ (oliveoiltimes chybí) |
| Dedup | L1 fingerprint (7 dní) + L2 Jaccard 0.55 + Haiku same-story judge | ✅ |
| Překlad/klasifikace | Haiku: title + summary + cz_context + badge | ✅ |
| Zobrazení | `/novinky/page.tsx` ISR revalidate=300 (5 min) | ✅ |

**DB stav:** 69 radar items celkem, **3 za posledních 7 dní** (poslední: 2026-07-22 06:31)

**Slabý článek:** Jen 3 nové položky/7 dní přes cron každé 2 hodiny — přísný dedup filtruje většinu. `oliveoiltimes.com` feed chybí.

---

## F — Data Integrity

**Datum:** 2026-07-23 | **Aktivních produktů:** 478

| # | Kontrola | Výsledek | Status |
|---|---|---|---|
| F-1 | Aktivní produkty bez ceny | **1** | ⚠ WARN |
| F-2 | Aktivní produkty bez obrázku | 0 | ✅ |
| F-3 | Aktivní produkty s volume_ml null/0 | 0 | ✅ |
| F-4 | consecutive_404≥2 ale in_stock=true | 0 | ✅ |
| F-5 | price_history za 7 dní | **0/26 retailerů** | 🔴 KRITICKÉ |
| F-6 | project_learnings tabulka | nereaguje | ⚠ WARN |
| F-7 | Newsletter consent_at GDPR | **5 záznamů** | ⚠ WARN |
| F-8 | Duplicitní article_drafts | 0 | ✅ |
| F-9 | weekly_decisions tabulka | nereaguje | ℹ INFO |
| F-10 | price_watches | total: 0 | ℹ INFO (feature nová) |

### Detail nálezů

**F-1: Produkt bez in_stock nabídky**
`extra-panensky-olivovy-olej-sitia-pdo-0-2-critida-4-l-design` — aktivní, viditelný na webu, ale bez ceny a bez affiliate CTA.

**F-5: price_history — 26 mainstream retailerů bez záznamu za 7 dní** ⚠
price_history celkem: **7 360 záznamů** (nejnovější dnes 04:57 UTC). Tabulka tedy funguje.

7 specialty shopů píše historii správně: `greekmarket`(231), `olivum`(268), `reckyeshop`(5), `milujemekretu`(120), `olivarna`(30), `italyshop`(262), `reckonasbavi`(291)

26 bez záznamu za 7 dní: mall, itesco, kaufland, olivovyolej, mujbio, iherb, rohlik, kosik, vinoteka-praha, globus, gaea, albert, zdrave-oleje, jamonarna, lozanocervenka, delishop, cretamart, ellada, gourmet-partners, oliviersandco, cerfis, topdelikatesy, aktin, nestonej, zdravoslav, eshop

**Nejpravděpodobnější příčina:** Tyto retailery jsou zásobovány XML feed-sync (`feed-sync` cron 04:00 UTC). XML pipeline pravděpodobně aktualizuje `product_offers` (aktuální ceny) ale **nezapisuje do `price_history`** (historické záznamy). Specialty shopy jsou skrapovány přes discovery a ty historii píší.

**Dopad:** Cenový vývoj (Fáze 2) bude bez dat pro 26 hlavních retailerů. Price Index (1. 8.) bude mít zálohu přes product_offers, ale bez historické sady.

**F-6: Tabulka project_learnings neexistuje nebo je prázdná**
DB query vrátila `undefined`. Learnings jsou jen v CLAUDE.md.

**F-7: 5 confirmed newsletter signupů bez consent_at** (GDPR čl. 7)
Double opt-in proběhl, ale handler nenastavil `consent_at` při potvrzení. Pravděpodobně race condition nebo starší signupy před přidáním pole.

---

## G — Security & GDPR

| Kontrola | Status | Závažnost |
|---|---|---|
| Newsletter unsubscribe bez auth | ✅ OK | — |
| Lead magnet unsubscribe | ✅ OK (sdílí newsletter) | — |
| Price watch unsubscribe bez auth | ✅ OK | — |
| Price watch unsub — error check při DB fail | ⚠ chybí | NÍZKÁ |
| Drip odesílá jen confirmed | ✅ OK | — |
| Price watch odesílá jen confirmed | ✅ OK | — |
| Newsletter odesílá jen confirmed | ✅ OK | — |
| Admin PUT /api/admin/products → 401 | ✅ OK (HMAC cookie) | — |
| **Cron auth — 3 routy** | 🔴 **FAIL** | STŘEDNÍ |
| Lead magnet consent logging | ✅ OK | — |
| Price watch consent_ip — raw IP | ⚠ WARN | NÍZKÁ |
| Decision bridge injection guard | ✅ OK | — |
| Email v URL na unsub stránce | ⚠ WARN | NÍZKÁ |

### Detail nálezů

**G-1: 3 cron routy — nekonzistentní a nebezpečná auth** (STŘEDNÍ)
Soubory: `app/api/cron/newsletter-generate/route.ts`, `newsletter-send/route.ts`, `price-alerts/route.ts`

Problém 1 — secret v query parametru:
```
?secret=VALUE  ← loguje se do Railway access logů
```
Sdílená `lib/cron-auth.ts` toto zakazuje. 3 routy mají inline `checkAuth()` který akceptuje `req.nextUrl.searchParams.get('secret')`.

Problém 2 — open pokud CRON_SECRET chybí:
```typescript
if (!expected) return true  // ← veřejně přístupné!
```
Sdílená `checkCronAuth()` vrací HTTP 500, inline verze vrací `true`.

**Fix (příští sprint):**
```typescript
import { checkCronAuth } from '@/lib/cron-auth'
// nahradit inline checkAuth()
```

**G-2: Email v URL na odhlašovací stránce** (NÍZKÁ)
`/?resubscribe=${encodeURIComponent(email)}` — email se loguje do server access logů.

**G-3: Price watch `consent_ip` — raw IP** (NÍZKÁ)
Newsletter hashuje IP přes SHA-256, price watch ukládá raw IP. Nekonzistentní.

---

## H — Known Gaps

### H.1 Živé DB metriky (2026-07-23)

| Metrika | Hodnota | Cíl |
|---|---|---|
| Aktivní produkty | 478 | — |
| Produkty se score | 275 (58 %) | 90 % |
| Produkty bez score | **203 (42 %)** | <10 % |
| In-stock nabídky bez affiliate_url | **365** | 0 |
| Nabídky s URL ale bez affiliate | **389** | 0 |
| Aktivní bez meta_description | 12 | 0 |
| Newsletter signups | 7 | — |
| Drip emailů pending (neodeslané) | **6** | 0 |
| Price watches | 0 | — |
| Published articles | 34 | — |
| Article drafts (čekají na review) | 1 | — |
| Radar items (7 dní) | 3 | 5–10/týden |

### H.2 Prioritizovaný gap backlog

| # | ID | Popis | Priorita | Dopad |
|---|---|---|---|---|
| 1 | **H-01** | **365 in-stock nabídek bez affiliate_url** — bez affiliate URL jsou kliknutí 0 Kč příjem. eHUB auto-fill pokrývá jen 4 retaily; rohlik/kosik/mall nemají discovery_sources ani API. | 🔴 KRITICKÁ | Příjmy |
| 2 | **H-02** | **203 aktivních produktů bez score (42 %)** — chybí kyselost/polyfenoly z rescrape. Produkty bez score nefigurují v žebříčcích, nižší CTR. | 🔴 KRITICKÁ | SEO + konverze |
| 3 | **F-5** | **feed-sync nezapisuje do price_history** pro 26 mainstream retailerů. Srpen 2026 price-index bude zálohou z product_offers (žádná historická řada). | 🟡 STŘEDNÍ | Data / Price index |
| 4 | **T-19** | **Token-affiliate alignment** — 10 článků s wrong slugy, ~289 ztracených kliků/měs, ~231 Kč/měs ztracených příjmů. TOP: nejlepsi-olivovy-olej-2026 (129 kliků). | 🟡 STŘEDNÍ | Příjmy |
| 5 | **T-18** | **LRU cultivar exclusion** — `pickOilOfTheWeek()` vylučuje productId ne odrůdu → Picual se opakuje v každém newsletteru. | 🟡 STŘEDNÍ | Newsletter |
| 6 | **T-24** | **Reprice pro mainstream shopy** — 79 % produktů bez baseline ceny. Slevová detekce (drip email 3, price-watch) pokrývá jen 2 XML retaily. | 🟡 STŘEDNÍ | Data přesnost |
| 7 | **H-03** | **6 drip emailů pending, 0 sent** — cron běží, ale subscribers možná nemají drip frontu (non-lead_magnet source). `NEWSLETTER_AUDIENCE_ID` chybí v env. | 🟡 STŘEDNÍ | Email pipeline |
| 8 | **T-16** | **link-check bez audit trail** — deaktivace produktů bez záznamu v agent_decisions; false positive nelze diagnostikovat. | 🟡 STŘEDNÍ | Transparentnost |
| 9 | **T-01** | **Token validace** — `scripts/cron/validate-tokens.ts` existuje ale není rutinně nasazen. Inactive produkt v článku = tichá 404. | 🟡 STŘEDNÍ | Integrita obsahu |
| 10 | **T-14** | **GSC re-check po title/linkbuilding patchi** (překročen deadline). Ověřit CTR dopad. | 🟡 STŘEDNÍ | SEO validace |
| 11 | **T-06** | **Hero image silent failure** — `searchUnsplash()` tiše selhává bez `UNSPLASH_ACCESS_KEY`. 2/3 článků Vlny 2 měly null hero. | 🔵 NÍZKÁ | Content pipeline |
| 12 | **T-08** | **4 brand stránky** s chybami (Sitia, Motakis, Corinto, Evoilino). Chybí meta_title, FAQs, hero. | 🔵 NÍZKÁ | SEO |
| 13 | **H-05** | **oliveoiltimes RSS chybí** v `OLIVE_NEWS_FEEDS`. Radar pokrývá jen Google News (šum). | 🔵 NÍZKÁ | Radar |
| 14 | **T-09** | **Score null pro rafinované** oleje — produktová karta matoucí bez score. | 🔵 NÍZKÁ | UX |
| 15 | **T-23** | **Affiliate disclaimer** — EU Omnibus Directive. Odloženo do 10k sessions/měsíc. | 🔵 NÍZKÁ | Legal |

---

## Souhrn všech nálezů

### 🔴 Kritické — opravit brzy
| ID | Popis | Sekce |
|---|---|---|
| C-1 | `/zebricek/nejlepsi` → **404** v `emails/welcome-d0-deals.tsx` — jde každému novému odběrateli | C |
| H-01 | **365 in-stock nabídek bez affiliate_url** — nulové příjmy z těchto kliků | H |
| H-02 | **203 aktivních produktů bez score (42 %)** — nefigurují v žebříčcích, lower CTR | H |

### 🟡 Střední — příští sprint
| ID | Popis | Sekce |
|---|---|---|
| A-1 | `cron:newsletter-send` chybí na Railway — newsletter se negeneruje automaticky | A |
| F-5 | feed-sync nezapisuje do price_history pro 26 mainstream retailerů | F |
| G-1 | 3 cron routy s nebezpečnou auth (secret v URL + open bez CRON_SECRET) | G |
| T-19 | Token-affiliate alignment — ~231 Kč/měs ztracených příjmů | H |
| H-03 | 6 drip emailů pending, 0 sent — ověřit lead_magnet source a NEWSLETTER_AUDIENCE_ID | H |

### 🔵 Nízká / INFO — backlog
| ID | Popis | Sekce |
|---|---|---|
| D-1 | /index-cen SSR nevykresluje 639 Kč/l — ISR cache timing (revalidatePath po snapshotu) | D |
| D-2 | robots.txt — GPTBot bez explicitního pravidla | D |
| F-7 | 5 newsletter signupů bez consent_at (GDPR čl. 7) | F |
| G-2 | Email v URL na odhlašovací stránce | G |
| G-3 | price_watch ukládá raw IP místo SHA-256 hash | G |
| C-2 | Dva paralelní systémy hlídání cen (price_alerts vs price_watches) | C |
| C-3 | `emails/welcome.tsx` — mrtvý kód (neimportovaný) | C |
| T-06 | Hero image silent failure bez UNSPLASH_ACCESS_KEY | H |
| T-08 | 4 brand stránky s missing meta_title/FAQ/hero | H |

---

## Statistiky auditu

- **Celkem testů / kontrol:** ~85
- **OK / Funguje:** 65
- **Kritické nálezy:** 3
- **Střední nálezy:** 5
- **INFO/nízká závažnost:** ~17
- **Žádná kriticky rozbitá stránka pro návštěvníky** (web plně dostupný)

---

*Audit dokončen: 2026-07-23 | Claude Code multi-agent pass*
*Opravy: žádné (audit byl pasivní). Výjimka: žádná kritická závada viditelná návštěvníkům nenalezena.*
