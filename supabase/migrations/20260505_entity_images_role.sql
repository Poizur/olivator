-- Image role — odliš logo (square, transparent BG, kontejnerové zobrazení)
-- od hero / gallery (krajinné, plná šíře, object-cover).
--
-- Důvod: brand auto-research dosud ukládal logo s is_primary=true a sort_order=0
-- → na detailu značky se pak logo cropovalo jako landscape hero (vypadalo
-- hrozně), na homepage kartě stejně. S image_role rozlišíme render mode.
--
-- Hodnoty:
--   logo      — značkové logo, render contain + bílé pozadí
--   hero      — wide landscape hero (top of detail page)
--   editorial — fotka v ## sekci editorial story
--   gallery   — atmosférická fotka v galerii (producent, výroba, místa)

ALTER TABLE entity_images
  ADD COLUMN IF NOT EXISTS image_role VARCHAR(20) NOT NULL DEFAULT 'gallery'
  CHECK (image_role IN ('logo', 'hero', 'editorial', 'gallery'));

-- Backfill: dosud uložená brand loga (source='auto_research') byly všechna
-- loga — označ je. Ostatní entity_images zůstanou na default 'gallery'.
UPDATE entity_images
SET image_role = 'logo'
WHERE entity_type = 'brand'
  AND source = 'auto_research'
  AND is_primary = true;

CREATE INDEX IF NOT EXISTS idx_entity_images_role
  ON entity_images(entity_type, entity_id, image_role);

COMMENT ON COLUMN entity_images.image_role IS
  'Rozlišuje render: logo (contain+white bg) vs hero/gallery (cover landscape).';
