-- partner_inquiries: poptávky na zařazení do katalogu (formulář /pro-prodejce)
CREATE TABLE IF NOT EXISTS partner_inquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name   TEXT NOT NULL,
  web_url     TEXT NOT NULL,
  email       TEXT NOT NULL,
  feed_url    TEXT,
  message     TEXT,
  consent     BOOLEAN NOT NULL DEFAULT true,
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'contacted', 'approved', 'rejected', 'duplicate')),
  notes       TEXT,
  retailer_id UUID REFERENCES retailers(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_inquiries_status_idx ON partner_inquiries (status);
CREATE INDEX IF NOT EXISTS partner_inquiries_created_idx ON partner_inquiries (created_at DESC);

COMMENT ON TABLE partner_inquiries IS 'Poptávky prodejců přes /pro-prodejce. Human gate — nic se neaktivuje automaticky.';
