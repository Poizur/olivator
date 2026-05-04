-- Olivator Cenový widget — velkoobchodní ceny EVOO ze světových trhů.
-- Zdroj: International Olive Council (IOC) měsíční report.
-- Aktualizace: admin manuálně 1× týdně (pátek po IOC release) — scraper odložen.
-- Public widget na homepage zobrazuje top 5 trhů.

CREATE TABLE IF NOT EXISTS market_prices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market       VARCHAR(100) NOT NULL,          -- 'Jaén (Španělsko)', 'Bari (Itálie)'
  price_eur    DECIMAL(10, 2) NOT NULL,         -- EUR / 100 kg
  change_pct   DECIMAL(6, 2),                   -- % oproti minulému týdnu (záporné = pokles)
  week_of      DATE NOT NULL,                   -- '2026-04-28' — pondělí týdne
  source       VARCHAR(50) DEFAULT 'IOC',
  source_url   TEXT,                            -- odkaz na konkrétní report
  is_published BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,               -- na webu zobrazujeme podle sort_order
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_prices_week
  ON market_prices(week_of DESC, sort_order) WHERE is_published = true;

-- Seed: poslední IOC report (uživatel může smazat / přepsat v adminu).
INSERT INTO market_prices (market, price_eur, change_pct, week_of, source, source_url, sort_order) VALUES
  ('Jaén (Španělsko)',  407.00, -2.5,  '2026-04-28', 'IOC',
   'https://www.internationaloliveoil.org/olive-sector-statistics-january-february-2026/', 1),
  ('Bari (Itálie)',     650.00, -30.9, '2026-04-28', 'IOC',
   'https://www.internationaloliveoil.org/olive-sector-statistics-january-february-2026/', 2),
  ('Chania (Řecko)',    465.00, -6.0,  '2026-04-28', 'IOC',
   'https://www.internationaloliveoil.org/olive-sector-statistics-january-february-2026/', 3)
ON CONFLICT DO NOTHING;
