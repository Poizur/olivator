-- Manual override + web-check cena/dostupnost
-- Chrání před feed přepsáním lidské opravy; ukládá ověřenou cenu ze stránky
ALTER TABLE product_offers
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_note TEXT,
  ADD COLUMN IF NOT EXISTS page_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_mismatch BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_web_check TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS product_offers_manual_override_idx
  ON product_offers (manual_override) WHERE manual_override = true;
CREATE INDEX IF NOT EXISTS product_offers_price_mismatch_idx
  ON product_offers (price_mismatch) WHERE price_mismatch = true;
CREATE INDEX IF NOT EXISTS product_offers_last_web_check_idx
  ON product_offers (last_web_check DESC NULLS LAST);
