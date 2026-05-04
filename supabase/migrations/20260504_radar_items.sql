-- Olivator Radar — feed novinek o olivovém oleji ze světového tisku.
-- Cron 1× za 2 hodiny fetchne RSS feedy (Olive Oil Times, IOC, Google News, …),
-- deduplikuje přes fingerprint, přeloží do češtiny přes Claude Haiku, uloží
-- jako radar_items. Public stránka /radar zobrazuje feed s badges.
--
-- Adaptováno z AIkompass projektu (only5l-agent), Python → TypeScript.

CREATE TABLE IF NOT EXISTS radar_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        VARCHAR(50),                -- 'oliveoiltimes', 'ioc', 'googlenews_olive', ...
  original_url  TEXT UNIQUE,                -- dedup hard key
  original_title TEXT,
  czech_title   TEXT NOT NULL,              -- AI překlad max 80 znaků
  czech_summary TEXT NOT NULL,              -- 2 věty co se stalo
  cz_context    TEXT,                       -- 1 věta co to znamená pro CZ trh
  badge         VARCHAR(20) DEFAULT 'news', -- harvest|price|award|science|quality|news
  fingerprint   VARCHAR(16),                -- L1 dedup hash
  published_at  TIMESTAMPTZ DEFAULT NOW(),
  is_published  BOOLEAN DEFAULT true        -- admin může schovat manuálně
);

CREATE INDEX IF NOT EXISTS idx_radar_items_published
  ON radar_items(published_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_radar_items_fp
  ON radar_items(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_radar_items_badge
  ON radar_items(badge, published_at DESC);

-- Agent decisions log — používá se pro 7-day window dedup history.
-- decision_type='breaking_news_processed' obsahuje payload {title,url,fingerprint}.
CREATE TABLE IF NOT EXISTS agent_decisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name    VARCHAR(50),
  decision_type VARCHAR(50),
  payload       JSONB,
  fingerprint   VARCHAR(16),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_breaking_dedup
  ON agent_decisions(decision_type, fingerprint, created_at DESC)
  WHERE decision_type = 'breaking_news_processed';

CREATE INDEX IF NOT EXISTS idx_agent_decisions_recent
  ON agent_decisions(decision_type, created_at DESC);

-- Project learnings (Fáze 2 — Learning Agent) — připraveno, neaktivní zatím.
CREATE TABLE IF NOT EXISTS project_learnings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  source      TEXT,                          -- '/admin/products/[id]', 'commit:abc123'
  impact      TEXT DEFAULT 'medium',         -- low|medium|high|critical
  commit_hash TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_learnings_category
  ON project_learnings(category, created_at DESC);
