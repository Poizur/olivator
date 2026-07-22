-- Re-price: sledování po sobě jdoucích 404 odpovědí per offer.
-- Po 2× consecutive 404 → in_stock=false (dočasný výpadek ≠ smazaný produkt).
ALTER TABLE product_offers ADD COLUMN IF NOT EXISTS consecutive_404 INTEGER DEFAULT 0;
