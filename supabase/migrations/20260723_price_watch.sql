-- Price Watch: long-running per-product email alerts
-- Applied 2026-07-23 via Supabase dashboard (table already exists)

CREATE TABLE IF NOT EXISTS price_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_at_signup NUMERIC(10,2),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmation_token TEXT UNIQUE,
  consent_at TIMESTAMPTZ,
  consent_ip TEXT,
  last_notified_at TIMESTAMPTZ,
  last_notified_price NUMERIC(10,2),
  unsubscribe_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_watches_active ON price_watches(product_id) WHERE active = true AND confirmed = true;
CREATE INDEX IF NOT EXISTS idx_price_watches_unsub ON price_watches(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_price_watches_confirm ON price_watches(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_watches_email_confirmed ON price_watches(email) WHERE confirmed = true AND active = true;

ALTER TABLE price_watches ENABLE ROW LEVEL SECURITY;
