# SEO STRATEGY — OLIVATOR.CZ

> Cíl: dominance Google pro **vše**, co se i okrajem týká olivového oleje v ČR.
> Verze: 2026-05-07 · Status: Aktivní plán
> Zdroj: full audit + DB inventory 2026-05-07

---

## 0. AKTUÁLNÍ STAV (verifikováno 2026-05-07)

### Pokrytí

| Oblast | Stav | Detail |
|---|---|---|
| **Veřejné stránky** | 18 | homepage, srovnavac, olej/[slug], porovnani, zebricek, zebricek/[slug], pruvodce, pruvodce/[slug], recept, recept/[slug], oblast/[slug], znacka/[slug], odruda/[slug], metodika, novinky, novinky/[slug], o-projektu, quiz |
| **Aktivní produkty** | 173 | všichni mají meta_description + description_long >500ch |
| **Produkty s meta_title** | **0/173** ❌ | KRITICKÝ GAP |
| **Články /pruvodce** | 4 | jak-vybrat, nejlepsi-2026, polyfenoly, recky-vs-italsky |
| **Recepty** | 3 | bruschetta, pesto, salat-s-burratou |
| **Žebříčky** | 5 (statické) | nejlepsi-2026, recky, bio, italsky, vysokopolyfenolove |
| **Regiony aktivní** | 4/4 | apulie, korfu, kreta, peloponnes — všechny s textem ~3000ch |
| **Brandy aktivní** | 6/38 | alfa, corinto, evoilino, intini, orino, sitia-kreta — 32 draft bez obsahu |
| **Odrůdy aktivní s textem** | 5/8 | chybí: frantoio, leccino, olivastra |
| **Entity fotky** | **0** ❌ | KRITICKÝ GAP — `entity_images` prázdná |

### Schema.org pokrytí

| Schéma | Kde | Status |
|---|---|---|
| Product + AggregateOffer + Review | `/olej/[slug]` | ✅ |
| Article | `/pruvodce/[slug]` | ✅ ale bez `image` |
| Recipe | `/recept/[slug]` | ✅ |
| Organization | `/znacka/[slug]` | ✅ |
| Place | `/oblast/[slug]` | ✅ |
| FAQPage | `/olej/[slug]` | ✅ |
| BreadcrumbList | jen `/olej/[slug]` | ⚠️ chybí na entity, listings, articles |
| ItemList | nikde | ❌ chybí na `/srovnavac`, `/zebricek/[slug]` |
| NewsArticle | nikde | ❌ chybí na `/novinky/[slug]` |

### Technical SEO

| Položka | Status |
|---|---|
| `robots.ts` | ✅ správně, AI crawlery blokované |
| `sitemap.ts` dynamický | ✅ ale `lastModified: new Date()` všude (Google vidí "změněno dnes vždy") |
| Canonical URLs | ✅ na produktech, entitách, srovnavac. Chybí na `/zebricek/[slug]` |
| Homepage H1 | ❌ pouze H2, žádný H1 |
| `revalidate` | ✅ rozumné časování |
| OG images | ✅ na produktech, ❌ na entitách (žádné fotky) |
| hreflang cs-SK | ❌ neexistuje (Fáze 2 SK trh) |

---

## 1. FÁZE — STRUKTURA (PŘEHLED)

| # | Název | Délka | Cíl |
|---|---|---|---|
| **0** | Quick Wins | 1 den | Mechanické fixy s velkým dopadem |
| **1** | Schema & Discoverability | 2–3 dny | Plné JSON-LD pokrytí, fix sitemap, ItemList |
| **2** | Entity Foundation | 3–5 dní | Entity fotky, dotáhnout 3 cultivary, draft brands |
| **3** | Meta Optimization | 2–3 dny | Admin UI pro meta, custom titles pro TOP 50 produktů |
| **4** | Topic Authority | 3–4 týdny | 15+ článků, 10+ receptů, dynamické žebříčky |
| **5** | E-E-A-T Signals | 1–2 týdny | Autoři, editorial, article images |
| **6** | Backlink & Outreach | ongoing | Mediakit, gaest posty, resource page outreach |
| **7** | Advanced & Voice | ongoing | LocalBusiness, voice search, SGE optimalizace |

---

## FÁZE 0 — QUICK WINS (1 den)

**Cíl:** Mechanické opravy, které zvýší SEO bez velkého času.

### 0.1 Homepage H1 ⚡
- **Soubor:** `app/page.tsx:155`
- **Co:** Aktuálně největší nadpis je H2. Přidat hidden nebo viditelný H1 ("Olivátor — Nezávislý srovnávač olivových olejů v Česku").
- **Čas:** 5 min
- **Dopad:** Google jasně rozumí, o čem celý web je.

### 0.2 Metadata na `/zebricek/[slug]`
- **Soubor:** `app/zebricek/[slug]/page.tsx`
- **Co:** Přidat `generateMetadata` s názvem žebříčku + description.
- **Čas:** 15 min
- **Dopad:** Sdílené žebříčky budou mít čitelný `<title>` v SERP.

### 0.3 Fix sitemap `lastModified`
- **Soubor:** `app/sitemap.ts`
- **Co:** Použít `product.updated_at`, `article.published_at` místo `new Date()`.
- **Čas:** 30 min
- **Dopad:** Google neignoruje "vše se změnilo dnes" — efektivnější crawl budget.

### 0.4 BreadcrumbList JSON-LD na entity pages
- **Soubory:** `app/oblast/[slug]/page.tsx`, `app/znacka/[slug]/page.tsx`, `app/odruda/[slug]/page.tsx`
- **Co:** Použít existující `breadcrumbSchema()` z `lib/schema.ts`.
- **Čas:** 30 min (3 stránky)
- **Dopad:** Rich snippets v SERP, lepší navigace.

### 0.5 BreadcrumbList JSON-LD na článcích/receptech
- **Soubory:** `app/pruvodce/[slug]/page.tsx`, `app/recept/[slug]/page.tsx`
- **Čas:** 20 min
- **Dopad:** Rich snippets.

### 0.6 Canonical URL na `/zebricek/[slug]`
- **Soubor:** `app/zebricek/[slug]/page.tsx`
- **Čas:** 5 min

### 0.7 Product schema description = description_long
- **Soubor:** `app/olej/[slug]/page.tsx`, `lib/schema.ts`
- **Co:** Schema používá `descriptionShort` → změnit na `descriptionLong` (Google zvýhodňuje delší description).
- **Čas:** 10 min

**Celkem Fáze 0: ~2 hodiny**

---

## FÁZE 1 — SCHEMA & DISCOVERABILITY (2–3 dny)

**Cíl:** Plné strukturované pokrytí pro AI search engines, GenAI snippets, Rich Results.

### 1.1 ItemList schema na `/srovnavac`
- **Soubor:** `app/srovnavac/page.tsx`
- **Co:** Přidat ItemList JSON-LD s top 50 produkty.
- **Dopad:** Google vidí, že je to ranking/katalog s konkrétními produkty.
- **Čas:** 30 min

### 1.2 ItemList + AggregateOffer na `/zebricek/[slug]`
- **Soubor:** `app/zebricek/[slug]/page.tsx`
- **Co:** Žebříček = ranking → ItemList s `position` 1–N.
- **Dopad:** Rich snippets pro "Nejlepší řecký olivový olej" atp.
- **Čas:** 1 h

### 1.3 NewsArticle schema na `/novinky/[slug]`
- **Soubor:** `app/novinky/[slug]/page.tsx`
- **Co:** Přidat NewsArticle JSON-LD (datePublished, dateModified, author, image, articleBody).
- **Dopad:** Eligible pro Google News, Top Stories, Discover.
- **Čas:** 30 min

### 1.4 Article schema doplnit `image` pole
- **Soubor:** `app/pruvodce/[slug]/page.tsx`
- **Co:** Schema má `headline`, `datePublished`, ale chybí `image`. Přidat hero image.
- **Předpoklad:** Articles potřebují `hero_image_url` field — nejdřív DB migrace + admin UI.
- **Čas:** 1 h

### 1.5 Recipe schema vylepšit
- **Soubor:** `app/recept/[slug]/page.tsx`
- **Co:** Přidat `nutrition`, `recipeCategory`, `recipeCuisine`, `keywords`.
- **Čas:** 30 min

### 1.6 HowTo schema pro "Jak vybrat olivový olej"
- **Soubor:** nový article + `app/pruvodce/[slug]/page.tsx`
- **Co:** Když article má structurované kroky → HowTo schema (eligible pro Google rich results).
- **Čas:** 1 h

### 1.7 Knowledge Graph entity linking
- **Co:** Přidat `sameAs` do Organization schema (Wikipedia, Wikidata, Knowledge panel preparation).
- **Čas:** 30 min

**Celkem Fáze 1: ~5 hodin**

---

## FÁZE 2 — ENTITY FOUNDATION (3–5 dní)

**Cíl:** Naplnit entity pages obsahem + fotkami, aktivovat draft brandy s produkty.

### 2.1 Spustit content generaci pro 3 chybějící cultivary
- **Skript:** `scripts/generate-entity-content.ts --only=cultivars --slug=frantoio`
- **Cultivary:** frantoio, leccino, olivastra
- **Předpoklad:** Doplnit profiles do `CULTIVAR_PROFILES` v skriptu.
- **Čas:** 30 min

### 2.2 Vytvořit script `import-entity-photos.ts`
- **Soubor:** nový `scripts/import-entity-photos.ts`
- **Co:** Volat `importRegionPhotos()`, `importBrandPhotos()`, `importCultivarPhotos()` z `lib/entity-photos.ts`.
- **Čas:** 30 min

### 2.3 Doplnit Unsplash queries pro chybějící entity
- **Soubor:** `lib/entity-photos.ts`
- **Chybí:** `alfa` (brand), `frantoio`, `leccino`, `olivastra` (cultivary)
- **Čas:** 15 min

### 2.4 Spustit import fotek
- **Cíl:** 4 regiony × 3 fotky + 6 brandů × 1 + 8 cultivarů × 1 = ~26 fotek
- **Čas:** 5 min běh + manuál kontrola alt textů

### 2.5 AI alt texty pro entity fotky
- **Co:** Skript projde fotky bez alt_text, zavolá Claude vision/Haiku → custom alt text.
- **Čas:** 1 h

### 2.6 Audit draft brandů → aktivovat ty s produkty
- **Skript:** `scripts/audit-brand-drafts.ts` (nový): pro každý draft brand zjisti počet produktů, sketchnout TOP 10.
- **Akce:** Pro brandy s 2+ produkty: spustit content gen + Unsplash + activate.
- **Cíl:** dostat z 6 → 15+ aktivních brandů.
- **Čas:** 3 h (audit + gen + manual review)

### 2.7 2nd wave entity z memory (Toskánsko, Andalusie, Picual, Arbequina)
- **Co:** Až dorazí produkty z těchto regionů, automaticky vytvořit entity.
- **Status:** Naplánováno, čeká na produkty.

**Celkem Fáze 2: ~5 hodin (bez 2.7)**

---

## FÁZE 3 — META OPTIMIZATION (2–3 dny)

**Cíl:** Custom meta_titles pro TOP produkty (lepší CTR v SERP), admin UI pro snadnou editaci.

### 3.1 Admin UI pro meta_title + meta_description
- **Soubor:** `app/admin/(protected)/products/[id]/product-form.tsx`
- **Co:** Přidat 2 fields: `meta_title` (max 60), `meta_description` (max 160). Live preview SERP snippet.
- **Čas:** 2 h

### 3.2 Bulk meta_title generation pro produkty
- **Skript:** `scripts/backfill-meta-titles.ts` (nový)
- **Šablona:** `${name} — Score ${score}/100, kyselost ${acidity}% | Olivátor`
- **Custom pro top 50:** Claude Haiku napíše unikátní title (max 60ch) zohledňující origin + cert.
- **Čas:** 2 h

### 3.3 Audit meta_descriptions pro relevanci
- **Co:** 172/172 mají meta_description, ale jsou auto-generované. Zkontrolovat zda obsahují klíčová slova ("olivový olej", "extra panenský", region).
- **Akce:** Pro 50 nejhodnocenějších produktů → ručně/AI revize.
- **Čas:** 3 h

### 3.4 Image alt_text audit
- **Skript:** najít produkty s generickým alt textem (= jenom název).
- **Cíl:** alt = `${name} — ${origin_region}, ${origin_country}` formát.
- **Čas:** 1 h

### 3.5 OG images optimalizace
- **Co:** Produkty mají `og:image` = primary photo. Zkontrolovat 1200×630 ratio, fallback default.
- **Čas:** 1 h

**Celkem Fáze 3: ~9 hodin**

---

## FÁZE 4 — TOPIC AUTHORITY (3–4 týdny)

**Cíl:** Pokrýt **každé** SEO klíčové slovo kolem olivového oleje. Stát se autoritou.

### 4.1 Articles content gap — 15+ nových článků v /pruvodce

**Vzdělávací (10):**
- [ ] Jak číst etiketu olivového oleje (kyselost, polyfenoly, sklizeň)
- [ ] Polyfenoly: kolik je dost? Jak je poznat na etiketě
- [ ] Extra panenský vs panenský vs rafinovaný — kompletní průvodce
- [ ] Olivový olej na smažení — bod zakouření a co s ním
- [ ] Olivový olej a zdraví: co tvrdí věda v 2026
- [ ] DOP, PGI, BIO: které certifikace skutečně něco znamenají
- [ ] Sklizeň oliv: early harvest vs late harvest, proč je rozdíl
- [ ] Filtrovaný vs nefiltrovaný olivový olej
- [ ] Středomořská strava a olivový olej: vědecký kontext
- [ ] Olivový olej pro děti: od kdy, kolik, který

**Srovnání/výběr (5):**
- [ ] Olivový olej do salátu vs na vaření
- [ ] Italský vs španělský vs řecký — co si kdy vybrat
- [ ] Premium olej (>500 Kč/l) — má smysl?
- [ ] Olivový olej do 200 Kč — nejlepší poměr cena/výkon
- [ ] Dárkové balení olivového oleje — pro koho a co

**Praktické (5):**
- [ ] Jak skladovat olivový olej doma
- [ ] Otevřená lahev olivového oleje — jak rychle spotřebovat
- [ ] Kde koupit kvalitní olivový olej v ČR — průvodce
- [ ] Falešný olivový olej: jak rozeznat
- [ ] Degustace olivového oleje doma — návod krok za krokem

**Zdroj:** Content Agent (Claude Haiku/Sonnet), template v `lib/article-template.ts` nebo MDX.
**Cíl:** 1500–3000 slov per článek, structured (H2/H3, FAQ na konci, embedded product cards).
**Čas:** 2 dny per článek průměrně = 30–40 dní celkem (paralelizovatelné).

### 4.2 Recepty content gap — 10+ nových receptů

- [ ] Caprese salát s mozzarellou
- [ ] Olivový olej drizzle na rybu (focaccia)
- [ ] Hummus s extra panenským olejem
- [ ] Greek salad (horiatiki)
- [ ] Tapenade
- [ ] Aglio e olio (špagety)
- [ ] Pita s olivovým olejem (řecké placky)
- [ ] Carpaccio
- [ ] Bagna cauda (italský dip)
- [ ] Olivový olej cake (sladký dezert)

**Cíl:** Každý recept = product placement (konkrétní olej s affiliate linkem).
**Čas:** 1 den per recept.

### 4.3 Žebříčky → migrace ze static do DB + dynamické

- **Aktuálně:** 5 žebříčků v `lib/static-content.ts` (statické)
- **Cíl:** Přesunout do `rankings` DB tabulky → admin UI → custom URL slugy.
- **Nové žebříčky:**
  - Nejlepší olivový olej do 200 Kč
  - Nejlepší olivový olej do 300 Kč
  - Nejlepší olivový olej do 500 Kč
  - Nejlepší prémiový (>500 Kč/l)
  - Nejlepší bio řecký
  - Nejlepší DOP
  - Nejlepší early harvest
  - Nejlepší pro salát
  - Nejlepší pro vaření
  - Nejlepší dárkové balení
- **Čas:** 1–2 týdny

### 4.4 Glossary / wiki sekce
- **Nová stránka:** `/slovnik` nebo `/glossary`
- **Co:** Krátké definice klíčových termínů (kyselost, polyfenoly, oleocanthal, EVOO, DOP, IGP, …) s linky na hluboké články.
- **SEO:** Schema `DefinedTerm`, internal linking magnet.
- **Čas:** 1 týden

**Celkem Fáze 4: 3–4 týdny**

---

## FÁZE 5 — E-E-A-T SIGNALS (1–2 týdny)

**Cíl:** Google algoritmus chce důkazy expertize, autorství, důvěryhodnosti.

### 5.1 Autorský systém
- **DB:** Nová tabulka `authors` (id, name, slug, bio, photo_url, expertise, social_links)
- **Stránky:** `/o-projektu/[autor-slug]` — detailní bio
- **Article schema:** `author: { @type: 'Person', name: ..., url: ... }`
- **Čas:** 2 dny

### 5.2 Editorial guidelines stránka
- **URL:** `/editorial-policy` nebo `/redakcni-zasady`
- **Obsah:** Jak vybíráme produkty, jak testujeme, konflikty zájmů (affiliate transparentnost).
- **Schema:** AboutPage
- **Čas:** 4 h

### 5.3 Methodology page rozšíření
- **Soubor:** `app/metodika/page.tsx`
- **Co:** Detailní vzorec Score, source data list, peer review (kdo to ověřil).
- **Čas:** 1 den

### 5.4 Article hero images + AI captions
- **DB:** `articles.hero_image_url`, `articles.hero_image_alt`
- **Admin UI:** Drag & drop hero image
- **Čas:** 1 den

### 5.5 Cited sources v každém článku
- **Format:** "Zdroj: IOC report 2025, USDA database"
- **Schema:** `Article.citation` pole
- **Čas:** Průběžně, per článek

### 5.6 Updated date visible
- **Co:** Každý článek má "Aktualizováno DD. MM. YYYY" v hlavičce
- **Schema:** `dateModified` (už máme)
- **UI:** Vizuálně viditelné
- **Čas:** 1 h

### 5.7 Trust signals na homepage
- **Co:** Logo "Bez reklam · Nezávislé hodnocení · 173 produktů" — konkretizace
- **Akce:** Přidat čísla (kolik produktů, kolik testů, jak často update)
- **Čas:** 1 h

**Celkem Fáze 5: 1–2 týdny**

---

## FÁZE 6 — BACKLINK & OUTREACH (ongoing)

**Cíl:** Domain authority růst → bez backlinků se i 1. místo dlouho neudrží.

### 6.1 Mediakit
- **Stránka:** `/pro-novinare` nebo `/press`
- **Obsah:** Logo, screenshoty, klíčová čísla (počet produktů, návštěvnost), kontakt na PR.
- **Čas:** 1 den

### 6.2 Resource page outreach
- **Cíl:** Najít blog posty typu "Nejlepší zdroje o jídle/zdraví v ČR" → požádat o link.
- **Tools:** Ahrefs/Semrush (placené) nebo Google operator searches.
- **Čas:** 1 h týdně, ongoing

### 6.3 Guest posty
- **Cíl:** 1× měsíčně článek na food/zdraví/lifestyle blog s linkem na Olivátor.
- **Témata:** "Jak vybrat olivový olej" pro food blogy, "Polyfenoly" pro health blogy.
- **Čas:** 4 h per post

### 6.4 HARO (Help A Reporter Out) — CZ ekvivalenty
- **Tools:** Mediafax, ČTK, novinářské skupiny.
- **Cíl:** Nabídnout expertise na olivový olej → mention v článku → link.

### 6.5 Wikipedia editing
- **Cíl:** Edit hesla "Olivový olej", "Středomořská strava" v cz.wikipedia → reference na konkrétní zdroje (Olivátor metodika).
- **Pozor:** Wikipedia má strict no-promo policy — musí být reálná hodnota.
- **Čas:** 4 h

**Celkem: ongoing 5–10 h týdně**

---

## FÁZE 7 — ADVANCED & FUTURE (ongoing)

### 7.1 Voice search optimization
- **Co:** FAQ schémata (už máme), conversational keywords.
- **Příklad:** "Jaký olivový olej je nejlepší pro saláty?" → optimalizovaný H3 + answer.

### 7.2 Search Generative Experience (SGE) preparation
- **Co:** Klíčové info v prvních 3–5 odstavcích, strukturovaný obsah, jasné odpovědi na otázky.
- **Cíl:** Být citován v Google AI Overviews / Bing Copilot.

### 7.3 LocalBusiness schema na entity pages
- **Co:** Region pages mohou mít LocalBusiness pokud máme geo souřadnice.
- **Předpoklad:** Doplnit `latitude`, `longitude` do `regions` tabulky.

### 7.4 Multilang (SK)
- **Co:** Hreflang tags `cs-CZ` ↔ `cs-SK` (Fáze 2 SK trh).
- **Předpoklad:** SK affiliate síť funguje.

### 7.5 Core Web Vitals optimization
- **Cíl:** LCP <2.5s, CLS <0.1, INP <200ms.
- **Tools:** PageSpeed Insights, Lighthouse CI.
- **Čas:** Průběžně.

### 7.6 GSC (Google Search Console) monitoring
- **Akce:** Týdenní review CTR, queries, posunů pozic.
- **Tool:** GSC API → custom dashboard v adminu.
- **Čas:** 30 min týdně.

### 7.7 A/B testing meta titles
- **Co:** Pro 10 TOP produktů zkusit 2 varianty meta_title, sledovat CTR v GSC.
- **Tool:** Custom script + GSC API.

---

## PROGRESS TRACKER

Tento dokument je živý plán. Při dokončení úkolu změň `[ ]` na `[x]`.
Při zjištění nového gapu přidej úkol do správné fáze.

**Stav fází (k 2026-05-07):**

- [ ] Fáze 0 — Quick Wins (0/7)
- [ ] Fáze 1 — Schema & Discoverability (0/7)
- [ ] Fáze 2 — Entity Foundation (0/7)
- [ ] Fáze 3 — Meta Optimization (0/5)
- [ ] Fáze 4 — Topic Authority (0/4 hlavní bloky)
- [ ] Fáze 5 — E-E-A-T Signals (0/7)
- [ ] Fáze 6 — Backlink & Outreach (ongoing)
- [ ] Fáze 7 — Advanced & Future (ongoing)

---

## DOPORUČENÉ POŘADÍ IMPLEMENTACE

1. **Týden 1:** Fáze 0 + 1 (technický fundament — všechny mechanické fixy)
2. **Týden 2:** Fáze 2 (entity content + fotky — visible win)
3. **Týden 3:** Fáze 3 (meta admin UI + custom titles)
4. **Týden 4–7:** Fáze 4 (články + recepty paralelně) + start Fáze 5
5. **Týden 8+:** Fáze 5 dokončit, spustit Fáze 6 outreach
6. **Ongoing:** Fáze 6 + 7

---

## METRIKY ÚSPĚCHU

| Metrika | Aktuální | Cíl 30 dní | Cíl 90 dní | Cíl 180 dní |
|---|---|---|---|---|
| Organické kliky/měs (GSC) | ? | +50% | 5 000 | 25 000 |
| Indexované stránky | ? | 250+ | 350+ | 500+ |
| Pozice "olivový olej" (GSC) | ? | top 50 | top 20 | top 5 |
| Pozice "extra panenský olivový olej" | ? | top 30 | top 10 | top 3 |
| Pozice "nejlepší olivový olej" | ? | top 30 | top 10 | top 3 |
| Backlinky (referring domains) | ? | +5 | +20 | +50 |
| Avg. CTR v SERP | ? | 3% | 5% | 8% |

**Měření:** Google Search Console (klíčový), GA4, Ahrefs/Semrush.

---

*Aktualizuj při každé změně. Když přidáš úkol, dej ho do správné fáze. Když dokončíš, odškrtni a přidej datum.*
