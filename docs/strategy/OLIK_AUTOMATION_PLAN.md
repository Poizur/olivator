# OLIVATOR — OLÍK + AUTOMATION MASTER PLAN
# Cíl: Kompletní content automation foundation s Olíkem jako persona
# Estimated cost: ~$0.70 (foundation) + ~$0.10/článek (ongoing)
# Tvůj čas: 30-45 min foundation week, pak 10-20 min/týden

---

## FILOZOFIE

**3 pilíře:**

1. **Olík jako persona** — author napříč webem, E-E-A-T compliant
2. **AI automation s lidskou kontrolou** — Ty rozhoduješ, AI dělá
3. **Kvalita > Kvantita** — 1-2 perfektní články týdně, ne 10 průměrných

**Pravidla pro Google 2026:**
- E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
- AI detection <20%
- Original data + sources
- Schema.org markup
- Internal + external linking

**Tvůj reálný czas:**
- Foundation week: 30-45 minut total
- Ongoing: 10-20 minut/týden (review + approve)

---

## ABSOLUTNÍ PRAVIDLA

1. **STOP po každém Úkolu** — žádný auto-flow
2. **Hard limit celý sprint: $1.50**
3. **Validátor češtiny POVINNÝ** pro každý generovaný text
4. **Backup před změnami** klíčových tabulek
5. **Branch workflow:** `olik-automation` branch, deploy až na konci
6. **Eskalace:** 2× chyba → STOP a report (CLAUDE.md sekce 20)

---

# DEN 1 — OLÍK AUTHOR SYSTEM

**Cíl:** Olík je oficiální author napříč webem s E-E-A-T compliant infrastructure.
**Čas:** 2-3 hodiny
**Cena:** ~$0

## ÚKOL 1.1 — Olík Profile + Schema

### Bio (use tento exact text)

```
🦊 OLÍK

Hlavní degustátor a redaktor Olivátoru.

Olík ochutnal stovky olejů z Řecka, Itálie, Španělska, Chorvatska 
a Portugalska. Specializuje se na rozlišení skutečné kvality od 
marketingu. Olivator Score je výsledkem jeho práce — kombinuje 
laboratorní data, certifikace a reálné degustace do jednoho čísla.

"Olivový olej není jen tuk. Je to esence sluneční energie 
zachycená v lahvi. Pomohu ti najít ten správný pro tebe."

📍 Praha, Česká republika
📧 olik@olivator.cz
```

### Schema.org Person markup (global)

```typescript
// lib/schema/olik-person.ts

export const olikPersonSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Olík",
  "url": "https://olivator.cz/autor/olik",
  "image": "https://olivator.cz/olik-profile.png",
  "jobTitle": "Hlavní degustátor a redaktor",
  "description": "Maskot a expert Olivátoru. Specializuje se na hodnocení olivových olejů, vědecké analýzy a sezónní reporty. Olivator Score je jeho výtvor.",
  "worksFor": {
    "@type": "Organization",
    "name": "Olivator",
    "url": "https://olivator.cz"
  },
  "knowsAbout": [
    "olivový olej",
    "Olivator Score",
    "Mediterranean diet",
    "DOP certifikace",
    "Polyfenoly",
    "Olive oil tasting",
    "Olive harvest",
    "Středomořská gastronomie"
  ],
  "knowsLanguage": ["cs", "en"]
}
```

### Implementation

- Vytvoř `lib/schema/olik-person.ts`
- Inject schema do `<head>` global (přes layout.tsx)
- Vytvoř/aktualizuj `/public/olik-profile.png` (use existing `/olik.png` if available)

### Cost: $0

---

## ÚKOL 1.2 — Author Page `/autor/olik`

### Co tam má být

```
[Hero: Olík foto + bio + key stats]

🦊 Olík
Hlavní degustátor Olivátoru

Olík ochutnal stovky olejů z Řecka, Itálie, Španělska...
[Full bio]

📊 Olíkova práce v číslech:
- 445 olejů v katalogu
- 31 regionů zmapováno
- 36 odrůd analyzováno
- Olivator Score od 0-100

## Olíkovy nejnovější články
[Grid s posledními 6 articles]

## Témata na která Olík píše
- 🇬🇷 Řecké oleje
- 🇮🇹 Italské oleje
- 🇪🇸 Španělské oleje
- 🧪 Vědecké analýzy
- 🛒 Buying guides
- 🍴 Recepty + pairing
- 📊 Cenové reporty

## Sleduj Olíka
[Newsletter signup form]

## Kontakt
olik@olivator.cz
```

### Implementation

```typescript
// app/autor/olik/page.tsx

import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Olík — Hlavní degustátor Olivátoru | Olivator',
  description: 'Olík je hlavní degustátor a expert Olivátoru. Ochutnal stovky olejů z Řecka, Itálie, Španělska. Olivator Score je jeho výtvor.',
}

export default async function OlikAuthorPage() {
  // Get recent articles
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, title, hero_image_url, category, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6)
  
  // Stats
  const stats = await getProductStats() // 445, 31 regions, 36 cultivars
  
  return (
    <main>
      <OlikHero />
      <OlikStats stats={stats} />
      <RecentArticles articles={articles} />
      <TopicsCovered />
      <NewsletterCTA source="autor_olik_page" />
      <ContactSection />
      
      {/* Schema.org Person markup */}
      <Script
        id="olik-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(olikPersonSchema) }}
      />
    </main>
  )
}
```

### Cost: $0

---

## ÚKOL 1.3 — Author Byline Component

### Component

```typescript
// components/article/author-byline.tsx

import Link from 'next/link'
import Image from 'next/image'

interface AuthorBylineProps {
  publishedAt: string
  updatedAt?: string
  readingTime?: number  // minutes
}

export function AuthorByline({ publishedAt, updatedAt, readingTime }: AuthorBylineProps) {
  const isUpdated = updatedAt && updatedAt !== publishedAt
  
  return (
    <div className="flex items-center gap-3 py-4 border-y border-stone-200">
      <Link href="/autor/olik" className="flex items-center gap-2">
        <Image 
          src="/olik-profile.png" 
          alt="Olík - hlavní degustátor Olivátoru" 
          width={40} 
          height={40} 
          className="rounded-full"
        />
        <div>
          <div className="text-sm font-medium">Olík</div>
          <div className="text-xs text-stone-600">Hlavní degustátor</div>
        </div>
      </Link>
      
      <div className="text-xs text-stone-500 ml-auto">
        {isUpdated ? (
          <>Aktualizováno {formatDate(updatedAt)}</>
        ) : (
          <>Publikováno {formatDate(publishedAt)}</>
        )}
        {readingTime && <> · {readingTime} min čtení</>}
      </div>
    </div>
  )
}
```

### Integration

- Inject do `app/pruvodce/[slug]/page.tsx` (po H1)
- Auto-calculate reading time: `Math.ceil(word_count / 200)` (cca 200 WPM)

### Cost: $0

---

## ÚKOL 1.4 — Update existujících 23 článků

### Co dělat

Pro každý article v DB:
- Set `author_name = 'Olík'`
- Set `author_slug = 'olik'`
- Verify že author_id ukazuje na Olík entry (pokud máme `authors` tabulku)

### DB migration

```sql
-- Pokud nemáme authors tabulku
CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  image_url TEXT,
  email VARCHAR(255),
  schema_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO authors (slug, name, bio, image_url, email, schema_metadata)
VALUES (
  'olik',
  'Olík',
  'Hlavní degustátor a redaktor Olivátoru. Ochutnal stovky olejů z Řecka, Itálie, Španělska, Chorvatska a Portugalska. Specializuje se na rozlišení skutečné kvality od marketingu.',
  '/olik-profile.png',
  'olik@olivator.cz',
  '{...full schema markup...}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET 
  bio = EXCLUDED.bio,
  image_url = EXCLUDED.image_url,
  schema_metadata = EXCLUDED.schema_metadata;

-- Update existing articles
UPDATE articles 
SET author_id = (SELECT id FROM authors WHERE slug = 'olik')
WHERE author_id IS NULL OR author_id NOT IN (SELECT id FROM authors);
```

### Cost: $0

---

## DEN 1 REPORT

```
Den 1 — Olík Author System: HOTOVO

✓ Olík Profile + Schema.org Person markup
✓ /autor/olik page (recent articles, stats, bio, contact)
✓ AuthorByline component
✓ 23 článků: author=Olík
✓ Authors tabulka vytvořena s Olíkem

LIVE na webu:
- Schema.org Person markup global
- /autor/olik page
- Author byline na každém článku

CENA DEN 1: $0
```

STOP a čekat schválení Den 2.

---

# DEN 2 — AI IMAGE PIPELINE

**Cíl:** Auto-select fotky napříč 3 zdroji + SEO metadata.
**Čas:** 2-3 hodiny
**Cena:** ~$0.20

## ÚKOL 2.1 — Image source integrations

### Depositphotos API

```typescript
// lib/images/depositphotos.ts

import axios from 'axios'

const DP_API_KEY = process.env.DEPOSITPHOTOS_API_KEY
const DP_API_URL = 'https://api.depositphotos.com'

interface DPImageResult {
  id: string
  url_preview: string
  url_thumb: string
  url_download: string
  title: string
  description: string
}

export async function searchDepositphotos(
  query: string,
  limit: number = 10
): Promise<DPImageResult[]> {
  const response = await axios.get(`${DP_API_URL}/search`, {
    params: {
      api_key: DP_API_KEY,
      query: query,
      limit: limit,
      orientation: 'horizontal',
      type: 'photo',
    },
  })
  return response.data.images
}

export async function downloadDepositphotos(imageId: string, size: 'large' | 'medium' = 'medium') {
  // Use license to download
  const response = await axios.post(`${DP_API_URL}/download`, {
    api_key: DP_API_KEY,
    image_id: imageId,
    size,
  })
  return response.data.download_url
}
```

### Unsplash API (existing, may need)

```typescript
// lib/images/unsplash.ts

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

export async function searchUnsplash(query: string, limit: number = 10) {
  const response = await axios.get('https://api.unsplash.com/search/photos', {
    headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    params: { query, per_page: limit, orientation: 'landscape' },
  })
  return response.data.results
}
```

### Pexels API

```typescript
// lib/images/pexels.ts

const PEXELS_API_KEY = process.env.PEXELS_API_KEY

export async function searchPexels(query: string, limit: number = 10) {
  const response = await axios.get('https://api.pexels.com/v1/search', {
    headers: { 'Authorization': PEXELS_API_KEY },
    params: { query, per_page: limit, orientation: 'landscape' },
  })
  return response.data.photos
}
```

### Env variables

User musí přidat do `.env.local` a Railway:
```
DEPOSITPHOTOS_API_KEY=...
PEXELS_API_KEY=...
UNSPLASH_ACCESS_KEY=... (already exists)
```

(Bezplatné Pexels API key získat z https://www.pexels.com/api/)

### Cost: $0 (no Claude calls)

---

## ÚKOL 2.2 — AI Image Selector

### Logic

Pro daný article topic + outline:
1. AI extrahuje keywords pro vizuální search (3-5 různých queries)
2. Search all 3 sources paralelně
3. AI vyhodnotí best matches per query (preferuj: relevance > resolution > aesthetic)
4. Pick top 3 (1 hero + 2 in-article)
5. Download + convert to WebP
6. Generate SEO metadata

### Implementation

```typescript
// lib/images/ai-image-selector.ts

import Anthropic from '@anthropic-ai/sdk'

interface ArticleContext {
  title: string
  topic: string
  outline: string[]
}

interface ImageQuery {
  query: string
  purpose: 'hero' | 'in_article_1' | 'in_article_2'
  context: string  // what part of article
}

export async function generateImageQueries(article: ArticleContext): Promise<ImageQuery[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  const prompt = `
Pro článek "${article.title}" navrhni 3 image queries pro stock photo search.

Outline článku:
${article.outline.join('\n')}

Pro každou query specifikuj:
- query (anglicky, 3-5 slov, descriptive)
- purpose (hero / in_article_1 / in_article_2)
- context (kterou sekci článku doprovází)

Příklad pro "Řecký olivový olej — průvodce":
[
  {"query": "greek olive oil bottles authentic", "purpose": "hero", "context": "úvod"},
  {"query": "olive harvest crete greece", "purpose": "in_article_1", "context": "sekce o regionech"},
  {"query": "tasting olive oil drops", "purpose": "in_article_2", "context": "sekce o degustaci"}
]

Vrať POUZE JSON array.
`
  
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  })
  
  return JSON.parse(response.content[0].text)
}

export async function selectBestImages(article: ArticleContext): Promise<SelectedImage[]> {
  const queries = await generateImageQueries(article)
  const results: SelectedImage[] = []
  
  for (const queryDef of queries) {
    // Search all 3 sources paralel
    const [dp, unsplash, pexels] = await Promise.all([
      searchDepositphotos(queryDef.query, 5),
      searchUnsplash(queryDef.query, 5),
      searchPexels(queryDef.query, 5),
    ])
    
    // AI vyhodnotí best match
    const best = await evaluateBestMatch({
      query: queryDef.query,
      context: queryDef.context,
      candidates: [...dp, ...unsplash, ...pexels],
    })
    
    results.push({
      ...best,
      purpose: queryDef.purpose,
    })
  }
  
  return results
}
```

### Cost: ~$0.05 per article (Claude image queries + evaluation)

---

## ÚKOL 2.3 — Auto-generate SEO metadata

### Per obrázek generate

```typescript
// lib/images/image-metadata-generator.ts

export async function generateImageMetadata(
  image: SelectedImage,
  context: { article_title: string, section: string, keyword: string }
): Promise<ImageMetadata> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  const prompt = `
Generuj SEO metadata pro fotku v článku "${context.article_title}".

Sekce kde se fotka objeví: ${context.section}
Primární keyword: ${context.keyword}
Obsah fotky: ${image.description || image.title}

Vrať JSON:
{
  "filename": "descriptive-kebab-case.webp (max 60 chars)",
  "alt": "Descriptive alt text v češtině s keywordem (100-125 chars)",
  "caption": "Popis pod fotkou v češtině (50-80 chars, volitelný)",
  "title_attribute": "Hover text (optional, kratký)"
}

Pravidla:
- Alt text musí být DESCRIPTIVE (popisuje OBSAH fotky), ne marketing
- Filename kebab-case, ASCII only
- Caption volitelný — jen pokud fotka potřebuje kontext
- Žádné AI fráze
- Tykání pokud caption obsahuje výzvu
`
  
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  })
  
  return JSON.parse(response.content[0].text)
}
```

### Image processing pipeline

```typescript
// lib/images/process-pipeline.ts

import sharp from 'sharp'

export async function processImage(
  sourceUrl: string,
  metadata: ImageMetadata
): Promise<ProcessedImage> {
  // 1. Download
  const buffer = await downloadImage(sourceUrl)
  
  // 2. Resize + convert to WebP
  const webp = await sharp(buffer)
    .resize(1200, 800, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .toBuffer()
  
  // 3. Upload to storage
  const filename = `${metadata.filename}.webp`
  const storageUrl = await uploadToSupabaseStorage(webp, filename)
  
  return {
    url: storageUrl,
    filename,
    alt: metadata.alt,
    caption: metadata.caption,
    title: metadata.title_attribute,
    width: 1200,
    height: 800,
  }
}
```

### Cost: ~$0.02 per article (metadata generation)

---

## DEN 2 REPORT

```
Den 2 — AI Image Pipeline: HOTOVO

✓ Depositphotos API integrace
✓ Unsplash API integrace (existing)
✓ Pexels API integrace
✓ AI Image Selector (3 queries → best from 3 sources)
✓ Image processing pipeline (WebP convert, 1200×800)
✓ Auto SEO metadata (filename, alt, caption)

ENV vars needed:
- DEPOSITPHOTOS_API_KEY
- PEXELS_API_KEY

Cost: ~$0.05/article ongoing

CENA DEN 2: ~$0.10 (test calls)
```

STOP a čekat schválení Den 3.

---

# DEN 3 — 2× AI REVIEW PASS + ADMIN UI

**Cíl:** Automatic quality control + human approval workflow.
**Čas:** 3-4 hodiny
**Cena:** ~$0.30

## ÚKOL 3.1 — 2× AI Review Pass

### Pass 1: Validátor češtiny (existing)

Already implemented v `lib/newsletter-blocks.ts` jako `validateCzechText()`.

### Pass 2: AI Review "kde to zní jako AI"

```typescript
// lib/content/ai-review-pass.ts

export async function aiReviewPass(article: { title: string, body: string }): Promise<ReviewResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  const prompt = `
Jsi AI detector + editor. Přečti přiložený článek a najdi:

1. **AI fráze které zní generičtě** ("v dnešní době", "je důležité", 
   "pojďme se podívat", "nezbytné", "úžasný", "fantastický")
2. **Doslovné překlady z angličtiny** (např. "vezměte si chvilku")
3. **Tvrzení bez zdroje** (čísla, statistiky bez citace)
4. **Sekce které jsou příliš generické**
5. **Místa kde chybí osobní voice** (žádné "vyzkoušeli jsme", "překvapilo mě")
6. **Příležitosti pro internal linking** na produkty z DB

Vrať JSON s konkrétními návrhy:
{
  "ai_score_estimate": 0-100,  // odhad % AI obsahu
  "issues": [
    {
      "severity": "critical|warning|suggestion",
      "location": "paragraph 3, line 2",
      "current_text": "Citace problematického textu",
      "suggestion": "Konkrétní návrh oprava",
      "reason": "Proč je to problém"
    }
  ],
  "internal_link_opportunities": [
    {
      "text_anchor": "kvalitní řecké oleje",
      "suggest_link": "/regiony/recko",
      "context": "po větě..."
    }
  ],
  "overall_quality_score": 0-100,
  "must_fix_before_publish": true|false
}

Článek:
"""
${article.title}

${article.body}
"""
`
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })
  
  return JSON.parse(response.content[0].text)
}
```

### Auto-apply opravy

```typescript
// lib/content/auto-apply-fixes.ts

export async function autoApplyReviewFixes(
  article: { title: string, body: string },
  review: ReviewResult
): Promise<ImprovedArticle> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  const prompt = `
Aplikuj následující opravy do článku. Zachovej strukturu (H1, H2, H3), 
délku, internal/external linky.

Opravy:
${JSON.stringify(review.issues, null, 2)}

Internal link příležitosti:
${JSON.stringify(review.internal_link_opportunities, null, 2)}

Pravidla:
- Nahraď AI fráze přirozenými variantami
- Přidej internal linky tam kde dávají smysl
- Zachovej osobní voice
- Tykání konzistentní
- Validátor češtiny by neměl detekovat AI fráze

Vrať POUZE upravený markdown obsah článku (bez metadata).

Originál:
"""
${article.title}

${article.body}
"""
`
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  })
  
  return {
    body: response.content[0].text,
    improvements_applied: review.issues.length,
  }
}
```

### Workflow integration

```typescript
// scripts/generate-article-pipeline.ts

async function generateArticlePipeline(topic: string) {
  const tracker = new CostTracker(0.20)
  
  // 1. Initial draft (Sonnet + Learning Injection)
  await tracker.checkBudget(5000)
  const draft = await generateArticleDraft(topic)
  
  // 2. Pass 1: Validátor češtiny
  const validation1 = validateCzechText(draft.body)
  if (!validation1.ok) {
    draft.body = await fixCzechIssues(draft.body, validation1.issues)
  }
  
  // 3. Pass 2: AI Review
  await tracker.checkBudget(3000)
  const review = await aiReviewPass(draft)
  
  // 4. Auto-apply fixes pokud potřeba
  if (review.must_fix_before_publish || review.ai_score_estimate > 25) {
    await tracker.checkBudget(4000)
    const improved = await autoApplyReviewFixes(draft, review)
    draft.body = improved.body
  }
  
  // 5. Final check
  const finalReview = await aiReviewPass(draft)
  
  return {
    draft,
    review: finalReview,
    cost: tracker.getTotal(),
    ready_for_approval: finalReview.ai_score_estimate < 25 && finalReview.overall_quality_score > 80
  }
}
```

### Cost: ~$0.03 per article

---

## ÚKOL 3.2 — Admin UI `/admin/articles/pending`

### Co tam má být

```
[Header: "Articles Pending Review (3)"]

[Per pending article:]
- Title
- AI score (visual gauge 0-100, target <25)
- Quality score (visual gauge 0-100, target >80)
- Word count
- Internal links count
- External links count
- Created at
- Topic / category

[Actions per article:]
- 👁️ Preview (modal s full content)
- ✓ Approve & Publish
- ✏️ Request edits (textarea s feedback)
- ❌ Reject

[Sidebar: Quality metrics]
- AI score
- Quality score
- Reading time
- SEO score
- Schema markup ✓
- Internal links ✓
- External links ✓
```

### Implementation

```typescript
// app/admin/articles/pending/page.tsx

export default async function PendingArticlesPage() {
  const { data: pending } = await supabase
    .from('articles')
    .select('*, author:authors(*)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
  
  return (
    <main>
      <h1>Articles Pending Review ({pending.length})</h1>
      
      {pending.map(article => (
        <PendingArticleCard 
          key={article.id} 
          article={article}
        />
      ))}
    </main>
  )
}
```

```typescript
// components/admin/pending-article-card.tsx

export function PendingArticleCard({ article }) {
  return (
    <div className="border rounded-lg p-6">
      <div className="flex justify-between">
        <div>
          <h2>{article.title}</h2>
          <p className="text-stone-600">{article.category} · {article.word_count} slov</p>
        </div>
        <div className="flex gap-2">
          <QualityScore score={article.ai_score} type="ai" target="<25" />
          <QualityScore score={article.quality_score} type="quality" target=">80" />
        </div>
      </div>
      
      <ArticleQualityChecklist article={article} />
      
      <div className="flex gap-2 mt-4">
        <button onClick={() => openPreview(article)}>👁️ Preview</button>
        <button onClick={() => approveAndPublish(article.id)} className="btn-primary">
          ✓ Approve & Publish
        </button>
        <button onClick={() => openEditRequest(article)}>✏️ Request edits</button>
        <button onClick={() => rejectArticle(article.id)} className="btn-danger">
          ❌ Reject
        </button>
      </div>
    </div>
  )
}
```

### API endpoints

```typescript
// app/api/admin/articles/[id]/approve/route.ts

export async function POST(req: Request, { params }) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Update status to active
  await supabase
    .from('articles')
    .update({ 
      status: 'active', 
      published_at: new Date().toISOString() 
    })
    .eq('id', params.id)
  
  // Trigger sitemap revalidation
  await revalidatePath('/sitemap.xml')
  await revalidatePath('/pruvodce/[slug]', 'page')
  
  // Optional: GSC URL submit
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    await submitUrlToGSC(`https://olivator.cz/pruvodce/${slug}`)
  }
  
  return Response.json({ ok: true })
}
```

### Cost: $0

---

## DEN 3 REPORT

```
Den 3 — 2× AI Review + Admin UI: HOTOVO

✓ Pass 1 — Validátor češtiny (existing) integrated
✓ Pass 2 — AI Review (Sonnet) implemented
✓ Auto-apply fixes pokud >25% AI nebo issues
✓ Final check before "ready_for_approval"
✓ /admin/articles/pending UI
✓ Approve / Request edits / Reject buttons
✓ Quality dashboard per article
✓ API endpoints (approve, reject, request edits)

CENA DEN 3: ~$0.10 (test článek runs)
```

STOP a čekat schválení Den 4.

---

# DEN 4 — TOPIC GENERATOR + WEEKLY WORKFLOW

**Cíl:** Auto suggest topics týdně + automated production.
**Čas:** 2-3 hodiny
**Cena:** ~$0.10

## ÚKOL 4.1 — Topic Idea Generator

```typescript
// scripts/cron/topic-generator.ts

// Runs every Monday 6:00 UTC
async function generateWeeklyTopicSuggestions() {
  // 1. Get GSC top queries (if integration available)
  const topQueries = await getGSCTopQueries() // top 20 queries last 7 days
  
  // 2. Analyze gaps (queries with high impressions but low CTR)
  const gaps = topQueries.filter(q => q.impressions > 100 && q.ctr < 0.05)
  
  // 3. Check existing articles
  const existing = await getExistingArticleTopics()
  const uncovered = gaps.filter(g => !existing.includes(g.query))
  
  // 4. AI prioritize + suggest angle
  const suggestions = await aiSuggestTopics(uncovered)
  
  // 5. Save to topic_ideas table
  await supabase.from('topic_ideas').insert(suggestions.map(s => ({
    keyword: s.keyword,
    suggested_title: s.title,
    estimated_volume: s.volume,
    suggested_angle: s.angle,
    priority: s.priority,
    status: 'suggested',
    suggested_at: new Date().toISOString(),
  })))
  
  // 6. Send admin email
  await sendTopicSuggestionsEmail(suggestions)
}
```

### Sample AI suggestion prompt

```
Pro Olivator (srovnávač olivového oleje v ČR) navrhni 3 article topics 
pro tento týden.

Aktuální gaps z GSC:
${JSON.stringify(uncovered)}

Existing articles:
${existing.map(a => a.title).join('\n')}

Pro každý topic:
- keyword (primary)
- suggested_title (engaging, max 60 char, with keyword)
- volume (estimated monthly search)
- angle (jaký angle / proč právě tento article 10× lepší než current top)
- priority (high/medium/low based na opportunity)

Preferuj:
- Vysoký volume + nízká konkurence
- Sezónní relevance (květen-červen)
- Buying intent (commercial)

Vrať JSON array s 3 návrhy.
```

### Admin email

```
Subject: 🦊 Olíkovy návrhy na tento týden

Olík navrhuje 3 témata k vytvoření:

1. "Řecký olivový olej — kompletní průvodce 2026"
   Volume: 610 hits/měsíc
   Priority: HIGH
   Angle: Konkurence 0, můžeme dominovat. Spojit s katalogem 200+ řeckých olejů.
   
   [Approve] [Skip]

2. "Olivový olej na smažení — co říká věda"
   Volume: 480 hits/měsíc
   Priority: MEDIUM
   Angle: Smoke point edukace + náš filtered katalog
   
   [Approve] [Skip]

3. "Lidl olivový olej — recenze a alternativy"
   Volume: 210 hits/měsíc
   Priority: HIGH (low competition)
   Angle: Brand recenze, upsell na premium
   
   [Approve] [Skip]

[Approve All & Generate]
```

### Cost: ~$0.05 per week (Claude analysis)

---

## ÚKOL 4.2 — Article Generation Workflow

### Trigger: po user approval topic

```typescript
// app/api/admin/topics/[id]/approve/route.ts

export async function POST(req: Request, { params }) {
  const adminKey = req.headers.get('x-admin-key')
  // ... auth
  
  const { data: topic } = await supabase
    .from('topic_ideas')
    .select('*')
    .eq('id', params.id)
    .single()
  
  // Mark as in production
  await supabase
    .from('topic_ideas')
    .update({ status: 'in_production' })
    .eq('id', params.id)
  
  // Trigger background generation
  await triggerArticleGeneration(topic)
  
  return Response.json({ ok: true, message: 'Article generation started. Check /admin/articles/pending in ~10 minutes.' })
}

async function triggerArticleGeneration(topic) {
  // Background job (could be Railway worker or simple async)
  setTimeout(async () => {
    try {
      // 1. Generate draft
      const draft = await generateArticleDraft(topic)
      
      // 2. AI Image selection
      const images = await selectBestImages({
        title: draft.title,
        topic: topic.keyword,
        outline: draft.h2_sections,
      })
      
      // 3. 2× review pass + auto-apply fixes
      const reviewed = await runReviewPasses(draft)
      
      // 4. Internal linking
      const linked = await injectInternalLinks(reviewed, topic.keyword)
      
      // 5. Save as pending_review
      await supabase.from('articles').insert({
        ...linked,
        author_id: getOlikId(),
        status: 'pending_review',
        ai_score: reviewed.final_review.ai_score_estimate,
        quality_score: reviewed.final_review.overall_quality_score,
        images: images,
      })
      
      // 6. Notify admin
      await sendAdminEmail('🦊 Olík dokončil draft', `/admin/articles/pending`)
      
    } catch (e) {
      // Error handling
      await markTopicFailed(topic.id, e.message)
    }
  }, 0)
}
```

### Cost: ~$0.10 per article

---

## DEN 4 REPORT

```
Den 4 — Topic Generator + Workflow: HOTOVO

✓ Weekly topic generator (CRON pondělí 6:00 UTC)
✓ GSC integration pro gap analysis (manuální nebo API)
✓ AI topic suggestions (3 per týden)
✓ Admin email s návrhy
✓ Auto article generation po topic approval
✓ Background job pipeline
✓ End-to-end workflow tested

CENA DEN 4: ~$0.10
```

STOP a čekat schválení Den 5.

---

# DEN 5 — PILOT ARTICLE #1

**Cíl:** Test full workflow on real article.
**Čas:** 1-2 hodiny (žádná tvá práce, jen admin approve)
**Cena:** ~$0.10

## Pilot topic

**Doporučení: "Řecký olivový olej — kompletní průvodce 2026"**
- Volume: 610 hits/měsíc (+ multiple related keywords)
- Konkurence: 0
- Spojení s existing /regiony/recko
- Spojení s 200+ řeckými oleji v katalogu

## Workflow

```
1. Topic suggestion → admin email (✓ test že workflow funguje)
2. User schvalí topic
3. Auto article generation:
   - Draft (Sonnet + Learning Injection)
   - 3 images selected from Depositphotos/Unsplash/Pexels
   - 2× review pass
   - Internal links injected
   - Schema markup
4. Article appears in /admin/articles/pending
5. Admin emailotification
6. User otevře /admin/articles/pending
7. User review (5-10 min)
8. User approve → publish
9. GSC URL inspection request auto-triggered
10. Sitemap auto-updates
```

## Pilot expected output

```
Title: Řecký olivový olej — kompletní průvodce 2026
Author: Olík
Word count: ~3000-4000
AI score: <20%
Quality score: >85
Internal links: 5-7 (na produkty + 2 související články)
External links: 3-5 (EU eAmbrosia, vědecké studie, IOC)
Images: 3 (hero + 2 in-article)
Schema: Article, FAQPage, BreadcrumbList
Reading time: 12-15 min
```

## Cost: ~$0.10

---

## DEN 5 REPORT

```
Den 5 — Pilot Article #1: HOTOVO

✓ Topic approved: "Řecký olivový olej — kompletní průvodce 2026"
✓ Auto workflow executed end-to-end
✓ Article in /admin/articles/pending
✓ Admin notification sent

POŠLI MI:
- Link na draft v /admin/articles/pending
- AI score
- Quality score
- Tvůj verdict (approve / request edits)

Po approve:
- Live na /pruvodce/recky-olivovy-olej-kompletni-pruvodce-2026
- GSC URL submitted

CENA DEN 5: ~$0.10
```

STOP a čekat tvé approve.

---

# DEN 6 — PILOT ARTICLE #2

Stejný workflow, **AI vybere topic** automaticky.

Možnosti (AI rozhodne):
- "Olivový olej na smažení — co říká věda" (480 hits/měsíc)
- "Lidl olivový olej — recenze a alternativy" (210 hits/měsíc)
- "Polyfenoly — proč na nich záleží" (already exists, můžeš refresh)

**Cena: ~$0.10**

STOP a čekat tvé approve.

---

# DEN 7 — FINAL VERIFY + DEPLOY

## ÚKOL 7.1 — Final deploy

- Merge `olik-automation` → main
- Push → Railway auto-deploy
- Čekat 3 min (BUG-011)
- Verify /api/health

## ÚKOL 7.2 — Smoke testy

- Otevři /autor/olik — funguje?
- Otevři libovolný article — author byline visible?
- Otevři /admin/articles/pending — UI funguje?
- Otevři published pilot article — schema markup OK (test přes Google Rich Results)?

## ÚKOL 7.3 — Schedule weekly CRON

Verify že Railway CRON má:
- topic-generator (pondělí 6:00 UTC)
- Plus všechny existing CRONy z předchozích sprintů

## ÚKOL 7.4 — Final report

```
✅ OLÍK + AUTOMATION MASTER PLAN: HOTOVO

Implementováno:
✓ Olík author system (schema, page, byline)
✓ AI Image Pipeline (Depositphotos + Unsplash + Pexels)
✓ 2× AI Review Pass (Czech validator + AI detector + auto-fix)
✓ Admin /articles/pending approval UI
✓ Weekly topic generator (CRON)
✓ End-to-end article generation pipeline
✓ 2 pilot articles published

Tvůj weekly commitment od příštího týdne:
- Pondělí: schválit 1-3 topic návrhy (2 min)
- Středa-Pátek: review + approve drafts (10-20 min)
- Total: 15-25 min/týden

CENY:
- Foundation: $0.70
- Per article ongoing: $0.10
- Topic generation: $0.05/týden

CELKOVÁ CENA SPRINTU: ~$1.10

DOPAD:
- Olík je teď AUTOR napříč webem (E-E-A-T)
- Article production je automatizovaná
- Tvůj čas: 15-25 min/týden
- Kvalita controlled: <20% AI, >80 quality, schema markup
- Foundation pro 50-100 článků/rok
```

---

## FINÁLNÍ PRAVIDLA

### Cost tracking
- Foundation (Den 1-4): $0.70
- Per pilot article: $0.10
- Total sprint: max $1.50

### Branch workflow
- `olik-automation` branch
- Commit po každém dni
- Deploy hromadný Den 7

### Validation
- Validátor češtiny POVINNÝ
- AI detection target <20%
- Quality score target >80
- Pre-publish 35-bodový check

### Eskalace
- 2× chyba → STOP a report
- CLAUDE.md sekce 20

### ENV vars
User musí přidat (Den 2):
- `DEPOSITPHOTOS_API_KEY`
- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY` (už existuje)

---

🫒
