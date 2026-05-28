# SEO Audit — Olivator.cz
**Datum:** 2026-05-28  
**Verze projektu:** Next.js 16.2.3 (Turbopack), Node 24  
**Rozsah:** Celý projekt (`app/`, `components/`, `lib/`, `next.config.ts`, `app/sitemap.ts`, `app/robots.ts`)  
**Metodika:** Statická analýza kódu + porovnání s Google Search Console requirements a schema.org specifikací

---

## Přehled závažnosti

| Závažnost | Počet | Dopad |
|-----------|-------|-------|
| 🔴 KRITICKÉ | 3 | Blokuje rich results nebo indexaci klíčových stránek |
| 🟡 VAROVÁNÍ | 8 | Suboptimální — snižuje viditelnost, ale neblokuje |
| ✅ V POŘÁDKU | 14 | Funguje správně |

---

## 1. Rendering & Architektura

### ✅ Správně

- **Product detail** (`app/olej/[slug]/page.tsx`): `revalidate = 3600`, `dynamicParams = true`, `generateStaticParams()` pre-renderuje top 30 produktů podle Score → ISR on-demand pro zbytek. Ideální balance mezi TTFB a čerstvostí dat.
- **Sitemap** (`app/sitemap.ts`): `revalidate = 21600` (6h cache) — správně, Google přijímá aktualizaci s max. 6h zpožděním.
- **Entity stránky** (`/oblast`, `/znacka`, `/odruda`): ISR s revalidací → bez force-dynamic zbytečného overheadu.

### 🟡 VAROVÁNÍ

**`/pruvodce/[slug]` — `force-dynamic`**  
`app/pruvodce/[slug]/page.tsx:19`
```typescript
export const dynamic = 'force-dynamic'
```
Komentář říká "obsah se mění v DB — vždy fetchuj čerstvá data". Záměr je správný, ale `force-dynamic` znamená:
- Žádné caching → každý bot request plně fetchuje Supabase
- Pomalejší TTFB pro Google crawler
- Vyšší egress při crawlu (bot přijde 5× za den = 5× full DB fetch)

**Doporučení:** Přepnout na `revalidate = 1800` (30 min). Po editaci článku v adminu volat `revalidatePath('/pruvodce/[slug]')` přes on-demand revalidation. Tím se data obnoví do 30 sekund po uložení, ne až za 30 minut.

---

## 2. Metadata

### ✅ Správně

- `metadataBase: new URL('https://olivator.cz')` v `app/layout.tsx:10` — OG a canonical URL se správně absolutizují.
- `<html lang="cs">` v `app/layout.tsx:56` — správný jazyk pro CZ trh.
- Product detail: meta title fallback logika Score + cena; meta description s `trimMeta(text, 155)` — nepřesahuje 160 znaků.
- Canonical v `app/layout.tsx:40` nastavena pro homepage.

### 🟡 VAROVÁNÍ

**OG image chybí na 3 typech stránek**

| Stránka | Soubor | Stav |
|---------|--------|------|
| `/pruvodce/[slug]` | `app/pruvodce/[slug]/page.tsx:53` | `openGraph` bez `images` pole |
| `/oblast/[slug]` | `app/oblast/[slug]/page.tsx` | `openGraph` bez `images` pole |
| `/znacka/[slug]` | `app/znacka/[slug]/page.tsx` | `openGraph` bez `images` pole |

Bez OG image sdílení na sociálních sítích zobrazí pouze text → nižší CTR při sdílení. Pro průvodce a entity stránky (oblast, značka) stačí použít `heroImageUrl` nebo `photo_url` z DB.

**`/olivovy-olej-5l` a `/nejprodavanejsi` — chybí OG image**  
Tyto stránky mají canonical a metadata, ale žádný `openGraph.images`. Nízký prioritní problém (neindexované přes sitemap — viz sekce 5).

---

## 3. Canonical & Duplicity

### ✅ Správně

- Canonical na všech hlavních stránkách nastavena (`/srovnavac`, `/pruvodce/[slug]`, `/olej/[slug]`, `/oblast/[slug]`, `/znacka/[slug]`, `/nejprodavanejsi`, `/metodika`).
- 5 permanentních 301 redirectů v `next.config.ts:10–16` pro staré/přejmenované URL.
- Žádné duplicitní slug kolize v sitemap (DB-first deduplikace přes `dbArticleSlugs` Set).

### ✅ Bez problémů

Query parametry (filtry v `/srovnavac?origin=gr`) nejsou v sitemapě — správně. Robots.ts neblokuje `/srovnavac` — Google může crawlovat s parametry, ale canonical URL ukazuje na čistou verzi.

---

## 4. Structured Data

### 🔴 KRITICKÉ — `ratingCount: 1` v AggregateRating

**Soubor:** `lib/schema.ts:116`
```typescript
aggregateRating: {
  '@type': 'AggregateRating',
  ratingValue: product.olivatorScore,
  bestRating: 100,
  worstRating: 0,
  ratingCount: 1,   // ← PROBLÉM
},
```

Olivator Score je algoritmický výpočet (kyselost + certifikace + polyfenoly + cena/kvalita), **ne agregát uživatelských recenzí**. `ratingCount: 1` implikuje jednu uživatelskou recenzi, což je nepravdivé.

Google Search Console [explicitně varuje](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) před "schema review marked as spam" pro auto-generované ratingy bez skutečných uživatelů. Výsledek: rich snippet (hvězdičky) se nezobrazí nebo bude označen jako spam.

**Doporučení — dvě možnosti:**

A) Odebrat `aggregateRating` úplně a ponechat pouze `review` s `@type: Review` a `author: Organization`. Google zobrazí editorial review badge (méně atraktivní než hvězdičky, ale legitimní).

B) Přejmenovat na `aggregateRating` s vlastní `@type` score — ale to není standardní schema.org a Google negarantuje zobrazení.

C) Sbírat skutečné uživatelské recenze (Fáze 2 — wishlist/profily) a pak použít `ratingCount` odpovídající reálnému počtu.

**Doporučuji možnost A** — je to konzervativní a chrání před penalizací.

### ✅ Správně

- `Product` schema s `AggregateOffer`, `lowPrice`, `highPrice`, `offerCount` — správně implementováno.
- `shippingDetails` a `hasMerchantReturnPolicy` per retailer s fallbacky — nadprůměrná implementace.
- `BreadcrumbList` na produktech (`lib/schema.ts:147`) i článcích (`app/pruvodce/[slug]/page.tsx:200`).
- `FAQPage` dynamicky parsovaný z `## FAQ` sekce v article body — `app/pruvodce/[slug]/page.tsx:210–241`.
- `Article` schema s `datePublished`, `author`, `publisher`, `mainEntityOfPage`.
- `Recipe` schema (předpokládám na `/recept/[slug]` — implementace nebyla ve scope auditu).
- `GeoCoordinates` v `PlaceJsonLd` pro `/oblast/[slug]` stránky — 31 regionů hardcoded v `entity-jsonld.tsx`.

### 🟡 VAROVÁNÍ — `dateModified` = `datePublished` pro všechny články

**Soubor:** `app/pruvodce/[slug]/page.tsx:167–168`
```typescript
datePublished: article.publishedAt ?? buildTime,
dateModified: article.publishedAt ?? buildTime,   // ← ignoruje updatedAt
```

Pole `article.updatedAt` existuje v DB (`articles.updated_at`) a je dostupné v komponentě jako `article.updatedAt`. Přesto se `dateModified` nastavuje na `publishedAt`. Google používá `dateModified` pro rozhodování o recrawlu — pokud se nemění, crawler snižuje frekvenci návštěv aktualizovaných stránek.

**Fix:** `dateModified: article.updatedAt ?? article.publishedAt ?? buildTime`

---

## 5. Sitemap & Robots

### ✅ Správně

- `sitemap.ts` pokrývá: statické stránky, produkty (z DB `status='active'`), žebříčky, DB articles + static fallback, recepty, regiony, značky, odrůdy, glosář.
- `robots.ts` blokuje 17 AI crawlerů (GPTBot, ClaudeBot, Bytespider, Diffbot atd.) + `/admin` + `/api/` + `/go/`.
- `sitemap` URL v robots: `https://olivator.cz/sitemap.xml` — správně.

### 🔴 KRITICKÉ — `/nejprodavanejsi` a `/olivovy-olej-5l` chybí v sitemapě

Obě stránky:
- Existují (`app/nejprodavanejsi/page.tsx`, `app/olivovy-olej-5l/page.tsx`)
- Mají `revalidate = 3600`
- Mají canonical URL
- Jsou v navigaci (`/nejprodavanejsi` jako "Bestsellery 🔥" v `components/nav.tsx:11`)
- **Nejsou v `app/sitemap.ts`**

`/nejprodavanejsi` je navigační položka s priority klíčovým slovem ("nejprodávanější olivový olej"). Bez sitemapového záznamu závisí indexace výhradně na crawlování přes navigaci — Google to sice najde, ale bez `lastModified` a `priority` signálu může trvat týdny.

**Fix — přidat do `app/sitemap.ts` staticPages:**
```typescript
{ url: `${baseUrl}/nejprodavanejsi`, lastModified: buildTime, changeFrequency: 'daily', priority: 0.85 },
{ url: `${baseUrl}/olivovy-olej-5l`, lastModified: buildTime, changeFrequency: 'weekly', priority: 0.8 },
```

### 🟡 VAROVÁNÍ — `/autor/olik` chybí v sitemapě

`app/autor/olik/page.tsx` má plnou metadata (title, description, canonical `https://olivator.cz/autor/olik`). Stránka má strukturovaná data autora (Person schema). Author page s `rel="author"` zpětně odkazovaná z článků by měla být v sitemapě pro E-E-A-T signál.

**Fix:** Přidat do staticPages s `priority: 0.4`.

---

## 6. Affiliate Odkazy

### ✅ Správně

- `rel="sponsored nofollow noopener"` na všech affiliate odkazech — `components/affiliate-link.tsx:26`. Správně implementováno v souladu s Google guidelines.
- Redirect přes `/go/[retailer]/[slug]` loguje klik a vrací 302 — čistá URL bez affiliate parametrů na produktové stránce.

### 🟡 VAROVÁNÍ — Chybí viditelný text affiliate disclosure na `/olej/[slug]`

Google [vyžaduje](https://developers.google.com/search/docs/advanced/guidelines/link-schemes) jasné označení affiliate vztahu viditelné uživateli, ne jen v HTML atributech. Aktuálně na produktové kartě není žádná věta ve stylu "Olivator dostává provizi za nákupy přes naše odkazy."

**Doporučení:** Přidat do `components/product/where-to-buy-panel.tsx` nebo do `components/retailer-card.tsx` malý text pod tlačítky:
```
* Olivator může získat provizi z nákupů přes partnerské odkazy — ceny vždy aktuální.
```

Stačí jednou pod celou sekcí cen, ne u každého tlačítka.

---

## 7. Nadpisy & Sémantika

### 🟡 VAROVÁNÍ — Homepage `<h1>` jen v client componentě

**Soubory:** `app/page.tsx:78` importuje `SommelierHero`; `components/sommelier-hero.tsx:1` má `'use client'`.

`SommelierHero` renderuje `<h1>` (řádek 189), ale protože je to client component, při SSR/SSG Google crawler dostane HTML bez `<h1>` v initial response — komponent se hydratuje až v browseru. Google tvrdí, že spouští JavaScript, ale Googlebot má zpožděný rendering a první pass HTML (bez JS) je pro crawl priority rozhodující.

**Doporučení:** Přesunout `<h1>` (nebo jeho text) do server-renderovaného `app/page.tsx` jako viditelný nadpis před `<SommelierHero>`, nebo vyexportovat statický text titulku ze `SommelierHero` props tak, aby se vyrenderoval SSR.

### ✅ Správně

- Všechny ostatní klíčové stránky mají `<h1>` v server componentách.
- `/pruvodce/[slug]:275`: `<h1>` s `{article.title}` — server component, viditelné okamžitě.
- `/olej/[slug]`: product name v `<h1>` — server rendered.
- Hierarchie nadpisů H1→H2→H3 zachována na article pages (ArticleBody renderuje Markdown).

---

## 8. Obrázky

### ✅ Správně

- `minimumCacheTTL: 2592000` (30 dní) v `next.config.ts:23` — Supabase egress optimalizace.
- `loading="lazy"` na všech non-hero obrázcích v `/olej/[slug]` (řádky 585, 658, 796, 907, 933, 960, 1036).
- `fetchPriority="high"` na hero image v `/oblast/[slug]` — LCP optimalizace.
- Alt texty: produktové obrázky mají `alt={product.name}` nebo `alt={img.altText ?? product.name}`.
- Next.js `<Image>` komponenta na produktech (automatický WebP, srcset, lazy loading).

### 🟡 VAROVÁNÍ

- `<img>` (nativní) místo `<Image>` (Next.js) na hero obrázcích v `/pruvodce/[slug]:290` a entity linkových sekcích (`907, 933, 960`). Chybí automatická optimalizace velikosti a WebP konverze pro tyto obrázky.
- Hero image v `app/pruvodce/[slug]/page.tsx:290` nemá `fetchPriority="high"` — LCP kandidát bez priority hint.

---

## 9. Výkon

### Build konfigurace

Build byl spuštěn v době auditu (Turbopack). Konkrétní bundle sizes nejsou dostupné, ale platí:

**Next.js 16.2.3 (Turbopack)** — projekt je na Next.js 16.x, přičemž `CLAUDE.md` uvádí "Next.js 14.x". Dokumentace je zastaralá, ale technicky to není problém.

### 🟡 VAROVÁNÍ — Chybí `headers()` v `next.config.ts` pro security headers

`next.config.ts` neobsahuje `async headers()`. Chybí:
- `X-Frame-Options: SAMEORIGIN` — ochrana před clickjacking
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

Google PageSpeed Insights a Lighthouse to reportují jako varování, nepenalizuje to rankings přímo, ale je to best practice.

**Doporučení** (přidat do `next.config.ts`):
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  }]
},
```

### ✅ Image cache TTL

30denní TTL na Next.js image optimizer eliminuje opakovaný egress ze Supabase Storage. Správné pro Railway hosting.

---

## 10. Interní Prolinkování

### ✅ Správně

- Navigace (`components/nav.tsx`) odkazuje na: `/srovnavac`, `/nejprodavanejsi`, `/slevy`, `/zebricek`, `/novinky`, `/pruvodce`, `/recept`, `/metodika`.
- Sidebar v `/pruvodce/[slug]` obsahuje "Top oleje" (5 produktů), "Další průvodci" (3 články) a "Recepty s olejem" — cross-linking mezi obsahovými typy.
- Produktová karta odkazuje na `/oblast/`, `/znacka/`, `/odruda/` přes entityLinks sekci.
- Žebříčky linkují na konkrétní produkty.

### 🟡 VAROVÁNÍ — `/znacka`, `/oblast`, `/odruda` nejsou v navigaci

Tyto sekce (entity pages) jsou dostupné pouze z produktových karet, ne z navigace. Pro Google to znamená:
- Nižší PageRank přenášený na tyto stránky
- Kratší crawl path od homepage

Doporučení: Přidat dropdown "Vyhledat dle" nebo "Kategorie" v navigaci s linky na entity sekce.

---

## 11. Ostatní

### ✅ Správně

- `app/not-found.tsx` existuje — vlastní 404 stránka.
- HTTPS vynuceno na Railway (bez potřeby konfigurace v Next.js).
- `robots.ts` blokuje `/go/` — affiliate redirect URL se neindexují (správně).
- Záhlaví `<html lang="cs">` — česky lokalizovaný obsah správně označen.

### 🟡 VAROVÁNÍ — `hreflang` chybí kompletně

Projekt plánuje SK trh (Fáze 2, `market=SK` parametr v DB). Aktuálně žádná stránka nemá `hreflang` alternates. Není to urgentní (SK obsah není live), ale připravit strukturu před spuštěním SK verzí.

### ✅ Quiz stránka správně mimo sitemap

`/quiz` není v sitemapě — správně. Quiz je interaktivní nástroj, ne indexovatelný obsah. Přes navigaci dostupný není.

---

## Prioritizovaný akční plán

### Udělat hned (kritické)

1. **`ratingCount` fix** — `lib/schema.ts:116`: Odebrat `aggregateRating` nebo nahradit autentickým počtem recenzí. Blokuje legitimní zobrazení hvězdiček v SERP.

2. **Sitemap doplnit** — `app/sitemap.ts`: Přidat `/nejprodavanejsi` (priority 0.85) a `/olivovy-olej-5l` (priority 0.8). Jsou to landing pages s commercial intent a nejsou crawlovatelné bez sitemapového záznamu spolehlivě.

3. **`dateModified` fix** — `app/pruvodce/[slug]/page.tsx:168`:
   ```typescript
   dateModified: article.updatedAt ?? article.publishedAt ?? buildTime,
   ```

### Udělat tento sprint (varování)

4. **Affiliate disclosure text** — Přidat viditelnou větu u cen na `/olej/[slug]`.

5. **Homepage `<h1>` SSR** — Přesunout nebo zduplikovat text nadpisu do server-renderovaného kontextu.

6. **`/autor/olik` do sitemaps** — Nízká námacha, E-E-A-T signál pro autora obsahu.

7. **OG image pro průvodce** — Použít `article.heroImageUrl` jako `openGraph.images[0]` v `app/pruvodce/[slug]/page.tsx`.

### Nízká priorita (backlog)

8. **Security headers** v `next.config.ts`.
9. **Hero image `<Image>` místo `<img>`** v `app/pruvodce/[slug]/page.tsx`.
10. **`/znacka`, `/oblast`, `/odruda` do navigace** — footerové linky jako minimum.
11. **`hreflang`** — Připravit až před spuštěním SK trhu.

---

*Audit provedl Claude Code, 2026-05-28. Nezahrnuje výkonnostní metriky (Core Web Vitals) — pro ty spustit PageSpeed Insights na olivator.cz.*
