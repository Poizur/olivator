-- Recipes DB — strukturovaná tabulka pro recepty.
-- Před: hardcoded v lib/static-content.ts + lib/article-bodies.ts (drag-deploy).
-- Po: editovatelné v adminu, generovatelné AI, propojené s entitami v DB.

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Display metadata
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  emoji VARCHAR(8),
  read_time VARCHAR(20),                 -- "3 min čtení"
  hero_image_url TEXT,

  -- Recipe specifics (SEO Recipe schema-ready)
  prep_time_min INTEGER,                 -- Minuty přípravy
  cook_time_min INTEGER,                 -- Minuty vaření (0 pokud raw)
  servings INTEGER,                      -- Počet porcí
  difficulty VARCHAR(20)                 -- 'easy' | 'medium' | 'hard'
    CHECK (difficulty IN ('easy', 'medium', 'hard') OR difficulty IS NULL),
  cuisine VARCHAR(50),                   -- 'italian' | 'greek' | 'spanish' | 'czech' …

  -- Strukturovaný obsah (pokud je vyplněný, public stránka ho rozparsuje hezky)
  ingredients JSONB DEFAULT '[]',        -- [{name, amount, unit, note?}]
  instructions JSONB DEFAULT '[]',       -- [{step, duration_min?, note?}]

  -- Editorial body — markdown s ## H2, ### H3 (delší tipy, kontext)
  body_markdown TEXT,

  -- Pairing context (pro AI gener + display "doporučujeme olej z X")
  recommended_oil_types TEXT[] DEFAULT '{}',    -- ['evoo'] (typ)
  recommended_cultivars TEXT[] DEFAULT '{}',    -- ['coratina'] (slug)
  recommended_regions TEXT[] DEFAULT '{}',      -- ['apulie'] (slug)

  -- SEO
  meta_title VARCHAR(70),
  meta_description VARCHAR(160),

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  source VARCHAR(40),                    -- 'manual' | 'ai_generated' | 'static_legacy'
  ai_generated_at TIMESTAMPTZ,

  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_status_published
  ON recipes(status, published_at DESC NULLS LAST) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recipes_recommended_regions
  ON recipes USING GIN (recommended_regions);
CREATE INDEX IF NOT EXISTS idx_recipes_recommended_cultivars
  ON recipes USING GIN (recommended_cultivars);


-- ── Migrace existujících 2 receptů ze static contentu ──────────────────────

INSERT INTO recipes (
  slug, title, excerpt, emoji, read_time,
  prep_time_min, cook_time_min, servings, difficulty, cuisine,
  ingredients, instructions, body_markdown,
  recommended_cultivars, recommended_regions,
  meta_title, meta_description,
  status, source, published_at
) VALUES
(
  'bruschetta-s-rajcaty',
  'Bruschetta s rajčaty a bazalkou',
  'Klasika italské kuchyně, kde kvalita olivového oleje dělá rozdíl. S doporučením konkrétního oleje.',
  '🍅',
  '3 min čtení',
  10, 5, 4, 'easy', 'italian',
  '[
    {"name": "kvalitní chléb (ciabatta nebo pain de campagne)", "amount": 4, "unit": "plátky"},
    {"name": "zralá rajčata (heirloom nebo San Marzano)", "amount": 4, "unit": "ks"},
    {"name": "stroužek česneku", "amount": 1, "unit": "ks"},
    {"name": "čerstvá bazalka", "amount": 1, "unit": "hrst"},
    {"name": "mořská sůl", "amount": null, "unit": "podle chuti"},
    {"name": "čerstvě mletý černý pepř", "amount": null, "unit": "podle chuti"},
    {"name": "kvalitní EVOO (extra panenský olivový olej)", "amount": 3, "unit": "lžíce", "note": "klíčová ingredience — viz doporučení níže"}
  ]'::jsonb,
  '[
    {"step": "Chléb opeč na grilu nebo v troubě (200 °C, 4 min) dozlatova.", "duration_min": 5},
    {"step": "Teplý chléb potři jednou stranou rozkrojeným česnekem."},
    {"step": "Rajčata nakrájej na kostky ~1 cm. Zlehka osol — sůl vytáhne šťávu."},
    {"step": "Polož kostky rajčat na chléb. Zalij EVOO velkoryse — minimálně 1 lžíci na kus."},
    {"step": "Přidej trhanou bazalku, špetku pepře, doladí solí."}
  ]'::jsonb,
  '## Olej dělá 80 % chuti

Bruschetta je test oleje. Když olej voní po čerstvé trávě, mandlích a rajčatovém listu, sedne s rajčaty perfektně. Plochý oil-of-the-supermarket schová rajčata pod mastnou vrstvou.

### Co konkrétně doporučujeme
- Apulský olej s tóny rajčatového listu — tóny zelené trávy a artyčoku.
- Řecký olej z Kalamaty — jemnější, ale s pěknou pálivostí.
- Cokoli s DOP v cenovce 50–100 Kč/100 ml — bezpečná volba.

### Čemu se vyhnout
- Refined olive oil (nebo "Olive Oil" bez extra panenský) — neutrální chuť, plochá bruschetta.
- Pomace — chemicky extrahovaný odpadní olej, na bruschettu zločin.

## Tip nakonec

Bruschettu jez ihned po servírování. Chléb se rychle nasákne šťávou a měkne. Po 10 minutách už není to ono.

Pokud máš zbytky mizajícího chleba, polij ho čerstvým EVOO a popraš solí. Slow food breakfast.',
  ARRAY['coratina'],
  ARRAY['apulie'],
  'Bruschetta s rajčaty: recept + doporučený olivový olej',
  'Italská klasika kde olej dělá rozdíl. Recept + naše doporučení konkrétního oleje který dělá z bruschetty zážitek.',
  'active', 'static_legacy', NOW()
),
(
  'domaci-pesto',
  'Domácí pesto alla genovese',
  'Autentické pesto vyžaduje kvalitní EVOO. Ukážeme recept a doporučíme olej, který mu sedne nejlíp.',
  '🌿',
  '4 min čtení',
  15, 0, 4, 'medium', 'italian',
  '[
    {"name": "čerstvá bazalka (nejlépe Genovese DOP)", "amount": 50, "unit": "g"},
    {"name": "piniové oříšky", "amount": 30, "unit": "g"},
    {"name": "stroužek česneku", "amount": 1, "unit": "ks"},
    {"name": "Parmigiano Reggiano DOP, nastrouhaný", "amount": 50, "unit": "g"},
    {"name": "Pecorino Romano DOP", "amount": 25, "unit": "g"},
    {"name": "kvalitní EVOO", "amount": 120, "unit": "ml", "note": "jemný až středně výrazný — viz výběr"},
    {"name": "mořská sůl", "amount": 0.5, "unit": "lžička"}
  ]'::jsonb,
  '[
    {"step": "Bazalku opláchni a osuš (vlhká rozmaže olej). Listy odtrhej od stonků."},
    {"step": "V hmoždíři nejprve rozdrť česnek se solí. Sůl zde funguje jako abrazivum."},
    {"step": "Přidej piniové oříšky, drť na hladkou pastu."},
    {"step": "Po hrstech přidávej bazalku, drcením rotujícím pohybem (ne lisem). Při tlučení se uvolní éterické oleje."},
    {"step": "Vmíchej oba sýry."},
    {"step": "Postupně přilévej olej, stále míchej, dokud nedostaneš krémovou konzistenci."}
  ]'::jsonb,
  '## Mixér místo hmoždíře

Funguje, ale dej pozor na 2 věci:
- Krátké pulsace ne kontinuální mixování — třeným teplem se bazalka oxiduje a hořkne.
- Studené nože — ideálně mixér chvíli v lednici, ostří méně zahřejí směs.

## Které oleje sednou

Pesto vyžaduje jemný až středně výrazný olej — moc pálivý ho přebije, plochý nepodpoří.

### Doporučení
- Řecká Kalamata DOP — jemná chuť, neperebíjí bazalku.
- Olej z ligurské oblasti (Frantoio, Taggiasca) — autentická volba, ale v ČR vzácný a drahý.
- Cokoli s kyselostí pod 0,4 % a polyfenoly 200–500 mg/kg.

### Čemu se vyhnout
- Apulský Coratina — moc pálivý, schová bazalku.
- Toskánský early harvest — moc hořký a vegetativní, kolize s bazalkou.
- Oleje bez kategorie "extra panenský".

## Servírování

Pesto na čerstvé těstoviny (trofie, gnocchi, tagliatelle):
1. Uvař těstoviny al dente.
2. Před scezením odeber 2–3 lžíce vařicí vody.
3. Pesto NEdávej na pánev — teplem se bazalka oxiduje. Smíchej se studeným pestem v míse + 1–2 lžíce vařicí vody pro emulgaci.
4. Servíruj okamžitě s extra strouhaným parmazánem.',
  ARRAY['kalamata', 'koroneiki'],
  ARRAY['kreta', 'peloponnes'],
  'Domácí pesto alla genovese: recept + výběr oleje',
  'Autentické pesto se 7 surovinami. Ukážeme klasickou metodu v hmoždíři + jaký olej k pestu sedne nejlíp.',
  'active', 'static_legacy', NOW()
)
ON CONFLICT (slug) DO NOTHING;
