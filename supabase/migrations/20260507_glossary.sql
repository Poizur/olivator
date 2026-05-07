-- Glossary / wiki sekce — /slovnik s definicemi olivového oleje terminologie.
-- Cíl: SEO-cílené landing pages pro long-tail keywords (kyselost, polyfenoly,
-- DOP, oleocanthal, EVOO, atd.) + interní linking magnet pro články.
--
-- Schema.org: DefinedTerm + DefinedTermSet (slovník jako celek).

CREATE TABLE IF NOT EXISTS glossary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(80) UNIQUE NOT NULL,

  -- Display
  term VARCHAR(100) NOT NULL,           -- "Polyfenoly", "Kyselost", "EVOO"
  term_alt VARCHAR(200),                 -- "Volné mastné kyseliny" (alt znění, hledá se i toto)

  -- Definitions
  definition_short TEXT NOT NULL,        -- 1-2 věty pro náhled, ~150 znaků
  definition_long TEXT,                  -- markdown, 200-500 slov, kontext + příklady

  -- Categorization
  category VARCHAR(40) DEFAULT 'general'
    CHECK (category IN ('general', 'chemistry', 'certification', 'process', 'cultivar', 'region')),

  -- Cross-linking (interní landing pages, ne external)
  related_terms TEXT[] DEFAULT '{}',     -- slugs of jiných glossary_terms
  related_articles TEXT[] DEFAULT '{}',  -- slugs of articles
  related_entity_slugs JSONB DEFAULT '{}', -- {"region": ["kreta"], "cultivar": ["koroneiki"]}

  -- SEO
  meta_title VARCHAR(70),
  meta_description VARCHAR(200),

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glossary_slug ON glossary_terms(slug);
CREATE INDEX IF NOT EXISTS idx_glossary_status ON glossary_terms(status);
CREATE INDEX IF NOT EXISTS idx_glossary_category ON glossary_terms(category);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION glossary_terms_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS glossary_terms_updated_at ON glossary_terms;
CREATE TRIGGER glossary_terms_updated_at
  BEFORE UPDATE ON glossary_terms
  FOR EACH ROW
  EXECUTE FUNCTION glossary_terms_updated_at_trigger();

-- ── Seed: 15 nejdůležitějších termínů ────────────────────────────────────────

INSERT INTO glossary_terms (slug, term, term_alt, definition_short, category, status) VALUES
(
  'evoo',
  'EVOO',
  'Extra virgin olive oil, extra panenský olivový olej',
  'Nejvyšší kategorie olivového oleje dle EU normy. Lisován za studena, kyselost ≤ 0,8 %, žádná chemická úprava, organoleptická kvalita ověřená panelem.',
  'general',
  'active'
),
(
  'kyselost-olivoveho-oleje',
  'Kyselost',
  'Volné mastné kyseliny, oleic acid percentage',
  'Procentuální obsah volných mastných kyselin. Indikuje čerstvost oliv a kvalitu zpracování. EVOO ≤ 0,8 %, panenský ≤ 2 %, prémiový ≤ 0,3 %.',
  'chemistry',
  'active'
),
(
  'polyfenoly',
  'Polyfenoly',
  'Polyphenols, fenolové sloučeniny',
  'Antioxidační sloučeniny v olivovém oleji. EU norma povoluje claim "ochrana lipidů" od 250 mg/kg. Rozsah v EVOO: 100-1000 mg/kg.',
  'chemistry',
  'active'
),
(
  'oleocanthal',
  'Oleocanthal',
  'Pikantní polyfenol',
  'Polyfenol zodpovědný za "pálivý" pocit v hrdle. Beauchamp et al. (2005) prokázali protizánětlivý efekt podobný ibuprofenu.',
  'chemistry',
  'active'
),
(
  'oleuropein',
  'Oleuropein',
  'Hořký polyfenol',
  'Hlavní polyfenol mladých oliv, zodpovědný za hořkou chuť olivového oleje. Vysoké koncentrace v early harvest olejích.',
  'chemistry',
  'active'
),
(
  'hydroxytyrosol',
  'Hydroxytyrosol',
  'Antioxidant olivového oleje',
  'Silný antioxidant odvozený od oleuropeinu. EU EFSA potvrdilo health claim pro ochranu LDL cholesterolu.',
  'chemistry',
  'active'
),
(
  'peroxidove-cislo',
  'Peroxidové číslo',
  'Peroxide value, PV',
  'Měří stupeň oxidace olejů. Norma EVOO: ≤ 20 mEq O2/kg. Vysoká hodnota = stárnutí, nesprávné skladování.',
  'chemistry',
  'active'
),
(
  'dop',
  'DOP',
  'Denominazione di Origine Protetta, Chráněné označení původu',
  'EU certifikace garantující, že produkt pochází z konkrétní zeměpisné oblasti a používá tradiční metodu výroby. Příklady: Terra di Bari DOP, Kalamata DOP.',
  'certification',
  'active'
),
(
  'pgi-igp',
  'PGI / IGP',
  'Protected Geographical Indication, Chráněné zeměpisné označení',
  'Slabší geografická vazba než DOP — alespoň jedna fáze výroby (pěstování, lisování, balení) musí být v dané oblasti.',
  'certification',
  'active'
),
(
  'bio-certifikace',
  'BIO',
  'Organic, Ekologické zemědělství',
  'EU certifikace zaručující, že olej pochází z oliv pěstovaných bez syntetických pesticidů a hnojiv. Cyklus přechodu: 3 roky.',
  'certification',
  'active'
),
(
  'nyiooc',
  'NYIOOC',
  'New York International Olive Oil Competition',
  'Největší a nejprestižnější mezinárodní soutěž olivových olejů. Tři úrovně: Gold, Silver, Bronze. Vítězové se prezentují na etiketě.',
  'certification',
  'active'
),
(
  'early-harvest',
  'Early Harvest',
  'Předčasná sklizeň, raně lisovaný olej',
  'Sklizeň oliv ještě nezralých (zelené, říjen-listopad). Vyšší obsah polyfenolů, intenzivnější chuť, ale nižší výnos = vyšší cena.',
  'process',
  'active'
),
(
  'cold-pressed',
  'Lisování za studena',
  'Cold pressed, prima spremitura a freddo',
  'Mechanická extrakce oleje při teplotě pod 27°C. Zachovává polyfenoly a vitamín E. Povinné pro EVOO.',
  'process',
  'active'
),
(
  'koroneiki',
  'Koroneiki',
  'Řecká odrůda olivovníku',
  'Nejrozšířenější řecká cultivar, dominantní na Krétě a Peloponésu. Profil: intenzivní ovocnost, hořkost, vysoké polyfenoly.',
  'cultivar',
  'active'
),
(
  'coratina',
  'Coratina',
  'Italská odrůda olivovníku',
  'Hlavní cultivar Apulie. Velmi intenzivní profil — vysoká hořkost, štiplavost, artičokové tóny. Polyfenoly často 500-1000 mg/kg.',
  'cultivar',
  'active'
)
ON CONFLICT (slug) DO NOTHING;
