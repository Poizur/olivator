# PROJECT-INVENTORY.md — Olivátor.cz

*Vygenerováno: 2026-06-15 | Discovery audit, žádné změny kódu. Zdroj: čtení migrací/scriptů + live Supabase REST dotazy + Railway GraphQL API.*

Účel dokumentu: kompletní mapa toho, co Olivátor dnes je — pro audit a automatizační roadmap. Kde si nejsem jistý, je to napsáno explicitně jako "nevím, potřebuje ověření" — žádná hodnota v tomto dokumentu není dohádaná.

---

## ČÁST 1 — ARCHITEKTURA & DEPLOY

### Tech stack
- **Next.js 16.2.3** (App Router), **React 19.2.4**, **TypeScript ^5** (`package.json:25-32`)
- `tsconfig.json`: `target: ES2017`, `strict: true`, `moduleResolution: bundler`, alias `@/*` → `./*`. **`exclude: ["node_modules", "scripts"]`** — `/scripts` je mimo typecheck, takže chyby typů v cron scriptech `tsc`/`next build` neodhalí.
- DB klient: `@supabase/supabase-js ^2.104.0`
- Styling: Tailwind CSS `^4`
- AI SDK: `@anthropic-ai/sdk ^0.90.0`, centrální wrapper `lib/anthropic.ts`
- Email: `@react-email/components` + `react-email` pro šablony; odesílání přímým `fetch()` na Resend REST API v `lib/email.ts` (žádný `resend` npm balíček)
- HTML parsing: `cheerio ^1.2.0`
- Node engine: `>=20.18.0`
- `next.config.ts`: redirecty (kanibalizace merge, staré GSC URL), `images.minimumCacheTTL: 2592000` (30 dní), remote patterns pro Supabase Storage / Shoptet CDN / Open Food Facts / Unsplash
- **CI: žádné.** `.github/workflows/` neexistuje. Jediná build validace je Railway Nixpacks build samotný.

**Zásadní nesoulad s CLAUDE.md:** sekce 2/11/14 CLAUDE.md popisují scraping stack jako **Playwright + Puppeteer** a věnují celou sekci 11 Railway+Playwright konfiguraci (BUG-016). Reálně **žádný z těchto balíčků není v `package.json`** a grep po `playwright`/`puppeteer`/`chromium.launch` v `/lib` a `/scripts` nevrací nic. Scraping běží čistě přes `fetch()` + `cheerio` (`lib/shop-crawlers.ts`, `lib/product-scraper.ts`). Buď je CLAUDE.md zastaralý popis rané fáze vývoje, nebo je to mezera pro JS-heavy e-shopy, které cheerio nezvládne (žádný JS render). Vyžaduje rozhodnutí Architekta — viz Část 7.

### Environment variables (názvy, ne hodnoty)

| Proměnná | Kde se používá | V `.env.local` |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase.ts`, `next.config.ts`, napříč app | ano |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend Supabase klient | ano |
| `SUPABASE_SERVICE_KEY` | `lib/supabase.ts` (server-side singleton) | ano |
| `ANTHROPIC_API_KEY` | `lib/anthropic.ts`, `scripts/generate-entity-meta.ts` | ano |
| `ADMIN_SECRET_KEY` | admin auth middleware | ano |
| `CRON_SECRET` | cron API routes (`x-cron-secret` header) | ano |
| `UNSPLASH_ACCESS_KEY` | `lib/unsplash.ts`, `lib/audit-applier.ts` | ano |
| `PEXELS_API_KEY` | `lib/pexels.ts`, `lib/image-search.ts` | ano |
| `RESEND_API_KEY` | `lib/email.ts` | ano |
| `RESEND_FROM_EMAIL` / `RESEND_NEWSLETTER_FROM` | `lib/email.ts`, `lib/newsletter-sender.ts` | ano |
| `RESEND_WEBHOOK_SECRET` | `app/api/webhooks/resend/route.ts` | ano |
| `NEXT_PUBLIC_GA4_ID` | `app/layout.tsx` | ano |
| `ALERT_EMAIL` | monitoring/alert logika | ano |
| `GITHUB_TOKEN` / `GITHUB_REPO` | learning agent (git commit analýza) | ano |
| `RAILWAY_TOKEN` | manuální Railway API dotazy (mimo app kód) | ano |
| `SUPABASE_MANAGEMENT_TOKEN` | management API skripty | ano |
| `NODE_ENV` | obecně | ano |
| `GSC_SERVICE_ACCOUNT_KEY`, `GSC_SITE_URL` | `lib/gsc.ts` | **NE — ověřeno, 0 výskytů `GSC_` v `.env.local`** |
| `NEXT_PUBLIC_SITE_URL` | absolutní URL generování | ne |
| `AUDIT_DRY_RUN`, `MEDIUM_PASS_MAX_COST`, `VERBOSE`, `NEWSLETTER_AUDIENCE_ID` | audit/cron cost-control flagy | ne |

**Ověřeno přímo (`grep -ic "GSC_" .env.local` → 0):** GSC integrace (`lib/gsc.ts`, admin `/admin/gsc` stránka existuje) nemá v `.env.local` ani jednu ze svých dvou required proměnných. Buď GSC dashboard v adminu dnes neběží / vrací prázdná data, nebo se autentizace řeší jinak (např. jiný název proměnné, nebo soubor mimo `.env.local`). CLAUDE.md sekce 24 i moje starší memory tvrdí "GSC verification hotovo 2026-04-29" — to je v rozporu s aktuálním nálezem. **Potřebuje verifikaci s Architektem, ne domněnku.**

### Git workflow
- Větve: `main` + 7 dalších (`feature/article-product-integrity`, `feature/article-product-tokens`, `deploy/nejprodavanejsi-redesign`, `seo-phase-all-2026-05-26`, `seo/vlna1-title-fixes`, `olik-strategic-sprint`, plus `claude/*` worktree větve). **Žádná `staging` větev** navzdory CLAUDE.md sekci 22, která ji předpokládá.
- Posledních 10 commitů je přímo na `main` — pracovní vzor je "commit rovnou na main", feature větve existují paralelně ale nejsou hlavní cesta.
- `railway.toml` (22 řádků) obsahuje jen `[build]` (Nixpacks) a `[deploy]` (healthcheck, restart policy). **Neobsahuje žádnou zmínku o tom, která branch spouští auto-deploy** — to se nastavuje výhradně v Railway dashboardu per-service, mimo repo.
- Cron schedule (časy) pro jednotlivé Railway cron services **nejsou nikde v repu jako strojově čitelný config** — `railway.toml` cron expressions neobsahuje vůbec. Časy v CLAUDE.md sekci 14 a v docstringech jednotlivých scriptů (`scripts/cron/*.ts`) jsou dokumentační záznam, ne živý zdroj pravdy. **Potřebuje ověření přímo v Railway dashboardu** — žádný textový soubor v repu garantuje, že tam tyto časy reálně jsou nastavené.

### Railway services (15 živě, GraphQL dotaz)

| Service | npm script | Script file | Role |
|---|---|---|---|
| `olivator` | `start` (`next start`) | — | hlavní web |
| `cron-entity` | `cron:entity-aggregate` | `scripts/cron/entity-aggregate.ts` | cron |
| `feed-sync` | `cron:feed-sync` | `scripts/cron/feed-sync.ts` | cron |
| `radar` | `cron:radar` | `scripts/cron/radar.ts` | cron |
| `learning` | `cron:learning` | `scripts/cron/learning.ts` | cron |
| `cron-discovery` | `cron:discovery` | `scripts/cron/discovery.ts` | cron |
| `cron-prospect` | `cron:prospect` | `scripts/cron/prospect.ts` | cron |
| `cron-link-check` | `cron:link-check` | `scripts/cron/link-check.ts` | cron |
| `services.seasonal-dispatcher` | `cron:seasonal-dispatcher` | `scripts/cron/seasonal-dispatcher.ts` | cron |
| `services.welcome-dispatcher` | `cron:welcome-dispatcher` | `scripts/cron/welcome-dispatcher.ts` | cron |
| `cron:lab-research` | `cron:lab-research` | `scripts/cron/lab-research.ts` | cron |
| `cron-proposal-audit` | `cron:proposal-audit` | `scripts/cron/proposal-audit.ts` | cron |
| `cron-auto-audit` | `cron:auto-audit` | `scripts/cron/auto-audit.ts` | cron |
| `seo-snapshot` | `cron:seo-snapshot` | `scripts/cron/seo-snapshot.ts` | cron |
| `cron-newsletter-generate` | `cron:newsletter-generate` | `scripts/cron/newsletter-generate.ts` | cron |

14 cron služeb + 1 web služba = 15. Žádná samostatná "worker" role (Next.js API routes pod `/app/api/cron/*` slouží jako fallback/manuální trigger pro stejnou logiku, ne jako oddělená infrastruktura). `manager` (`cron:manager`) a `newsletter-send` (`cron:newsletter-send`) existují jako npm scripty a script soubory, ale **nebyly v živém seznamu 15 Railway služeb** — buď neběží jako samostatná služba, nebo běží pod jiným jménem v dashboardu. Potřebuje ověření.

### External services

| Služba | Role | Kde |
|---|---|---|
| **Supabase** | Primární Postgres DB + Storage | `lib/supabase.ts` (jediný singleton) |
| **Anthropic/Claude API** | Content generation, score zdůvodnění, entity meta, prospect klasifikace | `lib/anthropic.ts` |
| **Unsplash** | Editorial fotky (články, entity stránky) | `lib/unsplash.ts` |
| **Pexels** | Druhý obrázkový fallback | `lib/pexels.ts`, `lib/image-search.ts` |
| **Resend** | Newsletter + transakční email + webhook bounce tracking | `lib/email.ts`, `app/api/webhooks/resend/route.ts` |
| **Heureka Affiliate** | Affiliate síť + XML feed zdroj (`xml_feed_format='heureka'`) | `lib/heureka-feed-parser.ts`, `lib/feed-sync.ts` |
| **Dognet** | Affiliate síť (volba v retailer formuláři) | `retailer-form.tsx` dropdown |
| **CJ Affiliate** | Zmíněno jen v `/o-projektu` marketingovém textu — **žádná kódová integrace nalezena** | — |
| **Google Search Console** | SEO dashboard v adminu | `lib/gsc.ts` — env vars chybí, viz výše |
| **GA4** | Web analytics | `app/layout.tsx` přes `@next/third-parties` |
| **Sentry/error tracking** | **Nenalezeno nic** | — |

---

## ČÁST 2 — DATABÁZE (Supabase Postgres)

Zdroj pravdy pro úplnost seznamu tabulek: `supabase/migrations/20260515_enable_rls.sql` vyjmenovává **57 tabulek** v `public` schématu. 55 z nich má živě ověřený row count (`users` a `wishlists` jsou Fáze 2 prázdné tabulky — 0 a 0 řádků, to je očekávané).

**Důležitý nález:** `brands`, `regions`, `cultivars`, `entity_images`, `product_cultivars`, `audit_runs`, `product_data_audit`, `gsc_keyword_metrics`, `seo_activity_log`, `seo_metric_snapshots`, `seo_notes` **nemají žádný `CREATE TABLE` v migration historii** — jen `ALTER TABLE` na ně odkazují, jako by existovaly samo sebou. Vznikly mimo migration flow (ručně v Supabase dashboardu nebo neuloženým skriptem). To znamená: **pro klíčové content-entity tabulky (brands/regions/cultivars) neexistuje v repu source-of-truth DDL** — recovery/staging replikace schématu by je musela rekonstruovat odjinud.

### Hlavní tabulky

**`products`** — `20260413_initial_schema.sql` + ~10 ALTER migrací. Klíčové sloupce: `ean` UNIQUE, `slug` UNIQUE, `origin_country`, `type` CHECK(evoo/virgin/refined/olive_oil/pomace), `acidity`, `polyphenols`, `olivator_score` CHECK(0-100), `score_breakdown` JSONB, `status` CHECK(**draft/active/inactive/excluded** — ověřeno živě v `20260504_products_status_excluded.sql:15`), `status_reason`, `custom_faqs` JSONB.
**Live: 489 total = 463 active, 0 draft, 24 inactive, 2 excluded.**
Writers: ~90 souborů (`lib/discovery-agent.ts`, `lib/feed-sync.ts`, `lib/product-rescrape.ts`, `lib/quality-rules.ts`, `lib/manager-agent.ts`, desítky jednorázových `scripts/backfill-*.ts`/`scripts/fix-*.ts`, `app/api/admin/products/**`).
Readers: `app/go/[retailer]/[slug]/route.ts`, `app/oblast|odruda|znacka/[slug]/page.tsx`, `app/sitemap.ts` (filtr `status='active'`, ověřeno).

**`product_offers`** — `product_id`/`retailer_id` FK, `price`, `in_stock`, `affiliate_url`, `commission_pct`, UNIQUE(product_id, retailer_id). **Live: 492.**

**`retailers`** — `slug` UNIQUE, `affiliate_network`, `xml_feed_url`/`xml_feed_format` (routing pro feed-sync). **Live: 33, všech 33 `is_active=true`.**

**`brands`** — bez CREATE TABLE v migracích (jen ALTER: founded_year, timeline, tldr, is_featured). **Live: 138.**

**`regions`** — bez CREATE TABLE (ALTER: terroir, tldr, map_image). **Live: 31.**

**`cultivars`** — bez CREATE TABLE (ALTER: flavor_profile, intensity_score, pairing_pros/cons). **Live: 36.**

**`product_images`** — `product_id` CASCADE, `url`, `is_primary`, `sort_order`, `source`. **Live: 1662.**

**`price_history`** — `product_id`, `retailer_id`, `price`, `recorded_at`. **Live: 4407.** Writers jen `lib/discovery-agent.ts`, `lib/feed-sync.ts` — úzké a čisté.

**`affiliate_clicks`** — `click_id` UNIQUE, UTM pole (`20260513_affiliate_clicks_utm.sql`). **Live: 1967.** Writers/readers jen `app/go/[retailer]/[slug]/route.ts`, `lib/data.ts`, `lib/manager-agent.ts`.

**`feature_flags`** — PK = `key`. Seed v CLAUDE.md uvádí 8 řádků (`ai_sommelier`, `wishlist`, `user_profiles`, `visual_search`, `price_alerts`, `ai_search`, `comparator`, `quiz`). **Live ověřeno: jen 5 řádků zbylo** — `wishlist`(false), `price_alerts`(false), `ai_search`(true), `comparator`(true), `quiz`(true). `ai_sommelier`, `user_profiles`, `visual_search` byly **smazány** migrací `20260504_cleanup_zombie_feature_flags.sql`. To je v rozporu s CLAUDE.md sekcí 7, která je popisuje jako "připravené, enabled=false pro Fázi 2/3" — dnes neexistují vůbec, ani jako disabled.

**`newsletter_signups`** — preferences JSONB, unsubscribe_token. **Live: 5.**

**`newsletter_drafts`** — CHECK `campaign_type IN ('weekly','deals','harvest','alert')`, CHECK status. **Live: 3.** (Pozn.: dnešní oprava `services.seasonal-dispatcher` — viz commit `deac25f` — řešila přesně tento CHECK constraint, script posílal `'seasonal'` což constraint odmítal.)

**`seasonal_emails`** — 9 seedovaných šablon. **Live: 9.**

**`welcome_series_queue`** — `subscriber_id` FK CASCADE, `sent`. **Live: 8.**

**`keyword_mapping`** — `keyword` UNIQUE, `search_volume`, `cpc_czk`, `status` default `'unmapped'`. **Live: 201.**

**`rankings`** — `slug` UNIQUE, `product_slugs` TEXT[], `status`. **Live: 16.**

**`recipes`** — `slug` UNIQUE, JSONB ingredients/instructions. **Live: 13 = 13 active, 0 draft, 0 archived.**

**`glossary_terms`** — **Live: 15** (= seed).

**`brand_research_drafts`** — PK = `brand_id` (ne `id`). **Live: 30 = 2 pending_review, 11 applied, 1 rejected, 13 no_url, 3 error.**

**`admin_login_attempts`** — rate-limit pro admin login. **Live: 14.**

**`agent_decisions`** — sdílí migrační soubor s `radar_items` (`20260504_radar_items.sql`, ne samostatný soubor jak by název napovídal). `agent_name`, `decision_type`, `payload` JSONB, `fingerprint` dedup. **Live: 56.**

**`project_learnings`** — sdílí soubor s `agent_decisions`. Komentář v migraci říká "připraveno, neaktivní zatím", ale **live: 164 řádků** — `cron:learning` (pondělí 08:00 UTC dle docstringu) ji aktivně plní.

**`discovery_candidates`** — `status` CHECK(pending/auto_published/auto_added_offer/approved/rejected/needs_review/failed). **Live: 531.**

**`discovery_sources`** — `domain` UNIQUE, `status` CHECK(suggested/enabled/disabled/rejected/failing). **Live: 86.**

### Ostatní tabulky (live count, bez detailního rozboru)

| Tabulka | Live | | Tabulka | Live |
|---|---|---|---|---|
| product_cultivars | 355 | | content_calendar | 33 |
| entity_images | 215 | | strategy_goals | 24 |
| entity_faqs | 410 | | topic_ideas | 0 |
| quality_issues | 885 | | notification_log | 69 |
| quality_rules | 10 | | app_settings | 7 |
| seo_proposals | 149 | | bulk_jobs | 15 |
| seo_tasks | 68 | | market_prices | 3 |
| authors | 1 (Olík) | | general_faqs | 12 |
| recipe_entity_links | 0 | | manager_reports | 1 |
| radar_items | 56 | | price_alerts | 1 |
| newsletter_sends | 8 | | newsletter_events | 0 |
| users | 0 (Fáze 2) | | wishlists | 0 (Fáze 2) |

`audit_runs`, `product_data_audit`, `gsc_keyword_metrics`, `seo_activity_log`, `seo_metric_snapshots`, `seo_notes` — **nevím, nezjišťováno** (nejsou v migracích, live count nebyl pro tyto explicitně dotázán). Doporučuji doplnit v navazujícím kroku.

### Writers/Readers (vzorek hlavních toků)

| Tabulka | Writers | Readers |
|---|---|---|
| products | discovery-agent, feed-sync, product-rescrape, quality-rules, manager-agent, ~50 backfill/fix scripty, admin API | `/go/`, entity stránky, sitemap |
| product_offers | feed-sync, discovery-agent, link-rot-checker, lab-research API | `/go/`, lib/data.ts, newsletter-blocks, article-validator |
| articles | admin articles route, seo-activity, generate-articles.ts, jednorázové patch-*.mts | /pruvodce/[slug], sitemap |
| price_history | jen discovery-agent, feed-sync | /olej/[slug], newsletter-blocks, welcome-series |
| affiliate_clicks | jen /go/ route, manager-agent | lib/data.ts, admin analytics |

`products` writers list (~90 souborů) je nápadně široký — hodně jednorázových `scripts/fix-*.ts`/`backfill-*.ts`. Historicky se opravy dat dělaly ad-hoc skripty místo přes admin UI nebo trvalý rule engine (`lib/quality-rules.ts` dnes částečně nahrazuje). Kandidát na konsolidaci — viz Část 7.

---

## ČÁST 3 — SCRIPTS & AGENTI

Všech 14 cron scriptů sedí v `/scripts/cron/`, identický pattern: `npm run cron:X` → standalone `main()` → `process.exit()`. Většina má kill-timer proti zaseknutí (výjimky bez timeru: `proposal-audit`, `seo-snapshot`, `seasonal-dispatcher`, `welcome-dispatcher`).

| Cron | Soubor | Trigger (dle docstringu/CLAUDE.md — neověřeno v Railway dashboardu) | Dependencies | Failure mode | Output |
|---|---|---|---|---|---|
| entity-aggregate | `scripts/cron/entity-aggregate.ts` → `lib/entity-aggregator.ts` | denně ~03:00 UTC | čte products, zapisuje cultivars | kill timer 10 min | přepočtený flavor_profile/intensity_score |
| feed-sync | `scripts/cron/feed-sync.ts` → `lib/feed-sync-runner.ts` | denně 04:00 UTC | retailers.xml_feed_url, fetch XML | kill timer 15 min, per-retailer try/catch | products(draft), product_offers, price_history |
| radar | `scripts/cron/radar.ts` → `lib/radar-agent.ts` | každé 2h | RSS feedy, Claude Haiku dedup | kill timer 10 min | radar_items → `/novinky` |
| learning | `scripts/cron/learning.ts` → `lib/learning-agent.ts` | pondělí 08:00 UTC | git log, agent_decisions, Claude Haiku | kill timer 15 min | project_learnings (dedup) |
| discovery | `scripts/cron/discovery.ts` → `lib/discovery-agent.ts` (964 ř.) | denně 04:30 UTC | discovery_sources, shop-crawlers, product-scraper, Claude | kill timer **30 min** (nejdelší) | discovery_candidates, products, product_offers |
| prospect | `scripts/cron/prospect.ts` → `lib/prospector.ts` | pondělí 05:00 UTC | curated shop list | kill timer 10 min | discovery_sources(suggested) |
| link-check | `scripts/cron/link-check.ts` → `lib/link-rot-checker.ts` | 2 pasy denně (02:00, 04:00 UTC dle CLAUDE.md) | HTTP check affiliate_url | kill timer 15 min | product_offers/products status flip |
| manager | `scripts/cron/manager.ts` → `lib/manager-agent.ts` | pondělí 05:00 UTC | affiliate_clicks, discovery_candidates, Claude | kill timer 15 min, email best-effort | manager_reports + email |
| seasonal-dispatcher | `scripts/cron/seasonal-dispatcher.ts` | denně 09:00 UTC | seasonal_emails, newsletter_signups, Claude Haiku | **žádný kill timer**, opraveno dnes (commit `deac25f`) | newsletter_drafts + sent emaily |
| welcome-dispatcher | `scripts/cron/welcome-dispatcher.ts` (15 ř., nejmenší) → `lib/welcome-series.ts` | denně 09:00 UTC | welcome_series_queue | žádný kill timer | sent emaily |
| lab-research | `scripts/cron/lab-research.ts` (171 ř.) → `lib/product-lab-research.ts` | nevím, neuvedeno v CLAUDE.md cron tabulce | products bez acidity/polyphenols, brands.website_url | kill timer 20 min **BEZ `.unref()`** (komentář v kódu: "nestihl se spustit, user feedback 2026-05-07" — neuzavřený reliability issue) | acidity/polyphenols/score |
| proposal-audit | `scripts/cron/proposal-audit.ts` → `lib/audit-rules.ts` | 03:00 UTC | generuje návrhy, NEaplikuje automaticky | žádný kill timer | proposals (admin schvaluje) |
| auto-audit | `scripts/cron/auto-audit.ts` (222 ř., 5 kroků) | 04:00 UTC | junk-brand detector (cost limit $0.50/den), quality_issues | per-step error handling | products/brands fixy, rankings repopulate |
| seo-snapshot | `scripts/cron/seo-snapshot.ts` → `lib/seo-activity.ts` | 05:00 UTC | 8 SEO metrik | try/catch → exit(1) | seo_metric_snapshots |
| newsletter-generate | `scripts/cron/newsletter-generate.ts` → `lib/newsletter-composer.ts` | středa 18:00 UTC | Claude | kill timer 3 min | newsletter_drafts (status=draft, čeká na schválení) |
| newsletter-send | `scripts/cron/newsletter-send.ts` | čtvrtek 08:00 UTC | guard `newsletter_auto_send` setting — pokud false, exit bez akce | kill timer 10 min | HTTP self-call na `/api/admin/newsletter/drafts/[id]/send` |

### Generování článků — `scripts/generate-articles.ts` (1234 ř.)

Výhradně manuální CLI: `npx tsx --env-file=.env.local scripts/generate-articles.ts [--slug=X] [--skip-existing|--force] [--dry-run] [--detect-only]`. Žádný cron.

- `ARTICLE_BRIEFS` — hardcoded array v souboru, každý se `slug`/`title`/`category`/`targetKeyword`/`briefPoints`/`unsplashQuery`/`focus_dimension`.
- `focus_dimension` (CLAUDE.md sekce 25) — `FocusDimension` typ s 13 hodnotami, `fetchProductCatalog(focus, limit=35)` routuje na hlavní switch-query nebo speciální `fetchProductsByPrice()`/`fetchProductsByOriginMix()`. `detectFocusDimension()` explicitně **nikdy nečte `body_markdown`** (prevence false positive, řádek 957).
- `CATALOG_RULES` (řádky 710-726) — injektuje se jen když `needsCatalogContext(brief)` = true (kategorie zebricek/srovnani, nebo "top picks" klíčová slova v briefPoints).
- Model: body = `claude-sonnet-4-5` (`max_tokens: 6000`), meta = `claude-haiku-4-5` (`max_tokens: 300`).
- Detekce se loguje do `agent_decisions` — **insert je v try/catch s prázdným catch blokem** (řádek 1006-1008): pokud insert selže, nikdo se to nedozví.
- Hero image: `searchUnsplash()` v `lib/unsplash.ts` **throws** při chybějícím klíči, ale `fetchHero()` to obaluje a tiše vrací `null` + jen `console.warn`. **T-06 z backlogu, stále neopraveno** (ověřeno čtením kódu, ne jen z poznámek).

**Validace:** `lib/article-validator.ts:validateArticle(slug)` — tolerance v kódu: score ±0 (ERROR), kyselost ±0.02 % (ERROR), polyfenoly ±50 mg/kg (WARNING), cena ±100 Kč (WARNING). Omezení zaznamenané přímo v kódu: kyselost/polyfenoly se hledají jen na **prvním řádku** za odkazem (ne celý kontext) — záměrný tradeoff proti false positivům, ale číslo na 2. řádku stejného odstavce proklouzne. `scripts/validate-article-products.ts` je CLI wrapper (`--slug=X` nebo `--all`), exit code 1 při ≥1 erroru, ale **nenalezena evidence že by byl zapojen do CI** (CI ostatně neexistuje vůbec).

### Scraper moduly

- `lib/shop-crawlers.ts` (325 ř.) — čistý `fetch()`+`cheerio`. Dvě strategie (`shoptet_sitemap`, `shoptet_category`) podle `discovery_sources.crawler_type`. Anti-block: vlastní User-Agent, `AbortSignal.timeout(15s)`, 2s delay mezi shopy. **Drobná code duplikace**: `crawlShop()` (ř. 219-261) a `testCrawlerForDomain()` (ř. 264-303) mají identický try/catch/switch blok, liší se jen zdroj configu.
- `lib/product-scraper.ts` (864 ř.) — JSON-LD + OpenGraph + per-domain CSS fallback. SSRF guard, content-type/size limity, charset detekce.
- `lib/discovery-agent.ts` (964 ř., hlavní orchestrátor) — crawl → scrape → match (EAN exact, jinak Levenshtein fuzzy name) → rozhodnutí → `discovery_candidates` → AI content generation pro nové produkty. Dedup proti XML retailerům přes `getRetailerSlugsWithXmlFeed()`.
- `lib/feed-sync.ts` (364 ř.) + `lib/feed-sync-runner.ts` (307 ř.) — per-retailer try/catch (komentář cituje BUG-002), plus doháněcí pasy (auto-research, rescrape max 40 draftů/run).

### Manuální/admin-trigger nástroje (`/app/api/admin/`)

Bulk operace, které jsou hotové jako automatizace, ale čekají na manuální spuštění z admin UI: `products/bulk-rescrape`, `products/bulk-status`, `products/bulk-vision` (Claude Vision, `maxDuration=600`), `products/bulk-fill-specs`, `products/backfill-origin`, `products/backfill-drafts`, `products/bulk-meta`, `products/[id]/rescrape`, `products/[id]/scan-lab-report`, `products/[id]/rescrape-gallery`, `prospect/run`, `brands/auto-research-bulk`, `articles/bulk-publish`, `discovery/bulk-approve`, `discovery/run`, `manager/run`, `recipes/bulk-publish`, `radar/run`.

---

## ČÁST 4 — DATA FLOWS

### A) Nový produkt → katalog → článek → publish

```
XML retailer (feed-sync, 04:00) ──┐
                                   ├─→ upsert by EAN → products(draft) + product_offers + price_history
Non-XML retailer (discovery, 04:30) ┘         │
                                               ├─ vysoká match confidence → auto_published / auto_added_offer (automaticky)
                                               └─ nejistý match → discovery_candidates(needs_review/pending) → ČLOVĚK schvaluje v /admin/discovery
Manuální import URL (/admin/products/import) ─→ products(draft) přímo

Doplnění chybějících specs (acidity/polyphenols):
  lab-research cron (web research na brand.website_url) ──┐
  manuální "Scan štítku" foto-OCR (scan-lab-report)         ├─→ products.acidity/polyphenols → score.ts přepočet
  discovery-agent regex extrakce z popisu (při scrape)     ┘

Fotky: discovery auto-publikuje 5 (source='scraper'), zbytek jako scraper_candidate → admin swap/add
Popisy: content-agent.ts (Claude) generuje při discovery; manuální "backfill-drafts" pro starší draft bez popisu

Články jsou SAMOSTATNÝ pipeline (E) — produkt se do článku dostává přes
catalog injection / {{product:slug}} token, ne naopak.
```

Human-in-the-loop je tedy hybridní: vysoká jistota matchu = plně automatické, nejistý match nebo nový brand/region = čeká na admin schválení.

### B) Ceny a offers
- XML retaileři: `cron:feed-sync` denně 04:00 UTC, per-retailer izolované (jeden pád nezastaví ostatní).
- Non-XML: `cron:discovery` denně 04:30 UTC.
- Mrtvé affiliate linky: `lib/link-rot-checker.ts`, 2 pasy/den, threshold=2 → product_offers/products status flip na inactive. Retailer, který smaže/přesune produkt, se tedy odhalí do max. 24-48 h, ne okamžitě.

### C) Brand/region/certifikace
- Auto-extrakce při discovery (`lib/entity-extractor.ts`, brand/region/cultivar z product name+description) — vytváří orphan `brand_slug` stuby automaticky (`auto-audit.ts` krok 2).
- Obsah stránek (story, philosophy, founded_year, hero foto, FAQ) je dnes z velké části **manuální** — `brands/auto-research-bulk` AI-vygeneruje `description_long`, ale foto/story/founded_year zůstávají gap (viz BRAND-AUDIT.md v rootu — Sitia/Motakis/Corinto/Evoilino nekompletní).
- Cultivar agregace (flavor_profile, intensity_score) je plně automatická — `cron:entity-aggregate` denně přepočítá z `product_cultivars` (355 vazeb).

### D) Recenze a obsah
**Žádný systém pro recenze neexistuje.** Žádná DB tabulka s "review" v názvu nalezena žádným ze 4 research agentů. CLAUDE.md sekce 15 zmiňuje "Review Summarizer Agent" jako Fázi 2 — nezačato, 0 % hotovo.

### E) Articles a SEO content
```
ARTICLE_BRIEFS (hardcoded) nebo --slug
        │
        ▼
detectFocusDimension() / explicit focus_dimension
        │
        ▼
fetchProductCatalog(focus, 35) ── real DB produkty (CATALOG_RULES injektováno pro zebricek/srovnani)
        │
        ▼
Claude Sonnet (body, 6000 tok) + Claude Haiku (meta, 300 tok)
        │
        ▼
searchUnsplash() hero ── TICHÝ FAIL při chybějícím klíči (T-06, stále neopraveno)
        │
        ▼
articles(status='draft') v DB
        │
        ▼
validate-article-products.ts (manuální CLI) NEBO admin PATCH route
        │            (PATCH na status='active' blokuje při validation.ok=false — ověřeno v kódu)
        ▼
ČLOVĚK kontroluje hero_image_url != null (manuální krok, nic to nevynucuje)
        │
        ▼
status='active' → sitemap.ts (filtr status=active, ověřeno) → live
```

---

## ČÁST 5 — MANUÁLNÍ PROCESY

| Úkon | Frekvence | Trvání | Riziko chyby | Automatizovatelnost |
|---|---|---|---|---|
| Schválení nejistých discovery candidates (`needs_review`/`pending`) | ad-hoc, dle volume nových shopů | 5-30 min/session | střední (špatný EAN match publikuje špatný produkt) | středně (ladění match-confidence threshold) |
| Schválení article draftů → active (validator gate + hero check) | ad-hoc po `generate-articles.ts` běhu | 10-20 min/článek | střední (YMYL obsah, incident už nastal v 05/2026) | obtížná (potřeba human judgment i s validátorem) |
| Manuální kontrola `hero_image_url != null` před publish | ad-hoc/per článek | ~2 min | nízké | snadná — dalo by se udělat hard block jako u produktových čísel, dnes NENÍ vynuceno kódem |
| Schválení newsletter draftu (generate středa → review → send čtvrtek) | týdně | 10-15 min | střední (broadcast nelze vzít zpět) | obtížná bez ztráty kontroly; `newsletter_auto_send` guard existuje, ale default vypnuto |
| Doplňování brand stránek (story, hero foto, founded_year) | ad-hoc, dle BRAND-AUDIT.md backlogu | hodiny/brand | nízké | částečná (text lze AI-gen, foto výběr manuální) |
| "Klikni a spusť" bulk tlačítka (bulk-rescrape, bulk-vision, bulk-meta, bulk-fill-specs) | ad-hoc | sekundy kliknutí, ale čeká se na to | nízké | **už automatizováno, jen čeká na manuální spuštění** — kandidát na vlastní cron |
| Diagnostika Railway crash notifikací (přímo pozorováno v této session — seasonal-dispatcher) | ad-hoc, kdy spadne cron | 15-30 min (čtení logů + kódu + fix) | vysoké, pokud se přehlédne (cron může být dlouho rozbitý nepozorovaně) | středně (alerting/dashboard by zkrátil detection time, samotná diagnóza zůstává lidská) |
| Visuální QA na mobilu (screenshoty, layout review — pozorováno přímo v této session) | ad-hoc | minuty | nízké | částečná (visual regression testing by zachytil regrese, estetický úsudek zůstává manuální) |
| Lab report foto-scan trigger (`scan-lab-report`) | per produkt, ad-hoc | ~1 min klik + AI cena | nízké | lze rozšířit na batch/auto |
| Review discovery_sources návrhů od prospectoru (`suggested` → `enabled`/`rejected`) | týdně po `cron:prospect` | 5-15 min | nízké | snadná až středně |
| Standing manuální gate (CLAUDE.md sekce 20): DB schema, `/go/` redirect logika, env vars v produkci, Railway config, RLS policies | trvalé pravidlo, ne časová frekvence | — | vysoké pokud porušeno | záměrně NE-automatizováno (bezpečnostní brzda) |

---

## ČÁST 6 — POJISTKY & QUALITY GATES

| Pojistka | Soubor | Co blokuje | Co může propustit |
|---|---|---|---|
| `CATALOG_RULES` prompt injection | `scripts/generate-articles.ts:710-726`, aktivní jen když `needsCatalogContext()`=true | Claude smí citovat jen produkty z reálného DB katalogu vloženého do promptu | Běžné `pruvodce` články bez "top picks" klíčových slov pravidla nedostanou vůbec — záměrné, ale je to měkká hranice (substring match na klíčová slova, ne explicitní flag na všech briefech) |
| `validateArticle(slug)` | `lib/article-validator.ts` | `{{product:slug}}` token i `/olej/slug` markdown link — existence v DB + tolerance na score/kyselost/polyfenoly/cenu | Číslo na 2.+ řádku odstavce za linkem (záměrný tradeoff v regex scope, zdokumentováno přímo v kódu) |
| Admin PATCH blokace | `app/api/admin/articles/[slug]/route.ts:37-49` | `status→active` vrátí 422 dokud `validateArticle().ok !== true` — ověřeno přímo v kódu, ne jen v komentáři | Přímý UPDATE přes Supabase Studio/SQL by gate obešel úplně — je to admin-route-level, ne DB constraint/trigger |
| `detectFocusDimension()` no-body-read pravidlo | `generate-articles.ts:957` | Nikdy nečte `body_markdown` při auto-detekci (prevence false positive — 22/24 článků zmiňuje polyfenoly v těle) | — |
| Token resolver fallback | `lib/template-vars.ts:57-140` | Neexistující slug → `console.warn` + `PRODUCT_MISSING_MARKER`, ne crash | Nedohledáno jak se marker zobrazí koncovému uživateli na renderu — **nevím jistě, potřebuje ověření v `article-body.tsx`** |
| Hero image check | CLAUDE.md sekce 25 (manuální postup) + `lib/unsplash.ts` throw | Throw při chybějícím klíči | `fetchHero()` v generate-articles.ts to chytá a tiše vrací null — **T-06, stále neopraveno, ověřeno čtením kódu dnes** |
| `METODOLOGICKÝ TÓN` prompt pravidlo | `generate-articles.ts:658` | Zakazuje superlativy bez dat v promptu Claude | Jen prompt-level instrukce, **žádný post-generation regex check** — pokud Claude pravidlo nedodrží, nic to nezachytí |
| `agent_decisions` logging | `generate-articles.ts:1006-1008` | Loguje focus_dimension rozhodnutí | **Prázdný catch blok** — pokud insert selže nebo tabulka neexistuje, ticho, žádný alert |

**Shrnutí false-positive/false-negative rizika:** Vrstvy jsou navržené proti přesně tomu, co se stalo v incidentu z května (vymyšlené produkty/čísla) — to pokrývají dobře. Slabší jsou proti: (1) marketingovým superlativům (jen prompt, žádný validátor), (2) chybějícím hero images (tichý fail), (3) obcházení gate přímým DB zápisem (žádný DB-level constraint).

---

## ČÁST 7 — IDENTIFIKOVANÉ MEZERY

**Otevřené tickety z backlogu (project_open_tasks memory, neověřeno žije-li ještě každý beze změny):**
- **T-01 (vysoká priorita)** — žádný cron validuje aktivní články proti produktům, které mezitím přešly na `inactive`. Token by v tom okamžiku ukázal `PRODUCT_MISSING_MARKER` bez jakékoli admin notifikace. Navrhované řešení (cron + `article_validation_errors` tabulka) **nezavedeno**.
- **T-06** — hero image tichý fail. **Potvrzeno dnešním čtením kódu jako stále neopravené.**
- **T-08** — Sitia, Motakis, Corinto, Evoilino brand stránky nekompletní (chybí meta_title, FAQ, hero foto u některých). Soubor `BRAND-AUDIT.md` v rootu (untracked) obsahuje detail.
- **T-09 (nízká)** — non-EVOO produkty (pomace, rafinovaný) mají `olivator_score=null`, karta zobrazuje matoucí "Score + recenze" link bez skóre.
- **T-11/T-12 (nízká)** — 9+ prázdných obrázkových slotů ve Vlně 2 článků, Unsplash free tier nemá vhodné kosmetické/lifestyle záběry.

**Nově zjištěné, dnes (ne v starém backlogu):**
- **Playwright/Puppeteer v CLAUDE.md vs realita** — CLAUDE.md popisuje scraping stack, který v repu vůbec neexistuje (cheerio+fetch místo). Dokumentace je buď zastaralá, nebo chybí reálná schopnost pro JS-rendered e-shopy.
- **GSC env vars chybí úplně** v `.env.local`, přestože CLAUDE.md a starší memory tvrdí "GSC verification hotovo". Buď integrace dnes neběží, nebo se autentizace přesunula jinam — nejasné, **potřeba ověřit s Architektem**, ne předpokládat.
- **`brands`/`regions`/`cultivars`/`product_cultivars`/`entity_images` bez CREATE TABLE** v migration historii — schema drift risk, žádný DDL source-of-truth pro klíčové content tabulky.
- **`feature_flags`: `ai_sommelier`, `user_profiles`, `visual_search` smazány** cleanup migrací, ne jen disabled — v rozporu s CLAUDE.md sekcí 7, která je popisuje jako "připravené pro pozdější fázi".
- **Affiliate URL strategie nejasná** — starší memory (`project_open_tasks.md`, 2026-04-27) tvrdí "78 % offers chybí affiliate_url = peníze na zemi". Novější memory (`project_mvp_state.md`-adjacent poznámka) tvrdí "affiliate_url=NULL je ZÁMĚRNÉ, `/go/` route to řeší přes template auto-fill za runtime". Tyto dvě tvrzení si odporují a nebyly v rámci tohoto auditu nezávisle ověřeny proti aktuálnímu `/go/[retailer]/[slug]/route.ts` chování. **Potřebuje jasné info od Architekta, který stav je aktuální** — finanční dopad (affiliate revenue) je dost velký na to, aby se na tom nehádalo.
- **Stale git worktree** `.claude/worktrees/xenodochial-pascal-9aa69c` (branch `claude/xenodochial-pascal-9aa69c`, commit `3908bc3`, odlišný od `main` `66be49c`) — gitignored, takže bezpečný, ale starý (timestamp ukazuje na 29. května) a nejasné jestli ještě aktivně používaný.
- **17 audit/report `.md` souborů v repo rootu, žádný trackovaný v gitu** (`ARTICLES-AUDIT.md` i `ARTICLES_AUDIT.md` — dvě konvence názvu stejné věci; `SEO-AUDIT.md` existuje ve 3 verzích `SEO-AUDIT.md`/`"SEO-AUDIT 2.md"`/`"SEO-AUDIT 3.md"`). Žádný systém pro "tohle je platná verze" — riziko že se příští audit dívá na zastaralá data.
- **`lab-research` kill timer bez `.unref()`** — vlastní komentář v kódu cituje neuzavřený reliability problém z 2026-05-07.
- **Žádný systém recenzí** — Fáze 2 funkce z CLAUDE.md, 0 % implementováno, žádná DB tabulka.
- **CJ Affiliate** zmíněn v marketingovém textu (`/o-projektu`), ale 0 kódové integrace — aspirační copy, ne realita.
- **`manager_reports` má jen 1 živý řádek** navzdory týdennímu cronu — buď je nový, nebo report perzistence/delivery nefunguje spolehlivě (email send je jen "best-effort warn", ne hard fail).

---

## ČÁST 8 — TECH DEBT

- **510 duplicitních " 2"/" 3" souborů** (`find . -iname "* 2.*"`), všechny **untracked** v gitu (potvrzeno — žádný v `git ls-files`). Bezpečné smazat bez dopadu na historii, ale zatím nikdo to neudělal.
- **17 ad-hoc audit `.md` reportů v rootu** (viz Část 7) — žádná archivační konvence, sprawl roste s každým novým auditem.
- **Worktree `.claude/worktrees/xenodochial-pascal-9aa69c`** — plná kopie projektu, gitignored, stale od 29. května. BUG-025 v CLAUDE.md varuje přesně před tímhle typem stavu (riziko merge z worktree do main).
- **24 `inactive` + 2 `excluded` produkty** v DB — `app/sitemap.ts` je správně vyfiltruje (ověřeno), ale nekontrolováno, jestli `/srovnavac` listing nebo kategorie stránky mají stejný filtr důsledně.
- **1 archived článek** (`olivovy-olej-a-zdravi-veda-2026`) — ověřeno, nikde nelinkovaný, nízké riziko.
- **`products` tabulka má ~90 writer souborů**, hodně jednorázových `scripts/fix-*.ts`/`backfill-*.ts` z různých období — historicky se opravy řešily ad-hoc skripty namísto jednoho rule enginu. `lib/quality-rules.ts` dnes částečně nahrazuje, ale stará vrstva zůstává v repu.
- **Drobná duplikace** v `lib/shop-crawlers.ts` — `crawlShop()` a `testCrawlerForDomain()` mají identický try/catch/switch blok (řádky 219-261 vs 264-303).
- **2 skutečné TODO komentáře** mimo " 2" soubory (`lib/knowledge-graph.ts:28`); zbytek TODO-like greps byly false positivy z promptových textů v `generate-articles.ts`.
- **`scripts/` vyloučeno z TypeScript typecheck** (`tsconfig.json exclude`) — type chyby v cron scriptech se nikdy nezachytí buildem, jen runtime crashem (přesně to, co se stalo se `seasonal-dispatcher.ts` dnes).

---

## ČÁST 9 — METRIKY A MONITORING

### Co se měří dnes
- **Affiliate kliky** — `affiliate_clicks` (1967 řádků) + UTM sloupce; admin `/admin/analytics` zobrazuje denní graf, top produkty/retailery/referrery/zařízení (tahle stránka byla opravena v této session, dříve měla prázdný "Prokliky podle dne" graf).
- **GA4** pageview tracking client-side (`app/layout.tsx`).
- **SEO metriky** — `seo_metric_snapshots`, `seo_activity_log`, `gsc_keyword_metrics` tabulky existují (jména v RLS listu), ale živé naplnění přes GSC je nejisté kvůli chybějícím env vars (viz Část 7).
- **Data quality** — `quality_issues` (885 řádků), `quality_rules` (10) — aktivní monitoring datové kvality produktů.
- **Týdenní strategický report** — `manager_reports`, ale jen 1 živý řádek (viz Část 7 — nejasná spolehlivost).
- **Agent rozhodnutí** — `agent_decisions` (56), `project_learnings` (164, aktivně plněno týdenním cronem).

### Co se NEměří, ale pravděpodobně by měl
- **Performance článku po publikaci** — žádná vazba mezi konkrétním článkem a affiliate kliky/konverzemi, které z něj vzešly. GA4 dá obecné pageviews, ne "tenhle článek vydělal X Kč".
- **Broken links / 404 / 5xx na samotném webu** — `link-rot-checker` kontroluje jen `product_offers.affiliate_url` zdraví, ne zdraví vlastních interních stránek Olivátoru.
- **Scraper/cron success rate v čase** — jednotlivé běhy logují do konzole/emailu, ale není perzistovaný trend ("discovery měl 95% success rate tento týden, 60% minulý") — bez toho je těžké odhalit pomalou degradaci (např. shop změnil HTML strukturu).
- **AI generation quality feedback loop** — validátor zachytí faktické chyby (špatná čísla/neexistující produkty), ale nic neměří, jestli článek po publikaci skutečně rankuje/konvertuje. Není zpětná vazba "tenhle typ článku/briefu funguje, tenhle ne".
- **Cron health dashard / alerting** — přímo demonstrováno touto session: o crash `seasonal-dispatcher` jsme se dozvěděli jen díky tomu, že Railway poslal email a uživatel ho přeposlal. Žádný interní dashboard v adminu neagreguje "kdy poslední úspěšný běh, kdy poslední fail" napříč 14 cron službami.
- **Error tracking** — žádný Sentry/podobný nástroj. Jediný způsob zjistit produkční chybu je Railway deploy logy (manuální GraphQL/dashboard lookup).

---

## Shrnutí pro roadmap (nejvyšší-dopad nálezy)

1. **Cron monitoring chybí úplně** — žádný centrální přehled "co běží, co spadlo". Dnešní incident (seasonal-dispatcher) byl odhalen jen externí Railway notifikací, ne interním systémem.
2. **CLAUDE.md má min. 2 zastaralá tvrzení** (Playwright stack, GSC verification) — dokumentace by měla být buď opravena, nebo by Architekt měl potvrdit aktuální záměr.
3. **Affiliate URL stav je nejasný** mezi starou a novou memory — přímý finanční dopad, stojí za rychlé ověření s Architektem před jakýmkoli dalším rozhodnutím o monetizaci.
4. **`brands`/`regions`/`cultivars` bez DDL source-of-truth** — riziko při budoucí migraci/recovery.
5. **510 + 17 duplicitních/ad-hoc souborů** — levný úklid, nulové riziko, čistší pracovní prostor pro další audity.
6. **T-01 (token validace při deaktivaci produktu) je popsán jako vysoká priorita už v předchozí session a stále nezavedeno** — druhá vrstva self-healingu pro token systém chybí.
