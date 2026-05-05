-- Per-retailer shipping + return policy pro Google Merchant Listings rich snippet.
-- Aktuálně lib/schema.ts má hardcoded 99 Kč / 14 dní pro celou ČR. Tato migrace
-- přidá sloupce s reálnými per-retailer hodnotami, které se naplní:
-- 1) Automaticky z Heureka XML feed DELIVERY tagů (feed-sync cron)
-- 2) Z webu eshopu přes Claude auto-research (retailer-research)
-- 3) Manuálně adminem v retailer formuláři (override)

ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS shipping_rate_czk INTEGER,
  ADD COLUMN IF NOT EXISTS free_shipping_threshold_czk INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_days_min INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS delivery_days_max INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS return_days INTEGER DEFAULT 14;

COMMENT ON COLUMN retailers.shipping_rate_czk IS 'Min cena dopravy v Kč (z XML DELIVERY_PRICE nebo z webu). Null = neznámé, fallback 99 Kč.';
COMMENT ON COLUMN retailers.free_shipping_threshold_czk IS 'Cena nákupu nad kterou je doprava zdarma (např. 1000 Kč u Rohlíku). Null = nemá free shipping.';
COMMENT ON COLUMN retailers.delivery_days_min IS 'Minimální počet dní doručení. Default 1.';
COMMENT ON COLUMN retailers.delivery_days_max IS 'Maximální počet dní doručení. Default 3 (CZ standard).';
COMMENT ON COLUMN retailers.return_days IS 'Počet dní na vrácení zboží. Default 14 (CZ zákonné minimum).';
