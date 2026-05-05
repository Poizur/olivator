-- Cretamart.com — řecký olej z Kréty, eHUB partnerství.
-- Specifika: Heureka feed (?type=productscz) NEOBSAHUJE olej kategorii
-- (jen kosmetiku, med, koření, octy). Olej je na webu pod /cs/13-olivovy-olej.
--
-- Strategie: discovery agent (Playwright) scrapuje category page → najde 46
-- olejů → vytvoří drafty s offers + auto-rescrape pipeline. Bez XML feedu.
--
-- Affiliate: eHUB ID 0c6277d3, data1={product_slug} pro tracking.

-- 1. Retailer záznam
INSERT INTO retailers (
  name, slug, domain, affiliate_network, base_tracking_url,
  default_commission_pct, market, is_active
) VALUES (
  'Cretamart',
  'cretamart',
  'cretamart.com',
  'eHUB',
  'https://ehub.cz/system/scripts/click.php?a_aid=2f4d1556&a_bid=0c6277d3&data1={product_slug}&url={product_url}',
  7.50,
  'CZ',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  affiliate_network = EXCLUDED.affiliate_network,
  base_tracking_url = EXCLUDED.base_tracking_url,
  is_active = true;

-- 2. Discovery source pro category page crawl (PrestaShop layout)
-- crawler_type='shoptet_category' používá category_url. lib/shop-crawlers.ts
-- crawlShoptetCategory byl rozšířen o PrestaShop selektory (.product-miniature,
-- article[data-id-product], .product-container) v commitu spolu s touto migrací.
INSERT INTO discovery_sources (
  domain, slug, name, crawler_type, category_url, status, source, reasoning
) VALUES (
  'cretamart.com',
  'cretamart',
  'Cretamart',
  'shoptet_category',
  'https://cretamart.com/cs/13-olivovy-olej',
  'enabled',
  'manual',
  'Řecký krétský olej, eHUB partnerství. XML feed (?type=productscz) NEOBSAHUJE olej kategorii — jen kosmetiku/koření. Crawlujeme přes category page /cs/13-olivovy-olej (46 olejů, PrestaShop layout).'
)
ON CONFLICT (slug) DO UPDATE SET
  status = 'enabled',
  crawler_type = EXCLUDED.crawler_type,
  category_url = EXCLUDED.category_url,
  reasoning = EXCLUDED.reasoning;
