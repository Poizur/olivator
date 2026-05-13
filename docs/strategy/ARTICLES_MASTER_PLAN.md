# OLIVATOR — Articles Master Plan
# Cíl: kompletní transformace článků z neviditelných na revenue generator
# Estimated cost: ~$1.50, Estimated time: 2-3 hours

---

## KONTEXT

Z ARTICLES_AUDIT.md:
- 23 článků, kvalitních (96 % AI-clean, 83 % long-form)
- ALE: jen 4/23 v sitemap, 0/23 interních linků, 1 článek s template bug
- 6 článků chybí meta description

3 kritické fixy + 1 quality pass.

---

## ABSOLUTNÍ PRAVIDLA

1. **Validátor češtiny POVINNÝ** pro každý regenerovaný text
2. **Learning Injection** — pro každý Claude call načti lekce
3. **STOP po každém úkolu** — žádný auto-flow
4. **Hard limit $2** pro celý plán

---

## ÚKOL 1 — OPRAVIT `{{date.year}}` BUG (KRITICKÁ PRIORITA)

### Problém

Článek `nejlepsi-olivovy-olej-2026` obsahuje **nezprocessované template variables**:
- `{{date.year}}` → mělo být `2026`
- `{{products.count}}` → mělo být počet produktů

Visible live na produkci. Vypadá amatérsky.

### Diagnostika

```sql
-- Najdi všechny články s template variables
SELECT id, slug, title 
FROM articles 
WHERE 
  body_markdown ILIKE '%{{%}}%' OR
  body_markdown LIKE '%{%}%' OR
  body_markdown LIKE '%{%';
```

**Pošli mi seznam.** Pravděpodobně bude víc než 1 článek.

### Oprava

Pro každý postižený článek:

1. Načti aktuální `body_markdown`
2. Substituce:
   - `{{date.year}}` → `2026` (current year)
   - `{{products.count}}` → aktuální count z `products WHERE status='active'`
   - `{{products.top_count}}` → top X dle Score
   - Jiné `{{...}}` patterny → log a manual fix
3. Update DB s opraveným obsahem
4. **VALIDÁTOR** — verify že žádný `{{` nezůstal

```typescript
// scripts/fix-template-variables-in-articles.ts

async function fixTemplateVariables() {
  const { data: articles } = await supabase
    .from('articles')
    .select('id, slug, body_markdown, meta_description')
    .or('body_markdown.ilike.%{{%,meta_description.ilike.%{{%')
  
  const replacements = {
    '{{date.year}}': '2026',
    '{{products.count}}': await getProductCount(),
    '{{products.top_count}}': '5',
  }
  
  let fixed = 0
  let needsManualReview = []
  
  for (const article of articles) {
    let body = article.body_markdown
    let meta = article.meta_description || ''
    
    for (const [pattern, value] of Object.entries(replacements)) {
      body = body.replaceAll(pattern, value)
      meta = meta.replaceAll(pattern, value)
    }
    
    // Verify no more {{ patterns left
    if (/\{\{[^}]+\}\}/.test(body) || /\{\{[^}]+\}\}/.test(meta)) {
      const remaining = body.match(/\{\{[^}]+\}\}/g)
      needsManualReview.push({ slug: article.slug, remaining })
      continue
    }
    
    await supabase
      .from('articles')
      .update({ body_markdown: body, meta_description: meta })
      .eq('id', article.id)
    
    fixed++
  }
  
  return { fixed, needsManualReview }
}
```

### Bonus — vytvořit Learning

```sql
INSERT INTO project_learnings (category, title, description, rule, applies_to, impact)
VALUES (
  'content_quality',
  'Template variables nezpracovány v article generation',
  'Detekováno {{date.year}} a {{products.count}} v živém článku. 
   Content Agent nezpracoval templating syntax při generování.',
  'Při generování článku VŽDY:
   1. Substituuj dynamické proměnné PŘED uložením do DB
   2. Po generování ověř že žádný { nebo {{ pattern nezůstal
   3. Pokud generuješ ročně relevantní obsah, použij přímo current year 
      jako string ne template
   4. Validate: regex /\\{\\{[^}]+\\}\\}/ MUSÍ být null match',
  ARRAY['content_agent'],
  'high'
);
```

### Cost
- $0 (jen DB updates + 1 lesson insert)

---

## ÚKOL 2 — SITEMAP FIX (KRITICKÁ — bez tohoto 0 SEO traffic)

### Problém

`app/sitemap.ts` načítá články ze `static-content.ts` (4 statické), nikoli z DB. 19 článků chybí.

### Diagnostika

```bash
# Najdi current sitemap implementaci
grep -r "static-content" app/sitemap.ts
grep -r "getArticles" app/
```

### Oprava

```typescript
// app/sitemap.ts

import { supabase } from '@/lib/supabase'

export default async function sitemap() {
  // ... existing entries (homepage, srovnavac, atd.)
  
  // NEW: Load articles from DB
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, category, updated_at')
    .eq('status', 'active')
  
  const articleEntries = articles?.map(a => ({
    url: `https://olivator.cz/pruvodce/${a.slug}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  })) || []
  
  return [
    ...existingEntries,
    ...articleEntries,
  ]
}
```

### Plus — `generateStaticParams()` fix

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

Po deploy: `generateStaticParams` vrátí 23 článků → Next.js pre-buildne všechny → instant load + SEO indexing.

### Cost
- $0 (jen kód)

### Po deploy

```bash
# Verify sitemap
curl -s https://olivator.cz/sitemap.xml | grep -c "/pruvodce/"
# Mělo by vrátit 23 (nebo víc s dalšími static)
```

Submit nový sitemap do GSC (manuálně nebo CRON).

---

## ÚKOL 3 — INTERNÍ LINKY na produkty (REVENUE KRITICKÉ)

### Problém

0/23 článků odkazuje na konkrétní olej v katalogu.
Důsledek: Google nevidí topical authority + uživatel nepokračuje k nákupu.

### Strategie

Pro každý článek:

1. **AI analýza** — co je hlavní téma článku?
2. **Match s produkty** — 3-5 produktů které sedí (na základě category, region, certifikace, polyfenoly)
3. **Smart injection** — vložit interní link v relevantním místě textu

### Implementace

```typescript
// scripts/add-internal-links-to-articles.ts

const ARTICLE_TO_PRODUCT_LOGIC = {
  // Articles dle slugu → produktové query
  'olivovy-olej-do-200-kc': {
    query: { max_price: 200, min_score: 70, limit: 5 },
    insertText: 'Naše top picks pod 200 Kč',
  },
  'premium-olivovy-olej-ma-smysl': {
    query: { min_price: 500, min_score: 85, limit: 4 },
    insertText: 'Premium oleje za to stojí',
  },
  'jak-vybrat-olivovy-olej': {
    query: { min_score: 85, limit: 5 },
    insertText: 'Naše top doporučení',
  },
  'dop-pgi-bio-certifikace': {
    query: { has_certifications: ['DOP', 'BIO'], limit: 5 },
    insertText: 'Příklady DOP a BIO certifikovaných olejů',
  },
  'polyfenoly-kolik-je-dost': {
    query: { min_polyphenols: 500, limit: 4 },
    insertText: 'Oleje s nejvyššími polyfenoly',
  },
  'sklizen-oliv-early-vs-late-harvest': {
    query: { processing: 'early_harvest', limit: 4 },
    insertText: 'Early harvest oleje v našem katalogu',
  },
  'recky-vs-italsky': {
    query_pairs: [
      { country: 'GR', limit: 3, label: 'Top řecké' },
      { country: 'IT', limit: 3, label: 'Top italské' },
    ],
  },
  // ... další články
}

async function addInternalLinks() {
  for (const [slug, logic] of Object.entries(ARTICLE_TO_PRODUCT_LOGIC)) {
    const { data: article } = await supabase
      .from('articles')
      .select('id, body_markdown')
      .eq('slug', slug)
      .single()
    
    if (!article) continue
    
    // Najdi relevantní produkty
    const products = await getProductsByLogic(logic.query)
    
    // Generuj product link block (markdown)
    const linkBlock = generateProductLinkBlock(products, logic.insertText)
    
    // Inject after first H2 (kontextově)
    const newBody = injectAfterFirstH2(article.body_markdown, linkBlock)
    
    await supabase
      .from('articles')
      .update({ body_markdown: newBody })
      .eq('id', article.id)
  }
}

function generateProductLinkBlock(products, heading) {
  return `

## ${heading}

${products.map(p => 
  `- **[${p.name}](/olej/${p.slug})** — Score ${p.score}, ${p.cheapest_price} Kč u ${p.cheapest_retailer}`
).join('\n')}

`
}
```

### Cost
- ~$0.10 (jen kód + DB queries, žádné AI generování textů)

### Po deploy

Každý článek bude mít 3-5 interních linků na konkrétní oleje. Google vidí:
- Topical authority (článek o polyfenolech → odkaz na high-polyphenol oleje)
- Lepší user journey (článek → produkt → nákup)
- Affiliate revenue začne plynout

---

## ÚKOL 4 — META DESCRIPTIONS (6 článků chybí/krátké)

### Problém

- 4 článků nemá `meta_description`
- 2 článků má pod 120 znaků

### Oprava

```typescript
// scripts/regenerate-article-meta.ts

const { data: articles } = await supabase
  .from('articles')
  .select('id, slug, title, body_markdown, meta_description')
  .or(
    'meta_description.is.null,' +
    'meta_description.eq.,' +
    `meta_description.like.${Array(120).fill('_').join('')}%`
  )

for (const article of articles) {
  if (!needsMetaRegeneration(article)) continue
  
  // Claude Haiku — generuj meta description
  const newMeta = await generateArticleMeta(article)
  
  // Validátor češtiny
  const validation = validateCzechText(newMeta)
  if (!validation.ok) {
    // Retry, then skip
    continue
  }
  
  await supabase
    .from('articles')
    .update({ meta_description: newMeta })
    .eq('id', article.id)
}
```

### Cost
- 6 článků × $0.005 = $0.03

---

## ÚKOL 5 — Admin UI rozšíření (NICE TO HAVE)

Pokud zbývá budget a čas:

### Articles admin filters

```typescript
// /admin/articles
- Filter: status (active, draft, archived)
- Filter: category (vzdelavani, pruvodce, srovnani, zebricek)
- Filter: has_internal_links (yes/no)
- Filter: has_meta_description (yes/no)
- Filter: source (ai_generated, manual)
- Sort: by created_at, by word_count

Bulk akce:
- Mark as inactive
- Regenerate meta description
- Add internal links
```

### Cost
- $0 (jen kód)

---

## ÚKOL 6 — Nová témata (NICE TO HAVE, později)

Z auditu vyplývá že chybí 3 HIGH priority články:

1. **Oleokantal — co to je a proč záleží** (klíčová látka)
2. **Kyselost olivového oleje — dedikovaný průvodce**
3. **Olivový olej pro pleť** (nízká konkurence, vysoký search volume)

Generování později — ne v tomto sprintu. Focus teď na **technické fixy existujícího**.

---

## POSTUP

### Krok 1 — ÚKOL 1 — Fix template variables (PRIORITA)
- Diagnostika článků s `{{`
- Substituce + DB update
- Lesson insert
- STOP a report

### Krok 2 — ÚKOL 2 — Sitemap fix
- Modify `app/sitemap.ts`
- Modify `generateStaticParams()`
- Commit + deploy
- Verify produkční sitemap obsahuje 23 článků
- STOP a report

### Krok 3 — ÚKOL 3 — Interní linky
- Implement product matching logic
- Inject linky do 23 článků
- STOP a report

### Krok 4 — ÚKOL 4 — Meta descriptions
- Regenerate 6 chybějících/krátkých
- STOP a report

### Krok 5 — Admin UI (volitelně, pokud čas)

### Krok 6 — Nové články (DALŠÍ SPRINT)

---

## FINÁLNÍ REPORT

```
✅ Articles Master Plan dokončen

Úkol 1 — Template variables:
- X článků opraveno (substituce {{date.year}}, {{products.count}})
- Lesson vložena do project_learnings

Úkol 2 — Sitemap:
- 4 → 23 článků v sitemap
- generateStaticParams() vrací 23 článků
- GSC submit (manuální / auto)

Úkol 3 — Interní linky:
- 0 → 23 článků s 3-5 interními linky na produkty
- Total internal links: ~80
- Affiliate potenciál odemčen

Úkol 4 — Meta descriptions:
- 6 článků s aktualizovaným meta
- Všechny 23 článků mají validní 120-160 znaků meta

Celková cena: $X.XX (limit $2)

DALŠÍ KROK:
- Sledovat traffic za 2-4 týdny (Google indexing)
- Generovat 3 chybějící články (Oleokantal, Kyselost, Pleť) — separátní sprint
```

---

## DŮLEŽITÉ

### Anthropic API limit
Pokud "out of extra usage" → STOP, počkat na reset.

### Eskalace
2× chyba → stop. CLAUDE.md sekce 20.

### Backup
Před úpravou všech 23 článků → backup DB. Pokud cokoli pokazí, rollback.

---

🫒
