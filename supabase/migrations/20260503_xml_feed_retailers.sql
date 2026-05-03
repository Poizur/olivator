-- XML feed support pro retailery + první affiliate partner reckonasbavi.cz
--
-- Některé eshopy poskytují strukturovaný produkt feed (Heureka XML, Google
-- Shopping). Když ho mají → naimportujeme produkty + ceny dávkově. Když
-- nemají → spoléháme na per-URL Playwright scrape (existing rescrape).
-- XML feed je VÝHODA, ne povinnost.

ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS xml_feed_url TEXT,
  ADD COLUMN IF NOT EXISTS xml_feed_format VARCHAR(30),
  ADD COLUMN IF NOT EXISTS xml_feed_last_synced TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS xml_feed_last_result JSONB;

COMMENT ON COLUMN retailers.xml_feed_url IS 'Volitelný produktový feed (Heureka XML, Google Shopping). Pokud vyplněno, sync-feed endpoint hromadně importuje produkty + ceny.';
COMMENT ON COLUMN retailers.xml_feed_format IS 'Formát feedu: heureka, google_shopping, custom. Určuje který parser se použije.';
COMMENT ON COLUMN retailers.xml_feed_last_synced IS 'Kdy poslední sync proběhl.';
COMMENT ON COLUMN retailers.xml_feed_last_result IS 'JSON souhrn poslední synchronizace: created/updated/skipped počty, errors.';

-- První affiliate partner: reckonasbavi.cz přes eHUB
-- Brand: Řecko nás baví — vášniví cestovatelé Zdeněk a Marcelka
-- Komise: PPS 5–10 % per značka → defaultní 7.50 (override per offer možný)
-- Tracking: data1={product_slug} → eHUB vrátí slug v reportu transakcí
INSERT INTO retailers (
  name, slug, domain, affiliate_network, base_tracking_url,
  default_commission_pct, market, is_active,
  tagline, story, founders, headquarters, specialization,
  xml_feed_url, xml_feed_format
) VALUES (
  'Řecko nás baví',
  'reckonasbavi',
  'shop.reckonasbavi.cz',
  'eHUB',
  'https://ehub.cz/system/scripts/click.php?a_aid=2f4d1556&a_bid=46f8224d&data1={product_slug}&url={product_url}',
  7.50,
  'CZ',
  true,
  'Řecké oleje od cestovatelů, kteří se zamilovali do Korfu a tradice malých rodinných lisoven',
  'Eshop spravují Zdeněk a Marcelka — vášniví cestovatelé, kteří roky chodí po řeckých ostrovech a navazují přímé vztahy s tamními pěstiteli oliv. Specializují se na malé rodinné značky z Korfu, Kréty, Sitie a Peloponésu, které v běžných obchodech nedostanete. Většinu olejů koupíte i v balení po 5 litrech, výhodněji než jednolitrové láhve.',
  'Zdeněk a Marcelka',
  'Česko (sklad) + Korfu (původní pěstitelé)',
  'Řecké extra panenské olivové oleje od malých pěstitelů',
  'https://shop.reckonasbavi.cz/heureka/export/products.xml?hash=P2lRGhk8zvNODZhXU9Uw9ig',
  'heureka'
)
ON CONFLICT (slug) DO UPDATE SET
  base_tracking_url = EXCLUDED.base_tracking_url,
  affiliate_network = EXCLUDED.affiliate_network,
  xml_feed_url = EXCLUDED.xml_feed_url,
  xml_feed_format = EXCLUDED.xml_feed_format;
