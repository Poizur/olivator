-- Migration: Legalization status pro karanténní shopy (legalizační kampaň 2026-07)
-- Datum: 2026-07-27
-- Aplikovat přes: Supabase Dashboard → SQL Editor → Run

ALTER TABLE retailers
  ADD COLUMN IF NOT EXISTS legalization_status TEXT
    CHECK (legalization_status IN (
      'email_sent',
      'consented_free',
      'consented_affiliate',
      'declined',
      'no_response'
    )),
  ADD COLUMN IF NOT EXISTS legalization_status_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legalization_consent_ref TEXT;

-- Index pro filtrování v adminu (karanténa × kampaňový stav)
CREATE INDEX IF NOT EXISTS idx_retailers_legalization_status
  ON retailers (legalization_status)
  WHERE retailer_status = 'quarantine';

COMMENT ON COLUMN retailers.legalization_status IS
  'Stav legalizační kampaně: email_sent / consented_free / consented_affiliate / declined / no_response';
COMMENT ON COLUMN retailers.legalization_status_at IS
  'Datum poslední změny legalization_status (vyplňuje admin UI)';
COMMENT ON COLUMN retailers.legalization_consent_ref IS
  'Odkaz na soubor záznamu souhlasu v docs/legal/consents/, např. lozanocervenka-2026-07-28.md';
