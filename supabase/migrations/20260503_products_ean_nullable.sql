-- Farmářské / shop-internal oleje (Evoilino, malé Korfu lisovny) NEMAJÍ
-- oficiální GTIN. Heureka feedy pro ně generují placeholder typu
-- '7777770000037' — což by kolizovalo napříč shopy. Lepší je tyto produkty
-- ukládat s ean=null a deduplikovat přes source_url v lib/feed-sync.ts.
--
-- Initial schema měl ean VARCHAR(13) UNIQUE NOT NULL — přepneme na nullable.
-- UNIQUE constraint zůstává; Postgres default NULLS DISTINCT povoluje více
-- NULL hodnot bez konfliktu.

ALTER TABLE products
  ALTER COLUMN ean DROP NOT NULL;

COMMENT ON COLUMN products.ean IS 'EAN-13 (případně UPC-A normalized na 13 chars přes leading 0). Nullable pro farm-direct / shop-internal produkty bez oficiálního GTIN.';

-- Index pro source_url lookup — používá lib/feed-sync.ts.ensureProduct fallback
-- match když produkt nemá validní EAN. Bez indexu by SELECT na source_url
-- skenoval celou tabulku denně × N produktů ve feedu.
CREATE INDEX IF NOT EXISTS idx_products_source_url ON products(source_url)
  WHERE source_url IS NOT NULL;
