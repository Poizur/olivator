-- Rankings (žebříčky) — migrace ze static lib/static-content.ts do DB.
-- Důvod: admin může měnit pořadí + popis bez deploye, nové žebříčky se přidají
-- za pár kliknutí, dynamické queries přes filtr expression.
--
-- Backwards compat: dokud není migrace plně dokončená, /zebricek/[slug] stále
-- používá static fallback. V Fáze 4 update.

CREATE TABLE IF NOT EXISTS rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) UNIQUE NOT NULL,

  -- Display
  title VARCHAR(200) NOT NULL,
  description TEXT,
  emoji VARCHAR(8),
  hero_image_url TEXT,

  -- Categorization
  category VARCHAR(40) DEFAULT 'general'
    CHECK (category IN ('general', 'budget', 'premium', 'bio', 'origin', 'cultivar', 'use_case')),

  -- Manual list of products (slugs) — drží stabilní pořadí. Admin si může pinned
  -- list updatovat z UI bez code change. Délka 1-50 obvykle.
  product_slugs TEXT[] DEFAULT '{}',

  -- Optional: dynamic filter pro auto-populate. Pokud product_slugs prázdné,
  -- použije se filter. Příklad: {"price_max": 200, "type": "evoo", "limit": 10}
  filter_query JSONB DEFAULT '{}',

  -- SEO
  meta_title VARCHAR(70),
  meta_description VARCHAR(200),

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  position INTEGER DEFAULT 100,  -- pro pořadí v /zebricek listing

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rankings_slug ON rankings(slug);
CREATE INDEX IF NOT EXISTS idx_rankings_status ON rankings(status);
CREATE INDEX IF NOT EXISTS idx_rankings_position ON rankings(position);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION rankings_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rankings_updated_at ON rankings;
CREATE TRIGGER rankings_updated_at
  BEFORE UPDATE ON rankings
  FOR EACH ROW
  EXECUTE FUNCTION rankings_updated_at_trigger();

-- ── SEED — migrace 5 stávajících rankings ze static-content.ts ──────────────

INSERT INTO rankings (slug, title, description, emoji, category, product_slugs, status, position) VALUES
(
  'nejlepsi-olivovy-olej-2025',
  'Nejlepší olivový olej 2025',
  'Top 8 olejů dle Olivator Score',
  '🏆',
  'general',
  ARRAY[
    'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l',
    'evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml',
    'sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-1-l',
    'corinto-pelopones-bio-extra-panensky-olivovy-olej-0-4-5-l',
    'pallada-kreta-extra-panensky-olivovy-olej-500-ml',
    'intini-coratina-alberobello-extra-panensky-olivovy-olej-500-ml',
    'evoilino-korfu-bio-extra-panensky-olivovy-olej-500-ml',
    'orino-extra-panensky-olivovy-olej-bio-500-ml'
  ],
  'active',
  10
),
(
  'nejlepsi-recky-olej',
  'Nejlepší řecký olivový olej',
  'Top řecké oleje — Kréta, Peloponés, Korfu. Většinou s DOP certifikací.',
  '🇬🇷',
  'origin',
  ARRAY[]::TEXT[],
  'active',
  20
),
(
  'nejlepsi-bio-olej',
  'Nejlepší bio olivový olej',
  'BIO certifikované oleje seřazené dle Score',
  '🌿',
  'bio',
  ARRAY[]::TEXT[],
  'active',
  30
),
(
  'nejlepsi-italsky-olej',
  'Nejlepší italský olivový olej',
  'Top italské oleje — Apulie, Toskánsko. Charakteristická chuť, vysoké polyfenoly.',
  '🇮🇹',
  'origin',
  ARRAY[]::TEXT[],
  'active',
  40
),
(
  'nejlepsi-vysokopolyfenolovy-olej',
  'Nejlepší vysokopolyfenolové oleje',
  'Oleje s obsahem polyfenolů nad 500 mg/kg — funkční elixíry s nejvyšším antioxidačním potenciálem.',
  '⚗️',
  'general',
  ARRAY[]::TEXT[],
  'active',
  50
),
-- ── 8 nových žebříčků ───────────────────────────────────────────────────────
(
  'nejlepsi-olivovy-olej-do-200-kc',
  'Nejlepší olivový olej do 200 Kč',
  'Kvalitní EVOO za rozumnou cenu — pro každodenní vaření i salát.',
  '💰',
  'budget',
  ARRAY[]::TEXT[],
  'active',
  60
),
(
  'nejlepsi-olivovy-olej-do-300-kc',
  'Nejlepší olivový olej do 300 Kč',
  'Sweet spot pro většinu domácností. Top picks v cenovém segmentu 200-300 Kč.',
  '💰',
  'budget',
  ARRAY[]::TEXT[],
  'active',
  70
),
(
  'nejlepsi-olivovy-olej-do-500-kc',
  'Nejlepší olivový olej do 500 Kč',
  'Premium pásmo, kde už očekáváš skutečnou kvalitu — early harvest, single estate.',
  '💎',
  'premium',
  ARRAY[]::TEXT[],
  'active',
  80
),
(
  'nejlepsi-premiovy-olivovy-olej',
  'Nejlepší prémiový olivový olej (>500 Kč/L)',
  'Pro gourmet pokrmy a dárky — single estate, early harvest, NYIOOC vítězové.',
  '👑',
  'premium',
  ARRAY[]::TEXT[],
  'active',
  90
),
(
  'nejlepsi-bio-recky-olej',
  'Nejlepší bio řecký olivový olej',
  'Průnik dvou kvalit: BIO certifikace + řecký terroir. Většinou Koroneiki.',
  '🌿',
  'bio',
  ARRAY[]::TEXT[],
  'active',
  100
),
(
  'nejlepsi-dop-olivovy-olej',
  'Nejlepší DOP olivový olej',
  'Chráněné označení původu — geograficky vázané, traditional method.',
  '✓',
  'general',
  ARRAY[]::TEXT[],
  'active',
  110
),
(
  'nejlepsi-olivovy-olej-na-salat',
  'Nejlepší olivový olej do salátu',
  'Intenzivní profil, vysoké polyfenoly, pikantní/hořké tóny — finishing oil.',
  '🥗',
  'use_case',
  ARRAY[]::TEXT[],
  'active',
  120
),
(
  'nejlepsi-olivovy-olej-na-vareni',
  'Nejlepší olivový olej na vaření',
  'Vyvážený profil pro každodenní kuchyni, dobrá tepelná stabilita.',
  '🍳',
  'use_case',
  ARRAY[]::TEXT[],
  'active',
  130
)
ON CONFLICT (slug) DO NOTHING;
