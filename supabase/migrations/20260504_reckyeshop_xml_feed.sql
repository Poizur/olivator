-- Třetí XML retailer: reckyeshop.cz (eHUB).
-- Reckyeshop už existuje v retailers tabulce (admin manuálně přidal dříve),
-- jen mu doplníme XML feed + affiliate URL.
--
-- Feed: 353 položek celkem, 7 v kategorii Kuchyňské oleje.

UPDATE retailers
SET
  affiliate_network = 'eHUB',
  base_tracking_url = 'https://ehub.cz/system/scripts/click.php?a_aid=2f4d1556&a_bid=b44af70e&data1={product_slug}&url={product_url}',
  xml_feed_url = 'https://www.reckyeshop.cz/heureka/export/products.xml',
  xml_feed_format = 'heureka',
  is_active = true
WHERE slug = 'reckyeshop';

-- Pojistka: kdyby reckyeshop neexistoval (jiný název slugu např. 'reckyshop'),
-- vytvoříme ho jako nový.
INSERT INTO retailers (
  name, slug, domain, affiliate_network, base_tracking_url,
  default_commission_pct, market, is_active,
  xml_feed_url, xml_feed_format
) VALUES (
  'Reckyeshop',
  'reckyeshop',
  'reckyeshop.cz',
  'eHUB',
  'https://ehub.cz/system/scripts/click.php?a_aid=2f4d1556&a_bid=b44af70e&data1={product_slug}&url={product_url}',
  7.50,
  'CZ',
  true,
  'https://www.reckyeshop.cz/heureka/export/products.xml',
  'heureka'
)
ON CONFLICT (slug) DO NOTHING;

-- Disable případnou starou Playwright konfiguraci v discovery_sources.
UPDATE discovery_sources
SET status = 'disabled',
    reasoning = 'XML feed přes eHUB má prioritu před Playwright crawlem.',
    updated_at = NOW()
WHERE slug = 'reckyeshop' AND status = 'enabled';
