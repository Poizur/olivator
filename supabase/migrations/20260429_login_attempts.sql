-- Login attempts log pro rate-limiting / lockout admin loginu.
-- Každý pokus (úspěšný i neúspěšný) je zaznamenán s IP hashí.
-- Při 5 neúspěšných pokusech z jedné IP do 15 min → lockout 15 min.

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash VARCHAR(64) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pro rychlý lookup recentních pokusů per IP
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON admin_login_attempts(ip_hash, attempted_at DESC);

-- Cleanup index — záznamy starší než 24h smažeme periodicky
CREATE INDEX IF NOT EXISTS idx_login_attempts_cleanup
  ON admin_login_attempts(attempted_at);

COMMENT ON TABLE admin_login_attempts IS 'Audit log + rate-limit pro /api/admin/login. Cleanup po 24h.';
