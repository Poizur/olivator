-- Lead magnet: double opt-in + GDPR consent logging + PDF tracking + drip queue.
-- Rozšiřuje stávající newsletter_signups (single opt-in) o potvrzovací flow.
-- Po lead_magnet signup: confirmed=false + confirmation_token → email s linkem
-- → /api/newsletter/confirm → confirmed=true + consent_at + drip zařazen.

-- ── 1. Rozšíření newsletter_signups ────────────────────────────────────────

ALTER TABLE newsletter_signups
  ADD COLUMN IF NOT EXISTS confirmation_token  VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS consent_text        TEXT,          -- znění souhlasu (pro GDPR audit)
  ADD COLUMN IF NOT EXISTS consent_at          TIMESTAMPTZ,   -- kdy klikl "Potvrdit"
  ADD COLUMN IF NOT EXISTS consent_ip          VARCHAR(64),   -- IP při potvrzení (hashed SHA-256)
  ADD COLUMN IF NOT EXISTS pdf_sent_at         TIMESTAMPTZ;   -- kdy byl odeslán PDF průvodce

-- Index pro rychlé lookups confirmation tokenu (URL param)
CREATE INDEX IF NOT EXISTS idx_newsletter_confirmation_token
  ON newsletter_signups (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- ── 2. Email drip queue (lead magnet série) ────────────────────────────────
-- Každý subscriber dostane 4 emaily dle harmonogramu:
--   email_number 0  = ihned po potvrzení (PDF průvodce)
--   email_number 1  = +3 dny ("3 nejčastější chyby")
--   email_number 2  = +7 dní ("Který olej pro který účel")
--   email_number 3  = +14 dní ("Aktuální slevy" — live data z re-price)

CREATE TABLE IF NOT EXISTS email_drip_queue (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id  UUID        NOT NULL REFERENCES newsletter_signups(id) ON DELETE CASCADE,
  series         VARCHAR(20) NOT NULL DEFAULT 'lead_magnet'
                             CHECK (series IN ('lead_magnet')),
  email_number   INTEGER     NOT NULL CHECK (email_number BETWEEN 0 AND 10),
  scheduled_at   TIMESTAMPTZ NOT NULL,
  sent_at        TIMESTAMPTZ,
  status         VARCHAR(20) DEFAULT 'pending'
                             CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subscriber_id, series, email_number)
);

CREATE INDEX IF NOT EXISTS idx_email_drip_pending
  ON email_drip_queue (scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_drip_subscriber
  ON email_drip_queue (subscriber_id);
