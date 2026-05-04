-- Blocklist pro feed-sync — když admin produkt vyřadí (z jakéhokoliv důvodu:
-- špatná kategorie, nelíbí se, low quality, mimo tržní fokus, …), nesmí se
-- automaticky znovu naimportovat při dalším XML feed sync.
--
-- Status 'excluded' = soft delete:
-- - public listing už filtruje `eq('status', 'active')` → excluded skrytý ✅
-- - lib/feed-sync.ts.ensureProduct si při match na EAN/source_url ověří,
--   že existing produkt NENÍ excluded — pokud je, skip (no offer upsert).

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('draft', 'active', 'inactive', 'excluded'));

COMMENT ON COLUMN products.status IS
  'draft=čeká na admin schválení; active=zobrazený na webu; inactive=skrytý ale zachovaný; excluded=blocklist (sync ho nepřidá zpět ani po smazání).';
