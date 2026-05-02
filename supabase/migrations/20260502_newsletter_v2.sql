-- Newsletter v2: preference picker + drafts + tracking + price alerts.
-- Strategie: interest-based segmentation (user vybere co ho zajímá),
-- automatický draft generator → human approval → Resend send → tracking.

-- ── 1. Subscriber preferences + unsub token ────────────────────────────────
ALTER TABLE newsletter_signups
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
    "weekly": true,
    "deals": true,
    "harvest": false,
    "alerts": false
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMPTZ;

-- Pro existující řádky vygeneruj token (jednorázově)
UPDATE newsletter_signups
SET unsubscribe_token = encode(gen_random_bytes(32), 'hex')
WHERE unsubscribe_token IS NULL;

-- Future inserts: token vytvoří app, ne DB. Necháváme bez NOT NULL pro
-- backward compat se starými signupy.

CREATE INDEX IF NOT EXISTS idx_newsletter_unsub_token
  ON newsletter_signups (unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_newsletter_preferences_gin
  ON newsletter_signups USING GIN (preferences);


-- ── 2. Newsletter drafts (auto-generované, čekají na schválení) ────────────
CREATE TABLE IF NOT EXISTS newsletter_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Typ kampaně určuje koho oslovíme (preference filter)
  campaign_type VARCHAR(32) NOT NULL
    CHECK (campaign_type IN ('weekly', 'deals', 'harvest', 'alert')),
  subject VARCHAR(200) NOT NULL,
  preheader VARCHAR(200),
  -- HTML email body (pre-rendered z React Email)
  html_body TEXT NOT NULL,
  -- Plain text fallback
  text_body TEXT,
  -- Metadata: jaké bloky se použily, debug info
  blocks JSONB DEFAULT '[]'::jsonb,
  -- Generování + schválení
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'sending', 'sent', 'failed', 'archived')),
  -- Filtrování příjemců (kteří uživatelé dostanou tuto kampaň)
  audience_filter JSONB DEFAULT '{}'::jsonb,
  recipient_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_status
  ON newsletter_drafts (status, generated_at DESC);


-- ── 3. Newsletter sends (1 řádek per email per recipient) ──────────────────
-- Pro tracking + attribution. Resend zatím posílá hromadně přes Broadcasts;
-- my logujeme co bylo poslané + Resend message_id pro webhook tracking.
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES newsletter_drafts(id) ON DELETE CASCADE,
  signup_id UUID REFERENCES newsletter_signups(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  resend_message_id VARCHAR(64),  -- Resend ID pro webhook matching
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'complained', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  first_clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_draft
  ON newsletter_sends (draft_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_resend
  ON newsletter_sends (resend_message_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_signup
  ON newsletter_sends (signup_id);


-- ── 4. Newsletter events (open, click — z Resend webhooks) ─────────────────
-- Granular events. Sends.opened_at je just first event, tato tabulka má vše.
CREATE TABLE IF NOT EXISTS newsletter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID REFERENCES newsletter_sends(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL
    CHECK (event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'complained')),
  -- Pro click: která URL byla kliknutá
  link_url TEXT,
  -- Pro click: který blok v emailu (utm_content)
  block_id VARCHAR(40),
  user_agent TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_events_send
  ON newsletter_events (send_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_type
  ON newsletter_events (event_type, occurred_at DESC);


-- ── 5. Price alerts (per-user subscription na konkrétní olej) ──────────────
-- Triggered emaily — sebestačný feature mimo weekly newsletter.
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id UUID REFERENCES newsletter_signups(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_slug VARCHAR(255) NOT NULL,
  -- Threshold: trigger pokud cena klesne pod tuto hodnotu (CZK)
  threshold_price DECIMAL(10,2) NOT NULL,
  -- Auto-detect threshold: pokud user nezadal, použijeme aktuální cenu * 0.9
  auto_threshold BOOLEAN DEFAULT false,
  -- Snapshot ceny při vytvoření alertu (referenční bod)
  reference_price DECIMAL(10,2),
  -- Stav alertu
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'triggered', 'paused', 'expired')),
  -- Když se trigger splní → posíláme email + status='triggered'
  triggered_at TIMESTAMPTZ,
  triggered_price DECIMAL(10,2),
  -- Konfigurovatelné: jen prvni trigger nebo opakovaně
  one_time BOOLEAN DEFAULT true,
  unsubscribe_token VARCHAR(64) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '180 days')
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_active
  ON price_alerts (status, product_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_price_alerts_email
  ON price_alerts (email);
CREATE INDEX IF NOT EXISTS idx_price_alerts_token
  ON price_alerts (unsubscribe_token);
