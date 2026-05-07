-- Rozšíření radar_items o full-article content + náhledový obrázek + SEO metadata.
-- Detail stránka /novinky/[slug] zobrazí komplexnější český článek místo jen
-- 2-3 vět summary. Listing zachová czech_summary jako preview text.
--
-- Pravidla:
-- - slug UNIQUE (when not null) — SEO-friendly URL
-- - czech_article = 3-5 odstavců, ~400-600 slov
-- - image_url = Unsplash hero image, query topic-specific per článek
-- - meta_* = SEO tagy pro <head>

ALTER TABLE radar_items
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
  ADD COLUMN IF NOT EXISTS czech_article TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_alt TEXT,
  ADD COLUMN IF NOT EXISTS image_attribution TEXT,
  ADD COLUMN IF NOT EXISTS image_source_url TEXT,
  ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS radar_items_slug_idx
  ON radar_items(slug) WHERE slug IS NOT NULL;
