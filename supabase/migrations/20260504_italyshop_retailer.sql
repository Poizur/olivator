-- Druhý XML retailer: italyshop.cz (eHUB).
-- Specializace: italský sortiment — těstoviny, oleje, omáčky, sýry. Z 1311
-- položek ve feedu má 32 v kategorii Kuchyňské oleje (filter isOliveOil
-- po deploy 901dbfc/530b901 odfiltruje příslušenství).
--
-- Komise default 7.50 — user upraví v adminu po ověření v eHUB programu.
-- Tagline/story/founders se vyplní přes admin tlačítko ✨ Vyplnit prezentaci
-- automaticky (Claude Haiku z webu).

INSERT INTO retailers (
  name, slug, domain, affiliate_network, base_tracking_url,
  default_commission_pct, market, is_active,
  xml_feed_url, xml_feed_format
) VALUES (
  'Italyshop.cz',
  'italyshop',
  'italyshop.cz',
  'eHUB',
  'https://ehub.cz/system/scripts/click.php?a_aid=2f4d1556&a_bid=12368485&data1={product_slug}&url={product_url}',
  7.50,
  'CZ',
  true,
  'https://www.italyshop.cz/heureka/export/products.xml',
  'heureka'
)
ON CONFLICT (slug) DO UPDATE SET
  base_tracking_url = EXCLUDED.base_tracking_url,
  affiliate_network = EXCLUDED.affiliate_network,
  xml_feed_url = EXCLUDED.xml_feed_url,
  xml_feed_format = EXCLUDED.xml_feed_format;

-- Plus disable případnou starou Playwright konfiguraci v discovery_sources
-- (kdybychom si italyshop někdy přidali ručně) — XML cesta má prioritu.
UPDATE discovery_sources
SET status = 'disabled',
    reasoning = 'XML feed přes eHUB (Heureka, ~30 s) má prioritu před Playwright crawlem.',
    updated_at = NOW()
WHERE slug = 'italyshop' AND status = 'enabled';
