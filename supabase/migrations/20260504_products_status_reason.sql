-- Když admin nebo automat změní status produktu (inactive / excluded),
-- chceme vědět DŮVOD a KDO. Bez toho admin v listingu vidí jen „neaktivní"
-- bez kontextu — a netuší jestli je to systémová anomálie nebo vlastní volba.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status_reason_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS status_reason_note TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_by VARCHAR(20),
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN products.status_reason_code IS
  'Strojový kód důvodu (filtrovatelné v UI). Např. url_404, out_of_stock, duplicate, low_quality, wrong_category, custom.';
COMMENT ON COLUMN products.status_reason_note IS
  'Volitelný free-text důvod (admin custom nebo detail z auto-systému). Zobrazuje se v listingu pod jménem produktu.';
COMMENT ON COLUMN products.status_changed_by IS
  '''admin'' = ručně přes admin UI; ''auto'' = systémové změny (link-rot-checker, scraper apod.).';
COMMENT ON COLUMN products.status_changed_at IS
  'Kdy proběhla poslední změna statusu — užitečné pro auditní stopu.';
