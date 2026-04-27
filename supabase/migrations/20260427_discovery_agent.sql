-- Discovery Agent + Settings + Retailer ratings + Email log
-- Tato migrace připraví infrastrukturu pro plně autonomní hledání nových olejů.

-- 1. App settings (key/value JSONB) — admin si v UI mění bez kódu
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings (idempotent insert)
INSERT INTO app_settings (key, value, description) VALUES
  ('notification_email', '"italienasbavi@gmail.com"',
    'Adresa pro email notifikace z Discovery agenta a alertů'),
  ('discovery_daily_limit', '5',
    'Max počet nových kandidátů které agent zpracuje za 1 běh (testing → ladí se)'),
  ('discovery_auto_publish', 'true',
    'Auto-publikovat HIGH confidence nálezy bez schválení (admin dostane info email)'),
  ('discovery_enabled_shops', '["reckonasbavi","olivio","gaea","mujbio","zdravasila"]',
    'Aktivní e-shopy které Discovery scanuje při weekly run'),
  ('discovery_schedule_cron', '"0 4 * * 1"',
    'Cron pondělí 4:00 UTC. Změň pokud chceš jinou frekvenci.')
ON CONFLICT (key) DO NOTHING;

-- 2. Retailer hvězdičkové hodnocení
ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_source VARCHAR(20); -- 'heureka' | 'manual' | 'google'

COMMENT ON COLUMN retailers.rating IS '0-5 hvězdičkové hodnocení e-shopu, zobrazeno pod Buy buttonem';
COMMENT ON COLUMN retailers.rating_source IS 'Odkud rating pochází — heureka API automaticky / manual zadané adminem';

-- 3. Discovery candidates queue
CREATE TABLE IF NOT EXISTS discovery_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  source_domain VARCHAR(100),
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  -- Matching
  matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  match_type VARCHAR(20), -- 'ean' | 'fuzzy_name' | 'none'
  match_confidence DECIMAL(3,2), -- 0.00 - 1.00
  -- Data
  candidate_data JSONB NOT NULL, -- raw scraped product (name, ean, price, image_url, raw_description, ...)
  -- Decision
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'auto_published', 'auto_added_offer', 'approved', 'rejected', 'needs_review', 'failed')),
  reasoning TEXT, -- proč agent dospěl ke status (transparentnost pro admin review)
  resulting_product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- pokud byl založen produkt
  resulting_offer_id UUID REFERENCES product_offers(id) ON DELETE SET NULL, -- pokud byl založen offer
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(100),
  -- Notification
  email_sent_at TIMESTAMPTZ,
  --
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_status_created
  ON discovery_candidates(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_source_domain
  ON discovery_candidates(source_domain);

-- 4. Email log (audit trail co se posílalo)
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'discovery_summary' | 'price_alert' | 'crawler_failure' | 'manual'
  body_preview TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status VARCHAR(20) DEFAULT 'sent', -- 'sent' | 'failed' | 'bounced'
  delivery_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at
  ON notification_log(sent_at DESC);
