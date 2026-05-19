-- Featured brands — označí top 10 značek pro prominentní sekci na homepage.
-- is_featured = true → zobrazit; featured_order = pořadí 1–10.

ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS featured_order INT;

CREATE INDEX IF NOT EXISTS idx_brands_featured
  ON brands(featured_order)
  WHERE is_featured = true;

COMMENT ON COLUMN brands.is_featured IS 'True = zobrazit v sekci Top značky na homepage.';
COMMENT ON COLUMN brands.featured_order IS 'Pořadí v sekci Top značky (1 = první). NULL pokud není featured.';
