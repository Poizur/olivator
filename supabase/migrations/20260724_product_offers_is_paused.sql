-- Karanténa nesmluvních retailerů 2026-07-24
-- is_paused = true → nabídka skryta dokud retailer nepotvrdí souhlas
-- paused_reason → identifikátor důvodu (např. 'quarantine-2026-07')
-- Reverzibilní: SET is_paused = false pro obnovení

ALTER TABLE product_offers
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_product_offers_is_paused ON product_offers(is_paused) WHERE is_paused = true;
