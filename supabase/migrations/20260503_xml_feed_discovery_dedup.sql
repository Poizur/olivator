-- Dedup mezi discovery cron (Playwright) a feed-sync cron (Heureka XML).
--
-- reckonasbavi.cz sedí v discovery_sources jako 'shoptet_sitemap' crawler od
-- semínkového seedu. Po napojení XML feedu (20260503_xml_feed_retailers.sql)
-- by stejný shop běžel dvojitě: discovery sitemap crawl + XML sync.
-- discovery-agent.ts teď filtruje retailery s xml_feed_url, ale i discovery_sources
-- by měl reflektovat realitu — jasný signál v adminu, který shop jde kterou cestou.

UPDATE discovery_sources
SET
  status = 'disabled',
  reasoning = 'XML feed přes eHUB nás zásobuje rychleji a spolehlivěji (Heureka XML, ~30s vs Playwright sitemap ~10min). Zdroj pravdy: retailers.xml_feed_url. Vrátit do enabled, jen pokud bychom shutdownnuli XML feed.',
  updated_at = NOW()
WHERE slug = 'reckonasbavi'
  AND status = 'enabled';
