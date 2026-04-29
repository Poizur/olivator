-- Entity-page redesign (BRIEF.md): rozšíření regions/brands/cultivars
-- + nové tabulky entity_faqs a recipe_entity_links.
-- Žádné breaking změny — všechny nové sloupce mají default hodnoty.

-- ────────────────────────────────────────────────────────────────────────
-- CULTIVARS — chuťový profil, intenzita, párování, přezdívka
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE cultivars
  ADD COLUMN IF NOT EXISTS flavor_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {pikantnost, horkost, travnate, ovocne, mandlove} — každé 0-10
  ADD COLUMN IF NOT EXISTS intensity_score INTEGER CHECK (intensity_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS primary_use VARCHAR(20),
  -- 'cooking' | 'finishing' | 'dipping' | 'frying' | 'universal'
  ADD COLUMN IF NOT EXISTS pairing_pros TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pairing_cons TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nickname VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tldr VARCHAR(280),
  ADD COLUMN IF NOT EXISTS auto_filled_at TIMESTAMPTZ;
  -- timestamp posledního auto-fill běhu — když je null, admin přepsal ručně

-- ────────────────────────────────────────────────────────────────────────
-- BRANDS — zakladatel, generace, hektary, sídlo, časová osa
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS generation INTEGER,
  ADD COLUMN IF NOT EXISTS hectares INTEGER,
  ADD COLUMN IF NOT EXISTS headquarters VARCHAR(120),
  ADD COLUMN IF NOT EXISTS timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{year: 1860, label: 'založení', description: '...'}]
  ADD COLUMN IF NOT EXISTS tldr VARCHAR(280);

-- ────────────────────────────────────────────────────────────────────────
-- REGIONS — terroir struktura, TL;DR pro info pásek
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS terroir JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {climate, soil, tradition} — každé krátký string
  ADD COLUMN IF NOT EXISTS tldr VARCHAR(280);

-- ────────────────────────────────────────────────────────────────────────
-- ENTITY_FAQS — FAQ per entita s schema.org/FAQPage podporou
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entity_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('region', 'brand', 'cultivar')),
  entity_id UUID NOT NULL,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_faqs_lookup
  ON entity_faqs(entity_type, entity_id, sort_order);

-- ────────────────────────────────────────────────────────────────────────
-- RECIPE_ENTITY_LINKS — propojení receptů s oblastmi/odrůdami/značkami
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_entity_links (
  recipe_slug VARCHAR(255) NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('region', 'brand', 'cultivar')),
  entity_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (recipe_slug, entity_type, entity_slug)
);

CREATE INDEX IF NOT EXISTS idx_recipe_links_entity
  ON recipe_entity_links(entity_type, entity_slug);

-- ────────────────────────────────────────────────────────────────────────
-- COMMENTS pro budoucí archeology
-- ────────────────────────────────────────────────────────────────────────
COMMENT ON COLUMN cultivars.flavor_profile IS 'Auto-filled z products avg + admin override. Klíče: pikantnost, horkost, travnate, ovocne, mandlove (0-10).';
COMMENT ON COLUMN cultivars.auto_filled_at IS 'NULL = admin přepsal ručně, jinak timestamp posledního auto-fill běhu';
COMMENT ON COLUMN brands.timeline IS 'Pole milníků: [{year, label, description}]. Max 4-5 záznamů.';
COMMENT ON COLUMN regions.terroir IS 'Strukturovaný popis: {climate, soil, tradition}.';
COMMENT ON TABLE entity_faqs IS 'FAQ per entita pro SEO akordeon + schema.org FAQPage JSON-LD.';
COMMENT ON TABLE recipe_entity_links IS 'M:N tagging mezi recepty a entitami pro křížení v bloku 7.';
