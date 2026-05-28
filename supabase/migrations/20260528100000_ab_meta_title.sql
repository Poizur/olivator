-- A/B testing pro meta_title: alternativní variant pro top produkty.
-- Spusť dle standardní migrace přes: supabase db push NEBO Supabase dashboard > SQL Editor.
-- Vrátit: ALTER TABLE products DROP COLUMN meta_title_alt;

ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title_alt VARCHAR(70);

COMMENT ON COLUMN products.meta_title_alt IS 'Alternativní meta title pro A/B test CTR v GSC. Přepínej admin UI, sleduj CTR 28 dní.';
