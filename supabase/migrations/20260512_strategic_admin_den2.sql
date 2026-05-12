-- Den 2: Strategic Admin — content_calendar, keyword_mapping, strategy_goals, topic_ideas

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_week DATE NOT NULL,
  scheduled_priority INT DEFAULT 3,
  topic_type VARCHAR(50),
  primary_keyword VARCHAR(200),
  secondary_keywords TEXT[],
  suggested_title VARCHAR(300),
  suggested_angle TEXT,
  estimated_volume INT,
  competition_level VARCHAR(20),
  status VARCHAR(20) DEFAULT 'planned',
  related_article_id UUID,
  related_landing_page TEXT,
  notes TEXT,
  seasonal_context VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calendar_week ON content_calendar(scheduled_week);
CREATE INDEX IF NOT EXISTS idx_calendar_status ON content_calendar(status);

CREATE TABLE IF NOT EXISTS keyword_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(300) UNIQUE NOT NULL,
  search_volume INT,
  cpc_czk NUMERIC(6,2),
  competition_score INT,
  yoy_change_pct NUMERIC(6,2),
  intent VARCHAR(30),
  cluster_group VARCHAR(100),
  priority INT DEFAULT 3,
  status VARCHAR(30) DEFAULT 'unmapped',
  target_url TEXT,
  target_article_id UUID,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_keyword_volume ON keyword_mapping(search_volume DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_status ON keyword_mapping(status);
CREATE INDEX IF NOT EXISTS idx_keyword_cluster ON keyword_mapping(cluster_group);

CREATE TABLE IF NOT EXISTS strategy_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter VARCHAR(20) NOT NULL,
  goal_type VARCHAR(50),
  goal_name VARCHAR(200),
  target_value INT,
  current_value INT DEFAULT 0,
  unit VARCHAR(30),
  status VARCHAR(20) DEFAULT 'in_progress',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300),
  keyword VARCHAR(200),
  estimated_volume INT,
  angle TEXT,
  source VARCHAR(50),
  priority INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'suggested',
  scheduled_to_calendar_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed strategy_goals ───────────────────────────────────────────────────────

INSERT INTO strategy_goals (quarter, goal_type, goal_name, target_value, unit) VALUES
  ('Q1_2026', 'traffic',        'Unique visits/měsíc',     5000,  'visits'),
  ('Q1_2026', 'articles',       'Nových článků',           12,    'articles'),
  ('Q1_2026', 'landing_pages',  'Landing pages',           5,     'pages'),
  ('Q1_2026', 'brand_reviews',  'Brand recenzí',           3,     'articles'),
  ('Q1_2026', 'newsletter',     'Newsletter subscribers',  50,    'subs'),
  ('Q1_2026', 'revenue',        'Affiliate revenue/měsíc', 500,   'kc'),

  ('Q2_2026', 'traffic',        'Unique visits/měsíc',     15000, 'visits'),
  ('Q2_2026', 'articles',       'Nových článků',           12,    'articles'),
  ('Q2_2026', 'landing_pages',  'Landing pages',           5,     'pages'),
  ('Q2_2026', 'brand_reviews',  'Brand recenzí',           4,     'articles'),
  ('Q2_2026', 'pillar_pages',   'Pillar pages',            1,     'pages'),
  ('Q2_2026', 'newsletter',     'Newsletter subscribers',  200,   'subs'),
  ('Q2_2026', 'revenue',        'Affiliate revenue/měsíc', 3000,  'kc'),

  ('Q3_2026', 'traffic',        'Unique visits/měsíc',     30000, 'visits'),
  ('Q3_2026', 'articles',       'Nových článků',           12,    'articles'),
  ('Q3_2026', 'brand_reviews',  'Brand recenzí',           3,     'articles'),
  ('Q3_2026', 'pillar_pages',   'Pillar pages',            1,     'pages'),
  ('Q3_2026', 'newsletter',     'Newsletter subscribers',  500,   'subs'),
  ('Q3_2026', 'revenue',        'Affiliate revenue/měsíc', 8000,  'kc'),

  ('Q4_2026', 'traffic',        'Unique visits/měsíc',     50000, 'visits'),
  ('Q4_2026', 'articles',       'Nových článků',           12,    'articles'),
  ('Q4_2026', 'pillar_pages',   'Pillar pages',            1,     'pages'),
  ('Q4_2026', 'newsletter',     'Newsletter subscribers',  1000,  'subs'),
  ('Q4_2026', 'revenue',        'Affiliate revenue/měsíc', 15000, 'kc')
ON CONFLICT DO NOTHING;

-- ── Seed content_calendar (květen–prosinec 2026) ─────────────────────────────

INSERT INTO content_calendar (scheduled_week, scheduled_priority, topic_type, primary_keyword, suggested_title, estimated_volume, competition_level, seasonal_context) VALUES
  ('2026-05-12', 5, 'landing_page',  'olivový olej akce',          '/akce — Aktuální slevy',                    2400, 'low',    NULL),
  ('2026-05-19', 5, 'landing_page',  'řecký olivový olej',         '/regiony/recko — Expand',                   1950, 'low',    NULL),
  ('2026-05-26', 5, 'article',       'nejlepší olivový olej',       'Top 20 olejů 2026 — refresh',               1790, 'medium', NULL),

  ('2026-06-02', 4, 'article',       'olivový olej na vaření',      'Olivový olej do salátů — léto',             340,  'medium', 'summer'),
  ('2026-06-09', 4, 'article',       'extra panenský olivový olej', 'Extra panenský — kompletní průvodce',       1230, 'medium', NULL),
  ('2026-06-16', 4, 'article',       'bylinkové dressing',          'Bylinkové dressing — recepty',              200,  'low',    'summer'),
  ('2026-06-23', 4, 'brand_review',  'Lidl olivový olej',           'Lidl olej — recenze + alternativy',         370,  'low',    NULL),
  ('2026-06-30', 4, 'article',       'olivový olej na opalování',   'Olej na opalování — pravda',                360,  'medium', 'summer'),

  ('2026-07-07', 4, 'article',       'olivový olej kréta',          'Co přivézt z Kréty',                        460,  'medium', 'summer'),
  ('2026-07-14', 4, 'brand_review',  'Franz Josef olivový olej',    'Franz Josef — recenze',                     410,  'low',    NULL),
  ('2026-07-21', 4, 'article',       'italský olivový olej',        'Italský olej — průvodce',                   40,   'low',    NULL),
  ('2026-07-28', 4, 'landing_page',  'olivový olej zdraví',         '/zdravi — Health hub',                      1620, 'low',    NULL),

  ('2026-08-04', 4, 'article',       'olivový olej skladování',     'Skladování olejů — refresh',                80,   'low',    NULL),
  ('2026-08-11', 4, 'brand_review',  'Monini olivový olej',         'Monini — recenze',                          170,  'low',    NULL),
  ('2026-08-18', 4, 'article',       'olivový olej tapas',          'Tapas s olejem — recepty',                  100,  'low',    NULL),
  ('2026-08-25', 4, 'article',       'pre-harvest',                 'Co očekávat od letošní sklizně',            100,  'low',    'pre_harvest'),

  ('2026-09-01', 5, 'article',       'sklizeň olivového oleje',     'Sklizeň 2026 začíná!',                      200,  'low',    'harvest_start'),
  ('2026-09-08', 5, 'article',       'early harvest',               'Early harvest — co znamená',                150,  'low',    'harvest_start'),
  ('2026-09-15', 5, 'article',       'výroba olivového oleje',      'Výroba olivového oleje krok za krokem',     20,   'low',    'harvest'),
  ('2026-09-22', 5, 'pillar',        'olivový olej',                'Vše o olivovém oleji — Ultimate Guide',     2700, 'high',   NULL),
  ('2026-09-29', 5, 'brand_review',  'Borges olivový olej',         'Borges — recenze',                          60,   'low',    NULL),

  ('2026-10-06', 5, 'article',       'čerstvý olivový olej',        'Jak poznat čerstvý olej',                   50,   'low',    'new_harvest'),
  ('2026-10-13', 5, 'article',       'BIO olivový olej',            'BIO — co to znamená',                       120,  'low',    NULL),
  ('2026-10-20', 5, 'brand_review',  'Tesco olivový olej',          'Tesco — recenze',                           60,   'low',    NULL),
  ('2026-10-27', 5, 'article',       'olivový olej pro miminka',    'Olej pro miminka — pravda',                 20,   'low',    NULL),

  ('2026-11-03', 5, 'landing_page',  'olivový olej akce',           '/akce — refresh + black friday',            2400, 'low',    'black_friday'),
  ('2026-11-10', 5, 'article',       'olivový olej dárek',          'Olej jako dárek — průvodce',                100,  'low',    'christmas'),
  ('2026-11-17', 5, 'pillar',        'jak vybrat olivový olej',     'Jak kupovat olej — Pillar',                 340,  'medium', NULL),
  ('2026-11-24', 5, 'brand_review',  'Bertolli',                    'Bertolli — recenze',                        20,   'low',    NULL),

  ('2026-12-01', 5, 'article',       'olivový olej vánoce',         'Vánoční vaření s EVOO',                     50,   'low',    'christmas'),
  ('2026-12-08', 5, 'landing_page',  'olivový olej dárek',          'Top oleje k Vánocům',                       100,  'low',    'christmas'),
  ('2026-12-15', 4, 'article',       'olivový olej recenze',        'Year in review — nejlepší 2026',            20,   'low',    'year_end'),
  ('2026-12-22', 3, 'refresh',       'top 10 článků',               'Refresh top 10 článků',                     NULL, NULL,     NULL)
ON CONFLICT DO NOTHING;
