-- Konec affiliate programu prodejce (eHUB ukončuje Cretamart 23. 10. 2026).
-- Po tomto okamžiku /go/ vede přímo do obchodu s UTM, bez affiliate odkazu.
ALTER TABLE retailers ADD COLUMN IF NOT EXISTS affiliate_ends_at TIMESTAMPTZ;

-- Klik bez zdrojové stránky i bez refereru: přesměruje se normálně,
-- ale nepočítá se mezi lidské kliky (uvádí se zvlášť).
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS unverified BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_human ON affiliate_clicks (clicked_at) WHERE is_test = false AND unverified = false;
