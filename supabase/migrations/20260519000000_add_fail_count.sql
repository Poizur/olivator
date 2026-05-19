-- Přidá fail_count + last_fail_at na product_offers.
-- link-rot-checker nově deaktivuje offer až po 3 po sobě jdoucích selháních
-- (HTTP 4xx) místo okamžitého deactivate po prvním selhání.
-- Síťové chyby (timeout, DNS) fail_count neinkrementují.
-- Úspěch resetuje fail_count = 0.

ALTER TABLE product_offers
  ADD COLUMN IF NOT EXISTS fail_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_fail_at TIMESTAMPTZ;

-- Partial index — relevantní jen pro problematické offers (nenulový fail_count)
CREATE INDEX IF NOT EXISTS idx_offers_fail_count
  ON product_offers(fail_count)
  WHERE fail_count > 0;
