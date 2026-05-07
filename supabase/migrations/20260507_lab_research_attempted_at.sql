-- Tracking kdy naposledy lab-research cron zkoušel dohledat data pro produkt.
-- NULL = ještě nezkoušel, NOT NULL = zkusil (data buď nalezl nebo ne).
-- UI rozliší: čeká na cron (NULL + brand web) vs. cron nezískal (NOT NULL + stále chybí).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS lab_research_attempted_at TIMESTAMPTZ;
