-- Articles DB — průvodce, žebříčky, srovnání, vzdělávání.
-- Předtím: hardcoded v lib/static-content.ts + lib/article-bodies.ts.
-- Pravidla obsahu: text smí používat {{products.count}}, {{link:srovnavac|srovnávač}}
-- tokeny — resolvovány při render přes lib/template-vars.ts.

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Display
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  emoji VARCHAR(8),
  read_time VARCHAR(20),
  hero_image_url TEXT,

  -- Categorization
  category VARCHAR(40) NOT NULL DEFAULT 'pruvodce'
    CHECK (category IN ('pruvodce', 'zebricek', 'srovnani', 'vzdelavani')),

  -- Content
  body_markdown TEXT,

  -- SEO
  meta_title VARCHAR(70),
  meta_description VARCHAR(160),

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  source VARCHAR(40),  -- 'manual' | 'ai_generated' | 'static_legacy'
  ai_generated_at TIMESTAMPTZ,

  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category_published
  ON articles(category, published_at DESC NULLS LAST) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);


-- Seed: existující 4 statické články (jak vybrat, top 2025, řecký vs italský, polyfenoly).
-- Body je placeholder — admin přepíše přes editor nebo AI gen.
INSERT INTO articles (slug, title, excerpt, emoji, read_time, category, body_markdown, status, source, published_at) VALUES
(
  'jak-vybrat-olivovy-olej',
  'Jak vybrat olivový olej: na co opravdu záleží',
  'Kyselost, polyfenoly, certifikace — vysvětlujeme, co znamenají čísla na etiketě a proč na nich záleží.',
  '📖',
  '8 min čtení',
  'pruvodce',
  '## Tři čísla která fakt rozhodují

Když stojíš v obchodě před regálem olivových olejů, vidíš desítky lahví s podobnými etiketami. Co reálně rozhoduje o kvalitě? Tři čísla, na která se vyplatí dívat.

### 1. Kyselost (acidity)

Měřená v procentech — udává obsah volných mastných kyselin. Nižší = lepší. Extra panenský olivový olej (EVOO) musí mít kyselost ≤ 0,8 %. Kvalitní oleje mají typicky 0,2 % nebo méně.

Vysoká kyselost znamená olej z přezralých nebo poškozených oliv. Není to o pálivé chuti — kyselost necítíš jazykem, je to chemická charakteristika.

### 2. Polyfenoly (mg/kg)

Antioxidanty z dužiny oliv. Čím více, tím protizánětlivější účinek. EU označuje oleje s 250+ mg/kg jako "rich in polyphenols" — health claim podle EFSA.

Většina supermarketových olejů má 100-200 mg/kg. Kvalitní apulské nebo řecké oleje 400-800 mg/kg. Špičkové early-harvest 800+ mg/kg.

### 3. Certifikace

DOP/PDO = chráněné označení původu (olej z konkrétního regionu, kontrolovaný EU).
BIO = organic certifikace.
NYIOOC = mezinárodní oceňovací soutěž.

Žádný marketing, ale skutečný garant původu. Pokud chceš jistotu, kupuj DOP nebo BIO.

## Cena za 100 ml jako jediný spravedlivý ukazatel

Lahvi mají různé velikosti. 250ml × 350 Kč = 140 Kč/100ml. 5l × 1990 Kč = 40 Kč/100ml. Velký balení má vždycky lepší poměr — ale jen pokud spotřebuješ do 6 měsíců (po otevření kvalita degraduje).

V {{link:srovnavac|našem srovnávači}} máš cenu za 100 ml u každého oleje vidět hned.

## Proč nesnažit ušetřit na oleji

Olivový olej je zdravotní investice. Polyfenoly z 1 lžíce kvalitního EVOO denně mají měřitelný protizánětlivý účinek (publikované studie EFSA). Olej z marketu za 100 Kč/litr neobsahuje tyto účinné látky — chemicky je to spíš mastnota než funkční potravina.

Rozdíl mezi 50 Kč/100ml a 100 Kč/100ml je 1500 Kč/rok pro průměrnou domácnost. Health benefit kvalitního oleje > investice.

## Jak se vyhnout falsifikátům

Až 70 % světového olivového oleje se podle některých studií falšuje (smícháno s levnějšími slunečnicovými oleji nebo refined oleji). Jediná ochrana:

- Kupuj od důvěryhodných importérů — ne z neověřených e-shopů
- Vyžaduj DOP nebo lab report (NYIOOC)
- Cena pod 30 Kč/100ml = silný signál falsifikátu (skutečný EVOO není takhle levný vyrobit)
- Pokud olej voní jen "olejově" bez ovocných tónů → pravděpodobně refined nebo blend

V Olivátoru sledujeme {{retailers.activeCount}} prodejců a hodnotíme {{products.count}} olejů podle objektivního Olivator Score. Žádné placené pozice, žádné dotazníky producentů.',
  'active', 'static_legacy', NOW()
),
(
  'nejlepsi-olivovy-olej-2026',
  'Nejlepší olivový olej 2026: testujeme top oleje',
  'Nezávislý test olejů dostupných v ČR. Hodnotíme kyselost, polyfenoly, certifikace a cenu za 100 ml.',
  '🏆',
  '15 min čtení',
  'zebricek',
  '## Jak jsme testovali

V {{date.year}} jsme prošli {{products.count}} olivových olejů dostupných v ČR a vybrali top podle objektivních kritérií. Žádné dotazníky producentů, žádné placené pozice.

### Kritéria

Olivator Score (0-100) kombinuje:

- **Kyselost** (35 % váhy) — nižší = lepší, pod 0,2 % = max
- **Certifikace** (25 % váhy) — DOP+BIO = max
- **Polyfenoly + chemická kvalita** (25 %)
- **Cena/kvalita** (15 %)

Plnou metodiku najdeš v {{link:metodika|sekci Metodika}}.

## Top oleje podle kategorií

### Pro každodenní vaření (do 50 Kč/100ml)

Hledáš solidní EVOO na denní použití bez bankrotu? Sleduj řecké oleje z Kréty s DOP — nejlepší poměr cena/kvalita v EU. {{link:srovnavac|Srovnávač}} ti je seřadí podle ceny za 100 ml.

### Premiový pick (50-100 Kč/100ml)

Apulské Coratina jsou v této cenovce king — polyfenoly 600-900 mg/kg, intenzivní hořkost a pálivost, ideální na bruschettu, dressing, finishing.

### Health-focus (250+ mg/kg polyfenolů)

Pokud sleduješ zdraví, hledej oleje s lab reportem nebo NYIOOC certifikací. EU "rich in polyphenols" claim začíná u 250 mg/kg.

## Žebříček se aktualizuje

Tento žebříček je živý dokument — sledujeme {{products.count}} olejů a Score se přepočítává když se mění cena nebo přicházejí nové data. Aktuální top vidíš vždy v {{link:srovnavac|srovnávači}} seřazeno podle Score.',
  'active', 'static_legacy', NOW()
),
(
  'recky-vs-italsky',
  'Řecký vs italský olivový olej — který vybrat?',
  'Dva největší hráči na trhu olivových olejů. Srovnáváme chuťové profily, certifikace a ceny.',
  '🇬🇷',
  '6 min čtení',
  'srovnani',
  '## TL;DR

**Pro každodenní použití** doporučujeme řecký olej z Kréty s DOP — dobrý poměr cena/kvalita, jemná chuť, vysoká kyselostní disciplína.

**Pro speciální příležitosti** nebo intenzivní chuť (bruschetta, drsné saláty) si připlatíš za apulský Coratina nebo toskánský Frantoio. Oboje jsou kvalitní cesty — jen různá chuť.

## Kdo vyrábí kolik

Itálie a Řecko spolu produkují asi 60 % celosvětové produkce olivového oleje (zbytek hlavně Španělsko + Tunisko). Itálie má více značek a marketing. Řecko má větší produkci na obyvatele a vyšší procento DOP-certifikovaných olejů.

V našem katalogu sledujeme {{products.count}} olejů z různých zemí. Italské a řecké tvoří většinu.

## Chuťové rozdíly

### Italské
- Toskánské: hořké, intenzivní, vegetativní (artyčok, tráva)
- Apulské: ovocné, pálivé, výrazné (Coratina je nejvíc charakteristická odrůda)
- Sicilské: jemnější, mandlové tóny

### Řecké
- Krétské: jemné, sladší, ovocné (Koroneiki je dominantní odrůda)
- Peloponéské: středně intenzivní, balanced
- Lesbos: jemné, květinové

## Chemie

V průměru:

- **Italské EVOO** mívají 0,2-0,3 % kyselost, 300-700 mg/kg polyfenolů
- **Řecké EVOO** mívají 0,1-0,3 % kyselost, 250-600 mg/kg polyfenolů

Konkrétní čísla závisí na regionu, sklizni a producentovi. Naše {{link:srovnavac|databáze srovnávače}} ti to ukáže pro každý olej.

## Doporučení

- **Začátečník** → řecký Krétský DOP, jemná chuť, žádný "překvapivý" finish
- **Health-focused** → apulský Coratina, vysoké polyfenoly
- **Gourmet experimenty** → toskánské early harvest, drsná chuť

V {{link:srovnavac|srovnávači}} můžeš filtrovat podle země a porovnat oleje vedle sebe.',
  'active', 'static_legacy', NOW()
),
(
  'polyfenoly-proc-na-nich-zalezi',
  'Polyfenoly v olivovém oleji: proč na nich záleží',
  'Polyfenoly jsou klíčem ke zdravotním benefitům olivového oleje. Kolik jich potřebujete a kde je najdete?',
  '⚗️',
  '5 min čtení',
  'vzdelavani',
  '## Co jsou polyfenoly

Skupina antioxidantů z dužiny oliv. V olivovém oleji jich je několik typů:

- **Oleocanthal** — pálivý vjem v hrdle, silný protizánětlivý účinek (podobný ibuprofenu)
- **Oleuropein** — hořká chuť, antioxidační aktivita
- **Hydroxytyrosol** — kardio-protektivní efekt
- **Tyrosol** — neuroprotektivní

Pokud olej páli v hrdle a mírně hořkne — to JSOU polyfenoly. Sladký olej bez hořkosti = nízký polyfenol obsah (nebo rafinovaný).

## EU health claim

European Food Safety Authority (EFSA) v roce 2011 schválila health claim:

> "Polyfenoly z olivového oleje přispívají k ochraně lipidů v krvi před oxidačním stresem."

Aby olej mohl tento claim používat, musí obsahovat **min. 5 mg hydroxytyrosolu (a derivátů) na 20 g** = ~250 mg/kg polyfenolů. Většina supermarketových olejů to nesplní.

## Kolik denně

Studie naznačují benefit při 20-30 mg polyfenolů/den. To odpovídá 1-2 lžícím kvalitního EVOO (400+ mg/kg).

S průměrným supermarketovým olejem (100-200 mg/kg) potřebuješ 4-6 lžic — což je nereálné a nezdravé množství.

## Jak poznáš vysoký obsah

3 signály:

1. **Lab report nebo certifikace** (NYIOOC, COC) — uvádějí konkrétní číslo
2. **Chuť** — pikantnost a hořkost (zelený jabloňový tón = polyfenoly)
3. **Cena** — oleje s 400+ mg/kg nestojí pod 50 Kč/100ml. Výroba je dražší.

V {{link:srovnavac|našem katalogu}} ukazujeme hodnotu polyfenolů u každého oleje, kde výrobce nebo lab report uvádí číslo. Filtr "Polyfenoly 400+" ti je vyřadí.

## Pozor na zpracování

- **Pečení/vaření při 180+ °C** ničí 30-50 % polyfenolů
- **Otevřená lahev** ztrácí polyfenoly oxidací — max 6 měsíců po otevření
- **Slunce, teplo, vlhko** = degradace

Pro health benefit: použij olej **studený** (na salát, dochucení, dipping). Smažení = obyčejnější olej stačí.',
  'active', 'static_legacy', NOW()
)
ON CONFLICT (slug) DO NOTHING;
