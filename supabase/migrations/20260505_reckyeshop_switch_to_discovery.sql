-- Reckyeshop: XML feed má jen 7 olejů, ale web má 40+ olejů ve 4 podkategoriích.
-- Přepneme z XML cesty na discovery agent (Playwright sitemap crawl).
--
-- Pre-flight check (5. května 2026):
--   Feed:    https://www.reckyeshop.cz/heureka/export/products.xml → 7 položek "Kuchyňské oleje"
--   Web:     /extra-panensky-olivovy-olej/   ≈ 51 prod. linků
--            /bio-extra-panensky-olivovy-olej/ ≈ 45
--            /cerstve-oleje-ze-sklizne-2025-2026/ ≈ 54
--            /farmarsky-extra-panensky-olivovy-olej/ ≈ 45
--
-- Akce:
-- 1. retailers.xml_feed_url = NULL → cron:feed-sync ho přeskočí
-- 2. discovery_sources status='enabled' s crawler_type='shoptet_sitemap'
--    (reckyeshop je Shoptet, sitemap.xml má všech 40+ olejů)
-- 3. Affiliate tracking + tagline/story zachovány

UPDATE retailers
SET
  xml_feed_url = NULL,
  xml_feed_format = NULL
WHERE slug = 'reckyeshop';

-- Discovery source přidán/reaktivován pro Playwright crawl
INSERT INTO discovery_sources (
  domain, slug, name, crawler_type, status, source, reasoning
) VALUES (
  'reckyeshop.cz',
  'reckyeshop',
  'Reckyeshop',
  'shoptet_sitemap',
  'enabled',
  'manual',
  'XML Heureka feed má jen 7 olejů, web má 40+. Přepnuto na sitemap crawl 5.5.2026 (BUG-024).'
)
ON CONFLICT (slug) DO UPDATE SET
  status = 'enabled',
  crawler_type = 'shoptet_sitemap',
  reasoning = EXCLUDED.reasoning,
  updated_at = NOW();
