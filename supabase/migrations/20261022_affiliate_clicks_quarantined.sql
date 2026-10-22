-- Klik na /go/ u obchodu v karanténě: přesměrováno na stránku produktu, ne do e-shopu.
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS quarantined BOOLEAN NOT NULL DEFAULT false;
-- Zpětné označení kliků na obchody v karanténě (karanténa od 24. 7. 2026).
UPDATE affiliate_clicks c SET quarantined = true
  FROM retailers r WHERE r.id = c.retailer_id AND r.is_active = false AND c.clicked_at >= '2026-07-24';
