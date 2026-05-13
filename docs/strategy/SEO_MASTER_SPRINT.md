# OLIVATOR — SEO MASTER SPRINT
# 7-denní sprint: opravit + rozšířit SEO foundation
# Combinace: Articles fixes + 10 high-intent landing pages + Email magnety + Schema
# Estimated total cost: ~$1.50, Estimated time: 15-20 hodin work
# Potential traffic: ~10 000 unique visits/měsíc po indexaci (2-4 měsíce)

---

## ZÁKLAD STRATEGIE

**Zero marketing budget → pure organic SEO.**

**3 pilíře:**
1. **Opravit existing 23 článků** (technical debt blokuje indexaci)
2. **10 high-intent landing pages** za top keywords s nízkou konkurencí v ČR
3. **Email magnety + internal linking** pro konverzi traffic → subscribers → affiliate

**Klíčové insighty z keyword research (379 keywords analyzed):**
- `řecký olivový olej` — 610 hits/měsíc, konkurence **0**
- `olivový olej akce` — 1 400 hits/měsíc (commercial intent)
- `nejlepší olivový olej` — 290 hits/měsíc
- Total addressable: ~25 000 hits/měsíc, většina LOW competition v ČR

**Konkurenční výhody Olivatoru:**
- 445 produktů katalog (největší v ČR)
- Objektivní Score (nikdo nemá)
- 31 regionů + 36 cultivars (encyklopedie)
- Aktivní cenový monitoring 18 prodejců

**Realita konkurence:** olivum.cz (e-shop), reckonasbavi.cz (e-shop), italyshop.cz (e-shop) — **žádný srovnávač s SEO ambicí.**

---

## ABSOLUTNÍ PRAVIDLA

1. **STOP po každém dni** — žádný auto-flow, čekat na schválení
2. **Validátor češtiny POVINNÝ** pro každý generovaný text
3. **Learning Injection** — agenti čtou lekce z `project_learnings`
4. **Cost tracker** s hard limity per úkol
5. **Hard limit celý sprint: $2.00**
6. **Eskalace** — pokud chyba 2× → STOP a reportuj (CLAUDE.md sekce 20)
7. **Backup DB** před masivními změnami

---

# DEN 1 — ARTICLES MASTER PLAN

**Cíl:** Opravit current 23 článků aby indexovaly + monetizovaly.
**Čas:** 3-4 hodiny
**Cena:** ~$0.15

## ÚKOL 1.1 — Fix `{{date.year}}` template bug

### Problém

Článek `nejlepsi-olivovy-olej-2026` obsahuje **nezprocessované template variables**:
- `{{date.year}}` → mělo být `2026`
- `{{products.count}}` → mělo být počet produktů

LIVE na produkci. Vypadá amatérsky.

### Implementace

```typescript
// scripts/fix-template-variables-in-articles.ts

async function fixTemplateVariables() {
  // 1. Najdi všechny články s {{ pattern
  const { data: articles } = await supabase
    .from('articles')
    .select('id, slug, body_markdown, meta_description, meta_title')
    .or(
      'body_markdown.ilike.%{{%,' +
      'meta_description.ilike.%{{%,' +
      'meta_title.ilike.%{{%'
    )
  
  // 2. Načti dynamická data
  const productCount = await getProductCount() // count from products WHERE status='active'
  const currentYear = new Date().getFullYear().toString()
  
  const replacements = {
    '{{date.year}}': currentYear,
    '{{products.count}}': productCount.toString(),
    '{{products.top_count}}': '5',
    '{{date.month}}': new Date().toLocaleDateString('cs-CZ', { month: 'long' }),
  }
  
  const needsManualReview = []
  let fixed = 0
  
  for (const article of articles) {
    let body = article.body_markdown || ''
    let meta = article.meta_description || ''
    let title = article.meta_title || ''
    
    for (const [pattern, value] of Object.entries(replacements)) {
      body = body.replaceAll(pattern, value)
      meta = meta.replaceAll(pattern, value)
      title = title.replaceAll(pattern, value)
    }
    
    // Verify žádný {{ nezůstal
    const remaining = [
      ...(body.match(/\{\{[^}]+\}\}/g) || []),
      ...(meta.match(/\{\{[^}]+\}\}/g) || []),
      ...(title.match(/\{\{[^}]+\}\}/g) || [])
    ]
    
    if (remaining.length > 0) {
      needsManualReview.push({ 
        slug: article.slug, 
        remaining: [...new Set(remaining)]
      })
      continue
    }
    
    await supabase
      .from('articles')
      .update({ 
        body_markdown: body, 
        meta_description: meta,
        meta_title: title
      })
      .eq('id', article.id)
    
    fixed++
  }
  
  return { fixed, needsManualReview }
}
```

### Lekce do project_learnings

```sql
INSERT INTO project_learnings (category, title, description, rule, applies_to, impact)
VALUES (
  'content_quality',
  'Template variables nezpracovány v article generation',
  'Detekováno {{date.year}} a {{products.count}} v živém článku 
   nejlepsi-olivovy-olej-2026. Content Agent nezpracoval templating syntax.',
  'Při generování článku VŽDY:
   1. Substituuj VŠECHNY dynamické proměnné PŘED uložením do DB
   2. Po generování ověř že žádný { nebo {{ pattern nezůstal v body, meta, title
   3. Validate regex: /\\{\\{[^}]+\\}\\}/ MUSÍ vrátit null
   4. Pokud generuješ year-specific obsah, použij přímo string "2026" ne template',
  ARRAY['content_agent'],
  'high'
);
```

### Cost: $0 (jen DB)

---

## ÚKOL 1.2 — Sitemap fix (KRITICKÁ pro SEO)

### Problém

`app/sitemap.ts` načítá články ze `static-content.ts` (4 statické), nikoli z DB.
**19 článků chybí v sitemap** → Google je nevidí.

### Implementace

```typescript
// app/sitemap.ts

import { supabase } from '@/lib/supabase'

export default async function sitemap() {
  // ... existing entries
  
  // Articles z DB
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, updated_at, category')
    .eq('status', 'active')
  
  const articleEntries = (articles || []).map(a => ({
    url: `https://olivator.cz/pruvodce/${a.slug}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
  
  return [
    ...existingEntries,
    ...articleEntries,
  ]
}
```

```typescript
// app/pruvodce/[slug]/page.tsx

export async function generateStaticParams() {
  const { data: articles } = await supabase
    .from('articles')
    .select('slug')
    .eq('status', 'active')
  
  return articles?.map(a => ({ slug: a.slug })) || []
}
```

### Verify po deploy

```bash
curl -s https://olivator.cz/sitemap.xml | grep -c "/pruvodce/"
# Mělo by vrátit 23+
```

Submit do GSC (manuálně přes dashboard, nebo CRON pokud máme creds).

### Cost: $0

---

## ÚKOL 1.3 — Internal product links na 23 článků (REVENUE KRITICKÉ)

### Problém

**0/23 článků** odkazuje na produkty. Affiliate revenue z článků = 0 Kč.

### Implementace

```typescript
// scripts/add-internal-links-to-articles.ts

import { CostTracker } from '@/lib/cost-tracker'

const ARTICLE_TO_PRODUCT_LOGIC = {
  // === Srovnání ===
  'olivovy-olej-do-200-kc': {
    query: { max_price: 200, min_score: 70, limit: 5 },
    heading: 'Naše top picks pod 200 Kč',
  },
  'premium-olivovy-olej-ma-smysl': {
    query: { min_price: 500, min_score: 85, limit: 4 },
    heading: 'Premium oleje které stojí za to',
  },
  'olivovy-olej-do-salatu-vs-na-vareni': {
    query: { processing: 'cold_pressed', limit: 3, label: 'Pro saláty' },
    query2: { processing: 'refined', limit: 3, label: 'Pro vaření' },
  },
  'darkove-baleni-olivovy-olej': {
    query: { min_score: 80, container_type: ['glass', 'ceramic'], limit: 5 },
    heading: 'Top dárkové oleje',
  },
  'recky-vs-italsky': {
    query_pairs: [
      { country: 'GR', min_score: 80, limit: 3, label: 'Top řecké oleje' },
      { country: 'IT', min_score: 80, limit: 3, label: 'Top italské oleje' },
    ],
  },
  
  // === Průvodce ===
  'kde-koupit-olivovy-olej-cr': {
    query: { min_score: 80, limit: 5 },
    heading: 'Naše doporučení k vyzkoušení',
  },
  'falesny-olivovy-olej-jak-rozeznat': {
    query: { has_certifications: ['DOP'], limit: 5 },
    heading: 'Ověřené DOP oleje (bez rizika falešné značky)',
  },
  'degustace-olivoveho-oleje-doma': {
    query: { min_polyphenols: 400, limit: 5 },
    heading: 'Oleje pro skutečnou degustaci',
  },
  'jak-skladovat-olivovy-olej-doma': {
    query: { container_type: 'dark_glass', limit: 4 },
    heading: 'Oleje v ideálním obalu',
  },
  'otevrena-lahev-jak-rychle-spotrebovat': {
    query: { volume_ml: { lte: 500 }, limit: 4 },
    heading: 'Menší balení pro rychlejší spotřebu',
  },
  'jak-vybrat-olivovy-olej': {
    query: { min_score: 85, limit: 5 },
    heading: 'Naše top doporučení',
  },
  
  // === Vzdělávání ===
  'dop-pgi-bio-certifikace': {
    query: { has_certifications: ['DOP', 'BIO'], limit: 5 },
    heading: 'Příklady DOP a BIO certifikovaných olejů',
  },
  'olivovy-olej-na-smazeni-bod-zakoureni': {
    query: { processing: 'refined', limit: 4 },
    heading: 'Oleje vhodné na vyšší teploty',
  },
  'jak-cist-etiketu-olivoveho-oleje': {
    query: { min_score: 85, limit: 4 },
    heading: 'Top oleje s transparentními etiketami',
  },
  'polyfenoly-kolik-je-dost': {
    query: { min_polyphenols: 500, limit: 5 },
    heading: 'Oleje s nejvyššími polyfenoly (500+ mg/kg)',
  },
  'extra-panensky-vs-panensky-vs-rafinovany': {
    query: { type: 'extra_virgin', min_score: 80, limit: 5 },
    heading: 'Top extra panenské oleje',
  },
  'olivovy-olej-a-zdravi-veda-2026': {
    query: { min_polyphenols: 250, limit: 5 },
    heading: 'Oleje s health claim potenciálem (250+ mg/kg polyfenolů)',
  },
  'sklizen-oliv-early-vs-late-harvest': {
    query: { processing: 'early_harvest', limit: 5 },
    heading: 'Early harvest oleje v katalogu',
  },
  'filtrovany-vs-nefiltrovany-olivovy-olej': {
    query: { processing: 'unfiltered', limit: 4 },
    heading: 'Nefiltrované oleje (cloudy goodness)',
  },
  'stredomorska-strava-olivovy-olej': {
    query: { country: ['GR', 'IT', 'ES'], min_score: 80, limit: 5 },
    heading: 'Klasické středomořské oleje',
  },
  'olivovy-olej-pro-deti': {
    query: { has_certifications: ['BIO'], acidity_max: 0.3, limit: 4 },
    heading: 'Jemné BIO oleje pro děti',
  },
  'polyfenoly-proc-na-nich-zalezi': {
    query: { min_polyphenols: 600, limit: 4 },
    heading: 'Top oleje pro maximální zdravotní benefit',
  },
  
  // === Žebříček ===
  'nejlepsi-olivovy-olej-2026': {
    query: { min_score: 90, limit: 10 },
    heading: 'Top 10 olejů 2026 dle Olivator Score',
  },
}

async function addInternalLinks() {
  const tracker = new CostTracker(0.20)
  
  let updated = 0
  let skipped = 0
  
  for (const [slug, logic] of Object.entries(ARTICLE_TO_PRODUCT_LOGIC)) {
    const { data: article } = await supabase
      .from('articles')
      .select('id, body_markdown, slug')
      .eq('slug', slug)
      .single()
    
    if (!article) {
      skipped++
      continue
    }
    
    // Pokud article už obsahuje /olej/, skip (idempotence)
    if (article.body_markdown.includes('/olej/')) {
      skipped++
      continue
    }
    
    // Najdi produkty
    let products = []
    if (logic.query) {
      products = await getProductsByQuery(logic.query)
    } else if (logic.query_pairs) {
      products = await getProductsByPairs(logic.query_pairs)
    } else if (logic.query2) {
      const p1 = await getProductsByQuery({ ...logic.query, label: logic.query.label })
      const p2 = await getProductsByQuery({ ...logic.query2, label: logic.query2.label })
      products = [...p1, ...p2]
    }
    
    if (products.length === 0) {
      skipped++
      continue
    }
    
    // Generuj markdown blok
    const linkBlock = generateProductLinkBlock(products, logic.heading)
    
    // Inject po prvním H2 (kontextově)
    const newBody = injectAfterFirstH2(article.body_markdown, linkBlock)
    
    await supabase
      .from('articles')
      .update({ body_markdown: newBody })
      .eq('id', article.id)
    
    updated++
  }
  
  return { updated, skipped, total: Object.keys(ARTICLE_TO_PRODUCT_LOGIC).length }
}

function generateProductLinkBlock(products: any[], heading: string): string {
  return `
## ${heading}

${products.map((p, i) => 
  `${i+1}. **[${p.name}](/olej/${p.slug})** — Score ${p.score}, ${p.cheapest_price} Kč u ${p.cheapest_retailer}`
).join('\n')}

`
}

function injectAfterFirstH2(content: string, block: string): string {
  const lines = content.split('\n')
  let h2Index = -1
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      h2Index = i
      break
    }
  }
  
  if (h2Index === -1) {
    // Žádný H2, přidat na začátek
    return block + content
  }
  
  // Najdi konec první sekce (další H2 nebo konec)
  let endOfFirstSection = lines.length
  for (let i = h2Index + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      endOfFirstSection = i
      break
    }
  }
  
  // Inject před další H2 (nebo konec)
  lines.splice(endOfFirstSection, 0, block)
  return lines.join('\n')
}
```

### Cost: ~$0.10 (jen DB queries)

---

## ÚKOL 1.4 — Meta descriptions regenerace

### Problém

6 článků má chybějící nebo příliš krátkou meta description.

### Implementace

```typescript
// scripts/regenerate-article-meta.ts

async function regenerateArticleMeta() {
  const tracker = new CostTracker(0.20)
  
  const { data: articles } = await supabase
    .from('articles')
    .select('id, slug, title, body_markdown, meta_description, meta_title')
    .eq('status', 'active')
  
  let regenerated = 0
  let skipped = 0
  let failed = 0
  
  for (const article of articles) {
    // Skip pokud meta description sedí
    const needsMeta = !article.meta_description || 
                       article.meta_description.length < 120
    const needsTitle = !article.meta_title || 
                        article.meta_title.length < 30 ||
                        article.meta_title.length > 60
    
    if (!needsMeta && !needsTitle) {
      skipped++
      continue
    }
    
    try {
      await tracker.checkBudget(1500)
      
      // Generate přes Claude Haiku
      const result = await generateArticleMeta({
        title: article.title,
        slug: article.slug,
        body: article.body_markdown.slice(0, 2000), // first 2k chars for context
      })
      
      // Validátor češtiny
      const validation = validateCzechText(result.description)
      if (!validation.ok) {
        // Retry
        const retried = await generateArticleMeta(article, validation.issues)
        if (!validateCzechText(retried.description).ok) {
          failed++
          continue
        }
        result.description = retried.description
      }
      
      // Truncate na DB limity
      const finalMeta = result.description.slice(0, 160)
      const finalTitle = result.title.slice(0, 60)
      
      await supabase
        .from('articles')
        .update({
          meta_description: needsMeta ? finalMeta : article.meta_description,
          meta_title: needsTitle ? finalTitle : article.meta_title,
        })
        .eq('id', article.id)
      
      tracker.recordSpend(result.usage.input_tokens, result.usage.output_tokens)
      regenerated++
      
      await new Promise(r => setTimeout(r, 1000))
      
    } catch (e) {
      failed++
    }
  }
  
  return { regenerated, skipped, failed }
}
```

### Cost: ~$0.03

---

## DEN 1 REPORT

```
Den 1 — Articles Master Plan: HOTOVO

Úkol 1.1 — Template variables:
- X článků opraveno
- Lesson vložena do project_learnings
- Žádný {{ pattern v DB nezůstal

Úkol 1.2 — Sitemap fix:
- Před: 4/23 článků v sitemap
- Po: 23/23 v sitemap
- generateStaticParams() vrací 23 článků
- GSC manuální submit: [TODO admin]

Úkol 1.3 — Internal links:
- 23/23 článků s 3-5 internal links
- Total internal links: ~95
- Affiliate potenciál odemčen

Úkol 1.4 — Meta descriptions:
- X regenerated, Y skipped, Z failed
- Všechny 23 článků: validní 120-160 znaků meta

CENA DEN 1: $0.XX / $0.50 limit

DALŠÍ KROK: Den 2 — Top 3 high-intent landing pages
```

STOP a čekat schválení.

---

# DEN 2 — TOP 3 HIGH-INTENT LANDING PAGES

**Cíl:** Vytvořit 3 nejdůležitější landing pages za high-volume keywords.
**Čas:** 4-5 hodin
**Cena:** ~$0.50
**Potenciál:** ~4 200 hits/měsíc po indexaci

## LANDING PAGE 1 — `/akce` (NEJVYŠŠÍ PRIORITA)

### Keywords cluster

- `olivový olej akce` — 1 400 hits/měsíc
- `olivový olej v akci` — 480
- `akce olivový olej` — 170
- `olivovy olej akce` — 170
- `olivový olej sleva` — 20
- `extra panenský olivový olej akce` — 120
- `monini olivový olej akce` — 20
- `olivový olej franz josef akce` — 20

**Total: ~2 400 hits/měsíc, commercial intent, nízká konkurence**

### Struktura stránky

```
Title: Olivový olej v akci — aktuální slevy 2026 | Olivator
Meta: Sleduj denně aktualizované slevy na olivový olej. 18 prodejců, 445 produktů, top oleje od 99 Kč. Olivator Score garantuje kvalitu.

H1: Olivový olej v akci — denně aktualizované slevy

[Hero strip s aktuální nejlepší slevou]
"Aktuálně 30 produktů ve slevě průměrně -22 %"

[Hlavní content]

## Nejlepší slevy tento týden

[Auto-generated cards z DB — produkty kde aktuální cena < 30-day avg]
- Top 10 cards s největším % discount
- Každá karta: foto, název, Score, původní cena, aktuální cena, % sleva, CTA

[Email magnet inline]
"📩 Sleva ti utíkat nemusí. Pošlu ti notifikaci hned jak klesne cena
tvého oblíbeného oleje."
[Subscribe form — source=akce_landing]

## Slevy podle prodejce

[Per retailer sections — Olivum.cz, Reckonasbavi.cz, ItalyShop.cz...]
- Aktuální slevy z každého
- Link na další oleje od daného prodejce

## Jak najít skutečnou slevu (ne falešnou)

[Edukační sekce — krátký guide]
- Co je "doporučená cena" a proč na ní nezáviset
- Cenová historie — vidíš že cena byla nižší
- Olivator Score: kvalita = sleva (ne marketingová cena)

## Top 5 olejů které jsou TEĎ nejvýhodnější

[Curated picks — high Score + dobrá aktuální cena/100ml]

## FAQ
- Jak často se slevy aktualizují? (denně 4:00 UTC)
- Můžu si nastavit alert?
- Funguje to s newsletter?

[End CTA — newsletter pro slevy + complete catalog]
```

### Implementace

```typescript
// app/akce/page.tsx

import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Olivový olej v akci — aktuální slevy 2026 | Olivator',
  description: 'Sleduj denně aktualizované slevy na olivový olej. 18 prodejců, 445 produktů, top oleje od 99 Kč. Olivator Score garantuje kvalitu.',
  openGraph: {
    title: 'Olivový olej v akci — aktuální slevy 2026',
    description: '...',
  },
}

export default async function AkcePage() {
  // Find products on sale (current_price < 30-day avg by 10%+)
  const onSale = await getProductsOnSale()
  const byRetailer = groupByRetailer(onSale)
  const topPicks = await getCuratedTopPicks(onSale)
  
  return (
    <main>
      <HeroSection 
        title="Olivový olej v akci"
        subtitle={`Aktuálně ${onSale.length} produktů ve slevě průměrně -${avgDiscount}%`}
      />
      
      <SaleProductsGrid products={onSale.slice(0, 10)} />
      
      <InlineSubscribeBox 
        source="akce_landing"
        text="📩 Sleva ti utíkat nemusí..."
      />
      
      <ByRetailerSection byRetailer={byRetailer} />
      
      <HowToFindRealSaleSection />
      
      <TopPicksSection products={topPicks} />
      
      <FaqSection items={akceFaq} />
      
      <FinalCta />
    </main>
  )
}
```

### SEO

- Title 60 znaků s primárním keywordem
- Meta description 155 znaků
- H1 s "Olivový olej v akci"
- H2 sekce obsahují další keywords (slevy, akce, výhodné)
- Schema.org: ItemList markup pro produkty
- Schema.org: FAQPage markup
- Breadcrumb schema
- OG tags
- Internal links na: /srovnavac, /metodika, /zebricek, top 5 produktů

### Cost

- ~$0.20 (AI generování FAQ + edukační sekce + descriptions)

---

## LANDING PAGE 2 — `/regiony/recko` (OPTIMIZE EXISTING)

### Keywords cluster

- `řecký olivový olej` — 610 hits/měsíc (**konkurence 0!**)
- `nejlepší řecký olivový olej` — 460
- `olivový olej kréta` — 460
- `krétský olivový olej` — 370
- `řecký olivový olej 5l` — 30
- `olivový olej z kréty` — 20

**Total: ~1 950 hits/měsíc, konkurence prakticky nulová**

### Strategie

Vzít existující `/regiony/recko` (po Den 1 admin polish, vygenerovaná).
**Expandovat** o:
- Top oleje z Řecka (z catalogu)
- Top oleje z Kréty (sub-region)
- Příběh řeckého olivového oleje
- Charakteristiky odrůd (Koroneiki, Manaki, Athinolia)
- DOP regiony v Řecku
- Recepty s řeckým olejem
- Email magnet "Stáhni: 10 nejlepších řeckých olejů 2026 (PDF)"

### Implementace

```typescript
// app/regiony/[slug]/page.tsx
// Modify existing component to handle expanded content

async function getRecekContent() {
  const region = await supabase.from('regions').select('*').eq('slug', 'recko').single()
  
  // Top oleje z Řecka
  const topGreek = await supabase
    .from('products')
    .select('*')
    .eq('origin_country', 'GR')
    .order('olivator_score', { ascending: false })
    .limit(20)
  
  // Top z Kréty (sub-region)
  const topCreta = await supabase
    .from('products')
    .select('*')
    .eq('origin_country', 'GR')
    .or('origin_region.ilike.%kréta%,origin_region.ilike.%creta%')
    .order('olivator_score', { ascending: false })
    .limit(10)
  
  // DOP regiony
  const dopRegions = await getGreekDopRegions()
  
  // Hlavní odrůdy
  const greekCultivars = await getGreekCultivars()
  
  return { region, topGreek, topCreta, dopRegions, greekCultivars }
}
```

### SEO

- Title: "Řecký olivový olej — top 20 ze 18 prodejců | Olivator"
- Meta: "Hledáš nejlepší řecký olivový olej? 200+ řeckých olejů v katalogu, Olivator Score, ceny z 18 prodejců. Top: Sitia, Kalamata, Korinthia."
- H1: "Řecký olivový olej — průvodce + top vybrané"
- Schema.org: Article + ItemList

### Cost: ~$0.15

---

## LANDING PAGE 3 — `/zebricek/nejlepsi` (OPTIMIZE EXISTING)

### Keywords cluster

- `nejlepší olivový olej` — 290 hits/měsíc
- `nejkvalitnější olivový olej` — 300
- `nejlepší olivový olej na světě` — 220
- `nejlepsi olivovy olej` — 120
- `nejlepší řecký olivový olej` — 460 (overlap s landing 2)
- `jaký olivový olej` — 340
- `jaký olivový olej je nejlepší` — 60

**Total: ~1 790 hits/měsíc** (mínus overlap s landing 2)

### Strategie

Žebříček již existuje, ale expandujeme:
- TOP 20 olejů s detailním breakdown
- Vysvětlení proč jsou nahoře (Olivator Score komponenty)
- Per kategorie sub-žebříčky:
  - Top 5 do 200 Kč
  - Top 5 BIO
  - Top 5 řecké
  - Top 5 italské
  - Top 5 high-polyphenol
- Email magnet "PDF: Tabulka 50 nejlepších olejů 2026"

### Implementace

```typescript
// app/zebricek/nejlepsi/page.tsx (nebo modify existing)

async function NejlepsiPage() {
  const top20 = await getTop20()
  const subCategories = await getSubCategoryTops()
  
  return (
    <main>
      <HeroSection title="Nejlepší olivový olej 2026" />
      
      <TopRankingSection ranking={top20} />
      
      <SubCategoryRankings categories={subCategories} />
      
      <ScoreExplanationBlock />
      
      <InlineSubscribeBox 
        source="nejlepsi_landing"
        text="Stáhni PDF s kompletní tabulkou 50 nejlepších olejů"
      />
      
      <FaqSection />
    </main>
  )
}
```

### Cost: ~$0.15

---

## DEN 2 REPORT

```
Den 2 — Top 3 Landing Pages: HOTOVO

✓ /akce — vytvořeno
  - Slevy aktualizují denně 4:00 UTC
  - 10 produktů na sale
  - Email magnet "Newsletter pro slevy"
  - Schema.org ItemList + FAQPage

✓ /regiony/recko — expanded
  - 200+ řeckých olejů
  - Top 10 z Kréty (sub-region)
  - DOP regiony popsány
  - Email magnet "PDF řecké oleje"

✓ /zebricek/nejlepsi — expanded
  - Top 20 s detailním breakdown
  - 5 sub-žebříčků (do 200 Kč, BIO, řecké, italské, polyfenoly)
  - Email magnet "PDF 50 nejlepších"

CENA DEN 2: $X.XX / $0.50 limit

Potenciální traffic po indexaci:
- /akce: 2 400 hits/měsíc
- /regiony/recko: 1 950 hits/měsíc
- /zebricek/nejlepsi: 1 790 hits/měsíc
- Total: ~6 140 hits/měsíc

DALŠÍ KROK: Den 3 — Další 4 landing pages
```

STOP a čekat schválení.

---

# DEN 3 — DALŠÍ 4 LANDING PAGES

**Cíl:** Dokončit landing pages s vysokou volume.
**Čas:** 4-5 hodin
**Cena:** ~$0.40

## LANDING PAGE 4 — `/srovnavac/extra-panensky`

### Keywords cluster

- `extra panenský olivový olej` — 560 hits/měsíc
- `extra panenský olivový olej cena` — 290
- `extra panenský olivový olej zdraví` — 160
- `extra panenský olivový olej akce` — 120
- `extra virgin olivový olej` — 100
- `extra panenský olivový olej použití` — 100
- `extra panensky olivovy olej` — 20

**Total: ~1 350 hits/měsíc**

### Struktura

Filtered catalog (jen extra panenské) + edukační content + buying guide.

### Cost: ~$0.10

---

## LANDING PAGE 5 — `/zdravi` (Health Hub)

### Keywords cluster

- `olivový olej zdravotní účinky` — 420 (no competition?)
- `je olivový olej zdravý` — 410
- `olivový olej zdraví` — 290
- `olivový olej účinky` — 220
- `extra panenský olivový olej zdraví` — 160
- `olivovy olej zdravi` — 120

**Total: ~1 620 hits/měsíc**

### Struktura

Hub s rozcestníkem na health articles + scientific backing + EU health claim + produkty s 250+ mg/kg polyfenolů.

### Cost: ~$0.15

---

## LANDING PAGE 6 — `/srovnavac/na-smazeni`

### Keywords cluster

- `olivový olej na smažení` — 480
- `olivový olej smažení` — 240
- `olivovy olej smazeni` — 120
- `extra panenský olivový olej smažení` — 30
- `jaký olivový olej na smažení` — 20

**Total: ~890 hits/měsíc**

### Struktura

Smoke point edukace + filtered catalog + recepty + buying guide.

### Cost: ~$0.10

---

## LANDING PAGE 7 — `/srovnavac/sprej`

### Keywords cluster

- `olivový olej ve spreji` — 430
- `olivový olej sprej` — 20
- `olivový olej ve spreji lidl` — 20

**Total: ~470 hits/měsíc**

### Struktura

Filtered catalog (oleje ve spreji) + co je sprej olej + dieta + vaření.

### Cost: ~$0.05

---

## DEN 3 REPORT

```
Den 3 — Další 4 landing pages: HOTOVO

✓ /srovnavac/extra-panensky — 1 350 hits/měsíc potential
✓ /zdravi — 1 620 hits/měsíc potential
✓ /srovnavac/na-smazeni — 890 hits/měsíc potential
✓ /srovnavac/sprej — 470 hits/měsíc potential

Total additional: ~4 330 hits/měsíc
Cumulative landing pages potential: ~10 470 hits/měsíc

CENA DEN 3: $X.XX / $0.40 limit

DALŠÍ KROK: Den 4 — Email magnety + Schema markup
```

STOP a čekat schválení.

---

# DEN 4 — EMAIL MAGNETY NAPŘÍČ OBSAHEM

**Cíl:** Convert traffic na newsletter subscribers.
**Čas:** 2-3 hodiny
**Cena:** ~$0.10

## ÚKOL 4.1 — Inline subscribe box v článcích

Pro každý článek **po prvním H2** auto-inject:

```html
<div class="inline-subscribe-box">
  <div class="content">
    <h4>📩 Líbí se ti tento průvodce?</h4>
    <p>Posílám 1× týdně: olej týdne, slevy, recepty. Zdarma, kdykoliv odhlášení.</p>
  </div>
  <form action="/api/newsletter/subscribe" method="POST">
    <input type="hidden" name="source" value="article_inline" />
    <input type="hidden" name="article_slug" value="{slug}" />
    <input type="email" name="email" placeholder="tvuj@email.cz" required />
    <button>Odebírat</button>
  </form>
</div>
```

## ÚKOL 4.2 — End-of-article CTA

Po posledním H2:

```html
<div class="end-of-article-cta">
  <h3>Chceš víc tipů jako tenhle?</h3>
  <p>1× týdně do schránky:
    <ul>
      <li>Olej týdne s konkrétní recenzí</li>
      <li>Aktuální slevy ze 18 prodejců</li>
      <li>Recept + doporučený olej</li>
    </ul>
  </p>
  [Subscribe form — source=article_end]
</div>
```

## ÚKOL 4.3 — Article-specific lead magnets (nadstavba)

Pro top 5 článků (highest volume potential):
- `sklizen-oliv-early-vs-late-harvest` → "PDF: Kalendář olivové sklizně 2026"
- `dop-pgi-bio-certifikace` → "PDF: 30 nejdůležitějších certifikátů"
- `polyfenoly-kolik-je-dost` → "PDF: Top 50 olejů podle polyfenolů"
- `jak-vybrat-olivovy-olej` → "PDF: Checklist před nákupem"
- `jak-skladovat-olivovy-olej-doma` → "PDF: Skladování olejů — kompletní guide"

PDF magnety **nevytvářet teď** — zatím jen prepare email opt-in, PDF dodáme později.

### Cost: ~$0.05 (jen kód)

---

# DEN 5 — SCHEMA.ORG MARKUP

**Cíl:** Rich snippets v Google search results.
**Čas:** 2-3 hodiny
**Cena:** $0

## ÚKOL 5.1 — Article schema na všech 23 článcích

```typescript
// components/article-schema.tsx

import { JsonLd } from '@/lib/json-ld'

export function ArticleSchema({ article }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.meta_description,
        image: article.hero_image_url,
        author: {
          '@type': 'Organization',
          name: 'Olivator',
          url: 'https://olivator.cz',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Olivator',
          logo: {
            '@type': 'ImageObject',
            url: 'https://olivator.cz/logo-wordmark.png',
          },
        },
        datePublished: article.created_at,
        dateModified: article.updated_at,
      }}
    />
  )
}
```

## ÚKOL 5.2 — FAQ schema pro FAQ sekce

Detekovat FAQ patterny v článcích a generovat FAQPage schema.

## ÚKOL 5.3 — Product schema pro produktové stránky

```typescript
{
  '@type': 'Product',
  name: product.name,
  image: product.image_url,
  description: product.tldr,
  brand: { '@type': 'Brand', name: product.brand_name },
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: product.lowest_price,
    highPrice: product.highest_price,
    priceCurrency: 'CZK',
    offerCount: product.retailer_count,
  },
  aggregateRating: product.olivator_score ? {
    '@type': 'AggregateRating',
    ratingValue: product.olivator_score / 20, // convert 0-100 → 0-5
    bestRating: 5,
    ratingCount: 1,
  } : undefined,
}
```

## ÚKOL 5.4 — Breadcrumb schema

Pro všechny stránky s breadcrumb navigation.

## ÚKOL 5.5 — Organization schema

V `<head>` global:

```typescript
{
  '@type': 'Organization',
  name: 'Olivator',
  url: 'https://olivator.cz',
  logo: 'https://olivator.cz/logo-wordmark.png',
  description: 'Největší srovnávač olivových olejů v ČR',
  sameAs: [
    // Pokud máme social media — Instagram, FB
  ],
}
```

### Cost: $0

---

# DEN 6 — INTERNAL LINKING POLISH

**Cíl:** SEO juice flow napříč webem.
**Čas:** 2-3 hodiny
**Cena:** $0

## ÚKOL 6.1 — Related articles na konci článků

Po End-of-article CTA:

```html
<section class="related-articles">
  <h3>Mohlo by tě zajímat</h3>
  <div class="grid">
    <ArticleCard slug="..." />
    <ArticleCard slug="..." />
    <ArticleCard slug="..." />
  </div>
</section>
```

Logika výběru:
- Stejná kategorie + 1 z jiné
- Vyhnout se duplicitě (poslední 3 přečtené z cookie)

## ÚKOL 6.2 — "From the catalog" widget v sidebar

Desktop only sidebar:

```html
<aside class="article-sidebar">
  <h4>Vyzkoušej naše top picks</h4>
  [Top 3 produkty dle Score s mini-cards]
  
  <h4>Užitečné stránky</h4>
  - Žebříček nejlepších
  - Co je Olivator Score
  - Aktuální slevy
</aside>
```

## ÚKOL 6.3 — Footer link improvements

Přidat sitemap-like footer s top stránkami:
- Top kategorie (extra panenský, BIO, řecké, italské, na smažení)
- Top regiony (Andalusie, Toskánsko, Kréta, Apulie)
- Top odrůdy (Arbequina, Picual, Koroneiki, Frantoio)
- Užitečné odkazy (žebříčky, akce, metodika, FAQ)

### Cost: $0

---

# DEN 7 — FINAL VERIFY + DEPLOY

**Cíl:** Vše funguje, deployed, indexováno.
**Čas:** 2-3 hodiny
**Cena:** $0

## ÚKOL 7.1 — Full sitemap audit

```bash
curl -s https://olivator.cz/sitemap.xml | xmllint --format - | head -50

# Count:
- /pruvodce/ — mělo by být 23
- /regiony/ — 31
- /odrudy/ — 36
- /olej/ — 445
- /zebricek/ — N (existing + nové)
- Static — homepage, /metodika, /srovnavac, /akce, /zdravi, atd.

Total expected: ~600+
```

## ÚKOL 7.2 — GSC submit + verify

1. GSC dashboard → Sitemaps
2. Verify sitemap.xml status: success
3. Submit individual landing pages přes URL Inspection:
   - /akce
   - /regiony/recko (změna existing)
   - /zebricek/nejlepsi (změna existing)
   - /srovnavac/extra-panensky
   - /zdravi
   - /srovnavac/na-smazeni
   - /srovnavac/sprej

4. Request indexing pro top 23 článků (po fix).

## ÚKOL 7.3 — Schema verify

Test schema markup pomocí:
- https://search.google.com/test/rich-results
- https://validator.schema.org

Pro 3 vzorky:
- Article page (random article)
- Product page (top product)
- Landing page (/akce)

## ÚKOL 7.4 — Lighthouse audit

Mobile + desktop pro top 5 stránek:
- Homepage
- /akce
- /pruvodce/jak-vybrat-olivovy-olej
- /olej/[top product]
- /regiony/recko

Target: Performance > 80, SEO > 95, Accessibility > 90.

## ÚKOL 7.5 — Final report

```
SEO MASTER SPRINT — 7 DNŮ HOTOVO

PROVEDENÉ ZMĚNY:

Den 1 — Articles Master Plan:
✓ 23 článků opraveno (templates, internal links, meta)
✓ Sitemap 4 → 23 článků
✓ ~95 internal product links

Den 2-3 — 7 high-intent landing pages:
✓ /akce — 2 400 hits/měsíc potential
✓ /regiony/recko — 1 950 hits/měsíc
✓ /zebricek/nejlepsi — 1 790 hits/měsíc
✓ /srovnavac/extra-panensky — 1 350 hits/měsíc
✓ /zdravi — 1 620 hits/měsíc
✓ /srovnavac/na-smazeni — 890 hits/měsíc
✓ /srovnavac/sprej — 470 hits/měsíc

Total addressable: ~10 500 hits/měsíc po indexaci

Den 4 — Email magnety:
✓ Inline subscribe box ve všech článcích
✓ End-of-article CTA
✓ Source tracking per signup

Den 5 — Schema.org:
✓ Article schema (23 článků)
✓ FAQPage schema
✓ Product schema (445 produktů)
✓ Breadcrumb schema
✓ Organization schema global

Den 6 — Internal linking:
✓ Related articles widget
✓ Sidebar produktové linky
✓ Expanded footer

Den 7 — Deploy + Verify:
✓ Sitemap 600+ URLs
✓ GSC submitted všechny new landing pages
✓ Schema validated
✓ Lighthouse mobile + desktop OK

CENA CELÉHO SPRINTU: $X.XX / $2.00 limit

DOPAD:
- 23 článků konečně indexovaných
- 10 nových landing pages za high-intent keywords
- ~10 500 hits/měsíc addressable traffic (po 2-4 měsících indexace)
- Email funnel napříč veškerým obsahem
- Rich snippets v Google search

DALŠÍ KROKY (FOLLOW-UP):
- 1-2 týdny: sledovat GSC, kolik se indexuje
- Měsíc 1-2: prvé organic visits, A/B testing CTA
- Měsíc 3+: Sprint B — sezónní obsah (červen-srpen)
```

---

## FINÁLNÍ PRAVIDLA SPRINTU

### Cost tracking

Hard limity per den:
- Den 1: $0.50
- Den 2: $0.50
- Den 3: $0.40
- Den 4: $0.10
- Den 5-7: $0.10
- **Total max: $2.00**

### Validation

- **Validátor češtiny POVINNÝ** pro každý generovaný text
- Pokud retry 2× selže → skip + log + admin alert
- Po každém dni: TS clean check, ESLint check

### Backup

- Před Den 1 Úkol 1: backup `articles` tabulky
- Před Den 2: backup `regions`, `cultivars` (modifikujeme content)
- Před Den 5: backup sitemap config

### Anthropic API limit

Pokud "out of extra usage" → STOP, počkat na reset. Pokračovat odkud skončil.

### Deploy

Po každém dni commit + push, ale **deploy hromadný na konci Den 7**.
Důvod: minimalizovat Railway rebuilds (1× místo 7×).

Branch flow:
- Vytvořit branch `seo-master-sprint`
- Commitovat po každém dni
- Den 7: merge do `main` + push → Railway auto-deploy

---

## EXECUTION

### Začni TÝMTO

1. **Backup DB:**
   ```sql
   CREATE TABLE articles_backup_20260512 AS SELECT * FROM articles;
   ```

2. **Vytvořit branch:**
   ```bash
   git checkout -b seo-master-sprint
   ```

3. **Den 1 Úkol 1.1** — fix template variables
4. **STOP a report po Úkolu 1.1**

Pak postupně po jednotlivých Úkolech/Dnech s STOP between.

🫒
