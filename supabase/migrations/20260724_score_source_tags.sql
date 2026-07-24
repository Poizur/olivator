-- Score transparentnost: zdroj kyselosti a polyfenolů
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS acidity_source VARCHAR(30) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS polyphenols_source VARCHAR(30) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS source_note TEXT;

-- Backfill: vše existující → 'unknown' (data pocházejí ze scrapu, zdroj neznámý)
UPDATE products
SET
  acidity_source = 'unknown',
  polyphenols_source = 'unknown'
WHERE acidity_source IS NULL OR polyphenols_source IS NULL;

COMMENT ON COLUMN products.acidity_source IS 'label|tech_sheet|retailer_page|unknown — odkud pochází hodnota kyselosti';
COMMENT ON COLUMN products.polyphenols_source IS 'label|tech_sheet|retailer_page|unknown — odkud pochází hodnota polyfenolů';
COMMENT ON COLUMN products.source_note IS 'Volný text — URL tech listu, jméno dokumentu, datum ověření';
