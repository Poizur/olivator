# AUTOMATION AUDIT — červenec 2026
**Datum:** 2026-07-26  
**Cíl:** Mapa všech automatizací a jejich dopad na datovou pravdu  
**Politika (2026-07-24/25):** žádné automatické zápisy obsahu bez human gate · žádní noví prodejci/produkty bez člověka · žádná tvrzení bez zdroje · admin = web = DB

---

## 1. KOMPLETNÍ INVENTURA AUTOMATIZACÍ

### 1.1 Cron joby

| Cron | Kdy (UTC) | Hlavní funkce | Zapisuje do | Generuje obsah? | Vytváří entity? | Posílá email? |
|---|---|---|---|---|---|---|
| `cron:feed-sync` | `0 4 * * *` | XML feed sync, auto-research nových draftů, backfill | products(draft), product_offers, price_history | backfill popis (draft) | products(draft) ✅ | Ne |
| `cron:discovery` | `30 4 * * *` | Playwright crawl shopů bez XML fedu | discovery_candidates(needs_review) | Ne | Ne přímо ✅ | Ano (souhrn) |
| `cron:radar` | `0 */2 * * *` | RSS scan → AI překlad → radar_items | radar_items (is_published=true!) | **Ano — auto-publish** | Ne | Ne |
| `cron:prospect` | `0 5 * * *` | Hledání nových e-shopů | discovery_sources(suggested) | Ne | Ne ✅ | Ano (souhrn) |
| `cron:link-check` | `0 2,4 * * *` | Mrtvé affiliate URL | product_offers (fail_count, status, in_stock) | Ne | Ne | Ne |
| `cron:entity-aggregate` | `0 3 * * *` | Přepočet cultivar agregátů | entity tabulky (stats, scores) | Ne (přepočet) | Ne | Ne |
| `cron:learning` | `0 8 * * 1` | Extrakt lekcí z git + agent_decisions | project_learnings, agent_decisions | Ne (interní) | Ne | Ne |
| `cron:manager` | `0 5 * * 1` | Týdenní strategický report | manager_reports, agent_decisions | Ano — report | Ne | Ano (majitel) |

### 1.2 Lib agenti (volané z cronů nebo admin endpointů)

| Agent / Funkce | Volán z | Zapisuje | Human gate? |
|---|---|---|---|
| `runDiscoveryAgent()` | cron:discovery | discovery_candidates, discovery_proposals | ✅ vše→needs_review |
| `publishCandidate()` | admin approve endpoint | products, product_offers, product_images | ✅ admin click |
| `runFeedSync()` | cron:feed-sync | viz výše | ✅ nové→draft |
| `runRadarAgent()` | cron:radar | radar_items | ⚠️ auto is_published |
| `runLinkRotCheck()` | cron:link-check | product_offers | 🟡 auto deaktivace |
| `recomputeAllCultivars()` | cron:entity-aggregate | entity agregáty | ✅ přepočet, ne obsah |
| `runLearningExtraction()` | cron:learning | interní DB | ✅ interní |
| `runManagerReport()` | cron:manager | manager_reports | ✅ interní + email |
| `runProspector()` | cron:prospect | discovery_sources(suggested) | ✅ jen návrh |

### 1.3 DB triggery
Žádné `TRIGGER` v Supabase DB nebyly nalezeny. Přepočty probíhají programaticky přes `entity-aggregator.ts`.

---

## 2. KLASIFIKACE 🟢🟡🔴

### 🟢 BEZPEČNÉ (splňují politiku 2026-07-24)

**cron:feed-sync** — nové produkty dostávají `status: 'draft'`. Existující produkty: jen backfill `image_url` pokud je null, žádné přepsání statusu ani certifikací. ✅  

**cron:discovery** — PROPOSE-ONLY mode (L-031). Vše jde do `discovery_candidates.status='needs_review'`. Admin musí kliknout Schválit. ✅  

**cron:prospect** — pouze `discovery_sources.status='suggested'`. Cron nikdy nepřidá aktivního retailera. ✅  

**cron:entity-aggregate** — přepočítává agregáty (průměrný score, počet produktů) pro entity stránky. Nemění status produktů ani obsah článků. ✅  

**cron:learning** — zapisuje do `project_learnings` a `agent_decisions`. Interní systém, nezobrazuje se na webu. ✅  

**cron:manager** — vytváří report pro majitele (email + DB záznam). Nepublikuje obsah na web. ✅  

**admin approve endpoint** — `publishCandidate()` se volá výhradně po admin kliknutí. Human gate zachován. ✅  

---

### 🟡 SLEDOVAT (riziko, ale aktuálně pod kontrolou)

**cron:radar — auto-publish AI překladu**

- Co dělá: RSS scan → stahuje fullText → Claude přeloží a lokalizuje → upsert do `radar_items`
- Auto-publish logika (`lib/radar-agent.ts:372`):
  ```typescript
  const isPublished = !(hasNoFullText && isTooShort)
  ```
  Pokud má fullText NEBO je článek ≥ 500 znaků → `is_published: true` automaticky
- Zobrazuje se na `/novinky` — veřejná stránka
- Zdroj má source URL (odkaz na originál) ✅ — tvrzení není bez zdroje
- Riziko: AI překlad může obsahovat nepřesnosti nebo chyby lokalizace bez lidské kontroly
- Četnost: každé 2 hodiny, max 5 položek za běh

**publishCandidate() + EAN match = potenciální democe aktivního produktu**

- Scénář: Admin schválí discovery kandidáta → `publishCandidate()` najde existující produkt (EAN match) → `.update({ ...updatable })` obsahuje `status: 'draft'`
- Výsledek: Aktivní produkt (`status: 'active'`) by byl přepsán na `status: 'draft'` a zmizel z webu
- Kde: `lib/discovery-agent.ts:328-334`
- Kdy: POUZE při admin akci (ne nočně) — ale bug je reálný
- Závažnost: vysoká při výskytu, nízká pravděpodobnost (EAN match se aktivním produktem)

**discovery_auto_publish setting — dead code**

- `getSetting('discovery_auto_publish')` se čte na řádku 818 discovery-agenta
- Proměnná `autoPublish` NIKDY není použita v následující logice — vše jde přes PROPOSE-ONLY
- Riziko: Kdokoli by mohl věřit, že nastavením `discovery_auto_publish=true` v DB spustí auto-publish. Nestane se (logika ho ignoruje), ale je matoucí
- Doporučení: smazat čtení nadbytečné proměnné

**cron:link-check — automatická deaktivace nabídek**

- Po 2 nočních failech (threshold=2) nastaví `product_offers.status='inactive'`  
- Tato deaktivace se projeví ihned — nabídka zmizí z webu
- Akce je reverzibilní (re-enable přes admin) ✅
- Riziko: false positive při krátkém výpadku e-shopu může deaktivovat validní nabídku
- Audit trail: `fail_count` a `last_fail_at` jsou viditelné v admin UI

---

### 🔴 AKTIVNĚ PORUŠUJE POLITIKU

**Žádná automatizace nebyla nalezena, která by k dnešnímu datu aktivně porušovala politiku 2026-07-24.**

Politika vznikla 2026-07-24. Existující PROPOSE-ONLY mode (L-031) a `status: 'draft'` pattern byly implementovány dříve a jsou kompatibilní.

---

## 3. KONTROLNÍ OTÁZKY

### a) Kde by noční běh mohl přepsat DB bez vědomí majitele?

| Tabulka | Cron | Co přepíše | Schválení? |
|---|---|---|---|
| `radar_items.is_published` | cron:radar | auto-publish AI překladu | ❌ Ne |
| `product_offers.status/in_stock` | cron:link-check | deaktivace mrtvých URL | ❌ Ne (reverzibilní) |
| `products.image_url` | cron:feed-sync | backfill fotky (jen pokud null) | — bezpečné |
| Vše ostatní | — | — | ✅ human gate |

### b) Jaký obsah se generuje AI a jde přímo na web?

Pouze `radar_items` (sekce `/novinky`). Obsah je překlad/lokalizace existujícího novinářského článku se zdrojem — ne generovaný z ničeho.

Produktové popisy, články, průvodce — VŠECHNY jdou přes `status: 'draft'` a vyžadují admin schválení.

### c) Kde chybí audit trail?

| Oblast | Stav |
|---|---|
| Radar auto-publish | Pouze `agent_decisions` záznam — není viditelný v admin UI |
| Link-check deaktivace | `fail_count` v DB, viditelný v admin UI ✅ |
| Feed-sync nové drafty | `agent_decisions` + draft v admin UI ✅ |
| Discovery proposals | `discovery_candidates` + email ✅ |
| Admin approve akce | `agent_decisions` ✅ |

### d) Může noční běh vytvořit nového prodejce nebo aktivní produkt?

**Ne.** Ověřeno:
- Discovery: PROPOSE-ONLY, vše do `needs_review`
- Feed-sync: nové produkty → `status: 'draft'`
- Prospect: `discovery_sources.status='suggested'`
- Žádný cron nevolá `publishCandidate()` přímo

### e) Respektují automatizace politiku "žádná tvrzení bez zdroje"?

- `radar_items`: každá položka má `source_url` (originální článek) ✅
- Produktové popisy generované feed-syncem: v `draft`, zdroj = XML feed URL ✅
- Score breakdown: počítá se z DB hodnot, ne z AI spekulace ✅

---

## 4. NOČNÍ KLID — NAVRHOVANÁ PRAVIDLA

Tento seznam definuje, co se NESMÍ automaticky měnit bez lidské akce:

```
NOČNÍ KLID (2026-07-26):
✅ Může: products.image_url (backfill, jen pokud null)
✅ Může: product_offers.price, in_stock, fail_count, last_checked
✅ Může: product_offers.status → 'inactive' (po threshold failech)
✅ Může: radar_items (AI překlad z RSS se zdrojem)
✅ Může: discovery_candidates (status='needs_review')
✅ Může: entity agregáty (přepočet)
✅ Může: agent_decisions, manager_reports (interní)

❌ Nesmí: products.status → 'active' (bez admin kliknutí)
❌ Nesmí: products.certifications (přepsání existujících)
❌ Nesmí: articles.status → 'active' (bez admin kliknutí)
❌ Nesmí: retailers.is_active → true (bez admin kliknutí)
❌ Nesmí: Nový záznam v products s status='active'
❌ Nesmí: Nový záznam v retailers s is_active=true
```

---

## 5. NÁVRH FIXŮ

### Fix F-01: publishCandidate — nevymazávat status aktivních produktů (🟡 → 🟢)

**Problém:** `lib/discovery-agent.ts:328` — update existujícího produktu přepisuje `status: 'draft'`

**Fix:**
```typescript
// Před update: načti existující status
const { data: existing } = await supabaseAdmin
  .from('products')
  .select('id, status')
  .eq('ean', scraped.ean)
  .maybeSingle()

if (existing) {
  const { name_short, status: _status, ...updatable } = productPayload
  // Nepřepisuj status pokud je produkt aktivní
  const updatePayload = existing.status === 'active'
    ? { ...updatable, slug: undefined }
    : { ...updatable, slug: undefined, status: 'draft' }
  await supabaseAdmin.from('products').update(updatePayload).eq('id', existing.id)
}
```

**Priorita:** Střední — nastane jen při admin akci, ale efekt je vážný (produkt zmizí z webu)

---

### Fix F-02: Smazat dead code `autoPublish` (🟡 → 🟢)

**Problém:** `lib/discovery-agent.ts:818` — načítá `discovery_auto_publish` setting ale nikdy ho nepoužije

**Fix:** Smazat `const autoPublish = ...` a `autoPublished: 0` z výsledkového objektu (nebo zachovat jen pro backward compat v result shape)

**Priorita:** Nízká — neovlivňuje funkčnost, jen čistota kódu

---

### Fix F-03: Radar — volitelný human gate pro non-trivial AI content (politické rozhodnutí)

**Otázka pro Architekta:** Má `/novinky` mít human gate, nebo je auto-publish AI překladu z RSS se zdrojem přijatelný?

**Option A (status quo):** Pokud má fullText nebo je ≥ 500 znaků → auto-publish ✅ (rychlé novinky)  
**Option B (konzervativní):** Všechny radar položky → `is_published: false`, admin schvaluje v dashboard  
**Option C (hybridní):** Auto-publish jen pokud badge ∈ {'harvest', 'price', 'award'} a score ≥ threshold

---

## 6. ZÁVĚR

**Celkové hodnocení:** Systém je z velké části bezpečný. Klíčové human gate mechanismy (PROPOSE-ONLY v discovery, status='draft' v feed-sync, admin approve endpoint) jsou správně implementovány a funkční.

**Jediná oblast mimo politiku:** `radar_items` auto-publish AI překladu. Technicky argumentovatelný (zdroj existuje), ale vyžaduje rozhodnutí Architekta.

**Okamžitá akce (doporučeno):** Fix F-01 — ochrana aktivních produktů před demoní při admin approve. Nízké riziko implementace, vysoký dopad při výskytu.

---

*Audit provedl: Claude Code 2026-07-26*  
*Zdrojové soubory: lib/discovery-agent.ts, lib/feed-sync.ts, lib/radar-agent.ts, lib/link-rot-checker.ts, app/api/cron/*, app/api/admin/discovery/**
