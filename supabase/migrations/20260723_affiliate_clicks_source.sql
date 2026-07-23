-- Affiliate clicks: přidání kontextu kliku (odkud, typ stránky, cena v moment kliku).
-- session_id sloupec již existuje — nepřidáváme znovu.

ALTER TABLE affiliate_clicks
  ADD COLUMN IF NOT EXISTS source_page   TEXT,
  ADD COLUMN IF NOT EXISTS source_type   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS price_at_click DECIMAL(10,2);

-- Index pro analytiku dle source_type (JOIN-free bucketing v dashboardu)
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_source_type
  ON affiliate_clicks (source_type, clicked_at DESC);

COMMENT ON COLUMN affiliate_clicks.source_page   IS 'Referer URL nebo ?sp= parametr — absolutní URL stránky ze které klik přišel';
COMMENT ON COLUMN affiliate_clicks.source_type   IS 'Odvozený typ: product|zebricek|srovnavac|slevy|clanek|email|homepage|unknown';
COMMENT ON COLUMN affiliate_clicks.price_at_click IS 'Cena nabídky v Kč v moment kliku — pro odhad hodnoty košíků';
