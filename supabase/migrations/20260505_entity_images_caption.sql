-- Photo curator — admin UI bude zobrazovat fotky s captiony + dropdownem
-- pro reassign role (Hero / Story 1 / Story 2 / Filozofie / Galerie / Skrýt).
--
-- caption     — 1-věta CZ popis fotky (Claude Haiku Vision)
-- subject     — pomocná kategorie pro auto-assign: 'person', 'product',
--               'landscape', 'process', 'logo', 'building', 'ingredient'
-- suggested_role — auto-vyhodnocená role z subject + kontextu, admin může
--               přepsat změnou image_role
ALTER TABLE entity_images
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS subject VARCHAR(20),
  ADD COLUMN IF NOT EXISTS suggested_role VARCHAR(20);

COMMENT ON COLUMN entity_images.caption IS
  'AI-generovaný 1-věta CZ popis fotky pro admin curator UI.';
COMMENT ON COLUMN entity_images.subject IS
  'Auto-tag: person | product | landscape | process | logo | building | ingredient.';
COMMENT ON COLUMN entity_images.suggested_role IS
  'AI-doporučená image_role (default při insert). Admin může přepsat změnou image_role.';
