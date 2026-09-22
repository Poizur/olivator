-- GSC daily snapshot: query × page × date performance
-- Umožňuje historické srovnání a detekci trendů bez volání GSC API pokaždé.

CREATE TABLE IF NOT EXISTS gsc_snapshot (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taken_at    DATE NOT NULL,                    -- den snapshotu (jeden snapshot/den)
  dimension   VARCHAR(20) NOT NULL,             -- 'query', 'page', 'query+page'
  key1        TEXT NOT NULL,                    -- query nebo page URL
  key2        TEXT,                             -- druhý klíč pro query+page
  clicks      INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr         DECIMAL(6,4) DEFAULT 0,
  position    DECIMAL(6,2) DEFAULT 0,
  period_days INTEGER DEFAULT 28,              -- kolik dní dat zahrnuje
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(taken_at, dimension, key1, COALESCE(key2,''))
);

CREATE INDEX IF NOT EXISTS gsc_snapshot_taken_at_idx ON gsc_snapshot(taken_at);
CREATE INDEX IF NOT EXISTS gsc_snapshot_dimension_idx ON gsc_snapshot(dimension, taken_at);
CREATE INDEX IF NOT EXISTS gsc_snapshot_key1_idx ON gsc_snapshot(key1, dimension);
