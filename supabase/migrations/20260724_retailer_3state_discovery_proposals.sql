-- Migration: Třístavový model prodejců + discovery_proposals tabulka
-- Datum: 2026-07-24
-- Autor: Architekt (Claude Code)
-- Aplikovat přes: Supabase Dashboard → SQL Editor → Run

-- 1. Přidat retailer_status a legal_basis do retailers
ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS retailer_status TEXT NOT NULL DEFAULT 'active'
    CHECK (retailer_status IN ('active', 'quarantine', 'removed_legal')),
  ADD COLUMN IF NOT EXISTS retailer_status_note TEXT,
  ADD COLUMN IF NOT EXISTS legal_basis TEXT;

-- 2. Backfill ze stávajícího is_active
UPDATE retailers SET retailer_status = 'active' WHERE is_active = true;
UPDATE retailers SET retailer_status = 'removed_legal',
  retailer_status_note = 'Žádost o odstranění dat, 7/2026. Bez nabídek, HARD_EXCLUDE v discovery-agent.'
  WHERE is_active = false AND slug = 'olivum';
UPDATE retailers SET retailer_status = 'quarantine'
  WHERE is_active = false AND slug <> 'olivum';

-- 3. DB constraint: legal_basis NOT NULL pro nové záznamy
-- Historické záznamy mohou mít NULL (není RETROAKTIVNÍ)
-- Vynucení na aplikační vrstvě (AdminRetailerForm) + API validation.
-- Poznámka: bez partial NOT NULL nelze snadno vynucovat jen pro INSERT bez UPDATE.
-- Doporučeno: CHECK constraint nebo trigger. Prozatím aplikační pojistka.

-- 4. Tabulka discovery_proposals
CREATE TABLE IF NOT EXISTS discovery_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_url TEXT NOT NULL,
  shop_name TEXT,
  domain TEXT,
  product_count_estimate INTEGER,
  source TEXT DEFAULT 'cron:discovery',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'ignored', 'added')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_discovery_proposals_status ON discovery_proposals (status);
CREATE INDEX IF NOT EXISTS idx_discovery_proposals_domain ON discovery_proposals (domain);

-- 5. RLS pro discovery_proposals (service role přístup)
ALTER TABLE discovery_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON discovery_proposals USING (true);
