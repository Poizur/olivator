-- Newsletter signups — emaily pro 'Olej měsíce' newsletter (CLAUDE.md sec 5).
-- Single opt-in pro start, double opt-in přidáme až bude potřeba.

CREATE TABLE IF NOT EXISTS newsletter_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50),                  -- 'footer' / 'homepage' / 'product_page'
  market CHAR(5) DEFAULT 'CZ',
  ip_hash VARCHAR(64),
  user_agent TEXT,
  confirmed BOOLEAN DEFAULT true,      -- TODO: double opt-in v budoucnu
  unsubscribed BOOLEAN DEFAULT false,
  resend_contact_id VARCHAR(64),       -- ID v Resend Audiences (pokud sync proběhne)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_signups (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_created ON newsletter_signups (created_at DESC);
