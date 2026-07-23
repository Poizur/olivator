-- Měsíční cenový index olivových olejů ČR
-- Každý řádek = jeden segment (all/economy/standard/premium/origin:XX) v jednom měsíci.
-- Výpočet: medián Kč/l z nejlevnější in-stock nabídky per produkt, EVOO/virgin pouze.

CREATE TABLE price_index_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL,               -- 'YYYY-MM'
  segment VARCHAR(50) NOT NULL,            -- 'all', 'economy', 'standard', 'premium', 'origin:GR', 'origin:IT', 'origin:ES'
  median_czk_l NUMERIC(10,2) NOT NULL,
  avg_czk_l NUMERIC(10,2) NOT NULL,
  product_count INTEGER NOT NULL,
  retailer_count INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,                              -- metodická poznámka (zdroj dat, omezení)
  UNIQUE(month, segment)
);

CREATE INDEX idx_price_index_month ON price_index_snapshots(month DESC);

ALTER TABLE price_index_snapshots ENABLE ROW LEVEL SECURITY;
