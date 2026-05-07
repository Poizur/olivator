-- E-E-A-T author system pro Fáze 5.
-- Articles a recipes mohou mít konkrétního autora. Article schema místo
-- "author: Organization" generuje "author: Person" → Google rich result
-- s jménem autora + linkem na profil = trust signal.

CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(80) UNIQUE NOT NULL,

  -- Identity
  name VARCHAR(100) NOT NULL,
  title VARCHAR(120),  -- "Editor", "Sommelier", "Spoluautor", atd.

  -- Bio
  bio_short TEXT,           -- ~300 chars pro byline pod článkem
  bio_long TEXT,            -- markdown, plný profil
  expertise TEXT[],         -- ['olivový olej', 'středomořská kuchyně', ...]

  -- Links (sameAs pro Knowledge Graph)
  photo_url TEXT,
  email VARCHAR(120),
  linkedin_url TEXT,
  twitter_url TEXT,
  website_url TEXT,

  -- Trust signals
  credentials TEXT,         -- "Certifikovaný sommelier oleje (NYC 2024)"
  years_experience INTEGER,

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);
CREATE INDEX IF NOT EXISTS idx_authors_status ON authors(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION authors_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS authors_updated_at ON authors;
CREATE TRIGGER authors_updated_at
  BEFORE UPDATE ON authors
  FOR EACH ROW
  EXECUTE FUNCTION authors_updated_at_trigger();

-- Articles a recipes dostanou author_id FK (nullable — legacy AI-generated mají null)
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES authors(id) ON DELETE SET NULL;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES authors(id) ON DELETE SET NULL;

-- ── Seed: 1 default editor (Olivátor team) ──────────────────────────────────
INSERT INTO authors (slug, name, title, bio_short, expertise, status) VALUES
(
  'olivator-redakce',
  'Redakce Olivátor',
  'Editorial team',
  'Tým editorů olivator.cz se specializací na olivový olej, středomořskou stravu a spotřebitelskou ochranu. Všechny články prochází redakční kontrolou a jsou založeny na konkrétních datech ze 176+ produktů v katalogu.',
  ARRAY['olivový olej', 'středomořská strava', 'spotřebitelská kvalita'],
  'active'
)
ON CONFLICT (slug) DO NOTHING;
