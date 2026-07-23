-- Olík conversations log — anonymní záznamy dotazů na AI sommelier.
-- Žádné PII — emaily a telefony jsou maskovány před zápisem v API route.
-- GDPR: session_id je anonymní UUID generované na klientovi.

CREATE TABLE IF NOT EXISTS olik_conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   VARCHAR(36),
  query        TEXT NOT NULL,
  response_summary TEXT,
  recommended_slugs TEXT[] DEFAULT '{}',
  source_page  VARCHAR(200),
  tokens_used  INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_olik_conversations_created
  ON olik_conversations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_olik_conversations_session
  ON olik_conversations (session_id);

COMMENT ON TABLE olik_conversations IS
  'Anonymní log dotazů na Olíka (AI sommelier). Emaily/telefony v query jsou maskovány.';
