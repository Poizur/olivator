-- Quality Audit Agent — meta-learning system that records issues found
-- across products. Each lesson learned becomes a rule. Each new product
-- automatically checked against all rules. Auto-fixed where possible.

-- 1. Quality rules — definition of what we check
-- Rules are mostly hardcoded in lib/quality-rules.ts (so we can use real
-- functions for detection/fix), but this table is the runtime registry
-- so admin can disable/enable + see them all in /admin/quality.
CREATE TABLE IF NOT EXISTS quality_rules (
  rule_id VARCHAR(100) PRIMARY KEY, -- e.g. 'low_score_for_evoo'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  category VARCHAR(50), -- 'data_quality' | 'content' | 'legal' | 'seo' | 'image'
  has_auto_fix BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Issues found per product
CREATE TABLE IF NOT EXISTS quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rule_id VARCHAR(100) NOT NULL REFERENCES quality_rules(rule_id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'auto_fixed', 'resolved', 'ignored')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(100),
  auto_fix_attempted BOOLEAN DEFAULT false,
  auto_fix_succeeded BOOLEAN,
  -- One issue per (product, rule, status=open) — avoid spam if rule keeps firing
  UNIQUE (product_id, rule_id, status)
);

CREATE INDEX IF NOT EXISTS idx_quality_issues_status_severity
  ON quality_issues(status, severity, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_quality_issues_product
  ON quality_issues(product_id);

-- 3. Seed initial rules (idempotent)
INSERT INTO quality_rules (rule_id, name, description, severity, category, has_auto_fix) VALUES
  ('low_score_for_valid_evoo',
    'Nízké Score u kvalitního EVOO',
    'EVOO s acidity ≤ 0.4% by mělo dostat alespoň 30 bodů Score. Pravděpodobně chybí acidity v DB nebo špatně extrahovaná.',
    'warning', 'data_quality', true),

  ('missing_acidity_with_text',
    'Chybí acidity, přitom text ji obsahuje',
    'V raw_description se zmiňuje kyselost (např. "0,32%"), ale acidity field je null. Re-extrakce.',
    'warning', 'data_quality', true),

  ('description_too_short',
    'Krátký dlouhý popis',
    'description_long má méně než 250 slov. Pro SEO long-tail je potřeba více.',
    'warning', 'content', true),

  ('description_missing',
    'Chybí popis úplně',
    'Produkt nemá AI vygenerovaný description_long. Musí se spustit content agent.',
    'error', 'content', true),

  ('image_missing',
    'Chybí hlavní obrázek',
    'Produkt nemá image_url. Bez obrázku nedává smysl ho mít na webu.',
    'error', 'image', false),

  ('image_external_cdn',
    'Obrázek na cizím CDN',
    'image_url ukazuje na e-shop CDN (cdn.myshoptet.com). Měli bychom mít vlastní kopii v Supabase Storage.',
    'warning', 'image', true),

  ('bio_claim_without_cert',
    'Bio claim bez certifikace',
    'description_long zmiňuje "bio" / "organic" / "ekologický", ale certifications neobsahuje bio. Klamavá reklama (EU 2018/848).',
    'error', 'legal', false),

  ('inactive_with_offers',
    'Draft produkt s nabídkami',
    'Produkt je status=draft ale má product_offers. Pravděpodobně se zapomnělo publikovat.',
    'warning', 'data_quality', false),

  ('no_offers',
    'Žádné nabídky prodejců',
    'Produkt nemá žádný product_offer → uživatel nemůže koupit. Discovery by měl jeden vytvořit.',
    'warning', 'data_quality', false),

  ('source_url_missing',
    'Chybí source_url',
    'Bez source_url nelze automaticky rescrape ani price update.',
    'info', 'data_quality', false)
ON CONFLICT (rule_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  severity = EXCLUDED.severity,
  category = EXCLUDED.category,
  has_auto_fix = EXCLUDED.has_auto_fix,
  updated_at = NOW();
