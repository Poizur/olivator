# OLIVATOR — QUALITY-FIRST CONTENT STRATEGY 2026
# "Kvalita je na prvním místě" — postavit obsah který přežije Google updaty
# Filozofie: Lepší 1 perfektní článek za týden než 5 průměrných

---

## ZÁKLAD FILOZOFIE

**Co Google v 2026 hledá (E-E-A-T):**
- **Experience** — autor má reálnou zkušenost
- **Expertise** — autor zná téma
- **Authoritativeness** — externí signály důvěry
- **Trustworthiness** — transparentní zdroje, žádné lži

**Co Google ne chce:**
- AI obsah bez lidské intervence (Helpful Content Update penalizuje)
- Stock fotky z Depositphotos (signál nízké kvality)
- Bez author bylines (žádná autorita)
- Generic content (které existuje 1000× jinde)
- Bez sources (nedůvěryhodné)

---

## ČÁST 1 — CO JE DŮLEŽITÉ PRO SEO V 2026

### A) E-E-A-T signály (Google's #1 priority)

**1. Author bylines + Author pages**
- Každý článek musí mít autora (jméno, foto, bio)
- Author page s odkazy na všechny jeho články
- Bio musí ukazovat **expertise** (např. "Martin testuje olivové oleje od 2019, navštívil olivové háje v Andalusii a na Krétě")

**2. Schema.org Person markup**
```json
{
  "@type": "Person",
  "name": "Martin Navrátil",
  "jobTitle": "Zakladatel a hlavní recenzent",
  "knowsAbout": ["olivový olej", "středomořská gastronomie"],
  "sameAs": ["https://linkedin.com/in/...", "https://instagram.com/..."]
}
```

**3. About + Editorial Policy + Contact**
- `/o-projektu` — kompletní příběh
- `/editorial-policy` — jak rozhodujeme co psát (existuje?)
- Contact info viditelná
- Adresa firmy (i fiktivní home office)

**4. Affiliate disclosure**
- Každý článek s affiliate linky musí mít disclaimer
- "Olivator obsahuje affiliate odkazy. Cena pro tebe se nemění."

### B) Content depth (Google's quality signal)

**Pravidlo 10x rule:** Tvůj článek musí být 10× lepší než current top 1.

Co znamená "10× lepší":
- **Hlubší** — pokud konkurence má 1500 slov, ty máš 3000-5000
- **Originálnější** — vlastní data, vlastní fotky, vlastní testy
- **Strukturovanější** — TOC, H2/H3 hierarchy, FAQ schema
- **Vizuálnější** — vlastní fotky, infografiky, tabulky
- **Aktualizovanější** — datum poslední aktualizace, refresh každé 3 měsíce

### C) AI detection — jak nepadnout

**Google už zveřejnil:** "AI generated content is fine, but it must add genuine value."

Problém:
- Pure AI = generic = penalizace
- Pure AI s vlastními daty + edit + lidský review = OK

**Naše strategie:**
1. AI generuje **draft** (Sonnet, Learning Injection)
2. **Validátor češtiny** odstraní obvious AI fráze
3. **Lidský editor pass** (manuální 5-10 min per článek)
4. **2. AI pass** — Sonnet review s prompty "najdi co zní jako AI"
5. **3. fact-check** — Claude validuje konkrétní čísla/data
6. Až teprve publish

**Detekce nástroje:**
- Originality.ai (premium)
- Free: Copyleaks AI Content Detector

Cíl: detekce **pod 20% AI** (i pure human-written má 5-15%)

### D) Originální data (silný signál)

Google miluje **fresh, unique data**.

Co máme:
- ✅ 445 produktů s aktuálními cenami
- ✅ Score 0-100 (vlastní metrika)
- ✅ Cenová historie
- ✅ 18 prodejců aggregated

Co můžeme vytvářet:
- **Annual reports**: "Olivový olej v ČR 2026 — kompletní analýza" (study-based)
- **Monthly market reports**: cenové trendy
- **Test reports**: "Otestovali jsme 20 Lidl olejů — výsledky"
- **Survey results**: "Co Češi vědí o olivovém oleji?" (Google Forms na vlastních subscribers)

Tyto reporty získávají **přirozené backlinky** z médií, blogerů, vědců.

### E) Topical authority

Google hodnotí: **"Tahle stránka je expertem na téma?"**

Signály:
- Mnoho článků o stejném topicu (cluster)
- Internal linking mezi nimi
- Externí backlinks od relevantních autorit
- Old content (Google důvěřuje "staré" obsahu — 6+ měsíců)

Náš plán:
- 3 pillar pages (Ultimate Guide, Health, Buying Guide)
- 30-50 cluster článků odkazujících na pillars
- 18 měsíců minimum pro **plnou topical authority**

### F) Page experience signály

**Core Web Vitals:**
- LCP (Largest Contentful Paint) < 2.5s
- CLS (Cumulative Layout Shift) < 0.1
- INP (Interaction to Next Paint) < 200ms

**Mobile-first** (Google indexuje mobile verzi PRVNÍ):
- Mobile responsive (✓ máme po Master Foundation)
- Tap targets > 48px
- Readable font size

### G) Internal & external linking

**Internal:** 3-5 odkazů na související stránky per článek (✓ řešíme v Day 1)

**External:**
- Authority links: EU eAmbrosia, EFSA, IOC, scientific journals
- Min 2-3 external links per article
- DOFOLLOW links na trusted sources (signál důvěry)

---

## ČÁST 2 — FOTKY: DEPOSITPHOTOS vs. VLASTNÍ

### Reálné srovnání

| Aspekt | Stock (Depositphotos/Unsplash) | Vlastní fotky |
|---|---|---|
| Cena | $1-5 per foto | $0 (DIY) až $200 (pro foto) |
| Originalita | Nulová (na webu 1000×) | Unikátní |
| SEO signál | Slabý | Silný (image search) |
| E-E-A-T | Slabý (nemá ti to autoritu) | Silný (real experience) |
| Čas | 5 min | 30 min - 2 hod |
| Kvalita | Profesionální | Záleží na tobě |

### Strategie

**Hybrid přístup:**

**1. Hero obrázky** — vlastní pokud možno
- Příklad: článek o sklizni → tvoje vlastní foto olivy v ruce
- Pokud nelze → kvalitní stock, ALE editovat (crop, filter, overlay)

**2. In-article obrázky** — vlastní > stock
- Vlastní testy: fotka 5 olejů na stole vedle sebe
- Vlastní recepty: fotka jídla s konkrétním olejem
- Stock pro generic (např. olivový háj v Itálii kde jsi nebyl)

**3. Produkty** — vlastní > marketing
- Stávající: marketingové fotky výrobců (✓ legální use)
- Lepší: vlastní fotka produktu z různých úhlů
- Ideal: foto láhve + foto vyloženého oleje + lab test fotka

### Co můžeš dělat doma (DIY photography)

**Setup:**
- Smartphone s dobrým foťákem (iPhone 12+, Pixel 6+)
- Přirozené světlo u okna
- Bílé pozadí (kus papíru)
- 5 minut

**Co fotit:**
- Tvoje produkty co máš doma (5-10 fotek per produkt)
- Recepty když vaříš
- "Olej v akci" — kapání na chleba, do salátu
- Behind the scenes — testování, ochutnávání

**Tip:** Vyfoť 5-10 fotek **jedním shootingem** → použij napříč mnoha články.

### Vlastní fotka pravidla

- Min. resolution: 1200×800px
- Format: WebP (lighter) nebo high-quality JPEG
- Alt text popisný: "Detail kapek olivového oleje Casas de Hualdo s viditelnou zlatozelenou barvou"
- File name: descriptive ("casas-de-hualdo-detail-zlata-barva.jpg" ne "IMG_3847.jpg")
- EXIF data: zachovat (lokace, datum — autenticity signál)

### Doporučení teď

**Tento týden** — vyfoť doma:
- 5-10 produktů které máš
- 2-3 recepty s olejem
- "Behind the scenes" — tvoje pracovní místo, ochutnávání

To dá **30-50 vlastních fotek** pro budoucí články.

**Pro články kde nemáš vlastní fotky** → Unsplash (lepší než Depositphotos, kvalitní free):
- olivetreepictures.com (specific olive imagery, free)
- pexels.com
- unsplash.com

**Depositphotos používat MINIMUM** — vypadá to jako "korporátní website" ne "expert blog".

---

## ČÁST 3 — KVALITNÍ ČLÁNEK — KOMPLETNÍ CHECKLIST

Před publikací každý článek musí projít:

### A) Content quality (10 bodů)

- [ ] Min 1500 slov (lepší 2500-4000)
- [ ] H1 + min 5× H2 + H3 hierarchy
- [ ] TOC (Table of Contents) — clickable anchors
- [ ] Min 3 externí autoritativní zdroje (EU, EFSA, vědecké studie)
- [ ] Min 3 interní linky (na produkty + 2 související články)
- [ ] FAQ sekce min 5 otázek (FAQPage schema)
- [ ] Min 3 obrázky (1 hero + 2 in-article)
- [ ] Min 1 tabulka NEBO seznam pro skim-ability
- [ ] Konkrétní data (čísla, procenta, ceny — ne "mnoho/několik")
- [ ] Quotable insight — věta která se dá tweetnout

### B) AI detection (5 bodů)

- [ ] Pure AI fráze NULA (validátor češtiny pass)
- [ ] AI detection tool: <20% AI (Copyleaks free check)
- [ ] Druhý průchod AI s prompt "kde to zní jako AI"
- [ ] Manuální edit min 10% obsahu (vlastní příklady, anekdoty)
- [ ] Czech idioms a slang (AI typicky používá doslovný překlad)

### C) SEO technical (10 bodů)

- [ ] Title 50-60 znaků s primárním keywordem
- [ ] Meta description 150-160 znaků
- [ ] H1 obsahuje keyword (1×)
- [ ] H2 obsahují semantic keywords
- [ ] URL slug krátký a descriptive
- [ ] Schema.org Article markup
- [ ] Schema.org FAQPage (pokud FAQ)
- [ ] Schema.org BreadcrumbList
- [ ] Internal links 3-5
- [ ] External links 2-3

### D) Images (5 bodů)

- [ ] Hero image (1200×800px+)
- [ ] WebP nebo high-quality JPEG
- [ ] Alt text descriptive, obsahuje keyword
- [ ] File name descriptive
- [ ] Lazy loading

### E) E-E-A-T (5 bodů)

- [ ] Author byline (jméno + foto + bio)
- [ ] Datum publikace + "Aktualizováno"
- [ ] Affiliate disclosure (pokud relevantní)
- [ ] Sources cited (links na zdroje)
- [ ] Schema.org Person + Organization

**Pass threshold: 30/35** (86%+). Pod tím → fix nebo skip.

---

## ČÁST 4 — NOVÝ ČLÁNEK WORKFLOW (každý článek)

### Krok 1 — Topic research (15 min)

1. Otevři Google.cz, vyhledej keyword
2. Analyzuj top 5 výsledků:
   - Co píšou?
   - Co jim CHYBÍ?
   - Co můžu udělat 10× lepšího?
3. Najdi 3 související questions z "People Also Ask"
4. Plán: jaký angle / hook?

### Krok 2 — Outline (15 min)

```markdown
# Hlavní keyword (primary)
Sekondary keywords: X, Y, Z

## Hook
[1-2 věty které čtenáře zaujmou]

## H2: Co je to + proč na tom záleží
[Definice + value prop]

## H2: Klíčové aspekty (3-5 podbodů)
### H3 podbod 1
### H3 podbod 2
### H3 podbod 3

## H2: Naše doporučení
[Internal links na 3-5 produktů]

## H2: Recepty / Praktické tipy
[Akce-oriented obsah]

## H2: FAQ
[5-7 nejčastějších otázek]

## Závěr + CTA
[Newsletter signup + další článek]
```

### Krok 3 — Draft (Claude Sonnet, 20 min)

```
System prompt pro Sonnet:

Jsi expert na olivový olej s 10 let zkušeností. Píšeš pro Olivator.cz
— největší srovnávač olivového oleje v ČR.

KRITICKÁ PRAVIDLA:
1. Žádné AI fráze ("v dnešní době", "je důležité si uvědomit", 
   "pojďme se podívat", "úžasný", "fantastický", "nezbytné")
2. Tykání. Krátké věty (max 20 slov).
3. Konkrétní čísla, ne "mnoho/několik" (např. "Picual má 49 % polyfenolů 
   víc než Arbequina")
4. Authority cite: EU regulations, EFSA, IOC, NEJM/Nature/Lancet 
   pokud vědecké
5. Konkrétní produkty z DB (poskytnu seznam)
6. Personal voice — "vyzkoušeli jsme", "můj favorit", "překvapilo mě"
7. Czech idioms — žádný doslovný překlad z angličtiny

VÝSTUP: Markdown s H2/H3, min 2500 slov, internal links, FAQ na konci.

Lekce z předchozích běhů (z project_learnings):
[LEARNING INJECTION ZAPRACUJE]
```

### Krok 4 — AI review pass (10 min)

```
System prompt pro Sonnet review:

Přečti přiložený článek. Najdi:
1. AI fráze které jsem mohl propustit
2. Místa kde zní generičtě
3. Tvrzení bez zdroje
4. Sekce které by mohly být kratší
5. Příležitosti pro internal linking

Vrať konkrétní seznam s návrhy oprav.
```

### Krok 5 — Lidský editor pass (10 min)

Tvoje role:
- Přidat 1-2 osobní anekdoty ("Když jsem byl loni v Andalusii...")
- Editovat 10% obsahu vlastními slovy
- Přidat 1-2 čísla z aktuální DB (live data)
- Verifikovat fact-claims (Google search)
- Čtěte nahlas — zní to lidsky?

### Krok 6 — AI detector check (5 min)

```bash
# Copy article do https://copyleaks.com/ai-content-detector
# Goal: <20% AI score
# Pokud >20% → další editor pass
```

### Krok 7 — Images (15 min)

- Vyfoť 1-2 nové (telefon, doma)
- Nebo Unsplash pro generic
- Alt text descriptive
- WebP convert
- Compress (TinyPNG)

### Krok 8 — Final pre-publish check (10 min)

Projdi checklist z Části 3 — 30/35 minimum.

### Krok 9 — Publish + promote

- Add to DB
- Sitemap auto-updates
- Submit URL přes GSC
- Share na sociálních (až budeme mít)

**Total time per article: ~1.5-2 hodiny human work**

---

## ČÁST 5 — POSTUP — JAK ZAČÍT TENTO TÝDEN

### Den 0 (dnes-zítra) — PŘÍPRAVA, ne sprint

**Místo pouštění Claude Code rovnou:**

#### 1. Vyfoť doma (30-60 min)

- 5-10 produktů které máš doma
- Pracovní místo (notebook + olej)
- Behind the scenes (ochutnávání)
- Recepty pokud vaříš

**Output:** 30-50 fotek pro budoucí články.

#### 2. Vytvoř author bio + foto (1 hodina)

- Vyfoť selfie (profesionální)
- Napiš bio (200-300 znaků)
- Příklad: *"Martin testuje olivové oleje od 2019. Navštívil olivové háje v Andalusii a na Krétě. Zakladatel Olivator.cz."*
- LinkedIn profil aktualizuj

#### 3. Vytvoř Editorial Policy (30 min)

`/editorial-policy` stránka (existuje, ale možná basic).
Doplň:
- Jak hodnotíme produkty
- Affiliate disclosure
- Korekce chyb
- Diversity sources
- Update cyklus

#### 4. Vytvoř /o-projektu — pořádný (1 hodina)

Tvůj příběh:
- Proč jsi začal Olivator
- Jaké jsi měl problémy s olivovým olejem
- Tvoje cesta
- Tým (pokud někdo další)
- Mission

#### 5. Nastav Copyleaks free account (5 min)

https://copyleaks.com/ai-content-detector
Free tier = 1000 slov/měsíc. Plný plán $10/měs (až bude budget).

### Den 1 — Articles Master Plan FIRST (Quick Wins Only)

**Pošli Claude Code TENTO PROMPT** (modifikovaný original):

```
Den 1 — Articles Master Plan (FIX ONLY, žádný nový obsah)

ÚKOL 1.1 — Fix {{date.year}} template variables
ÚKOL 1.2 — Sitemap fix (4 → 23 článků)
ÚKOL 1.3 — Meta descriptions regenerace 6 článků
ÚKOL 1.4 — Internal links na 23 článků (3-5 per článek)

NEDĚLEJ ZATÍM:
- Žádné nové články
- Žádné landing pages
- Žádný nový obsah

Hard limit: $0.20
Validátor češtiny POVINNÝ pro meta descriptions.

Po dokončení STOP a report.
```

Tohle nejsou nové články, jen oprava existing. Bezpečné.

### Den 2-3 — STOP. Lidská práce.

**Tento čas je tvůj — kvalita vyžaduje lidskou ruku.**

1. **Vyber 1 keyword s nejvyšším potenciálem** pro pilot článek
   - Doporučuji: `řecký olivový olej` (610 hits/měsíc, konkurence 0)
   - Nebo: `olivový olej na smažení` (480 hits/měsíc)

2. **Sleduj Workflow z Části 4** krok po kroku
   - Topic research → outline → draft → AI review → lidský edit → check → publish

3. **Tento 1 článek bude STANDARD** pro všechny další

4. **Pošli mi draft k review** PŘED publish.

### Den 4-7 — Druhý článek po stejném procesu

Druhý keyword cluster, stejný workflow.
**2 perfektní články** za týden je lepší než 10 průměrných.

---

## ČÁST 6 — CO ŘEŠIT KAŽDÝ DEN/TÝDEN

### Daily checklist (5 min/den)

- [ ] Otevři GSC, podívej se na top queries
- [ ] Najdi otázky které lidé hledají
- [ ] Zapiš do "ideas" listu

### Weekly checklist (30 min/týden, pátek)

- [ ] Zkontroluj traffic v GA4
- [ ] Co fungoval, co ne
- [ ] Update 1 existing článek (refresh)
- [ ] Publish 1-2 nové (až workflow funguje)
- [ ] Sleduj backlinks (Ahrefs free)
- [ ] Refresh sitemap GSC submit

### Monthly checklist (2 hodiny/měsíc)

- [ ] Site audit (Screaming Frog free)
- [ ] Lighthouse top 10 pages
- [ ] Schema markup validation
- [ ] Mobile-first check
- [ ] Update editorial calendar
- [ ] Plánuj sezónní obsah

---

## ČÁST 7 — METRIKY KVALITY (ne kvantity)

**Žádné "kolik článků" — zaměříme se na:**

| Metrika | Cíl Q1 | Cíl Q2 | Cíl Q3 | Cíl Q4 |
|---|---|---|---|---|
| **Avg article time on page** | >2 min | >3 min | >3:30 | >4 min |
| **Bounce rate** | <70% | <60% | <55% | <50% |
| **Pages per session** | 1.5 | 2.0 | 2.5 | 3.0 |
| **Newsletter conversion** (article visitor → sub) | 1% | 2% | 3% | 5% |
| **Avg backlinks per top 10 articles** | 1 | 3 | 8 | 15 |
| **Featured snippets owned** | 0 | 2 | 5 | 10 |
| **Articles with 100+ visits/month** | 0 | 5 | 15 | 30 |

**Toto jsou ROZHODUJÍCÍ metriky.** Ne raw visits.

---

## ČÁST 8 — CO NEDĚLAT (časté chyby)

### ❌ Nepublikuj pure AI obsah
Google už detekuje. Penalizace je tichá ale brutální.

### ❌ Nepoužívej stock fotky z Depositphotos
Vypadá to jako "korporátní content marketing", ne expert blog.

### ❌ Nepiš pro keyword density
2026 to nefunguje. Google rozumí semantice.

### ❌ Nepublikuj bez author bylines
E-E-A-T penalizace. Anonymní = nedůvěryhodné.

### ❌ Nepublikuj duplicate content
Pokud máš 5 podobných článků → merge do jednoho lepšího.

### ❌ Nepublikuj bez sources
Tvrzení bez zdroje = nedůvěryhodné. Min 3 external authority links per article.

### ❌ Nepublikuj přes noc
Google miluje **konzistenci**. 1 článek týdně je lepší než 10 najednou + 3 měsíce nic.

### ❌ Nezapomeň refresh
Top články refresh každé 3-6 měsíců (datum update + nová data).

---

## FINÁLNÍ STRATEGIE — 12 MĚSÍCŮ

### Q1 2026 (květen-červenec) — FOUNDATION

- Articles fixes (23 článků)
- 2 pilot articles per týden (=24 articles over 12 weeks)
- Vyfocení vlastních fotek (50+)
- /o-projektu + /editorial-policy hotové
- Author bio + foto

**Cíl:** 5 000 unique visits/měsíc na konci Q1

### Q2 2026 (srpen-říjen) — EXPANSION

- 1-2 perfektní články týdně (~16-24 articles)
- 3 pillar pages (Ultimate Guide, Health, Buying Guide)
- Backlink outreach začínat
- Refresh top 10 starých článků

**Cíl:** 15 000 unique visits/měsíc

### Q3 2026 (listopad-leden) — HARVEST SEASON PUSH

- Sezónní obsah (sklizeň, vánoce, dárky)
- 2 articles týdně
- PR push (médi outreach)
- Brand recenze (Lidl, Tesco, Monini)

**Cíl:** 30 000 unique visits/měsíc

### Q4 2026 (únor-duben) — AUTHORITY BUILDING

- Year in review article
- Annual report "Olivový olej v ČR 2026"
- Test series (vlastní testy)
- 2 articles týdně
- Featured snippets owned: 10+

**Cíl:** 50 000+ unique visits/měsíc + 13 000+ Kč/měsíc affiliate revenue

---

## INVESTICE A NÁVRATNOST

### Tvůj čas

- Day 0 prep: 4-5 hodin
- Per článek: 1.5-2 hodiny human work
- 2 články týdně = 3-4 hodiny work/týden
- Plus daily/weekly check-ins: 1-2 hodiny/týden
- **Total: 5-6 hodin/týden** (manageable side project)

### AI náklady

- Articles Master Plan: $0.20
- Per nový článek: ~$0.05 (Sonnet draft + review)
- 2 články týdně × 4 týdny × 12 měsíců = ~$5 (extrémně levné)

### Stock fotky (minimal)

- Unsplash: zdarma
- Pexels: zdarma
- DIY foto: zdarma
- **Total: $0**

### Tools

- Copyleaks AI Detector: $10/měsíc (až bude budget)
- Screaming Frog free: $0
- GSC + GA4: $0
- Ahrefs free: $0
- **Total month 1-3: $0**

### Total roční investice

**~$30 AI + 250 hodin tvého času = projekt s revenue 13 000+ Kč/měsíc do roka.**

---

## CO TEĎ KONKRÉTNĚ DĚLAT

### Tento týden:

**Pondělí:**
- Pošli Claude Code prompt na Articles Master Plan FIX ONLY ($0.20)

**Úterý-Středa:**
- Vyfoť doma (30-60 min)
- Napiš author bio
- Aktualizuj /o-projektu

**Čtvrtek-Pátek:**
- Pilot article (1 z těchto):
  - "Řecký olivový olej — kompletní průvodce 2026" (high volume, low competition)
  - NEBO: "Olivový olej na smažení — vědecky podloženo" (specific intent)
- Sleduj Workflow z Části 4
- 1.5-2 hodiny tvé práce
- Pošli mi draft před publish

**Víkend:**
- Druhý článek nebo refresh existujícího

---

## ROZHODOVACÍ MOMENT

**Nevidím žádný důvod sprintovat 10 landing pages za týden.**

**Místo toho:**
1. Den 1: Quick fixes (article infrastructure)
2. Den 2-3: Foundation work (fotky, bio, editorial policy)  
3. Den 4-7: 1-2 PERFEKTNÍ článek
4. Příští týden: další 1-2 perfektní

**Tempo:** 1-2 articles týdně, **kvalita > kvantita**.

**Za 6 měsíců:** 26-48 perfektních článků = topical authority.

To je business model, ne content farm.

🫒
