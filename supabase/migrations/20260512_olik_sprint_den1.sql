-- Den 1: Olík Author System
-- Aplikuj přes Supabase dashboard → SQL editor

-- 1. Backup před změnami
CREATE TABLE IF NOT EXISTS articles_backup_olik AS SELECT * FROM articles;

-- 2. Authors tabulka
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

-- 3. Olík data
INSERT INTO authors (
  slug, name, bio_short, bio_full, voice_guidelines,
  image_url, email, schema_metadata
) VALUES (
  'olik',
  'Olík',
  'Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Píše o olivovém oleji ze 18 prodejců v ČR. Olivator Score je jeho dílo.',
  'Hlavní degustátor a kritický nos Olivátoru.

Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Ostatní mu nevadí.

Za poslední dva roky ochutnal 847 olejů (počítá si je). Navštívil 12 olivových hájů od Alentejo po Krétu. Pamatuje si chuť každého z nich. Jeho fotografická paměť ale končí u jmen prodejců.

Olivator Score vymyslel ve 3 ráno po pátém ochutnání řeckého DOP. Ráno si myslel, že je geniální. Po dvou letech testů se ukázalo, že měl pravdu.

Žádný výrobce mu neplatí. Naopak: čím dráž olej stojí, tím víc ho štve, když nestojí za nic.',
  'OLÍKŮV HLAS — PRAVIDLA PSANÍ:

TON:
- Tykání. Vždy.
- Krátké věty (max 20 slov, ideální 8-15)
- Self-deprecating humor občas
- Anti-corporate (nesnáší marketingové bláboly)
- Authority bez arogance

KONKRÉTNOST:
- Konkrétní čísla, ne "mnoho/několik"
- Konkrétní příklady místo obecností

ZAKÁZANÉ FRÁZE:
- "v dnešní době", "je důležité"
- "pojďme se podívat", "není žádným tajemstvím"
- "úžasný", "fantastický", "neuvěřitelný"
- Vykřičníky

POVOLENÉ A OČEKÁVANÉ:
- Personal voice ("vyzkoušel jsem", "překvapilo mě", "můj favorit")
- Vtipný komentář občas
- Cesty ("Když jsem byl loni v Andalusii...")
- Sezónní kontext

CO OLÍK MILUJE:
- DOP certifikované oleje
- Polyfenoly nad 500 mg/kg
- Early harvest
- Kalamata, Sitia, Apulie

CO OLÍK NESNÁŠÍ:
- "Prémiový" v názvu bez DOP
- Kyselost nad 0,5 %
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

-- 4. Author column na articles
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES authors(id);

-- 5. Přiřaď Olíka ke všem 23 článkům
UPDATE articles
SET author_id = (SELECT id FROM authors WHERE slug = 'olik')
WHERE author_id IS NULL;
