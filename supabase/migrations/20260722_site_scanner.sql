-- Site Scanner — nálezy UX/technických problémů z automatického průchodu webu.
-- Cron: pondělí + čtvrtek 04:00 UTC (0 4 * * 1,4).
-- Výstupy jdou do AI Ředitele (sekce "Co jsem našel na webu").

CREATE TABLE IF NOT EXISTS site_scan_findings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_run_id UUID NOT NULL,

  finding_type VARCHAR(50) NOT NULL,
  -- broken_image | zero_price | duplicate_name | empty_section
  -- repeated_product | missing_logo

  severity VARCHAR(10) NOT NULL
    CHECK (severity IN ('high', 'medium', 'low')),

  url     TEXT NOT NULL,    -- stránka kde byl nález
  element TEXT,             -- selektor / název prvku
  detail  TEXT NOT NULL,    -- lidský popis problému
  evidence TEXT,            -- HTTP status, hodnota, screenshot snippet

  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'ignored')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_run    ON site_scan_findings(scan_run_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON site_scan_findings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_type   ON site_scan_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_findings_open   ON site_scan_findings(created_at DESC)
  WHERE status = 'open';

ALTER TABLE site_scan_findings ENABLE ROW LEVEL SECURITY;
-- service role only (žádná anon/user RLS policy)
