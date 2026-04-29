-- regions.map_image_url — admin nahraje URL na obrázek mapy regionu
-- (Wikimedia Commons SVG, vlastní upload, atd.). RegionMap komponent ji
-- preferuje před hand-drawn SVG fallbackem v lib/region-maps.ts.

ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS map_image_url TEXT;

COMMENT ON COLUMN regions.map_image_url IS
  'URL obrázku mapy regionu (SVG/PNG). Když je vyplněno, RegionMap ho zobrazí místo zjednodušené SVG silhouette.';
