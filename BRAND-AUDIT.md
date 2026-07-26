# BRAND AUDIT — Sitia, Motakis, Corinto, Evoilino
**Datum:** 2026-06-02  
**Zdroj:** Supabase REST API + file-system `/app/znacka/[slug]/page.tsx`

---

## SUMMARY TABLE

| Značka | DB slug | Status | URL | Produkty (active) | description_long | meta_title | meta_description | tldr | story | FAQs | Fotky (roles) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sitia | `sitia` | active | `/znacka/sitia` | 7/10 | 2511 znaků | **CHYBÍ** | 115 znaků (OK) | **CHYBÍ** | **CHYBÍ** | **0** | **ŽÁDNÉ** |
| Sitia Kréta | `sitia-kreta` | active | `/znacka/sitia-kreta` | 7/7 | 3079 znaků | 35 znaků (OK) | 113 znaků (OK) | 217 znaků (OK) | **CHYBÍ** | 6 | logo(1) |
| Motakis | `motakis` | active | `/znacka/motakis` | 3/3 | 2726 znaků | **CHYBÍ** | 121 znaků (OK) | **CHYBÍ** | **CHYBÍ** | **0** | logo(1) |
| Corinto | `corinto` | active | `/znacka/corinto` | 9/10 | 3010 znaků | 44 znaků (OK) | 105 znaků (OK) | 230 znaků (OK) | **CHYBÍ** | 6 | logo(1) |
| Evoilino | `evoilino` | active | `/znacka/evoilino` | 6/6 | 2458 znaků | 40 znaků (OK) | 109 znaků (OK) | 207 znaků (OK) | **CHYBÍ** | 6 | logo(1), editorial(1, inactive) |

---

## PER-BRAND SEKCE

### SITIA (`/znacka/sitia`)

**Databázové ID:** `891a7a94-b1af-4d32-99a6-1c94aba0ef37`  
**Duplicitní problém:** Existují DvA značky — `sitia` (koperativa, 10 produktů) a `sitia-kreta` (retail label, 7 produktů). Přestože jde o totéž (SITIA DOP Kréta), jsou vedeny odděleně. Je třeba zvážit merge nebo jasné rozlišení v meta textu.

**Produkty (10 celkem, 7 active):**
- score=92 Extra panenský olivový olej SITIA PDO 0.2 CRITIDA 4 l DESIGN
- score=None Extra panenský olivový olej Thema 02 PDO - 500ml Terra di Sitia
- score=None Extra panenský olivový olej Thema 02 PDO v plechovce - 1l Terra di Sitia
- 2 inactive: Prémiový SITIA PDO 0,2 3 l plech (score=83), Orino 1l plech

**Kritické mezery:**
- `meta_title` = prázdné → Next.js fallback: `"Sitia — olivový olej"` (generické, neoptimální)
- `tldr` = prázdné → stránka nezobrazuje trust-row "O značce" blok
- `story` = prázdné → BrandStory komponenta dostane prázdné timeline (zobrazí se prázdná sekce)
- `founded_year`, `generation`, `hectares`, `headquarters` = vše null → KPI grid zobrazí `—` ve 3 ze 4 polích
- `description_short` = prázdné (jen description_long má 2511 znaků)
- `philosophy` = prázdné
- **0 entity_images** → stránka padá zpět na fallback `/brand-fallbacks/gr.jpg` (generická Řecko fotka, není brandová)
- **0 entity_faqs** → žádná FAQ sekce, žádný FAQPage schema.org

**H1 / Title situace:**
- H1 = `brand.name` = "Sitia" ✓ (hardcoded v page.tsx)
- `<title>` = "Sitia — olivový olej | Olivator" (fallback z page.tsx řádek 113)
- Meta description = 115 znaků (existuje, OK)

**Nabídky:** 7 produktů má nabídky, vše u `reckonasbavi` (dle brand cross-ref).

---

### MOTAKIS (`/znacka/motakis`)

**Databázové ID:** `f7f06449-8a6a-44cb-916b-5daaad723c7c`

**Produkty (3 active):**
- score=68 Motakis Kréta Extra panenský olivový olej 5 l – plech
- score=62 Motakis Kréta Extra panenský olivový olej 1 l
- score=None Motakis Kréta Extra panenský olivový olej 5 l (duplicitní 5l bez skóre)

**Kritické mezery:**
- `meta_title` = prázdné → fallback `"Motakis — olivový olej"`
- `tldr` = prázdné → bez trust-row bloku
- `story` = prázdné
- Všechny numerické KPI = null (founded_year, generation, hectares, headquarters)
- `description_short` = prázdné
- `philosophy` = prázdné
- Pouze logo (1 active), žádná hero/editorial/gallery fotka
- **0 entity_faqs** → žádná FAQ sekce, žádný FAQPage schema.org
- `website_url` = `https://motakis.gr` (je vyplněno ✓)
- Nízké Olivator Score (62–68) — menší lákavost pro organický traffik

**Poznámka:** 3 produkty jsou málo pro plnohodnotnou brandovou stránku. KPI grid nebude vypovídající bez dat.

---

### CORINTO (`/znacka/corinto`)

**Databázové ID:** `ed45ac58-2528-4a20-ba0b-3c7c6bcc556e`

**Produkty (10 celkem, 9 active):**
- score=82 CORINTO Peloponés Extra panenský olivový olej (MANAKI) 0,3% 5 l
- score=72 CORINTO Peloponés - 600+ polyfenolů 500 ml
- score=68 CORINTO Peloponés BIO (MANAKI) 0,4% 5 l
- score=67 CORINTO Peloponés BIO 100 ml sklo
- score=67 CORINTO Peloponés BIO 500 ml
- ...celkem 9 active, 1 inactive

**Stav — nejlepší z auditovaných značek:**
- `meta_title` = 44 znaků (✓ existuje, pod limitem 70)
- `meta_description` = 105 znaků (✓ OK)
- `tldr` = 230 znaků (✓ existuje)
- 6 entity_faqs ✓
- Logo (1 active) ✓
- `website_url` = `https://www.corinto.cz` ✓ (český eshop, silný affiliate potenciál)
- Největší product portfolio ze 4 značek (9 active)

**Zbývající mezery:**
- `story` = prázdné → BrandStory sekce bude prázdná (žádné timeline, žádný příběh)
- `philosophy` = prázdné
- `founded_year`, `generation`, `hectares`, `headquarters` = vše null → KPI grid zobrazí `—`
- `description_short` = prázdné (jen description_long 3010 znaků)
- Žádná hero/editorial/gallery fotka (jen logo) → fallback na generickou `/brand-fallbacks/gr.jpg`

---

### EVOILINO (`/znacka/evoilino`)

**Databázové ID:** `84eb93fd-93ae-4bc9-aecf-af2564e22787`

**Produkty (6 active):**
- score=68 Evoilino Korfu Extra panenský olivový olej 0,3% 1 l - sklo
- score=68 Evoilino Korfu Extra panenský olivový olej 0,3% 500 ml - sklo
- score=68 Evoilino Korfu Extra panenský olivový olej 0,3% 5 l
- score=None Evoilino Korfu EVOO ve spreji s lanýžem 50ml
- score=None Evoilino Korfu EVOO ve spreji s česnekem 50 ml
- 1 další produkt bez skóre

**Stav — druhý nejlepší:**
- `meta_title` = 40 znaků ✓
- `meta_description` = 109 znaků ✓ (zmiňuje Lianolia + PGI Korfu — specifické klíčové výrazy)
- `tldr` = 207 znaků ✓
- `description_short` = 204 znaků ✓ (jediná ze 4 značek co má vyplněno)
- 6 entity_faqs ✓
- `website_url` = `https://evoilino.gr` ✓
- Logo existuje (1 active)

**Zbývající mezery:**
- `story` = prázdné
- `philosophy` = prázdné
- `founded_year`, `generation`, `hectares`, `headquarters` = null
- 1 editorial fotka ale status=`inactive` → nezobrazí se (viz `getEntityPhotos` filtruje `status='active'`)
- Ostatní 2 loga jsou inactive — třeba zkontrolovat proč (duplicitní upload?)
- Všechny produkty mají stejné skóre 68 → průměrné KPI bude nízké

---

## RECKONASBAVI — TOP ZNAČKY

**Retailer:** `Řecko nás baví` | slug: `reckonasbavi` | ID: `83525b89-23ec-4432-a38a-497839156aa8`  
**Celkem nabídek:** 62 (všechny in_stock=true)

| Pořadí | Brand slug | Počet produktů |
|---|---|---|
| 1 | intini | 10 |
| 2 | **corinto** | 10 |
| 3 | **sitia-kreta** | 7 |
| 4 | **evoilino** | 6 |
| 5 | orino | 6 |
| 6 | petromilos-zakynthos | 4 |
| 7 | nikolos | 3 |
| 8 | evolia-platinum | 3 |
| 9 | pallada-kreta | 3 |
| 10 | **motakis** | 3 |

**Závěr:** Všechny 4 auditované značky jsou primárně nebo výhradně u reckonasbavi. Corinto a sitia-kreta jsou jejich největší značky (10+7 produktů). Intini (10 produktů) zatím nemá plnohodnotnou brand stránku — kandidát na další audit.

---

## KEYWORD_MAPPING POKRYTÍ

**Výsledek pro všechny 4 značky: 0 záznamů.**

Tabulka `keyword_mapping` neobsahuje žádné brand-specific klíčová slova pro Sitia, Motakis, Corinto ani Evoilino. Brand stránky tak nejsou zahrnuty v SEO mapování projektu.

**Chybějící keyword záznamy k vytvoření:**

| Keyword | Est. objem | Navrhovaná target_url |
|---|---|---|
| sitia olivový olej | ~100/měs | `/znacka/sitia` |
| corinto olivový olej | ~80/měs | `/znacka/corinto` |
| evoilino olivový olej korfu | ~50/měs | `/znacka/evoilino` |
| motakis olej kréta | ~30/měs | `/znacka/motakis` |

---

## BRAND PAGE RENDERING — JAK STRÁNKA FUNGUJE

Soubor: `/Users/martinnavratil/Desktop/Projekty/olivator/app/znacka/[slug]/page.tsx`

**Co stránka renderuje (relevantní pro audit):**

1. **H1** = `brand.name` (vždy přítomen, OK pro všechny 4)
2. **Hero foto** = `entity_images` kde `image_role IN ('hero','editorial','gallery')` → pokud žádné, fallback `/brand-fallbacks/{country_code}.jpg`
3. **Subheading pod H1** = `headquarters ?? countryName(country_code)` + founded_year + generation (vše null u všech 4)
4. **KPI grid** = 4 pole: počet olejů / průměrné skóre / hektary nebo ceny / pěstuje od (null u všech 4 → pole zobrazí `—`)
5. **TrustRow** = `tldr ?? description_short` (null u Sitia a Motakis)
6. **BrandStory** = `timeline` (prázdné u všech 4), portfolio split (vypočítá se z produktů)
7. **EditorialStory** = `description_long` rozdělí na ## sekce (existuje u všech 4, ~2500–3100 znaků)
8. **EntitySeoAccordion** = FAQs (0 u Sitia a Motakis, 6 u zbytku)
9. **Metadata `<title>`** = `meta_title` (chybí u Sitia a Motakis → fallback "Sitia — olivový olej")

---

## ZÁVĚR — CO KAŽDÁ STRÁNKA POTŘEBUJE

### Sitia (`/znacka/sitia`) — Priorita: VYSOKÁ
- Doplnit `meta_title` (doporučení: "Sitia — DOP olivový olej z Kréty | Olivator", max 70 znaků)
- Doplnit `tldr` (2–3 věty pro TrustRow)
- Přidat alespoň 1 `entity_image` (role=`hero` nebo `editorial`, status=`active`) — jinak generická GR fotka
- Přidat `entity_faqs` (min 5 otázek pro FAQ schema.org)
- Zvážit: merge se `sitia-kreta` do jedné značky, nebo jasně rozlišit v meta textu (koperativa vs. retail label)
- Doplnit `founded_year`, `headquarters` pokud dostupné

### Motakis (`/znacka/motakis`) — Priorita: STŘEDNÍ
- Doplnit `meta_title`
- Doplnit `tldr`
- Přidat `entity_faqs` (0 → žádná FAQ sekce)
- Přidat hero/editorial fotku (logo existuje, ale to nestačí jako hero)
- Malý produktový katalog (3 produkty) — brandová stránka bude prázdně vypadat; zvážit zda je hodná samostatné stránky nebo spíše sloučit s obecnou GR/Kréta stránkou

### Corinto (`/znacka/corinto`) — Priorita: NÍZKÁ (nejlepší stav)
- Přidat hero/editorial fotku (logo existuje, fallback na generické GR)
- Doplnit `story`/`philosophy`/`founded_year` pro BrandStory sekci
- Doplnit `description_short`
- Stránka je jinak ready — má meta_title, meta_description, tldr, 6 FAQs, 9 produktů

### Evoilino (`/znacka/evoilino`) — Priorita: NÍZKÁ (druhý nejlepší stav)
- Aktivovat editorial fotku (`status` = `inactive` → změnit na `active`)
- Doplnit `story`/`philosophy`/`founded_year`
- Doplnit `description_short` (existuje jako 204 znaků ✓, ale zkontrolovat obsah)
- Stránka je jinak ready — má meta_title, meta_description, tldr, description_short, 6 FAQs, 6 produktů

---

*Audit zpracován z Supabase REST API + file-system. Keyword objemy jsou odhadní (brand keywords v keyword_mapping tabulce chybí).*
