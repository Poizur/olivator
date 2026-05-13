-- Fix: no_offers grace period + reactivate 8 false-positive inactive products
-- Příčina: zdrave-oleje.cz servuje Windows-1250 bez charset v HTTP headeru
-- → scraper četl jako UTF-8 → mojibake → nabídky nebyly nikdy scrape-ovány
-- → auto-audit deaktivoval jako "no_offers" přestože stránky existují.

-- 1. Nový sloupec pro sledování poslední nabídky
ALTER TABLE products
ADD COLUMN IF NOT EXISTS last_offer_seen_at TIMESTAMPTZ;

-- 2. Backfill ze stávajících product_offers
UPDATE products p
SET last_offer_seen_at = (
  SELECT MAX(last_checked)
  FROM product_offers po
  WHERE po.product_id = p.id
)
WHERE id IN (SELECT DISTINCT product_id FROM product_offers);

-- 3. Reactivate 8 false-positive produktů (source URL vrací HTTP 200)
--    Výjimka: alfa-extra-panensky (reckyeshop.cz) = skutečný 404, necháváme inactive.
UPDATE products
SET
  status              = 'active',
  status_reason_code  = NULL,
  status_reason_note  = NULL,
  status_changed_by   = 'manual_fix_20260512',
  status_changed_at   = NOW(),
  updated_at          = NOW()
WHERE status_reason_code = 'no_offers';
