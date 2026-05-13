# 🦊 OLIVATOR — OLÍK + STRATEGIC ADMIN SPRINT
# 7-denní mega-sprint: Olík author + Strategic content admin + Automation
# Cena: ~$1.00 foundation + ~$0.10 per article ongoing
# Tvůj čas: 30-45 min foundation, pak 15-25 min/týden

═════════════════════════════════════════════════

## FILOZOFIE

**3 pilíře:**

1. **Olík jako persona** — author napříč webem, E-E-A-T compliant
2. **Strategic admin** — calendar, keywords, goals v adminu (žádné markdowny)
3. **AI automation s lidskou kontrolou** — Ty rozhoduješ, AI dělá

**Roční cíle 2026:**
- Q1 (květen-červenec): 5 000 unique visits/měsíc
- Q4 (únor-duben 2027): 50 000+ unique visits/měsíc
- Break-even (13 000 Kč/měsíc) do Q4

**Tvůj reálný čas:**
- Foundation sprint: 30-45 minut
- Ongoing: 15-25 minut/týden

═════════════════════════════════════════════════

## ABSOLUTNÍ PRAVIDLA

1. **STOP po každém dni** + report
2. **Hard limit celý sprint: $1.50**
3. **Validátor češtiny POVINNÝ** pro každý generovaný text
4. **Backup před změnami** klíčových tabulek
5. **Branch:** `olik-strategic-sprint`
6. **Deploy hromadný** Den 7
7. **Eskalace:** 2× chyba → STOP a report

═════════════════════════════════════════════════

# DEN 1 — OLÍK AUTHOR SYSTEM

**Cíl:** Olík je oficiální author napříč webem s E-E-A-T compliant infrastructure.
**Cena:** ~$0

## ÚKOL 1.1 — Olík v DB + Schema

### Authors table

```sql
CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio_short TEXT,
  bio_full TEXT,
  voice_guidelines TEXT,
  image_url TEXT,
  email VARCHAR(255),
  schema_metadata JSONB,
  social_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO authors (
  slug, name, bio_short, bio_full, voice_guidelines, 
  image_url, email, schema_metadata
) VALUES (
  'olik',
  'Olík',
  
  -- BIO SHORT (článek byline, end-of-article)
  'Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Píše o olivovém oleji ze 18 prodejců v ČR. Olivator Score je jeho dílo.',
  
  -- BIO FULL (/autor/olik page)
  'Hlavní degustátor a kritický nos Olivátoru.

Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Ostatní mu nevadí.

Za poslední dva roky ochutnal 847 olejů (počítá si je). Navštívil 12 olivových hájů od Alentejo po Krétu. Pamatuje si chuť každého z nich. Jeho fotografická paměť ale končí u jmen prodejců.

Olivator Score vymyslel ve 3 ráno po pátém ochutnání řeckého DOP. Ráno si myslel, že je geniální. Po dvou letech testů se ukázalo, že měl pravdu.

Žádný výrobce mu neplatí. Naopak: čím dráž olej stojí, tím víc ho štve, když nestojí za nic.',
  
  -- VOICE GUIDELINES (pro Claude content generation)
  'OLÍKŮV HLAS — PRAVIDLA PSANÍ:

TON:
- Tykání. Vždy.
- Krátké věty (max 20 slov, ideální 8-15)
- Self-deprecating humor občas
- Anti-corporate (nesnáší marketingové bláboly)
- Authority bez arogance

KONKRÉTNOST:
- Konkrétní čísla, ne "mnoho/několik" 
  (např. "847 olejů", ne "stovky")
- Konkrétní příklady místo obecností

ZAKÁZANÉ FRÁZE:
- "v dnešní době", "je důležité"
- "pojďme se podívat", "není žádným tajemstvím"
- "úžasný", "fantastický", "neuvěřitelný"
- Vykřičníky

POVOLENÉ A OČEKÁVANÉ:
- Personal voice ("vyzkoušel jsem", "překvapilo mě", "můj favorit")
- Vtipný komentář občas ("Cena na první pohled vysoká, na druhý ještě vyšší.")
- Cesty ("Když jsem byl loni v Andalusii...")
- Sezónní kontext ("Zrovna začíná sklizeň.")

CO OLÍK MILUJE:
- DOP certifikované oleje
- Polyfenoly nad 500 mg/kg
- Early harvest
- Andaluské fincas
- Kalamata, Sitia, Apulie

CO OLÍK NESNÁŠÍ:
- "Prémiový" v názvu bez DOP
- Kyselost nad 0,5 %
- "Z italské vesničky" bez konkretizace
- Krásné láhve s mizerným olejem',
  
  '/olik.png',
  'olik@olivator.cz',
  '{
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Olík",
    "jobTitle": "Hlavní degustátor a kritický nos Olivátoru",
    "knowsAbout": ["olivový olej", "Olivator Score", "DOP certifikace", "polyfenoly", "Mediterranean diet"],
    "knowsLanguage": ["cs", "en"]
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET 
  bio_short = EXCLUDED.bio_short,
  bio_full = EXCLUDED.bio_full,
  voice_guidelines = EXCLUDED.voice_guidelines;
```

### Update existujících 23 článků

```sql
-- Add author_id column pokud chybí
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES authors(id);

-- Set all to Olík
UPDATE articles 
SET author_id = (SELECT id FROM authors WHERE slug = 'olik')
WHERE author_id IS NULL;
```

## ÚKOL 1.2 — /autor/olik page

```typescript
// app/autor/olik/page.tsx

export const metadata = {
  title: 'Olík — Hlavní degustátor Olivátoru | Olivator',
  description: 'Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Píše o olivovém oleji ze 18 prodejců v ČR.',
}

export default async function OlikAuthorPage() {
  const olik = await getAuthorBySlug('olik')
  const articles = await getArticlesByAuthor('olik', { limit: 12 })
  const stats = await getOliveStats()
  
  return (
    <main>
      <OlikHero olik={olik} />
      <OlikStats stats={stats} />
      <OlikArticles articles={articles} />
      <TopicsCovered />
      <NewsletterCTA source="autor_olik_page" />
      
      <Script
        id="olik-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ 
          __html: JSON.stringify(olik.schema_metadata) 
        }}
      />
    </main>
  )
}
```

## ÚKOL 1.3 — Author byline component

```typescript
// components/article/author-byline.tsx

export function AuthorByline({ article }) {
  const updatedAt = article.updated_at
  const publishedAt = article.published_at
  const isUpdated = updatedAt && new Date(updatedAt) > new Date(publishedAt)
  
  return (
    <div className="flex items-center gap-3 py-4 border-y border-stone-200">
      <Link href="/autor/olik" className="flex items-center gap-2">
        <Image src="/olik.png" alt="Olík" width={40} height={40} className="rounded-full" />
        <div>
          <div className="text-sm font-medium">🦊 Olík</div>
          <div className="text-xs text-stone-600">Hlavní degustátor</div>
        </div>
      </Link>
      
      <div className="text-xs text-stone-500 ml-auto">
        {isUpdated ? `Aktualizováno ${formatDate(updatedAt)}` : `Publikováno ${formatDate(publishedAt)}`}
        {article.reading_time && ` · ${article.reading_time} min čtení`}
      </div>
    </div>
  )
}
```

## ÚKOL 1.4 — End-of-article box

```typescript
// components/article/olik-author-box.tsx

export function OlikAuthorBox() {
  return (
    <div className="bg-stone-50 rounded-lg p-6 my-8">
      <div className="flex items-start gap-4">
        <Image src="/olik.png" alt="Olík" width={60} height={60} className="rounded-full" />
        <div>
          <h4 className="font-bold mb-2">🦊 Tenhle článek napsal Olík</h4>
          <p className="text-stone-700">
            Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí 
            nad 0,5 %. Píše o olivovém oleji ze 18 prodejců v ČR. 
            Olivator Score je jeho dílo.
          </p>
          <div className="mt-3 flex gap-3">
            <Link href="#newsletter" className="text-olive-light hover:underline">
              Sleduj Olíka →
            </Link>
            <Link href="/autor/olik" className="text-olive-light hover:underline">
              Další články od Olíka
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## DEN 1 REPORT

```
Den 1 — Olík Author System: HOTOVO

✓ Authors tabulka + Olík data
✓ Schema.org Person markup
✓ /autor/olik page live
✓ AuthorByline component (top of article)
✓ OlikAuthorBox component (end of article)
✓ 23 článků: author=Olík

CENA: $0
```

STOP a čekat schválení.

═════════════════════════════════════════════════

# DEN 2 — STRATEGIC ADMIN (jádro plánu)

**Cíl:** Centrální místo pro celý strategický plán.
**Cena:** ~$0

## ÚKOL 2.1 — DB Schema

```sql
-- Content Calendar
CREATE TABLE content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_week DATE NOT NULL,        -- monday of target week
  scheduled_priority INT DEFAULT 3,    -- 1-5 (5 = highest)
  
  topic_type VARCHAR(50),              -- article, landing_page, brand_review, pillar, refresh
  primary_keyword VARCHAR(200),
  secondary_keywords TEXT[],
  suggested_title VARCHAR(300),
  suggested_angle TEXT,
  estimated_volume INT,                -- monthly searches
  competition_level VARCHAR(20),       -- low, medium, high, unknown
  
  status VARCHAR(20) DEFAULT 'planned', -- planned, in_progress, done, skipped, deferred
  related_article_id UUID,              -- link to articles table
  related_landing_page TEXT,
  
  notes TEXT,
  seasonal_context VARCHAR(100),       -- harvest, christmas, new_year, spring, summer
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_calendar_week ON content_calendar(scheduled_week);
CREATE INDEX idx_calendar_status ON content_calendar(status);

-- Keyword Mapping (z keywords.txt 379 keywords)
CREATE TABLE keyword_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(300) UNIQUE NOT NULL,
  search_volume INT,
  cpc_czk NUMERIC(6,2),
  competition_score INT,               -- 0-100, NULL = unknown
  yoy_change_pct NUMERIC(6,2),
  
  intent VARCHAR(30),                  -- informational, commercial, navigational, transactional
  cluster_group VARCHAR(100),          -- "olivový olej akce", "řecký olivový olej", "brand_lidl", atd.
  priority INT DEFAULT 3,              -- 1-5
  
  status VARCHAR(30) DEFAULT 'unmapped', -- unmapped, in_progress, mapped, deferred
  target_url TEXT,                     -- where this keyword should rank
  target_article_id UUID,              -- link na article
  
  notes TEXT,
  
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ
);

CREATE INDEX idx_keyword_volume ON keyword_mapping(search_volume DESC);
CREATE INDEX idx_keyword_status ON keyword_mapping(status);
CREATE INDEX idx_keyword_cluster ON keyword_mapping(cluster_group);

-- Strategy Goals
CREATE TABLE strategy_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter VARCHAR(20) NOT NULL,        -- Q1_2026, Q2_2026, Q3_2026, Q4_2026
  goal_type VARCHAR(50),               -- traffic, articles, revenue, indexed_urls, brand_reviews, etc.
  goal_name VARCHAR(200),
  target_value INT,
  current_value INT DEFAULT 0,
  unit VARCHAR(30),                    -- visits, kc, articles, etc.
  
  status VARCHAR(20) DEFAULT 'in_progress', -- pending, in_progress, achieved, missed
  
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topic Ideas (overflow / future)
CREATE TABLE topic_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300),
  keyword VARCHAR(200),
  estimated_volume INT,
  angle TEXT,
  source VARCHAR(50),                  -- gsc, manual, ai_suggestion, sezónní
  priority INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'suggested', -- suggested, accepted, rejected, scheduled
  
  scheduled_to_calendar_id UUID,       -- po přijetí
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## ÚKOL 2.2 — Seed strategy goals

```sql
INSERT INTO strategy_goals (quarter, goal_type, goal_name, target_value, unit) VALUES
  ('Q1_2026', 'traffic', 'Unique visits/měsíc', 5000, 'visits'),
  ('Q1_2026', 'articles', 'Nových článků', 12, 'articles'),
  ('Q1_2026', 'landing_pages', 'Landing pages', 5, 'pages'),
  ('Q1_2026', 'brand_reviews', 'Brand recenzí', 3, 'articles'),
  ('Q1_2026', 'newsletter', 'Newsletter subscribers', 50, 'subs'),
  ('Q1_2026', 'revenue', 'Affiliate revenue/měsíc', 500, 'kc'),
  
  ('Q2_2026', 'traffic', 'Unique visits/měsíc', 15000, 'visits'),
  ('Q2_2026', 'articles', 'Nových článků', 12, 'articles'),
  ('Q2_2026', 'landing_pages', 'Landing pages', 5, 'pages'),
  ('Q2_2026', 'brand_reviews', 'Brand recenzí', 4, 'articles'),
  ('Q2_2026', 'pillar_pages', 'Pillar pages', 1, 'pages'),
  ('Q2_2026', 'newsletter', 'Newsletter subscribers', 200, 'subs'),
  ('Q2_2026', 'revenue', 'Affiliate revenue/měsíc', 3000, 'kc'),
  
  ('Q3_2026', 'traffic', 'Unique visits/měsíc', 30000, 'visits'),
  ('Q3_2026', 'articles', 'Nových článků', 12, 'articles'),
  ('Q3_2026', 'brand_reviews', 'Brand recenzí', 3, 'articles'),
  ('Q3_2026', 'pillar_pages', 'Pillar pages', 1, 'pages'),
  ('Q3_2026', 'newsletter', 'Newsletter subscribers', 500, 'subs'),
  ('Q3_2026', 'revenue', 'Affiliate revenue/měsíc', 8000, 'kc'),
  
  ('Q4_2026', 'traffic', 'Unique visits/měsíc', 50000, 'visits'),
  ('Q4_2026', 'articles', 'Nových článků', 12, 'articles'),
  ('Q4_2026', 'pillar_pages', 'Pillar pages', 1, 'pages'),
  ('Q4_2026', 'newsletter', 'Newsletter subscribers', 1000, 'subs'),
  ('Q4_2026', 'revenue', 'Affiliate revenue/měsíc', 15000, 'kc');
```

## ÚKOL 2.3 — Seed keyword mapping (z keywords.txt)

Pošli mi `keywords.txt` (mám ho v kontextu). Insert všech 379 keywords s:
- keyword, search_volume, cpc_czk, competition_score, yoy_change_pct
- intent (auto-detect: "akce" → commercial, "co je" → informational, brand name → navigational)
- cluster_group (auto: top tokens — "olivový olej akce" → "akce", "řecký" → "regional_GR", brand → "brand_X")
- priority (auto: volume * intent_multiplier)
- status: 'unmapped' (do mappingu během sprintu)

```typescript
// scripts/seed-keyword-mapping.ts

const KEYWORDS_TXT = `... obsah z keywords.txt ...`;

async function seedKeywordMapping() {
  const lines = KEYWORDS_TXT.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const parsed = parseKeywordLine(line);  // extract keyword, volume, cpc, competition, yoy
    const intent = detectIntent(parsed.keyword);
    const cluster = detectCluster(parsed.keyword);
    const priority = calculatePriority(parsed.volume, intent);
    
    await supabase.from('keyword_mapping').upsert({
      keyword: parsed.keyword,
      search_volume: parsed.volume,
      cpc_czk: parsed.cpc,
      competition_score: parsed.competition,
      yoy_change_pct: parsed.yoyChange,
      intent,
      cluster_group: cluster,
      priority,
      status: 'unmapped',
    }, { onConflict: 'keyword' });
  }
}
```

## ÚKOL 2.4 — Seed content calendar (květen-prosinec 2026)

Auto-generuj 30+ calendar entries pro Q1-Q2-Q3:

```typescript
// scripts/seed-content-calendar.ts

const CALENDAR_2026 = [
  // Květen 2026 — Foundation week
  { week: '2026-05-12', priority: 5, type: 'landing_page', keyword: 'olivový olej akce', title: '/akce — Aktuální slevy', volume: 2400, competition: 'low', seasonal: null },
  { week: '2026-05-19', priority: 5, type: 'landing_page', keyword: 'řecký olivový olej', title: '/regiony/recko — Expand', volume: 1950, competition: 'low', seasonal: null },
  { week: '2026-05-26', priority: 5, type: 'article', keyword: 'nejlepší olivový olej', title: 'Top 20 olejů 2026 — refresh', volume: 1790, competition: 'medium', seasonal: null },
  
  // Červen 2026 — Léto
  { week: '2026-06-02', priority: 4, type: 'article', keyword: 'olivový olej na vaření', title: 'Olivový olej do salátů — léto', volume: 340, competition: 'medium', seasonal: 'summer' },
  { week: '2026-06-09', priority: 4, type: 'article', keyword: 'extra panenský olivový olej', title: 'Extra panenský — kompletní průvodce', volume: 1230, competition: 'medium', seasonal: null },
  { week: '2026-06-16', priority: 4, type: 'article', keyword: 'bylinkové dressing', title: 'Bylinkové dressing — recepty', volume: 200, competition: 'low', seasonal: 'summer' },
  { week: '2026-06-23', priority: 4, type: 'brand_review', keyword: 'Lidl olivový olej', title: 'Lidl olej — recenze + alternativy', volume: 370, competition: 'low', seasonal: null },
  { week: '2026-06-30', priority: 4, type: 'article', keyword: 'olivový olej na opalování', title: 'Olej na opalování — pravda', volume: 360, competition: 'medium', seasonal: 'summer' },
  
  // Červenec 2026 — Cestování
  { week: '2026-07-07', priority: 4, type: 'article', keyword: 'olivový olej kréta', title: 'Co přivézt z Kréty', volume: 460, competition: 'medium', seasonal: 'summer' },
  { week: '2026-07-14', priority: 4, type: 'brand_review', keyword: 'Franz Josef olivový olej', title: 'Franz Josef — recenze', volume: 410, competition: 'low', seasonal: null },
  { week: '2026-07-21', priority: 4, type: 'article', keyword: 'italský olivový olej', title: 'Italský olej — průvodce', volume: 40, competition: 'low', seasonal: null },
  { week: '2026-07-28', priority: 4, type: 'landing_page', keyword: 'olivový olej zdraví', title: '/zdravi — Health hub', volume: 1620, competition: 'low', seasonal: null },
  
  // Srpen 2026 — Konzervace + příprava na sklizeň
  { week: '2026-08-04', priority: 4, type: 'article', keyword: 'olivový olej skladování', title: 'Skladování olejů — refresh', volume: 80, competition: 'low', seasonal: null },
  { week: '2026-08-11', priority: 4, type: 'brand_review', keyword: 'Monini olivový olej', title: 'Monini — recenze', volume: 170, competition: 'low', seasonal: null },
  { week: '2026-08-18', priority: 4, type: 'article', keyword: 'olivový olej tapas', title: 'Tapas s olejem — recepty', volume: 100, competition: 'low', seasonal: null },
  { week: '2026-08-25', priority: 4, type: 'article', keyword: 'pre-harvest', title: 'Co očekávat od letošní sklizně', volume: 100, competition: 'low', seasonal: 'pre_harvest' },
  
  // ZÁŘÍ 2026 — HARVEST SEASON 🍂 (KLÍČOVÉ)
  { week: '2026-09-01', priority: 5, type: 'article', keyword: 'sklizeň olivového oleje', title: 'Sklizeň 2026 začíná!', volume: 200, competition: 'low', seasonal: 'harvest_start' },
  { week: '2026-09-08', priority: 5, type: 'article', keyword: 'early harvest', title: 'Early harvest — co znamená', volume: 150, competition: 'low', seasonal: 'harvest_start' },
  { week: '2026-09-15', priority: 5, type: 'article', keyword: 'výroba olivového oleje', title: 'Výroba olivového oleje krok za krokem', volume: 20, competition: 'low', seasonal: 'harvest' },
  { week: '2026-09-22', priority: 5, type: 'pillar', keyword: 'olivový olej', title: 'Vše o olivovém oleji — Ultimate Guide', volume: 2700, competition: 'high', seasonal: null },
  { week: '2026-09-29', priority: 5, type: 'brand_review', keyword: 'Borges olivový olej', title: 'Borges — recenze', volume: 60, competition: 'low', seasonal: null },
  
  // ŘÍJEN 2026 — Nová sklizeň
  { week: '2026-10-06', priority: 5, type: 'article', keyword: 'čerstvý olivový olej', title: 'Jak poznat čerstvý olej', volume: 50, competition: 'low', seasonal: 'new_harvest' },
  { week: '2026-10-13', priority: 5, type: 'article', keyword: 'BIO olivový olej', title: 'BIO — co to znamená', volume: 120, competition: 'low', seasonal: null },
  { week: '2026-10-20', priority: 5, type: 'brand_review', keyword: 'Tesco olivový olej', title: 'Tesco — recenze', volume: 60, competition: 'low', seasonal: null },
  { week: '2026-10-27', priority: 5, type: 'article', keyword: 'olivový olej pro miminka', title: 'Olej pro miminka — pravda', volume: 20, competition: 'low', seasonal: null },
  
  // LISTOPAD 2026 — Příprava na vánoce
  { week: '2026-11-03', priority: 5, type: 'landing_page', keyword: 'olivový olej akce', title: '/akce — refresh + black friday', volume: 2400, competition: 'low', seasonal: 'black_friday' },
  { week: '2026-11-10', priority: 5, type: 'article', keyword: 'olivový olej dárek', title: 'Olej jako dárek — průvodce', volume: 100, competition: 'low', seasonal: 'christmas' },
  { week: '2026-11-17', priority: 5, type: 'pillar', keyword: 'jak vybrat olivový olej', title: 'Jak kupovat olej — Pillar', volume: 340, competition: 'medium', seasonal: null },
  { week: '2026-11-24', priority: 5, type: 'brand_review', keyword: 'Bertolli', title: 'Bertolli — recenze', volume: 20, competition: 'low', seasonal: null },
  
  // PROSINEC 2026 — Vánoce peak
  { week: '2026-12-01', priority: 5, type: 'article', keyword: 'olivový olej vánoce', title: 'Vánoční vaření s EVOO', volume: 50, competition: 'low', seasonal: 'christmas' },
  { week: '2026-12-08', priority: 5, type: 'landing_page', keyword: 'olivový olej dárek', title: 'Top oleje k Vánocům', volume: 100, competition: 'low', seasonal: 'christmas' },
  { week: '2026-12-15', priority: 4, type: 'article', keyword: 'olivový olej recenze', title: 'Year in review — nejlepší 2026', volume: 20, competition: 'low', seasonal: 'year_end' },
  { week: '2026-12-22', priority: 3, type: 'refresh', keyword: 'top 10 článků', title: 'Refresh top 10 článků', volume: null, competition: null, seasonal: null },
];

// + tabulka pro 2027 Q1-Q2 (leden-duben)
```

## ÚKOL 2.5 — Admin UI sekce

### `/admin/content-strategy` — Strategický přehled

```typescript
// app/admin/content-strategy/page.tsx

export default async function StrategyPage() {
  const goals = await getCurrentQuarterGoals()
  const calendarStats = await getCalendarStats()
  const keywordStats = await getKeywordMappingStats()
  
  return (
    <main>
      <h1>Obsahová strategie 2026</h1>
      
      {/* Quarter progress bars */}
      <QuarterProgress goals={goals} />
      
      {/* Roční cíle s progress */}
      <GoalsList goals={goals} />
      
      {/* Quick stats */}
      <StatCard title="Tento týden" value={calendarStats.thisWeek} />
      <StatCard title="Nadcházející" value={calendarStats.upcoming4Weeks} />
      <StatCard title="Keywords mapped" value={`${keywordStats.mapped}/${keywordStats.total}`} />
      
      {/* Sezónní upozornění */}
      <SeasonalAlert />  {/* "Za 6 týdnů začíná sklizeň — připrav obsah" */}
    </main>
  )
}
```

### `/admin/content-calendar` — Editorial kalendář

```typescript
// app/admin/content-calendar/page.tsx

export default async function CalendarPage() {
  const entries = await getCalendarEntries({ from: now, to: '+12 months' })
  const groupedByMonth = groupByMonth(entries)
  
  return (
    <main>
      <h1>Editorial kalendář</h1>
      
      <Filters>
        <StatusFilter />
        <TypeFilter />
        <PriorityFilter />
        <SeasonalFilter />
      </Filters>
      
      {/* Per month */}
      {Object.entries(groupedByMonth).map(([month, weeks]) => (
        <MonthSection key={month} month={month}>
          {weeks.map(entry => (
            <CalendarEntry 
              key={entry.id} 
              entry={entry}
              actions={['edit', 'mark_done', 'skip', 'generate']}
            />
          ))}
        </MonthSection>
      ))}
      
      <button onClick={addEntry}>+ Přidat položku</button>
    </main>
  )
}
```

### `/admin/keyword-mapping` — Keywords status

```typescript
// app/admin/keyword-mapping/page.tsx

export default async function KeywordsPage() {
  const keywords = await getKeywords()
  const clusters = groupByCluster(keywords)
  
  return (
    <main>
      <h1>Keyword Mapping ({keywords.length} keywords)</h1>
      
      <StatCard title="Mapped" value={keywords.filter(k => k.status === 'mapped').length} />
      <StatCard title="Unmapped" value={keywords.filter(k => k.status === 'unmapped').length} />
      <StatCard title="High priority unmapped" value={keywords.filter(k => k.priority >= 4 && k.status === 'unmapped').length} />
      
      <Filters>
        <StatusFilter />
        <PriorityFilter />
        <IntentFilter />
        <ClusterFilter />
        <VolumeRangeFilter />
      </Filters>
      
      {/* Per cluster */}
      {Object.entries(clusters).map(([cluster, kws]) => (
        <ClusterSection key={cluster} cluster={cluster} keywords={kws}>
          <BulkActions actions={['schedule_to_calendar', 'mark_priority', 'export']} />
        </ClusterSection>
      ))}
    </main>
  )
}
```

## DEN 2 REPORT

```
Den 2 — Strategic Admin: HOTOVO

✓ DB schema (content_calendar, keyword_mapping, strategy_goals, topic_ideas)
✓ 16 strategy goals seedovaných (Q1-Q4 2026)
✓ 379 keywords seedovaných z keywords.txt
✓ 30+ calendar entries seedovaných (květen-prosinec 2026)
✓ /admin/content-strategy page
✓ /admin/content-calendar page  
✓ /admin/keyword-mapping page

CENA: $0
```

STOP a čekat schválení.

═════════════════════════════════════════════════

# DEN 3 — AI IMAGE PIPELINE + EDITOR

**Cíl:** Auto-select + manual override + plný article editor.
**Cena:** ~$0.20

## ÚKOL 3.1 — Pexels + Unsplash auto-select

```typescript
// lib/images/auto-select.ts

export async function autoSelectImagesForArticle(article: ArticleContext) {
  // 1. AI generates 3 image queries
  const queries = await generateImageQueries(article)
  
  // 2. Search Pexels + Unsplash paralel
  const results = await Promise.all(
    queries.map(async q => {
      const [pexels, unsplash] = await Promise.all([
        searchPexels(q.query, 5),
        searchUnsplash(q.query, 5),
      ])
      return { query: q, candidates: [...pexels, ...unsplash] }
    })
  )
  
  // 3. AI selects best from each
  const selected = await Promise.all(
    results.map(r => selectBestImage(r.query, r.candidates))
  )
  
  // 4. Download + convert WebP + generate metadata
  const processed = await Promise.all(
    selected.map(img => processImage(img))
  )
  
  return processed  // 3 images: hero, in_article_1, in_article_2
}
```

## ÚKOL 3.2 — Manual upload + Claude Vision

```typescript
// app/api/admin/articles/[id]/upload-image/route.ts

export async function POST(req, { params }) {
  // 1. Get uploaded file
  const formData = await req.formData()
  const file = formData.get('image') as File
  
  // 2. Convert to base64
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  
  // 3. Get article context
  const article = await getArticle(params.id)
  
  // 4. Claude Vision analyzuje obsah
  const analysis = await claudeVisionAnalyze({
    image_base64: base64,
    article_title: article.title,
    article_section: formData.get('section'),  // hero, in_article_1, in_article_2
  })
  
  // 5. Process + upload
  const processed = await sharp(buffer)
    .resize(1200, 800, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer()
  
  const storageUrl = await uploadToSupabaseStorage(processed, analysis.filename)
  
  // 6. Save to DB
  const image = await supabase.from('article_images').insert({
    article_id: params.id,
    url: storageUrl,
    filename: analysis.filename,
    alt: analysis.alt_text,
    caption: analysis.caption,
    position: formData.get('section'),
    source: 'manual_upload',
  })
  
  return Response.json({ ok: true, image })
}
```

## ÚKOL 3.3 — Full Article Editor

```typescript
// app/admin/articles/[id]/edit/page.tsx

export default async function EditArticlePage({ params }) {
  const article = await getArticle(params.id)
  
  return (
    <main className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <h1>Edit: {article.title}</h1>
        
        <Tabs>
          <Tab name="content">
            <MarkdownEditor 
              value={article.body_markdown}
              onChange={saveBody}
              insertOptions={['internal_link', 'image', 'product_card']}
            />
          </Tab>
          
          <Tab name="images">
            <ImageManager 
              images={article.images}
              onUpload={uploadImage}
              onReplace={replaceImage}
              onEditMeta={editImageMeta}
              onDelete={deleteImage}
              onReorder={reorderImages}
            />
          </Tab>
          
          <Tab name="seo">
            <SeoSettings 
              title={article.meta_title}
              description={article.meta_description}
              keywords={article.keywords}
            />
          </Tab>
          
          <Tab name="schema">
            <SchemaPreview article={article} />
          </Tab>
          
          <Tab name="publish">
            <PublishSettings 
              status={article.status}
              publishDate={article.published_at}
              author={article.author}
            />
          </Tab>
        </Tabs>
      </div>
      
      <aside>
        <QualityScore article={article} />  {/* AI score, quality, SEO */}
        <Preview article={article} />
        <ActionButtons>
          <Save />
          <Preview />
          <Publish />
          <Schedule />
        </ActionButtons>
      </aside>
    </main>
  )
}
```

## DEN 3 REPORT

```
Den 3 — Image Pipeline + Editor: HOTOVO

✓ Pexels + Unsplash auto-select
✓ AI image queries + best selection
✓ Manual upload + Claude Vision auto-meta
✓ Image processing (WebP, 1200×800)
✓ /admin/articles/[id]/edit full editor
✓ Tabs: Content, Images, SEO, Schema, Publish
✓ Markdown editor s insert options
✓ Image manager (replace, reorder, meta edit, delete)

CENA: ~$0.10
```

STOP a čekat schválení.

═════════════════════════════════════════════════

# DEN 4 — 2× AI REVIEW PASS + APPROVAL FLOW

**Cíl:** Quality control + admin approval workflow.
**Cena:** ~$0.20

## ÚKOL 4.1 — Pass 1 (Validátor češtiny) + Pass 2 (AI review)

```typescript
// lib/content/quality-pipeline.ts

export async function runQualityPipeline(draft) {
  // Pass 1: Validátor češtiny (existing)
  let validation = validateCzechText(draft.body)
  if (!validation.ok) {
    draft.body = await fixCzechIssues(draft.body, validation.issues)
  }
  
  // Pass 2: AI Review "kde to zní jako AI"
  const review = await sonnetReviewPass({
    article: draft,
    olikVoiceGuidelines: await getOlikVoiceGuidelines(),
  })
  
  // Auto-apply fixes pokud >20% AI score
  if (review.ai_score_estimate > 20) {
    draft.body = await sonnetAutoFix(draft.body, review.issues)
  }
  
  // Final check
  const finalReview = await sonnetReviewPass({ article: draft })
  
  return {
    draft,
    metadata: {
      ai_score: finalReview.ai_score_estimate,
      quality_score: finalReview.overall_quality_score,
      ready_for_approval: finalReview.ai_score_estimate < 20 && finalReview.overall_quality_score > 80,
    }
  }
}
```

## ÚKOL 4.2 — `/admin/articles/pending` queue

```typescript
// app/admin/articles/pending/page.tsx

export default async function PendingArticlesPage() {
  const pending = await getArticles({ status: 'pending_review' })
  
  return (
    <main>
      <h1>Articles Pending Review ({pending.length})</h1>
      
      {pending.map(article => (
        <PendingArticleCard key={article.id}>
          <QualityIndicators 
            aiScore={article.ai_score}
            qualityScore={article.quality_score}
            schemaValid={!!article.schema_markup}
            internalLinks={article.internal_links_count}
          />
          
          <Actions>
            <Link href={`/admin/articles/${article.id}/edit`}>
              ✏️ Edit
            </Link>
            <button onClick={() => approveAndPublish(article.id)}>
              ✓ Approve & Publish
            </button>
            <button onClick={() => requestEdits(article.id)}>
              💬 Request edits
            </button>
            <button onClick={() => reject(article.id)}>
              ❌ Reject
            </button>
          </Actions>
        </PendingArticleCard>
      ))}
    </main>
  )
}
```

## DEN 4 REPORT

```
Den 4 — Review + Approval Flow: HOTOVO

✓ 2× AI Review Pass (Czech + Sonnet review)
✓ Auto-apply fixes pokud >20% AI score
✓ Olík voice guidelines load from authors table
✓ /admin/articles/pending queue
✓ Quality indicators (AI, quality, schema, links)
✓ Approve / Edit / Request edits / Reject actions

CENA: ~$0.10 (test runs)
```

STOP a čekat schválení.

═════════════════════════════════════════════════

# DEN 5 — TOPIC GENERATOR + WEEKLY WORKFLOW

**Cíl:** Weekly auto-suggest + integrace s calendar.
**Cena:** ~$0.10

## ÚKOL 5.1 — Weekly topic generator CRON

```typescript
// scripts/cron/topic-generator.ts (Pondělí 6:00 UTC)

async function generateWeeklyTopics() {
  // 1. Check content_calendar pro this_week + next_week
  const upcoming = await getCalendarEntries({ 
    weeks: [thisMonday, nextMonday],
    status: ['planned']
  })
  
  // 2. If empty → AI suggests from unmapped keywords
  let suggestions = []
  if (upcoming.length === 0) {
    suggestions = await aiSuggestFromUnmappedKeywords({
      priority: 'high',
      limit: 3,
    })
  }
  
  // 3. Plus seasonal check
  const seasonal = checkSeasonalRelevance(now)  // harvest? christmas? spring?
  if (seasonal) {
    suggestions.push(...await getSeasonalSuggestions(seasonal))
  }
  
  // 4. Email admin
  await sendAdminEmail({
    subject: '🦊 Olíkovy návrhy na tento týden',
    suggestions,
    calendarEntries: upcoming,
  })
}
```

## ÚKOL 5.2 — Calendar → Article generation flow

```typescript
// app/api/admin/calendar/[id]/generate-article/route.ts

export async function POST(req, { params }) {
  const entry = await getCalendarEntry(params.id)
  
  // Mark in_progress
  await updateCalendarStatus(params.id, 'in_progress')
  
  // Background generation
  setTimeout(async () => {
    try {
      // 1. Generate draft (Sonnet + Learning Injection + Olík voice)
      const draft = await generateArticleDraft({
        keyword: entry.primary_keyword,
        title: entry.suggested_title,
        angle: entry.suggested_angle,
        seasonal_context: entry.seasonal_context,
        olikVoice: true,
      })
      
      // 2. Auto-select images (Pexels + Unsplash)
      const images = await autoSelectImagesForArticle(draft)
      
      // 3. 2× review pass
      const reviewed = await runQualityPipeline(draft)
      
      // 4. Inject internal links from product DB
      const linked = await injectInternalLinks(reviewed, entry.primary_keyword)
      
      // 5. Save as pending_review
      const article = await supabase.from('articles').insert({
        ...linked,
        author_id: getOlikId(),
        status: 'pending_review',
        ai_score: reviewed.metadata.ai_score,
        quality_score: reviewed.metadata.quality_score,
      }).single()
      
      // 6. Update calendar entry
      await supabase.from('content_calendar').update({
        status: 'done',
        related_article_id: article.id,
        completed_at: now(),
      }).eq('id', params.id)
      
      // 7. Update keyword mapping
      await supabase.from('keyword_mapping').update({
        status: 'mapped',
        target_article_id: article.id,
        target_url: `/pruvodce/${article.slug}`,
      }).eq('keyword', entry.primary_keyword)
      
      // 8. Notify admin
      await sendAdminEmail('🦊 Article ready for review', `/admin/articles/pending`)
      
    } catch (e) {
      await markCalendarFailed(params.id, e.message)
    }
  }, 0)
  
  return Response.json({ ok: true, message: 'Generation started. Check /admin/articles/pending in ~10 min.' })
}
```

## DEN 5 REPORT

```
Den 5 — Topic Generator + Workflow: HOTOVO

✓ Weekly topic generator CRON (pondělí 6:00 UTC)
✓ Reads from content_calendar + unmapped keywords
✓ Seasonal awareness
✓ Admin email with suggestions
✓ Calendar → article generation flow
✓ Auto-update calendar status + keyword mapping
✓ Notification when ready

CENA: ~$0.10
```

STOP a čekat schválení.

═════════════════════════════════════════════════

# DEN 6 — PILOT ARTICLE #1

**Cíl:** Test full workflow end-to-end.
**Cena:** ~$0.10

## Pilot topic

**"Řecký olivový olej — kompletní průvodce 2026"**
- Volume: 610 hits/měsíc + multiple related (~1 950 total)
- Konkurence: 0
- Calendar entry: 2026-05-19
- Existing /regiony/recko → expand

## Workflow

1. Calendar entry approved
2. Auto generation triggered
3. Olík writes draft (~3500 slov)
4. 3 images auto-selected (Pexels + Unsplash)
5. 2× review pass
6. Internal links injected
7. Article in /admin/articles/pending
8. **TY review** (10-15 min):
   - Read content
   - Approve or request edits
   - Manual image replacement (volitelně)
9. Approve & Publish

## DEN 6 REPORT

```
Den 6 — Pilot Article #1: HOTOVO

✓ Calendar entry generated
✓ Draft: "Řecký olivový olej — kompletní průvodce 2026"
✓ Olík byline
✓ 3 images selected (Pexels + Unsplash)
✓ 2× review pass passed
✓ Internal links: X products
✓ External links: 3 (EU eAmbrosia, IOC, vědecká studie)
✓ Quality score: XX
✓ AI score: XX
✓ In /admin/articles/pending

POŠLI MI:
- Quality + AI scores
- Tvůj verdict (approve / request edits)
```

STOP a čekat tvé approve.

═════════════════════════════════════════════════

# DEN 7 — FINAL DEPLOY + VERIFY

**Cíl:** Vše live + verified.
**Cena:** $0

## ÚKOL 7.1 — Merge + deploy

```bash
git checkout main
git pull origin main
git merge olik-strategic-sprint
git push origin main

# Wait 90s (BUG-011)
curl https://olivator.cz/api/health
```

## ÚKOL 7.2 — Smoke tests

- `/autor/olik` — funguje?
- `/admin/content-strategy` — dashboard zobrazí goals?
- `/admin/content-calendar` — 30+ entries visible?
- `/admin/keyword-mapping` — 379 keywords loaded?
- `/admin/articles/pending` — pilot article visible?
- Random article — author byline + end-of-article box?
- Schema markup validation (Google Rich Results)

## ÚKOL 7.3 — Schedule CRONs

Verify Railway CRONs:
- ✓ topic-generator (pondělí 6:00 UTC)
- ✓ welcome-dispatcher (denně 9:00 UTC)
- ✓ seasonal-dispatcher (denně 9:00 UTC)
- ✓ Plus existing 12 CRONů z Master Foundation

## ÚKOL 7.4 — Final report

```
✅ OLÍK + STRATEGIC SPRINT: HOTOVO

INFRASTRUCTURE:
✓ Olík author system (schema, page, byline, end-box, voice guidelines)
✓ Strategic admin (calendar, keywords, goals dashboards)
✓ DB schema (content_calendar, keyword_mapping, strategy_goals)
✓ Seeded: 16 goals, 379 keywords, 30+ calendar entries
✓ AI Image Pipeline (Pexels + Unsplash auto + Claude Vision manual)
✓ Article editor (content + images + SEO + schema + publish tabs)
✓ 2× AI Review Pass (Czech + Sonnet)
✓ Approval workflow (/admin/articles/pending)
✓ Topic generator weekly CRON
✓ Calendar → article generation flow

PILOT:
✓ Article #1: Řecký olivový olej (přípravený, čeká approve)

CENY:
- Foundation total: ~$0.70
- Per article ongoing: ~$0.10
- Topic generation/týden: $0.05

CELKOVÁ CENA SPRINTU: ~$1.00 / $1.50 limit

TVŮJ ONGOING COMMITMENT:
- Pondělí: 1 min (schválit topic návrhy)
- Středa-Pátek: 10-20 min (review + approve drafts)
- Volitelně: image manual override
- Total: 15-25 min/týden

CO MŮŽEŠ TEĎ:
1. Otevři /admin/content-strategy — vidíš celý rok
2. Schvalit pilot article v /admin/articles/pending
3. Pondělí 6:00 UTC dostaneš první weekly topic návrhy
4. 1-2 články týdně, ~50 článků za rok
5. Sledovat GSC: nové stránky se začnou indexovat
6. Q1 2026 cíl: 5 000 visits/měsíc

🦊 OLÍK JE NAŽIVO. AUTOMATION RUN.
```

═════════════════════════════════════════════════

## FINÁLNÍ PRAVIDLA

### Cost tracking
- Foundation (Den 1-5): $0.70
- Pilot Den 6: $0.10
- Total max: $1.50

### Branch workflow
- `olik-strategic-sprint` branch
- Commit po každém dni
- Deploy Den 7 only

### Validation
- Validátor češtiny POVINNÝ
- AI detection target <20%
- Quality score target >80
- Olík voice guidelines applied

### Backup
- Před Den 1: `CREATE TABLE articles_backup_olik AS SELECT * FROM articles;`
- Před Den 2: backup current schema (pg_dump pokud možno)

### Eskalace
- 2× chyba → STOP a report
- CLAUDE.md sekce 20

### ENV vars
- ✓ PEXELS_API_KEY (in .env.local)
- ✓ UNSPLASH_ACCESS_KEY (existing)

═════════════════════════════════════════════════

🦊 ZAČNI DEN 1 — Olík Author System.

STOP po každém dni a pošli report.

DOBRODRUŽSTVÍ ZAČÍNÁ.
