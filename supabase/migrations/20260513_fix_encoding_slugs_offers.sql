-- Fix encoding bug pro 6 zdrave-oleje.cz produktů
-- Příčina: zdrave-oleje.cz nezasílá charset v HTTP headers → discovery agent
--          číst bytes jako UTF-8 místo Windows-1250 → broken names + slugy.
-- Ceny ověřeny live 2026-05-13.

-- ── 1. old_slugs sloupec (pro 301 redirect) ──────────────────────────────────

ALTER TABLE products ADD COLUMN IF NOT EXISTS old_slugs TEXT[] DEFAULT '{}';

-- ── 2. Fix names + slugs, reactivace ─────────────────────────────────────────

UPDATE products SET
  name = 'Extra panenský olivový olej SITIA P.D.O. 0,3 Orino 5l plech',
  slug = 'extra-panensky-olivovy-olej-sitia-p-d-o-0-3-orino-5l-plech',
  old_slugs = array_append(old_slugs, 'extra-panensk-olivov-olej-sitia-p-d-o-0-3-orino-5l-plech'),
  status = 'active', status_reason_code = NULL, last_offer_seen_at = NOW()
WHERE id = '58da13fd-dfb9-43f8-8a4b-a3c2a16c59f0';

UPDATE products SET
  name = 'Extra panenský olivový olej SITIA P.D.O. 0,3 Orino 500ml',
  slug = 'extra-panensky-olivovy-olej-sitia-p-d-o-0-3-orino-500ml',
  old_slugs = array_append(old_slugs, 'extra-panensk-olivov-olej-sitia-p-d-o-0-3-orino-500ml'),
  status = 'active', status_reason_code = NULL, last_offer_seen_at = NOW()
WHERE id = '3fb40782-68c9-4cef-b17a-ad618c7f3e6e';

UPDATE products SET
  name = 'Extra panenský olivový olej SITIA P.D.O. 0,3 Orino 1l plech',
  slug = 'extra-panensky-olivovy-olej-sitia-p-d-o-0-3-orino-1l-plech',
  old_slugs = array_append(old_slugs, 'extra-panensk-olivov-olej-sitia-p-d-o-0-3-orino-1l-plech'),
  status = 'active', status_reason_code = NULL, last_offer_seen_at = NOW()
WHERE id = 'a54020b8-65f0-4cd0-bce7-9c17afaa607b';

UPDATE products SET
  name = 'Olivový olej z pokrutin 1l pet Liofito',
  slug = 'olivovy-olej-z-pokrutin-1l-pet-liofito',
  old_slugs = array_append(old_slugs, 'olivov-olej-z-pokrutin-1l-pet-liofito'),
  status = 'active', status_reason_code = NULL, last_offer_seen_at = NOW()
WHERE id = 'a5f2ed01-3d15-4a83-a5c4-a98aa6e58d46';

UPDATE products SET
  name = 'Extra panenský olivový olej NIKOLOS 5l plech',
  slug = 'extra-panensky-olivovy-olej-nikolos-5l-plech',
  old_slugs = array_append(old_slugs, 'extra-panensk-olivov-olej-nikolos-5l-plech'),
  status = 'active', status_reason_code = NULL, last_offer_seen_at = NOW()
WHERE id = 'b18078b1-95a0-4b43-b4d7-2a2876ba6e57';

UPDATE products SET
  name = 'Extra panenský olivový olej NIKOLOS 750ml',
  slug = 'extra-panensky-olivovy-olej-nikolos-750ml',
  old_slugs = array_append(old_slugs, 'extra-panensk-olivov-olej-nikolos-750ml'),
  status = 'active', status_reason_code = NULL, last_offer_seen_at = NOW()
WHERE id = 'd098b3be-aee1-446c-9de1-a5381f9c367d';

-- ── 3. Product offers (zdrave-oleje.cz, ceny live 2026-05-13) ────────────────

INSERT INTO product_offers (
  product_id, retailer_id, price, currency, in_stock, product_url, last_checked, last_price_change
) VALUES
  ('58da13fd-dfb9-43f8-8a4b-a3c2a16c59f0', '1b441aa0-b1ad-4df5-9484-2f05eb344fdd',
   1469, 'CZK', true,
   'https://www.zdrave-oleje.cz/2024-extra-panensky-olivovy-olej-sitia-p.d.o.-0,3-orino-5l-plech.html',
   NOW(), NOW()),
  ('3fb40782-68c9-4cef-b17a-ad618c7f3e6e', '1b441aa0-b1ad-4df5-9484-2f05eb344fdd',
   199, 'CZK', true,
   'https://www.zdrave-oleje.cz/2025-extra-panensky-olivovy-olej-sitia-p.d.o.-0,3-orino-500ml.html',
   NOW(), NOW()),
  ('a54020b8-65f0-4cd0-bce7-9c17afaa607b', '1b441aa0-b1ad-4df5-9484-2f05eb344fdd',
   329, 'CZK', true,
   'https://www.zdrave-oleje.cz/2026-extra-panensky-olivovy-olej-sitia-p.d.o.-0,3-orino-1l-plech.html',
   NOW(), NOW()),
  ('a5f2ed01-3d15-4a83-a5c4-a98aa6e58d46', '1b441aa0-b1ad-4df5-9484-2f05eb344fdd',
   221, 'CZK', false,
   'https://www.zdrave-oleje.cz/1900-olivovy-olej-z-pokrutin-1l-pet-liofito.html',
   NOW(), NOW()),
  ('b18078b1-95a0-4b43-b4d7-2a2876ba6e57', '1b441aa0-b1ad-4df5-9484-2f05eb344fdd',
   1526, 'CZK', true,
   'https://www.zdrave-oleje.cz/2022-extra-panensky-olivovy-olej-nikolos-5l-plech.html',
   NOW(), NOW()),
  ('d098b3be-aee1-446c-9de1-a5381f9c367d', '1b441aa0-b1ad-4df5-9484-2f05eb344fdd',
   318, 'CZK', true,
   'https://www.zdrave-oleje.cz/2023-extra-panensky-olivovy-olej-nikolos-750ml.html',
   NOW(), NOW())
ON CONFLICT (product_id, retailer_id) DO UPDATE SET
  price = EXCLUDED.price,
  in_stock = EXCLUDED.in_stock,
  product_url = EXCLUDED.product_url,
  last_checked = NOW();
