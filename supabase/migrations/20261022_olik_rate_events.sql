-- Rate-limit Olíka: 1 řádek = 1 zpráva poslaná modelu. Uchování 24 h (mazání v cron:link-check).
CREATE TABLE IF NOT EXISTS olik_rate_events (
  id BIGSERIAL PRIMARY KEY,
  ip_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_olik_rate_events_ip ON olik_rate_events (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_olik_rate_events_created ON olik_rate_events (created_at);
ALTER TABLE olik_rate_events ENABLE ROW LEVEL SECURITY;

-- Spotřeba Claude API (každé volání přes callClaude) — pro denní přehled nákladů v rutině.
CREATE TABLE IF NOT EXISTS api_usage (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(80) NOT NULL,
  model VARCHAR(60) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,5) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage (created_at);
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
