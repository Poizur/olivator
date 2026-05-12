-- Welcome série queue
CREATE TABLE IF NOT EXISTS welcome_series_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES newsletter_signups(id) ON DELETE CASCADE,
  email_number  INTEGER NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent          BOOLEAN DEFAULT false,
  sent_at       TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_welcome_queue_pending
  ON welcome_series_queue(scheduled_for)
  WHERE sent = false;

-- Sezónní emaily kalendář
CREATE TABLE IF NOT EXISTS seasonal_emails (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_key            VARCHAR(50) UNIQUE NOT NULL,
  send_month           INTEGER NOT NULL,
  send_day             INTEGER NOT NULL,
  subject_template     TEXT NOT NULL,
  template_name        VARCHAR(50) NOT NULL,
  required_preference  VARCHAR(50),
  is_active            BOOLEAN DEFAULT true,
  last_sent_year       INTEGER
);

INSERT INTO seasonal_emails
  (email_key, send_month, send_day, subject_template, template_name, required_preference)
VALUES
  ('oct_harvest_start',   10, 15, 'Začíná sklizeň 🫒 — co očekávat letos',       'harvest-start',     'harvest'),
  ('nov_harvest_arrived', 11, 25, 'Letošní sklizeň dorazila — první test',        'harvest-arrived',   'harvest'),
  ('dec_gift_guide',      12,  5, 'Dárkový průvodce — olej jako dárek',           'gift-guide',        NULL),
  ('jan_fake_oils',        1, 15, 'Pozor na falšované oleje po Vánocích',          'fake-oils-warning', NULL),
  ('feb_best_of_winter',   2, 10, 'Best of zima — co se nejvíc vyplatilo',        'winter-recap',      'weekly'),
  ('mar_spring_oils',      3, 20, 'Jaro = lehčí jídla = jiné oleje',              'spring-oils',       'weekly'),
  ('may_nyiooc',           5, 20, 'NYIOOC výsledky 🏆 — světoví vítězové 2026',   'nyiooc-results',    NULL),
  ('jun_summer_salads',    6, 15, 'Letní saláty — pairing průvodce',              'summer-pairing',    'weekly'),
  ('sep_pre_harvest',      9, 10, 'Nové sklizňové ceny — co očekáváme',           'pre-harvest',       'harvest')
ON CONFLICT (email_key) DO NOTHING;
