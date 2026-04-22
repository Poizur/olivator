# OLIVATOR.CZ — Project Bible pro Claude Code
## Verze: 2.0 | Duben 2026 | Status: Pre-development

> **Instrukce pro Claude Code:** Přečti tento soubor CELÝ před jakoukoliv akcí.
> Přečti také `DESIGN_REFERENCE.html` před vytvořením jakékoliv UI komponenty.
> Eskalační protokol je v sekci 20 — dodržuj ho přísně.

---

## 1. VIZE A BUSINESS MODEL

### Co je Olivator
Největší srovnávač olivových olejů v ČR a SK. Plně automatizovaný systém.
Majitel (Architekt) určuje směr — systém běží sám. Majitel nekóduje, neřeší techniku.

**Jedinečná hodnota:**
- Olivator Score — vlastní objektivní metrika (jediná v ČR)
- Nulová přímá konkurence
- Reálné ceny ze 18+ prodejců aktualizované každých 24h
- AI přirozené vyhledávání (natural language search)
- AI Sommelier — chat s expertem (Fáze 2)

### Trh
- ~580M CZK/rok, +11% YoY, 500+ produktů
- Nulová dedikovaná konkurence v CZ/SK
- Primárně CZ, sekundárně SK (parametr `market` v DB)

### Příjmy — výhradně affiliate
- Rohlík.cz, Košík.cz: 3–6%
- Mall.cz, iHerb: 5–8%
- Specialty e-shopy (olivio.cz, gaea.cz, olivovyolej.cz): 8–15%
- Amazon Associates EU: 3–4%
- Affiliate sítě: Dognet, Heureka Affiliate, CJ Affiliate

### Projekce
- Rok 1: 15 000–40 000 CZK/měs
- Rok 2: 60 000–120 000 CZK/měs
- Rok 3: 200 000+ CZK/měs
- Break-even: ~13 000 CZK/měs

### Náklady
- Railway hobby: $5/měs | Supabase: $0 (free) | Claude API: $5–10/měs | olivator.cz: ~25 CZK/měs

### Design inspirace
- **Vivino** — Score systém, produktová karta, chuťový profil
- **Wirecutter** — content strategie "best of", nezávislost
- **Wine Folly** — editorial tón, vzdělávání s osobností
- **only5l.com** — vzduch, trust signals, minimální design
- **Apple.com** — bílá, vzdušná typografie, žádné přeplnění

---

## 2. TECH STACK

```
Frontend:    Next.js 14 (App Router POUZE) + TypeScript
Databáze:    Supabase (PostgreSQL + pgvector + Storage)
Hosting:     Railway
AI:          Claude API — claude-sonnet-4-20250514
Scraping:    Playwright + Puppeteer
Styling:     Tailwind CSS
Node.js:     20+ | Next.js: 14.x | Supabase JS: 2.x
```

---

## 3. DESIGN REFERENCE

**POVINNÉ:** Přečti `DESIGN_REFERENCE.html` před vytvořením JAKÉKOLIV UI komponenty.

### Principy (Apple styl)
- Čistý, vzdušný, minimální — hodně bílého prostoru
- Trust signals: `✓ Nezávislé hodnocení ✓ Reálná data ✓ Žádná reklama`

### Font
- Nadpisy: **Playfair Display** (serif, 400/500, italics v olivové pro akcenty)
- Body: **Inter** (300/400/500)
- Logo: `olivátor.cz` — Inter 700, lowercase, barva `#2d6a4f`

### Barvy
```css
--olive:  #2d6a4f   /* primární brand */
--olive2: #1b4332   /* hover */
--olive3: #40916c   /* akcenty */
--olive4: #d8f3dc   /* light background */
--olive5: #b7e4c7   /* hover borders */
--terra:  #c4711a   /* Score badge — terrakota */
--text:   #1d1d1f
--text2:  #6e6e73
--text3:  #aeaeb2
--off:    #f5f5f7
--off2:   #e8e8ed
```

### Score vizualizace
- Badge: terrakota pill `background:#c4711a; color:#fff; border-radius:20px`
- Score kruh: zelená (87+), amber (75–86), modrá (<75)
- Breakdown: 4 komponenty viditelné na produktové kartě

---

## 4. STRUKTURA WEBU

### MVP stránky
```
/                           Homepage
/srovnavac                  Listing s filtry
/srovnavac?origin=gr        Filtrovaná URL (SEO)
/olej/[slug]                Produktová karta
/porovnani                  Comparator
/porovnani?ids=uuid,uuid    Sdílitelný link
/zebricek                   Přehled žebříčků
/zebricek/[slug]            Detail žebříčku
/pruvodce                   Blog/průvodce listing
/pruvodce/[slug]            Detail článku
/recept                     Recepty listing
/recept/[slug]              Detail receptu
/metodika                   Jak počítáme Olivator Score (trust + SEO)
/admin                      Admin UI (jen majitel)
/api/health                 Railway health check (POVINNÉ)
/go/[retailer]/[slug]       Affiliate redirect (KRITICKÉ)
```

### Fáze 2
```
/profil                     Uživatelský profil + wishlist
/zeme/[slug]                Origin pages s mapou
```

---

## 5. KLÍČOVÉ UI FUNKCE

### Floating Compare Bar
- Slide-in ze spodu při přidání 1+ produktu
- 5 slotů (min 2 pro tlačítko "Porovnat", max 5)
- Tlačítko `+ Porovnat` na každé kartě v listingu
- Tlačítko se změní na `✓ Přidáno` po kliknutí
- Toast notifikace při přidání/odebrání
- ✕ v slotu odebere konkrétní olej
- `Porovnat →` → `/porovnani?ids=...`
- Maximum 5 olejů — upozornění

### Comparator
- Side-by-side 2–5 olejů
- Zelená = nejlepší, červená = nejhorší v řádku
- Progress bary vizuálně
- "Olivator doporučuje" winner box + odůvodnění
- Affiliate CTA pro každý olej
- Chip-picker pro rychlé přidání
- Sdílitelná URL

### Olivator Score (0–100)
- Kyselost (35%) — nižší = lepší, pod 0,2% = max
- Certifikace (25%) — DOP+BIO = max
- Polyfenoly + chemická kvalita (25%)
- Cena/kvalita (15%)
- Transparentní breakdown na kartě
- AI vypočítá + slovní zdůvodnění

### AI Natural Language Search
- "lehký řecký do 200 Kč", "dárek pro tátu co rád vaří"
- Intent parsing → structured query → Supabase
- Feature flag: `ai_search` (výchozí: true)

### Quiz "Najdi svůj olej"
- 3–5 otázek → 3 doporučení s affiliate linky
- MVP: pravidlový; Fáze 2: AI přes Claude API
- Feature flag: `quiz` (výchozí: true)

### Newsletter
- "Olej měsíce" — AI vybere novinku/slevu
- 1× týdně automaticky, přirozené affiliate linky
- Integrace: Mailchimp nebo Resend API

### Wishlist / Oblíbené (Fáze 2)
- Srdíčko viditelné od MVP (neaktivní bez přihlášení)
- DB tabulka `wishlists` existuje od prvního dne
- Feature flag: `wishlist` (výchozí: false)

### Price History Graf (Fáze 2)
- Sparkline/plný graf na produktové kartě
- 30/90/365 dní přepínač
- Data scraper ukládá od M1 do `price_history`

### AI Sommelier Chat (Fáze 2)
- Floating button vpravo dole
- Přirozená čeština, max 3 doporučení, vždy cena + kde koupit
- Context: TOP 200 produktů jako RAG přes pgvector
- Feature flag: `ai_sommelier` (výchozí: false)

### Vizuální Search (Fáze 3)
- Foto lahve → AI rozpozná → Score + kde levněji
- Feature flag: `visual_search` (výchozí: false)

### Personalizace (Fáze 3)
- Profilování dle kliků/nákupů/wishlistu
- Feature flag: `user_profiles` (výchozí: false)

---

## 6. KATEGORIZACE PRODUKTŮ

**Typ:** `evoo`, `virgin`, `refined`, `olive_oil`, `pomace`

**Původ (ISO):** GR, IT, ES, HR, PT, TR, MA, TN, IL, US

**Zpracování:** `cold_pressed`, `filtered`, `unfiltered`, `early_harvest`, `late_harvest`

**Certifikace:** `dop`, `pgp`, `bio`, `organic`, `nyiooc`, `demeter`, `kosher`, `halal`, `vegan`

**Použití:** `salad`, `cooking`, `frying`, `dipping`, `fish`, `meat`, `health`, `gift`

**Chuťový profil (JSONB 0–100):** `fruity`, `herbal`, `bitter`, `spicy`, `mild`, `nutty`, `buttery`

**Cenové segmenty:** Budget (<15 Kč/100ml), Mid (15–30), Premium (30–50), Luxury (50+)

---

## 7. DATABÁZOVÉ SCHÉMA

### KRITICKÁ PRAVIDLA
1. **EAN = master klíč** — vždy check EAN před INSERT
2. **Nikdy ALTER TABLE bez migrace** — soubor v `/supabase/migrations/YYYYMMDD_popis.sql`
3. **Upsert pattern** — nikdy čistý INSERT bez existence check
4. **Tabulky users a wishlists existují od startu** — prázdné, připravené pro Fázi 2

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ean VARCHAR(13) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name_short VARCHAR(100),
  origin_country CHAR(2),
  origin_region VARCHAR(100),
  type VARCHAR(20) CHECK (type IN ('evoo','virgin','refined','olive_oil','pomace')),
  acidity DECIMAL(4,2),
  polyphenols INTEGER,
  peroxide_value DECIMAL(5,2),
  oleic_acid_pct DECIMAL(4,1),
  harvest_year INTEGER,
  best_before DATE,
  processing VARCHAR(50),
  flavor_profile JSONB DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  use_cases TEXT[] DEFAULT '{}',
  volume_ml INTEGER,
  packaging VARCHAR(20),
  olivator_score INTEGER CHECK (olivator_score BETWEEN 0 AND 100),
  score_breakdown JSONB DEFAULT '{}',
  description_short TEXT,
  description_long TEXT,
  meta_title VARCHAR(70),
  meta_description VARCHAR(160),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','active','inactive')),
  ai_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(100),
  affiliate_network VARCHAR(50),
  base_tracking_url TEXT,
  default_commission_pct DECIMAL(4,2),
  is_active BOOLEAN DEFAULT true,
  market CHAR(5) DEFAULT 'CZ',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id),
  price DECIMAL(10,2),
  currency CHAR(3) DEFAULT 'CZK',
  in_stock BOOLEAN DEFAULT true,
  product_url TEXT,
  affiliate_url TEXT,
  commission_pct DECIMAL(4,2),
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  last_price_change TIMESTAMPTZ,
  UNIQUE(product_id, retailer_id)
);

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id),
  price DECIMAL(10,2),
  in_stock BOOLEAN,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id VARCHAR(36) UNIQUE DEFAULT gen_random_uuid()::text,
  product_id UUID REFERENCES products(id),
  retailer_id UUID REFERENCES retailers(id),
  session_id VARCHAR(36),
  ip_hash VARCHAR(64),
  market CHAR(5) DEFAULT 'CZ',
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  source VARCHAR(50) DEFAULT 'scraper',
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feature_flags (
  key VARCHAR(50) PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('ai_sommelier',  false, 'AI chat — Fáze 2'),
  ('wishlist',      false, 'Oblíbené — Fáze 2'),
  ('user_profiles', false, 'Uživatelské účty — Fáze 3'),
  ('visual_search', false, 'Vizuální search — Fáze 3'),
  ('price_alerts',  false, 'Price alerts — Fáze 3'),
  ('ai_search',     true,  'AI natural language search — MVP'),
  ('comparator',    true,  'Porovnávač — MVP'),
  ('quiz',          true,  'Quiz najdi svůj olej — MVP');

-- Prázdné tabulky připravené pro Fázi 2
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email VARCHAR(255),
  display_name VARCHAR(100),
  taste_profile JSONB DEFAULT '{}',
  market CHAR(5) DEFAULT 'CZ',
  newsletter BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

---

## 8. API ENDPOINTY

```
GET  /api/health                     — Railway health check (POVINNÉ)
GET  /api/products                   — listing, filtry, stránkování
GET  /api/products/[slug]            — detail produktu
GET  /api/products/[slug]/prices     — ceny u prodejců
GET  /api/products/[slug]/history    — price history
POST /api/search                     — AI natural language search
GET  /api/compare?ids=uuid,uuid      — comparator data
GET  /api/score/[slug]               — Score breakdown
POST /api/chat                       — AI Sommelier (feature flag)
GET  /api/admin/products             — admin listing
PUT  /api/admin/products/[id]        — admin edit
POST /api/admin/products/[id]/images — upload fotek
PUT  /api/admin/products/[id]/offers — edit affiliate linků
```

---

## 9. AFFILIATE REDIRECT — KRITICKÉ

```
GET /go/[retailer-slug]/[product-slug]
```

**Postup (NESMÍ se změnit bez pokynu Architekta):**
1. Zaloguj klik do `affiliate_clicks`
2. Fetchni `affiliate_url` z `product_offers`
3. HTTP 302 redirect na affiliate URL
4. Cookie tracking 30–90 dní

**Maximalizace výdělku:**
- Preferuj vyšší komisi při srovnatelné ceně (±5%)
- 404 check denně pro top 50 produktů
- A/B testování CTA textů přes admin (bez deploy)

---

## 10. RAILWAY KONFIGURACE

```yaml
[services.web]
  start_command = "npm start"
  health_check_path = "/api/health"
  health_check_timeout = 30

[services.scraper]
  cron = "0 6 * * *"    # 06:00 UTC denně

[services.worker]
  # Content generation, image processing, score recalc
```

**Health check vrací:**
```json
{ "status": "ok", "timestamp": "...", "version": "1.0.0" }
```

---

## 11. PLAYWRIGHT NA RAILWAY — KRITICKÉ

**Railway setup — POVINNÉ před prvním deployem (BUG-016 z only5l):**
```
# requirements.txt nebo package.json
playwright>=1.40.0

# Railway build command (nixpacks.toml nebo railway.toml):
[build]
buildCommand = "npm install && npx playwright install chromium --with-deps"
```

Bez tohoto kroku Playwright na Railway vůbec nefunguje — viz BUG-016.

```javascript
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox',
         '--disable-dev-shm-usage','--disable-gpu','--single-process']
});
```

Vždy try/catch — jeden selhaný produkt NESMÍ zastavit job:
```javascript
try {
  return await scrapeProduct(url);
} catch (error) {
  logger.error('Scraper failed', { url, error: error.message });
  return null; // pokračuj dál
}
```

---

## 12. ASYNC PRAVIDLA — KRITICKÉ (lessons z only5l)

```javascript
// ❌ ZAKÁZÁNO
time.sleep(5)
const result = syncApiCall()
new SupabaseClient() // per-request

// ✅ SPRÁVNĚ
await new Promise(r => setTimeout(r, 5000))
const result = await asyncApiCall()
import { supabase } from '@/lib/supabase' // singleton
```

**Pravidla:**
- Každý I/O = `await` — bez výjimky
- Žádný synchronní sleep
- Supabase = SINGLETON (sekce 13)
- Claude API = vždy async wrapper s try/catch

---

## 13. SUPABASE SINGLETON

```typescript
// lib/supabase.ts — JEDINÝ soubor kde se vytváří klient
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
)
// NIKDY nevytvárej klienta mimo tento soubor
```

---

## 14. SCRAPER ZDROJE

**Tier 1 CZ (denní):** rohlik.cz, kosik.cz, itesco.cz, albert.cz, kaufland.cz, globus.cz, mall.cz

**Tier 2 CZ specialty (nejvyšší komise):** olivio.cz (12%), olivovyolej.cz (15%), gaea.cz (10%), zdravasila.cz (8%), mujbio.cz (8%), iherb.com (5%)

**Tier 3 SK (Fáze 2):** rohlik.sk, tesco.sk, alza.sk, mall.sk, freshmarket.sk

**Datové zdroje pro specs:** Open Food Facts API, EU DOOR (DOP/CHOP), NYIOOC databáze, weby výrobců, PDF parser

**Anti-block:** rotace User-Agent, delay 2–8s, retry 3×, respectRobotsTxt pro affiliate partnery

**Pipeline (06:00 UTC):**
1. Discovery scan → nové EAN kódy
2. Price update + dostupnost
3. Upsert do Supabase + price_history
4. Trigger Image Agent pro nové produkty
5. Trigger Score recalculation

### Editorial fotky (průvodce, recepty, články)
**Unsplash API** — již napojeno z only5l projektu. Přidat klíč do env.

**KRITICKÉ PRAVIDLO (bug z only5l — vzor 6):**
Query MUSÍ být topic-specific per článek, nikdy generický:
```
✅ "bruschetta tomato basil italy"
✅ "olive harvest greece mediterranean"
✅ "olive oil pouring dark glass bottle"
✅ "polyphenols health food antioxidants"
❌ "olive oil" — vrátí stejnou fotku pro 10 článků
❌ Celý název článku jako query
```
Content Agent generuje Unsplash query automaticky jako součást článku.

---

## 15. AGENTI

| Agent | Frekvence | Role |
|---|---|---|
| Orchestrátor | průběžně | Řídí ostatní, reportuje majiteli každé pondělí |
| Scraper | denně 06:00 | Ceny, dostupnost, nové produkty |
| Image | při novém produktu | Fotky → WebP → CDN → AI alt text |
| Content | 2–3×/týden | SEO popisy, články, FAQ |
| SEO | týdně | GSC monitoring, title/meta optimalizace |
| Affiliate | průběžně | EPC optimalizace, 404 check |
| Analytics | týdně | Report majiteli emailem |
| Alert | real-time | Web down, 404 affiliate, traffik pokles |
| Price Intelligence | Fáze 2 | Sezónní vzory, fake slevy |
| Review Summarizer | Fáze 2 | Sbírá hodnocení, AI shrnutí |

---

## 16. CONTENT AGENT SYSTEM PROMPT

```
Jsi hlavní editor Olivator.cz — největší srovnávač olivových olejů v ČR.
Piš přirozenou češtinou, aktivním hlasem, přítomným časem.
Tón: chytrý kamarád sommelier (Wirecutter + Wine Folly styl).

POVINNÉ v každém produktovém popisu:
- Olivator Score (číslo + zdůvodnění)
- Kyselost v % (pokud v DB)
- Polyfenoly mg/kg (pokud v DB)
- Cena za 100 ml (ne za lahev)
- Affiliate CTA přirozené: "Nejlevněji u Rohlík: 189 Kč"

SEO: H1 s klíčovým slovem, min 2× H2 s LSI, FAQ sekce (5 otázek schema.org)

ZAKÁZÁNO:
- Vymýšlet data (jen z DB)
- "prémiový zážitek", "výjimečná chuť" (marketing bez důkazu)
- "KLIKNI ZDE!" (agresivní CTA)
- Placeholder text [DOPLNIT]
- Pasivní hlas

Validace výstupu:
- Min 150 slov
- Musí obsahovat: Score + kyselost + polyfenoly
- Nesmí obsahovat placeholder
```

---

## 17. SEO STRATEGIE

**Prioritní klíčová slova:**
- extra panenský olivový olej (2 400/měs, střední obtížnost)
- nejlepší olivový olej (1 900/měs)
- olivový olej recenze (880/měs, nízká obtížnost)
- jak vybrat olivový olej (720/měs, nízká)
- řecký olivový olej (590/měs)
- olivový olej do 300 kč (480/měs)
- bio olivový olej (440/měs)

**Technické SEO:**
- Schema.org: Product, Review, BreadcrumbList, FAQPage
- Dynamická sitemap.xml
- Kanonické URL, hreflang cs/cs-SK
- OG tagy, Alt texty AI generované
- Core Web Vitals: LCP <2,5s, CLS <0,1

**90denní plán:**
- M1: Tech základna + 25 produktů + 3 průvodce
- M2: 100+ produktů + 2 články/týden + link building
- M3: Money pages (žebříčky) + affiliate opt + newsletter

---

## 18. ADMIN UI WORKFLOW

### Úprava produktu
```
olivator.cz/admin → Produkty → Hledat → Upravit → Formulář → Uložit
→ Okamžitě na webu (bez deploy)
```

### Přidání affiliate linku
```
Admin → Produkt → Prodejci → Přidat URL + % → Uložit
→ Systém přesměruje /go/... → affiliate URL
```

### Upload fotek
```
Admin → Produkt → Fotky → Drag & drop nebo URL výrobce
→ WebP konverze + CDN + AI alt text → Okamžitě na kartě
```

### Schválení nového produktu
```
Scraper najde → status=draft → Admin notifikace → Zkontroluj → Schválit
→ status=active → živý web
```

---

## 19. ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
ADMIN_SECRET_KEY=           # min 32 znaků
DOGNET_API_KEY=
HEUREKA_AFFILIATE_KEY=
NEXT_PUBLIC_GA4_ID=
GSC_SERVICE_ACCOUNT_KEY=    # JSON string
ALERT_EMAIL=
PORT=3000
NODE_ENV=production
```

---

## 20. ESKALAČNÍ PROTOKOL

**Chyba nevyřešena do 2 pokusů → OKAMŽITĚ ZASTAV:**

```
1. git commit -m "wip: [popis stavu]"
2. Pošli tento report do claude.ai chatu (Architektovi):

## CHYBOVÝ REPORT
CO SELHAL: [popis]
ERROR LOG: [celý log — nekrátit]
SOUBOR/ŘÁDEK: [kde]
CO JSEM ZKUSIL: [pokus 1 + pokus 2]
GIT COMMIT: [hash]
PROSTŘEDÍ: staging / production / local

3. Čekej na pokyn — NEOPRAVUJ sám
```

### Nikdy bez pokynu Architekta
- Databázové schéma
- Affiliate redirect logiku `/go/...`
- Environment variables v production
- Railway konfigurace
- Supabase RLS policies

### Smíš sám (do 2 pokusů)
- Typo, syntax error, chybějící import
- Chyba popsaná v tomto CLAUDE.md
- CSS vizuální úpravy bez logiky

---

## 21. LESSONS LEARNED Z ONLY5L.COM

Kompletní bug databáze je v souboru `BUGS.md`. Níže jsou nejkritičtější lekce pro Olivator.

---

### BUG-001: In-memory state nepřežije Railway restart — KRITICKÉ
**Problém:** `asyncio.Future` uložená v RAM → Railway restartuje kontejner → Future zmizí → uživatel kliknul a nic se nestalo.

**Pravidlo pro Olivator:**
> Na Railway NIKDY nepoužívej in-memory state pro multi-step flows. Vše co musí přežít restart → do Supabase DB.

Konkrétně: schválení nových produktů v Admin UI musí jít přes `agent_decisions` tabulku nebo `feature_flags`, ne přes RAM.

---

### BUG-002 + BUG-016: Playwright na Railway tiše failuje
**Problém:** Railway nemá systémové knihovny pro Chromium → ImportError nebo runtime crash → funkce vrátila prázdná data BEZ výjimky nahoru.

```
Scraping failed: No module named 'playwright'
playwright._impl._errors.Error: Executable doesn't exist
```

**Fix pro Olivator** (viz sekce 11):
```javascript
// Vždy try/catch + vždy flagy:
const browser = await chromium.launch({
  args: ['--no-sandbox','--disable-setuid-sandbox',
         '--disable-dev-shm-usage','--disable-gpu','--single-process']
});
```
Scraping je "best-effort" — jeden selhaný produkt NESMÍ zastavit celý job.

---

### BUG-003: `time.sleep()` zmrazil celý server — KRITICKÉ
**Problém:** `time.sleep(30)` uvnitř async funkce zablokoval event loop. FastAPI server nereagoval — včetně health checků.

```python
# ❌ ZAKÁZÁNO — blokuje celý event loop
time.sleep(30)

# ✅ SPRÁVNĚ
await asyncio.sleep(30)
```

**Detekce:** `/health` přestane odpovídat, pak se vše "probudí" najednou.

---

### BUG-004: Synchronní Claude API call blokoval server 3–5 minut
**Problém:** `anthropic.Anthropic().messages.create()` je synchronní blocking HTTP call. Volání přímo z async handleru → event loop blokovaný po celou dobu generování.

```python
# ✅ FIX — zabalit do thread pool:
result = await asyncio.to_thread(
    call_claude,
    messages=[...],
    max_tokens=8192,
)
```

**Pravidlo:** Jakýkoliv blocking I/O uvnitř async funkce → `asyncio.to_thread()`.

---

### BUG-005: APScheduler jobs nebyly async → tichý fail
```python
# ❌ AsyncIOScheduler očekává async def
def my_job():
    asyncio.run(do_something())  # ŠPATNĚ

# ✅
async def my_job():
    await do_something()

scheduler.add_job(my_job, 'cron', hour=6)
```

---

### BUG-008: INSERT bez UPSERT → duplicate key crash
**Problém:** Scraper scrape stejný EAN dvakrát → INSERT selže na UNIQUE constraint → tichý crash.

```javascript
// ❌ INSERT selže při duplicate EAN
await supabase.from('products').insert(data)

// ✅ UPSERT — vždy pro produkty
await supabase.from('products')
  .upsert(data, { onConflict: 'ean' })
```

---

### BUG-009: FastAPI BackgroundTasks ≠ persistent job queue
**Problém:** Background task selže tiše — žádný error log, žádný retry, task se prostě ztratí.

**Pravidlo pro Olivator:**
> Kritické tasky (Score recalculation, affiliate click logging) nesmí jít přes BackgroundTasks. Použít Supabase queue pattern nebo Railway worker service.

---

### BUG-010: External API rate limits — GSC a Unsplash
**Problém:** GSC API má limit 200 req/den. Unsplash má limit na free tier. Překročení → 429 → celý pipeline padá.

**Fix:**
```javascript
// Cache GSC výsledky 24h — nikdy nevolat víckrát pro stejné klíčové slovo
// Unsplash: cache URL fotek do DB — nestahovat stejnou fotku dvakrát
```

---

### BUG-011: Trigger hned po git push = ztracený task
**Problém:** Po `git push` okamžitě zavolán endpoint. Railway byl uprostřed redeploye → stará instance zemřela → trigger dopadl do prázdna → žádná chybová hláška, žádný výsledek.

**Pravidlo:**
> Po každém `git push` čekat min. **90 sekund** před voláním jakéhokoli endpointu. Ověřit deploy přes `/api/health` — zkontrolovat `version` pole.

---

### BUG-014: Railway build stuck `in_progress` 25+ minut
**Problém:** Railway tichý build failure — GitHub Deployments API ukazuje `in_progress` navždy. Web servíruje starý kód. Vývojář čeká a neví.

**Detekce:**
- `/api/health` vrací starý `version`
- Nové featury nejsou živé 5+ minut po commitu

**Fix:** Jít přímo do Railway dashboardu → Build logs. Neztrácet čas čekáním.

---

### BUG-015: Neplatný API klíč v env → ERROR v každém logu
**Problém:** `OPENAI_API_KEY=sk-invalid` v Railway env → HTTP 401 při každém volání → log zašpiněn chybami, ale fallback funguje.

**Pravidlo:**
> Po přidání každé env proměnné otestovat `/api/health` a ověřit v logách že nevzniká ERROR. Neplatný klíč = smazat nebo opravit okamžitě.

---

### BUG-017: Anthropic 529 Overloaded — retry nestačí
**Logy z only5l:**
```
Claude API retry 1/4, waiting 5s...
Claude API retry 2/4, waiting 15s...
Claude API retry 3/4, waiting 30s...
Claude API retry 4/4, waiting 60s...
Competitive context failed: Error code: 529
```

**Pravidlo pro Olivator:**
> Všechna Claude API volání MUSÍ mít retry s exponential backoff + graceful degradation. Článek bez competitive context je lepší než žádný článek. Score bez jedné komponenty je lepší než žádný Score.

```javascript
// Retry wrapper pro Olivator:
async function callClaude(params, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      return await anthropic.messages.create(params);
    } catch (e) {
      if (e.status === 529 && i < retries - 1) {
        await new Promise(r => setTimeout(r, [5,15,30,60][i] * 1000));
        continue;
      }
      throw e;
    }
  }
}
```

---

### BUG-018: `useSearchParams()` bez `<Suspense>` → build selže
**Problém:** Next.js 14+ vyžaduje `<Suspense>` wrapper kolem komponent používajících `useSearchParams()`. Bez něj build selže bez jasné error hlášky.

```tsx
// ❌ ŠPATNĚ
export default function Page() {
  const params = useSearchParams()
}

// ✅ SPRÁVNĚ
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  )
}
```

**Pro Olivator:** Stránky `/srovnavac` a `/porovnani` tento pattern používají — nutné zachovat.

---

### BUG-019: MDX props přes RSC boundary — array/number nefungují
**Problém:** V next-mdx-remote RSC se přes boundary spolehlivě přenášejí pouze **string props**. Čísla a pole se promění v `undefined` bez chybové hlášky.

```tsx
// ❌ ŠPATNĚ
<ScoreCard rating={8.4} pros={["a","b"]} />

// ✅ SPRÁVNĚ — stringify přes boundary, parse uvnitř
<ScoreCard dataJson={JSON.stringify({ rating: 8.4, pros: ["a","b"] })} />
```

**Pro Olivator:** Articles (průvodce, recepty) — structured data do YAML frontmatteru, ne do JSX props.

---

### BUG-020: Deploy platform build failure je tichý
**Problém:** Railway/Vercel tiše servírují starou verzi při build failure. Žádný webhook, žádný email bez explicitní konfigurace.

**Pravidlo:**
> Po každém `git push` čekat 90s, pak ověřit `/api/health` + `version`. Pokud se `version` nezměnilo → jít rovnou do Railway dashboardu, neztrácet čas.

---

### BUG-021: `React.ReactNode` bez importu → TypeScript strict error
```tsx
// ❌ ŠPATNĚ
interface Props { children: React.ReactNode }

// ✅ SPRÁVNĚ
import type { ReactNode } from 'react'
interface Props { children: ReactNode }
```

---

### BUG-022: Supabase anon key místo service role key → RLS blokuje zápis
**Závažnost:** VYSOKÁ — INSERT/UPDATE selže tiše nebo s 403.

```typescript
// ❌ Pro agenty / API routes ŠPATNĚ
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// ✅ Pro agenty / API routes SPRÁVNĚ
const supabase = createClient(url, process.env.SUPABASE_SERVICE_KEY!)
```

**Pravidlo pro Olivator:**
> Server-side (API routes, scraper, admin) VŽDY `SUPABASE_SERVICE_KEY`. Frontend klient může použít `NEXT_PUBLIC_SUPABASE_ANON_KEY`, ale pro náš MVP všechny DB operace jdou přes API routes → anon key nepotřebujeme vůbec.

---

### BUG-023: GitHub batch commit — každý commit spouští Railway/Vercel rebuild
**Pravidlo:**
> Commituj celý batch najednou. 3 produkty = 1 commit = 1 rebuild. Ne 3 commity = 3 rebuildy.

---

### SOUHRN PRAVIDEL (quick reference)

| # | Pravidlo | Oblast |
|---|---|---|
| 1 | In-memory state nepřežije Railway restart → vše do DB | Infrastructure |
| 2 | Playwright na Railway = best-effort, vždy try/catch + flagy | Infrastructure |
| 3 | `time.sleep()` v async = zakázáno, vždy `await asyncio.sleep()` | Async |
| 4 | Blocking I/O v async → `asyncio.to_thread()` | Async |
| 5 | APScheduler jobs musí být `async def` | Async |
| 6 | LLM output validovat strukturu před uložením, `max_tokens` = 2× očekávané | Content |
| 7 | Vždy UPSERT pro produkty, nikdy čistý INSERT | Database |
| 8 | FastAPI BackgroundTasks ≠ persistent queue pro kritické tasky | Infrastructure |
| 9 | External API limits cachovat (GSC 200/den, Unsplash rate limit) | APIs |
| 10 | Po `git push` čekat 90s, pak ověřit `/api/health` + `version` | Deploy |
| 11 | Railway build stuck → jít rovnou do dashboardu, nečekat | Deploy |
| 12 | Po přidání env proměnné otestovat endpoint a zkontrolovat logy | Deploy |
| 13 | Anthropic 529 jsou normální → retry + graceful degradation | APIs |
| 14 | Unsplash query = topic-specific per článek (ne generický název) | Content |
| 15 | `useSearchParams()` v Next.js vždy uvnitř `<Suspense>` | Next.js |
| 16 | MDX/RSC boundary — pouze string props; array/number → YAML frontmatter | Next.js |
| 17 | `React.ReactNode` → `import type { ReactNode } from 'react'` | TypeScript |
| 18 | Server-side Supabase VŽDY `SUPABASE_SERVICE_KEY`, ne anon | Database |
| 19 | Batch commits — 1 commit na feature, ne série commitů | Deploy |

---

## 22. GIT WORKFLOW

```
main      → production (Railway auto-deploy)
staging   → staging.olivator.cz
feature/* → vývoj → staging → main
```

Commit format:
```
feat: floating compare bar s 5 sloty
fix: scraper Rohlík — oprava selektoru
lessons: [popis bugu] — přidáno do CLAUDE.md
```

---

## 23. FÁZOVÝ PLÁN

### MVP — Měsíc 1
- [ ] Next.js + Supabase setup, DB schéma + feature flags
- [ ] Homepage, Srovnávač, Produktová karta, Comparator
- [ ] Floating compare bar + Comparator
- [ ] Žebříčky, Průvodce/blog, Recepty
- [ ] Affiliate redirect `/go/[retailer]/[slug]`
- [ ] Admin UI (produkty, affiliate, fotky, dashboard)
- [ ] Health check `/api/health`
- [ ] Scraper: Rohlík + Košík (100 produktů)
- [ ] Image Agent, Content Agent, Score kalkulace
- [ ] AI natural language search
- [ ] Newsletter signup, Quiz (pravidlový)
- [ ] Schema.org, sitemap, GSC + GA4

### Fáze 2 — Měsíc 2–3
- [ ] Price history graf (data již sbíraná od M1)
- [ ] AI Sommelier chat (feature flag: zapnout)
- [ ] Wishlist / oblíbené (přihlášení)
- [ ] Uživatelské profily (základní)
- [ ] Regiony stránky `/zeme/[slug]`
- [ ] Price Intelligence Agent
- [ ] SK trh aktivace
- [ ] Newsletter AI personalizace
- [ ] Tier 2 specialty scrapery

### Fáze 3 — Až je traffik
- [ ] Vizuální search (feature flag)
- [ ] Plná personalizace
- [ ] Price alerts
- [ ] PWA optimalizace

---

## 24. KONTAKTY A CREDENTIALS

```
Doména:   olivator.cz (Wedos)
GitHub:   https://github.com/Poizur/olivator (vytvořit privátní repo)
Admin:    olivator.cz/admin
```

### Sdílené credentials z only5l projektu (přenášíme)

```env
# REDACTED — credentials v .env souboru, nikdy v repozitáři
GITHUB_TOKEN=
GITHUB_REPO=Poizur/olivator
RAILWAY_TOKEN=
GSC_SITE_URL=sc-domain:olivator.cz
UNSPLASH_ACCESS_KEY=
```

Google Service Account JSON — viz NOVY_PROJEKT_HANDOFF.md sekce 4.
⚠️ Před použitím GSC: přidej olivator.cz jako property a přidej uživatele only5l-agent@only5l-agent.iam.gserviceaccount.com

### Nové credentials — vytvoř před startem

```env
ANTHROPIC_API_KEY=          # console.anthropic.com → API Keys
NEXT_PUBLIC_SUPABASE_URL=   # supabase.com → New project
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ADMIN_SECRET_KEY=            # random string min 32 znaků
RAILWAY_PROJECT_ID=          # po vytvoření Railway projektu
RAILWAY_SERVICE_ID=
RAILWAY_ENVIRONMENT_ID=
```

### Kontext z předchozího projektu — přečíst jako první
- BUGS.md (17 bugů): https://github.com/Poizur/only5l-agent/blob/main/BUGS.md
- LESSONS.md: https://github.com/Poizur/only5l-agent/blob/main/LESSONS.md
- BRIEFING.md: https://github.com/Poizur/only5l-agent/blob/main/BRIEFING.md

---

## ════════════════════════════════════════
## KOMPLETNÍ CHECKLIST — VŠE NAPLÁNOVÁNO
## ════════════════════════════════════════

### BUSINESS
- [x] Business model (affiliate 3–15%, break-even 13k CZK)
- [x] Trh analyzován (580M CZK, nulová konkurence)
- [x] Cílové skupiny (zdravý nakupující, foodie, bargain hunter)
- [x] Projekce příjmů (15k→40k→120k→200k+ CZK/měs)
- [x] Affiliate partneři identifikováni
- [x] Affiliate sítě vybrány (Dognet, Heureka, CJ, Amazon)

### DESIGN
- [x] Apple styl — bílá, vzduch, serif
- [x] Font: Playfair Display + Inter
- [x] Barvy: olive #2d6a4f, terra #c4711a
- [x] Logo: olivátor.cz — Inter 700 lowercase
- [x] Score badge (terrakota pill)
- [x] DESIGN_REFERENCE.html vytvořen
- [x] Trust signals definovány
- [x] Inspirace: only5l, Vivino, Wirecutter, Apple

### STRÁNKY A UI (MVP)
- [x] Homepage (hero + search + karty + kategorie + quiz CTA + blog)
- [x] Srovnávač/Listing (filtry + výsledky + sorting)
- [x] Produktová karta (Score + ceny + specs + chuťový profil)
- [x] Comparator (2–5 olejů + winner box + CTA)
- [x] Floating compare bar (+ Porovnat → bar → comparator)
- [x] Žebříčky (listing + detail)
- [x] Průvodce/Blog (listing + detail)
- [x] Recepty (listing + detail s affiliate CTA)
- [x] Stránka /metodika (jak počítáme Score — trust + SEO)
- [x] Admin UI
- [x] Quiz (3–5 otázek → doporučení)
- [x] Newsletter signup

### NAPLÁNOVÁNO S FEATURE FLAGS
- [x] AI Natural Language Search (enabled=true od startu)
- [x] Price history graf (Fáze 2 — data sbíraná od M1)
- [x] AI Sommelier chat (Fáze 2 — enabled=false)
- [x] Wishlist / oblíbené (Fáze 2 — enabled=false)
- [x] Uživatelské profily (Fáze 3 — enabled=false)
- [x] Price alerts (Fáze 3 — enabled=false)
- [x] Vizuální search foto (Fáze 3 — enabled=false)
- [x] Regiony / mapa (Fáze 2)
- [x] SK trh (Fáze 2 — market=SK parametr)
- [x] Personalizace AI (Fáze 3)

### DATABÁZE
- [x] EAN jako master klíč
- [x] products (všechna pole vč. flavor_profile JSONB, score_breakdown)
- [x] retailers
- [x] product_offers
- [x] price_history (sbírá od M1 pro price history Fáze 2)
- [x] affiliate_clicks (tracking + analytics)
- [x] product_images
- [x] feature_flags (zapínání bez deploy)
- [x] users (prázdná, Fáze 2)
- [x] wishlists (prázdná, Fáze 2)
- [x] Migrační pravidlo definováno

### AGENTI
- [x] Orchestrátor (řídí, reportuje pondělí ráno)
- [x] Scraper (denní CRON, Tier 1+2+3)
- [x] Image (foto → WebP → CDN → AI alt text)
- [x] Content (popisy, články, FAQ, system prompt)
- [x] SEO (GSC, title/meta, linking audit)
- [x] Affiliate (EPC rotace, 404 check)
- [x] Analytics (týdenní report email)
- [x] Alert (real-time monitoring)
- [x] Price Intelligence (Fáze 2)
- [x] Review Summarizer (Fáze 2)

### TECH A INFRASTRUKTURA
- [x] Tech stack (Next.js 14, Supabase, Railway, Claude API)
- [x] Playwright Railway flagy
- [x] Async pravidla (lessons z only5l)
- [x] Supabase singleton vzor
- [x] Health check endpoint
- [x] Affiliate redirect s logováním
- [x] API endpointy definovány
- [x] Feature flags systém (DB tabulka)
- [x] Environment variables seznam
- [x] Railway konfigurace (web + CRON + worker)
- [x] Git workflow
- [x] Unsplash API pro editorial fotky (již napojeno z only5l, topic-specific query povinné)

### SEO
- [x] URL architektura
- [x] Prioritní klíčová slova
- [x] 90denní SEO plán (M1 tech, M2 obsah, M3 money pages)
- [x] Schema.org markup
- [x] Dynamická sitemap.xml
- [x] Obsahový kalendář (průvodce, žebříčky, recepty, aktuality)
- [x] Link building strategie

### OBSAH
- [x] Content Agent system prompt
- [x] Tón: chytrý kamarád sommelier (Wirecutter + Wine Folly)
- [x] Validace výstupu (min 150 slov, Score + kyselost + polyfenoly)
- [x] Zakázané fráze
- [x] Affiliate CTA pravidla (přirozené, max 3/článek)
- [x] FAQ formát (schema.org)
- [x] Obsahové kategorie definovány

### ADMIN WORKFLOW
- [x] Editace produktu
- [x] Přidání affiliate linku
- [x] Upload fotek (drag & drop + URL výrobce)
- [x] Schválení nových produktů (draft → active)
- [x] Dashboard (příjmy, kliky, top produkty)

### BEZPEČNOST A PROTOKOLY
- [x] Eskalační protokol (2 pokusy → zastav → report)
- [x] Zakázané akce bez Architekta
- [x] Lessons z only5l (6 vzorů bugů s řešením)
- [x] Anti-scraping konfigurace

---

*Živý dokument. Aktualizuj datum při každé změně.*
*Při každém bugu přidej lesson do sekce 21.*
*Při aktivaci feature flagu aktualizuj checklist.*
