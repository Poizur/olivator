-- Decision→Executor bridge: executor_rule kolona v týdenních rozhodnutích.
-- Sonnet self-anotuje která rozhodnutí smí Executor provést automaticky po admin ANO.
-- Dvojitá validace v /api/admin/brief/decision: enum + RULE_CATEGORY_MAP + AUTO_WHITELIST.
ALTER TABLE weekly_decisions
  ADD COLUMN IF NOT EXISTS executor_rule VARCHAR(50);
-- Hodnoty: 'fix_affiliate_url' | 'recalc_score' | NULL (žádná auto-akce)
