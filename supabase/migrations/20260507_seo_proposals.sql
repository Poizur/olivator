-- Návrhy oprav z denního auditu — admin schvaluje co se má opravit.
-- Filozofie: nic se neopravuje samo (kromě deterministicky bezpečných věcí
-- v auto-audit). Ostatní = návrh do dashboardu, admin klikne Schválit/Ignorovat.

CREATE TABLE IF NOT EXISTS seo_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT NOW(),

  rule_id VARCHAR(60) NOT NULL,
  severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),

  target_type VARCHAR(30) NOT NULL,
  target_id UUID,
  target_slug VARCHAR(255),
  target_label VARCHAR(255),

  title TEXT NOT NULL,
  reason TEXT,
  suggested_action JSONB DEFAULT '{}',
  preview JSONB DEFAULT '{}',

  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'dismissed', 'applied', 'failed')),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  metadata JSONB DEFAULT '{}',

  UNIQUE (rule_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS seo_proposals_status_idx ON seo_proposals(status);
CREATE INDEX IF NOT EXISTS seo_proposals_rule_idx ON seo_proposals(rule_id);
CREATE INDEX IF NOT EXISTS seo_proposals_severity_idx ON seo_proposals(severity, detected_at DESC);
