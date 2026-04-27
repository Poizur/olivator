-- Discovery Sources — registr všech e-shopů které jsme kdy viděli.
-- Nahrazuje hardcoded config v lib/shop-crawlers.ts.
-- Slouží i jako audit trail (suggested → enabled → disabled → ...).

CREATE TABLE IF NOT EXISTS discovery_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(150) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255),

  -- Crawler config
  crawler_type VARCHAR(30) NOT NULL DEFAULT 'shoptet_sitemap',
  category_url TEXT, -- volitelné pro shoptet_category type

  -- Lifecycle status
  status VARCHAR(20) DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'enabled', 'disabled', 'rejected', 'failing')),

  -- Provenance
  source VARCHAR(40), -- 'manual' | 'prospector_heureka' | 'prospector_google' | 'seed'
  reasoning TEXT, -- proč prospector našel tenhle shop

  -- Stats
  found_at TIMESTAMPTZ DEFAULT NOW(),
  last_scanned_at TIMESTAMPTZ,
  last_scan_url_count INTEGER, -- kolik URL agent našel v posledním scanu
  last_scan_error TEXT,
  total_products_imported INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case-insensitive unique on domain (prevent http://www.X vs https://x duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_discovery_sources_domain_lower
  ON discovery_sources(LOWER(domain));
CREATE INDEX IF NOT EXISTS idx_discovery_sources_status
  ON discovery_sources(status, last_scanned_at DESC);

-- Seed ze stávající hardcoded config (idempotent)
INSERT INTO discovery_sources (domain, slug, name, crawler_type, category_url, status, source, reasoning) VALUES
  ('shop.reckonasbavi.cz', 'reckonasbavi', 'Řecko nás baví', 'shoptet_sitemap', NULL, 'enabled', 'seed',
    'Specialty řecký shop, 62 olejů, ověřeno funguje'),
  ('olivio.cz', 'olivio', 'Olivio.cz', 'shoptet_sitemap', NULL, 'disabled', 'seed',
    'DNS issue / nedostupné — vrátit až bude crawler doladěný'),
  ('gaea.cz', 'gaea', 'Gaea.cz', 'shoptet_sitemap', NULL, 'disabled', 'seed',
    'Sitemap funguje, ale nemá klasický EVOO sortiment'),
  ('mujbio.cz', 'mujbio', 'MujBio.cz', 'shoptet_sitemap', NULL, 'disabled', 'seed',
    'DNS issue / nedostupné'),
  ('zdravasila.cz', 'zdravasila', 'Zdravasila.cz', 'shoptet_sitemap', NULL, 'disabled', 'seed',
    'Sitemap funguje, ale jiný sortiment'),
  ('olivovyolej.cz', 'olivovyolej', 'Olivovyolej.cz', 'shoptet_sitemap', NULL, 'suggested', 'seed',
    'Specialty shop — ještě neověřený')
ON CONFLICT (slug) DO NOTHING;
