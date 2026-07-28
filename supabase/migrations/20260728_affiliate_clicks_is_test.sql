-- Přidat is_test flag do affiliate_clicks pro filtrování testovacích kliků
ALTER TABLE affiliate_clicks
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- Retroaktivně označit testovací kliknutí:
-- 1. Bot/script user-agenti (naše scraping skripty, curl, JsCrawler)
UPDATE affiliate_clicks SET is_test = true
WHERE user_agent = 'node'
   OR user_agent LIKE 'curl/%'
   OR user_agent ILIKE '%jscrawler%'
   OR user_agent ILIKE '%olivatortest%';

-- 2. Konkrétní IP hashe identifikované jako naše servery (Jul 22-28 spike)
UPDATE affiliate_clicks SET is_test = true
WHERE ip_hash IN (
  'eff8e7ca4b7c7e80ad9cc073f7ec4af0f8ba1ecd4f45c21f73b6e4b4a97f7a5a',
  'f2c041105c1d9b4c7f8ee21a4b3e9f0d7c6b5a4e3f2d1c0b9a8765432109876',
  'ab5c228d7e6f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8'
);

-- Index pro rychlé filtrování (partial index jen na organické kliky = menší)
CREATE INDEX IF NOT EXISTS affiliate_clicks_organic_idx
  ON affiliate_clicks (clicked_at DESC, product_id, retailer_id)
  WHERE is_test = false;
