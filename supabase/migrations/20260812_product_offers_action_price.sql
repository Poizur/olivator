-- product_offers: přidat action_price pro importování slev z Heureka XML feedů.
-- Spustit v Supabase SQL Editor.
ALTER TABLE product_offers
  ADD COLUMN IF NOT EXISTS action_price DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS action_price_start DATE DEFAULT NULL;

COMMENT ON COLUMN product_offers.action_price IS
  'Akční cena z Heureka XML <ACTION_PRICE>. NULL = žádná aktivní akce.';
COMMENT ON COLUMN product_offers.action_price_start IS
  'Datum začátku akce (z XML feedu nebo manuálně nastaveno adminem).';

-- Index pro rychlé filtrování produktů s aktivní akcí
CREATE INDEX IF NOT EXISTS idx_product_offers_action_price
  ON product_offers (action_price)
  WHERE action_price IS NOT NULL;
