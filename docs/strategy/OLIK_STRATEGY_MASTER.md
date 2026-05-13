# OLIVATOR — OLÍK STRATEGY MASTER
# Source of truth pro Olíkovu strategii a content automation
# Last updated: 13.05.2026
═════════════════════════════════════════════════
## TL;DR
Olivator je největší srovnávač olivového oleje v ČR. Olík je 
oficiální AI persona/autor obsahu — působí jako maskot a hlavní 
degustátor (podobně jako Alza má svého maskota).
**Strategie:** Quality > Quantity. 1-2 perfektní články týdně, 
ne 10 průměrných. E-E-A-T compliant. AI detection < 20%.
**Roční cíl (do Q4 2026):** 50 000 unique visits/měsíc, 
13 000 Kč/měsíc affiliate revenue (break-even).
**Mechanismus:** Strategic admin v DB (content_calendar, 
keyword_mapping, strategy_goals) + Olík author system + AI 
automation s lidskou kontrolou.
═════════════════════════════════════════════════
## SPRINT STATUS
### Olík Strategic Sprint (7 dní)
| Den | Co | Status | Commit |
|---|---|---|---|
| 1 | Olík Author System (schema, page, byline, end-box) | ✅ HOTOVO | cfe0708 |
| 2 | Strategic Admin (calendar, keywords, goals, UI) | ✅ HOTOVO | cfe0708 |
| 3 | AI Image Pipeline (Pexels + Unsplash + Vision) | ⏳ NEXT | - |
| 4 | 2× AI Review Pass + /admin/articles/pending | ⏳ | - |
| 5 | Topic Generator + Calendar→Article flow | ⏳ | - |
| 6 | Pilot Article #1 (Řecký olivový olej průvodce) | ⏳ | - |
| 7 | Final deploy + verify + GSC submit | ⏳ | - |
### Co je TEĎ na produkci
- ✅ /autor/olik page (s schema.org Person markup)
- ✅ AuthorByline na všech 23 článcích
- ✅ OlikAuthorBox na konci článků
- ✅ Authors tabulka s Olíkem
- ✅ /admin/content-strategy (24 cílů Q1-Q4)
- ✅ /admin/content-calendar (33 entries květen-prosinec 2026)
- ✅ /admin/keyword-mapping (200/379 keywords seeded)
- ✅ Score functional bonus (EVOLIA 79→85)
- ✅ Encoding fix + grace period
- ✅ Internal product links v 23 článcích
- ✅ Sitemap 23 článků
═════════════════════════════════════════════════
## OLÍK PERSONA
### Bio (krátká verze pro byline)
Olík · Hlavní degustátor

Pozn: emoji se NEPOUŽÍVÁ v UI. Foto maskota (/olik.png) ano.
### Bio (full verze pro /autor/olik)
```
Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí 
nad 0,5 %. Ostatní mu nevadí.

Za poslední dva roky ochutnal 847 olejů (počítá si je). Navštívil 
12 olivových hájů od Alentejo po Krétu. Pamatuje si chuť každého 
z nich. Jeho fotografická paměť ale končí u jmen prodejců.

Olivator Score vymyslel ve 3 ráno po pátém ochutnání řeckého 
DOP. Ráno si myslel, že je geniální. Po dvou letech testů se 
ukázalo, že měl pravdu.

Žádný výrobce mu neplatí. Naopak: čím dráž olej stojí, tím víc 
ho štve, když nestojí za nic.
```
### Voice guidelines (pro AI content generation)
**Ton:**
- Tykání. Vždy.
- Krátké věty (max 20 slov, ideální 8-15)
- Self-deprecating humor občas
- Anti-corporate
- Authority bez arogance

**Konkrétnost:**
- Konkrétní čísla, ne "mnoho/několik" (např. "847 olejů")
- Konkrétní příklady místo obecností

**Zakázané fráze:**
- "v dnešní době", "je důležité"
- "pojďme se podívat", "není žádným tajemstvím"
- "úžasný", "fantastický", "neuvěřitelný"
- Vykřičníky

**Povolené a očekávané:**
- Personal voice ("vyzkoušel jsem", "překvapilo mě")
- Vtipný komentář občas
- Cesty ("Když jsem byl loni v Andalusii...")
- Sezónní kontext ("Zrovna začíná sklizeň.")

**Co Olík miluje:**
- DOP certifikované oleje, polyfenoly nad 500 mg/kg
- Early harvest, andaluské fincas
- Kalamata, Sitia, Apulie

**Co Olík nesnáší:**
- "Prémiový" v názvu bez DOP
- Kyselost nad 0,5 %
- "Z italské vesničky" bez konkretizace
- Krásné láhve s mizerným olejem
═════════════════════════════════════════════════
## KLÍČOVÁ ROZHODNUTÍ
### UI Design
- **ŽÁDNÉ dekorativní emoji** (výjimka: vlajky států)
- Povolené: vlajky států (🇬🇷🇮🇹🇪🇸🇵🇹🇭🇷)
- Místo emoji ikon → reálné fotky nebo SVG library (Lucide React)
- Profesionální vzhled > dekorativní

### Content Quality (E-E-A-T)
- 1-2 perfektní články týdně (NE 10 průměrných)
- Min 2 500 slov, ideální 3 500-4 500
- 10× rule: musí být 10× lepší než current top 1 v search
- Min 3 external authority links (EU, EFSA, vědecké studie)
- Min 3-5 internal links na produkty
- FAQ sekce s FAQPage schema
- 35-bodový quality checklist před publish

### AI Safety
- 2× AI Review Pass POVINNÝ:
  - Pass 1: Validátor češtiny (existing)
  - Pass 2: Sonnet review "kde to zní jako AI"
- AI detection target < 20% (Copyleaks)
- Quality score > 80
- Lidský approval před publish (admin queue)

### Olík authority signals
- Schema.org Person markup
- /autor/olik page s bio + recent articles
- Author byline na každém článku
- End-of-article author box
- Konzistentní voice across content

### Image strategy
- **Auto:** Pexels + Unsplash (free, žádná tvá práce)
- **Manual:** Depositphotos drag & drop (premium, ty stáhneš)
- **Vision API:** auto generuje filename, alt, caption při upload
- WebP convert, 1200×800, alt text v češtině s keywordem
═════════════════════════════════════════════════
## ROČNÍ CÍLE 2026
### Q1 (květen-červenec 2026)
- 5 000 unique visits/měsíc
- 12 nových článků
- 5 landing pages
- 3 brand recenze
- 50 newsletter subs
- 500 Kč affiliate revenue/měsíc

### Q2 (srpen-říjen 2026)
- 15 000 unique visits/měsíc
- 12 nových článků
- 5 landing pages
- 4 brand recenze
- 1 pillar page
- 200 newsletter subs
- 3 000 Kč revenue/měsíc

### Q3 (listopad-leden 2027)
- 30 000 unique visits/měsíc
- 12 nových článků
- 3 brand recenze
- 1 pillar page
- 500 newsletter subs
- 8 000 Kč revenue/měsíc

### Q4 (únor-duben 2027)
- 50 000+ unique visits/měsíc
- 12 nových článků
- 1 pillar page
- 1 000 newsletter subs
- 15 000+ Kč revenue/měsíc (BREAK-EVEN)

**Data v DB:** `strategy_goals` tabulka (24 záznamů)
═════════════════════════════════════════════════
## EDITORIAL KALENDÁŘ
**Princip:** 4-6 článků měsíčně, sezónně laděné.

### Sezónní priority
**Květen-červen 2026** — Foundation + quick wins
- Articles fixes ✅
- Landing pages (/akce, /regiony/recko, /zebricek)
- 3 chybějící HIGH články (Oleokantal, Kyselost, Pleť)

**Červenec-srpen** — Léto, cestování
- Saláty + olej, bylinkové dressing
- "Co přivézt z Řecka"
- Olej na opalování

**Září-říjen** — HARVEST SEASON (KLÍČOVÉ)
- Sklizeň 2026 začíná!
- Early harvest průvodce
- Pillar page #1 "Vše o olivovém oleji"

**Listopad-prosinec** — Vánoce, dárky (PEAK COMMERCIAL)
- Dárkový průvodce
- /akce refresh + Black Friday
- Pillar page #2 "Jak kupovat olej"

**Leden-únor 2027** — New year, zdraví
- Mediterranean diet
- Polyfenoly + zdraví
- Pillar page #3 "Olivový olej a zdraví"

**Březen-duben 2027** — Jaro
- Jarní saláty
- Ochucené oleje
- Year-end refresh

**Data v DB:** `content_calendar` tabulka (33 entries květen-prosinec)
═════════════════════════════════════════════════
## KEYWORD STRATEGIE (379 keywords)
### Top priority (high volume + low competition)
| Keyword | Volume | Konkurence | Status |
|---|---|---|---|
| olivový olej | 2 700 | 10 | homepage |
| olivový olej akce | 1 400 | 19 | CREATE /akce |
| řecký olivový olej | 610 | **0** | /regiony/recko |
| extra panenský olivový olej | 560 | 16 | /srovnavac/extra-panensky |
| olivový olej na smažení | 480 | 15 | landing |
| nejlepší olivový olej | 290 | 13 | /zebricek/nejlepsi |

### Brand keywords (zero competition zlatý důl)
- Lidl: 370 hits/mo
- Franz Josef: 410
- Monini: 170
- Borges: 60
- Tesco: 60
- Albert: 130
- Billa: 70
- Kaufland: 70
- Bertolli: 20
- Costa d'Oro: 20

**Total brand traffic potential: ~1 480 hits/měsíc** za nulové 
konkurence. Strategie: recenze + alternativy → redirect na premium.

### High-intent landing pages (priority order)
1. `/akce` — commercial intent 2 400 hits/měsíc
2. `/regiony/recko` — 1 950 hits/měsíc (expand existing)
3. `/zebricek/nejlepsi` — 1 790 hits/měsíc
4. `/srovnavac/extra-panensky` — 1 350 hits/měsíc
5. `/zdravi` — 1 620 hits/měsíc
6. `/srovnavac/na-smazeni` — 890 hits/měsíc
7. `/srovnavac/sprej` — 470 hits/měsíc
8. `/srovnavac/bio` — 120 hits/měsíc
9. `/srovnavac/5l` — 350 hits/měsíc
10. `/srovnavac/na-vareni` — 340 hits/měsíc

**Data v DB:** `keyword_mapping` tabulka (200/379 keywords seeded)
═════════════════════════════════════════════════
## WORKFLOW PER ČLÁNEK (po sprintu)
```
Pondělí 6:00 UTC:
  └─ CRON: Topic Generator scan GSC + keywords + calendar
  └─ Email admin: 3 návrhy témat na týden

Pondělí ráno (ty):
  └─ Otevři email
  └─ Schválit 1-2 topics (1 click each, 2 min total)

Středa-Čtvrtek (automatic):
  └─ Olík generuje draft (Sonnet + Learning Injection + Voice)
  └─ AI Image Selection (Pexels + Unsplash, 3 fotek)
  └─ 2× AI Review Pass (Czech validator + Sonnet detector)
  └─ Auto-apply fixes pokud >25% AI score
  └─ Internal links injected
  └─ Schema markup
  └─ Save as pending_review
  └─ Admin notification email

Čtvrtek-pátek (ty):
  └─ Otevři /admin/articles/pending
  └─ Preview článek (5 min)
  └─ Volitelně: drag & drop nové fotky z Depositphotos
  └─ Schválit & Publish (1 click)

Páteční ráno (automatic):
  └─ Article live na olivator.cz
  └─ Sitemap auto-update
  └─ GSC URL submit
  └─ Calendar entry: done
  └─ Keyword mapping: mapped
  └─ Strategy progress: +1
```
**Tvůj celkový čas/týden: 15-25 minut.**
═════════════════════════════════════════════════
## TECHNICAL FOUNDATION
### Co máme po Master Foundation (5 fází + Olík Den 1+2)
- ✅ Learning Injection ($0.00 ongoing)
- ✅ Junk Brand Cleanup (149→130 brandů)
- ✅ Auto-audit + 2nd pass (522 produktů auditováno)
- ✅ Regions + Cultivars (31 regions, 36 cultivars)
- ✅ Manager Agent (claude-sonnet-4-6)
- ✅ Radar Agent (working feeds)
- ✅ Encoding fix (windows-1250 → UTF-8)
- ✅ Grace period 14 dní pro no_offers
- ✅ Slug regeneration logika
- ✅ Score functional bonus (>1500 mg/kg → +1-10)
- ✅ Comparative context regex guard

### CRON jobs aktivní (Railway)
- discovery-agent (denně)
- feed-sync (denně 4:00 UTC)
- price-tracker (každé 6h)
- auto-audit (denně 4:00 UTC)
- newsletter-weekly (Wed 18:00 UTC)
- welcome-dispatcher (denně 9:00 UTC)
- seasonal-dispatcher (denně 9:00 UTC)
- manager-agent (Mon 8:00 UTC)
- radar-agent (Mon 7:00 UTC)
- learning-agent (denně)

### NEW CRONy (po Olík sprintu Den 5)
- topic-generator (Mon 6:00 UTC)
- article-quality-audit (denně)
═════════════════════════════════════════════════
## KLÍČOVÉ LEKCE (v project_learnings tabulce)
### Critical
- **Slug generation**: UTF-8 validation povinná, ASCII-only check
- **Encoding fail**: zdrave-oleje.cz windows-1250 → UTF-8 fallback
- **Non-olive validation**: validateOliveOilProduct() před upsert

### High
- **Template variables**: žádné `{{}}` v live článcích, post-gen check
- **Reactivation trigger**: po status change → rescrape + discovery sweep
- **Welcome email standard**: pedagogická progrese, čísla, autority
- **Audit anomaly**: name vs DB values rozdíl >40% → FLAG
- **No emoji UI**: jen vlajky pro státy, žádné dekorativní

### Medium
- **Comparative context**: regex guard pro polyfenol extraction
- **Functional oil bonus**: polyphenols >1500 → Score +1-10
- **Content quality**: 1-2 perfektní > 10 průměrných
═════════════════════════════════════════════════
## DETAILNÍ DOKUMENTY (reference, nikoli source of truth)
Tyto markdown dokumenty existují v Claude chat session (user 
má v /mnt/user-data/outputs/) ale NEJSOU v repu. Pokud potřebuješ 
deep dive na konkrétní téma, požádej usera o paste.

- **OLIK_STRATEGIC_SPRINT_FINAL.md** — Den 1-7 detailní implementace
- **OLIVATOR_SEO_STRATEGY_2026.md** — 12měsíční roadmap
- **QUALITY_FIRST_STRATEGY.md** — kompletní quality rules
- **OLIK_AUTOMATION_PLAN.md** — workflow detail

### Archive (hotové)
- **ARTICLES_MASTER_PLAN.md** — articles fixes (DONE 12.05.2026)
- **METODIKA_REDESIGN_PROMPT.md** — metodika showcase (DONE 12.05.2026)
═════════════════════════════════════════════════
## DALŠÍ KROKY
### Nejbližší (Den 3)
- AI Image Pipeline implementation
- Pexels + Unsplash API integration
- Claude Vision pro manual upload meta
- Article editor (Content + Images + SEO + Schema + Publish tabs)

### Pak (Den 4-7)
- 2× AI Review Pass
- /admin/articles/pending approval UI
- Topic Generator CRON
- Pilot Article #1 (Řecký olivový olej)
- Pilot Article #2 (AI vybere)
- Final deploy

### Po sprintu (týdenní rytmus)
- 1-2 articles per week
- Měsíční audit (refresh starých článků)
- Sezónní obsah (harvest, Vánoce, jaro)
═════════════════════════════════════════════════
## ZÁVĚR
**Olivator už NENÍ hobby projekt.**

Po Olík sprintu (Den 3-7) má:
- Olík jako oficiálního autora (E-E-A-T)
- Strategický plán na celý rok (DB)
- 200 keywords seeded (379 total)
- AI automation s lidskou kontrolou
- 2× AI review = quality gates
- Plný editor článků
- Topic Generator weekly

**Tvoje role:** Schvalovat (15-25 min/týden)
**Olíkova role:** Generovat, vybírat, reviewovat
**Cíl Q4 2026:** 50 000 visits/měsíc + 13 000 Kč/měsíc revenue
