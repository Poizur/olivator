-- Availability note from reckonasbavi Complete export.
-- Stores the out-of-stock text (e.g. "Na cestě z Řecka — naskladníme 23.12.")
-- so product cards can show informative messages instead of a generic badge.
-- Nullable: null when product is in stock or text is unavailable.

ALTER TABLE product_offers
  ADD COLUMN IF NOT EXISTS availability_note TEXT;

COMMENT ON COLUMN product_offers.availability_note IS
  'Human-readable availability text from Complete export AVAILABILITY_OUT_OF_STOCK field. '
  'Null when in stock. Example: ''Na cestě z Řecka — naskladníme 23.12. / expedice od 30.12.''';
