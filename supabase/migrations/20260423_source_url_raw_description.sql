-- Add source URL and raw scrape text so AI rewrite never reads its own output.
-- Fixes feedback loop where description_long (AI text) was used as "raw source"
-- for subsequent rewrites and fact extraction.

ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS raw_description TEXT;

COMMENT ON COLUMN products.source_url IS 'Original URL from which product was imported. Used for rescraping + attribution.';
COMMENT ON COLUMN products.raw_description IS 'Untouched scraped description text from source e-shop. Never overwritten by AI. Used as source-of-truth for AI rewrite + fact extraction.';
