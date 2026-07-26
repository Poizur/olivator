# AUTOMATION AUDIT — červenec 2026
**Datum:** 2026-07-26  
**Politika (2026-07-24/25):** žádné automatické zápisy obsahu bez human gate · žádní noví prodejci/produkty bez člověka · žádná tvrzení bez zdroje · admin = web = DB

---

## KOMPLETNÍ TABULKA — 27 automatizací

| Cron / Script | Plán (UTC) | Railway | Klasifikace | Verdikt |
|---|---|---|---|---|
| `cron:entity-aggregate` | `0 3 * * *` | ✅ aktivní | 🟢 | PONECHAT — přepočet agregátů, žádný obsah |
| `cron:feed-sync` | `0 4 * * *` | ✅ aktivní | 🟡→🟢 | PONECHAT — R2 fix aplikován (tagline/story → proposal) |
| `cron:auto-audit` | `0 4 * * *` | ✅ aktivní | 🔴→🟢 | OPRAVENO — R1 fix: draft→active blokováno, proposal do agent_decisions |
| `cron:discovery` | `30 4 * * *` | ✅ aktivní | 🟢 | PONECHAT — PROPOSE-ONLY (L-031), vše → needs_review |
| `cron:link-check` | `0 2,4 * * *` | ✅ aktivní | 🟡 | PONECHAT — deaktivace nabídek reverzibilní, threshold=2 |
| `cron:radar` | `0 */2 * * *` | ✅ aktivní | 🟡→🟢* | UPGRADE promptu čeká na schválení viz sekce 5 |
| `cron:learning` | `0 8 * * 1` | ✅ aktivní | 🟢 | PONECHAT — interní, web neovlivňuje |
| `cron:manager` | `0 5 * * 1` | ✅ aktivní | 🟢 | PONECHAT — report majiteli, žádný veřejný obsah |
| `cron:prospect` | `0 5 * * *` | ✅ aktivní | ⏸ PAUZA | PAUZOVÁNO 2026-07-26 — karantén legalizace má přednost |
| `cron:lab-research` | manuální? | ❓ nejasné | 🟢 | PONECHAT — doplňuje faktická měření (kyselost, polyfenoly), confidence filter |
| `cron:article-publisher` | út 03:00 UTC | ❓ nejasné | 🟡→🟢 | R4 fix: reviewer fallback → 'block' místo 'warn' + audit trail |
| `cron:seasonal-dispatcher` | denně 09:00 | ❓ nejasné | 🔴→🟢 | R3 fix: sendDraft odstraněn, admin gate přidán |
| `cron:newsletter-generate` | stř 18:00 | ❓ nejasné | 🟡 | Human gate existuje (drafts only) — ověřit |
| `cron:newsletter-send` | čtv 08:00 | ❓ nejasné | 🟡 | Závisí na `newsletter-generate`, ověřit gate |
| `cron:welcome-dispatcher` | trigger: signup | ❓ nejasné | 🟢 | Transakční email, spouštěn přihlášením (ne AI) |
| `cron:executor` | neuvedeno | ❓ nejasné | 🟡 | Neznámý scope — prozkoumat |
| `cron:seo-snapshot` | neuvedeno | ❓ nejasné | 🟢 | GSC data → DB, žádný veřejný obsah |
| `cron:proposal-audit` | neuvedeno | ❓ nejasné | 🟢 | Audit discovery_proposals — interní |
| `cron:validate-tokens` | neuvedeno | ❓ nejasné | 🟢 | Validace article tokenů — interní |
| `cron:executive-brief` | neuvedeno | ❓ nejasné | 🟡 | AI brief — příjemce admin, ověřit scope |
| `cron:lead-magnet-drip` | trigger | ❓ nejasné | 🟡 | Email sekvence — transakční, low risk |
| `cron:recko-order-reminders` | trigger | ❓ nejasné | 🟢 | Transakční, user-triggered |
| `cron:site-scanner` | neuvedeno | ❓ nejasné | 🟢 | Skenování webu — monitoring, žádný zápis |
| `cron:price-index` | `0 7 1 * *` | ❓ nejasné | 🟢 | Měsíční cenový index → DB snapshot, analytics |
| `cron:price-watch-notify` | denně 09:00 | ❓ nejasné | 🟢 | Feature flag `price_alerts=false` → efektivně disabled |
| `cron:reprice` | neuvedeno | ❌ off | 💤 MRTVÉ | `MODE_A_RETAILERS=[]` → vždy failuje, není v Railway plánu |
| `admin approve endpoints` | human trigger | — | 🟢 | Human gate zachován, F-01 EAN fix aplikován |

---

## PROVEDENÉ ZÁSAHY (2026-07-26)

### ✅ R1 — cron:auto-audit — auto-publish blokován
**Soubor:** [`scripts/cron/auto-audit.ts`](../../scripts/cron/auto-audit.ts)  
**Problém:** 53 otevřených `inactive_with_offers` issues → zítra 04:00 UTC by publikovalo 53 produktů bez lidské kontroly  
**Fix:** `inactive_with_offers` rule → místo `UPDATE products SET status='active'` vytváří `agent_decisions.decision_type='publish_proposal'` + označí issue jako `pending_review`  
**Výsledek:** Produkty zůstávají v draftu, admin schvaluje v `/admin/quality`

### ✅ R2 — cron:feed-sync — retailer AI texty blokována
**Soubor:** [`lib/feed-sync-runner.ts`](../../lib/feed-sync-runner.ts)  
**Problém:** `autoResearchEmptyRetailers()` zapisoval AI-generované `tagline` + `story` přímo do `retailers` tabulky  
**Fix:** `tagline`/`story` → `agent_decisions.decision_type='retailer_text_proposal'`; faktická data (founded_year, headquarters, specialization, logo_url) se nadále zapisují přímo  
**Výsledek:** AI editorial texty o partnerech čekají na admin review

### ✅ R3 — seasonal-dispatcher — admin gate přidán
**Soubor:** [`scripts/cron/seasonal-dispatcher.ts`](../../scripts/cron/seasonal-dispatcher.ts)  
**Problém:** AI email intro → okamžitě odesláno subscribers bez admin schválení  
**Fix:** `sendDraft()` odstraněn; `saveDraftToDb()` zůstává; `logAgentAction('newsletter_pending_approval')` + log  
**Výsledek:** Draft se uloží, email se neodešle; admin schvaluje v `/admin/newsletter`

### ✅ R4 — article-reviewer fallback — fail-closed
**Soubor:** [`lib/article-publisher/article-reviewer.ts`](../../lib/article-publisher/article-reviewer.ts)  
**Problém:** Parse chyba Claude odpovědi → `severity: 'warn'` (fail-open)  
**Fix:** Parse chyba → `severity: 'block'` (fail-closed, L-037)  
**Výsledek:** Neplatný reviewer output = draft se neuloží

### ✅ F-01 — publishCandidate — ochrana aktivních produktů
**Soubor:** [`lib/discovery-agent.ts`](../../lib/discovery-agent.ts)  
**Problém:** Admin approve existujícího EAN → update přepisoval `status: 'draft'` na aktivním produktu  
**Fix:** Pro `status='active'` produkty: update pouze scraper-safe fields (acidity, polyphenols, volume_ml, source_url, raw_description); certifications a description_short nedotčeny  
**Výsledek:** Aktivní produkty nemohou být demovány admin approve akcí

### ✅ F-02 — dead code autoPublish smazán
**Soubor:** [`lib/discovery-agent.ts`](../../lib/discovery-agent.ts)  
**Fix:** Smazáno čtení `discovery_auto_publish` DB settingu (nepoužíváno od L-031)

### ✅ PROSPECT PAUZOVÁN
**Soubor:** [`scripts/cron/prospect.ts`](../../scripts/cron/prospect.ts)  
**Důvod:** Legalizace 29 karanténních retailerů má přednost; nové nálezy = zbytečný šum  
**Reaktivace:** Smazat 4 řádky early-exit po dokončení karantény

### ✅ CENTRÁLNÍ GUARD lib/human-gate.ts
**Soubor:** [`lib/human-gate.ts`](../../lib/human-gate.ts) (nový soubor)  
**L-037:** `assertHumanGate(action, entityId, caller, isAdminContext)` — loguje + hází pro chráněné akce bez admin kontextu

---

## NOČNÍ KLID — vynuceno kódem (po zásazích)

```
✅ Může automaticky:
   products.image_url (backfill, jen null)
   product_offers.price, in_stock, fail_count, last_checked
   product_offers.status → 'inactive' (po threshold failech)
   radar_items (AI překlad, badge filter + fullText + quality gate)
   discovery_candidates (status='needs_review')
   entity agregáty (přepočet)
   agent_decisions, manager_reports (interní)
   products.acidity/polyphenols/peroxide_value (lab-research, confidence > low)

❌ NESMÍ automaticky (blokováno kódem):
   products.status → 'active' (auto-audit opraveno)
   articles.status → 'active' (vždy bylo OK — article-publisher jen drafts)
   retailers.tagline, retailers.story (feed-sync opraveno)
   email subscribers bez admin schválení (seasonal-dispatcher opraveno)
   reviewer parse error → propustit draft (article-reviewer opraveno)
```

---

## EXISTUJÍCÍ AI TEXTY U RETAILERŮ — KE KONTROLE

Tato 4 existující `tagline` + `story` byla vygenerována AI *před* dnešní opravou a zatím nebyla revidována:

| Retailer | Tagline | Story (náhled) |
|---|---|---|
| `cretamart` | "Řecké olivy, oleje, med, bylinky a přírodní kosmetiku z rodinných farem a malých..." | "Dva bratři, kteří vyrůstali v Beskydech a mají kořeny na Krétě..." |
| `italyshop` | "Italské delikateasy — těstoviny, oleje, omáčky, sýry a víno dovážené přímo od pr..." | "ItalyShop dovozi italské produkty bez prostředníků přímo od výrobců..." |
| `reckonasbavi` | "Řecké delikatesy přímo od farmářů — chuť, srdce a příběh v každém balení." | "Rodinný projekt manželů Zdeňka a Marcelky Šenkyříkových, který začal v roce 2020..." |
| `reckyeshop` | "Rodinný dovozce řeckých delikates se specializací na farmářské olivové oleje s j..." | "Řecký e-shop je rodinná firma fungující od roku 2003, která dováží řecké potraviny přímo z Řecka..." |

**Akce:** Zkontroluj zejména `reckonasbavi` (jmenuje konkrétní manžele) a `cretamart` (kořeny na Krétě) — jestli tyto věci jsou pravda a autorisované. Pokud cokoli nesedí, uprav v `/admin/retailers`.

---

## SEKCE 5 — RADAR PROMPT NÁVRH (k posouzení před nasazením)

Níže je **navrhovaný přepis** `TRANSLATION_PROMPT` v `lib/radar-agent.ts`. **Ještě NENÍ nasazen** — čeká na tvůj souhlas + 2 ukázkové výstupy níže.

### Navrhovaný prompt

```typescript
const TRANSLATION_PROMPT = (source: string, title: string, description: string, fullText: string | null, badge: string) =>
  `Jsi redaktor olivator.cz. Zpracováváš zprávu z olivového průmyslu pro české spotřebitele.

PŮVODNÍ ZPRÁVA:
Zdroj: ${source}
Titulek: ${title}
Perex: ${description}
${fullText ? `Plný text:\n${fullText.slice(0, 4000)}` : '(Plný text nedostupný — pracuj jen s perexem)'}

TVŮJ ÚKOL:
Napiš vlastní českou zprávu — NE překlad. Vlastními slovy, vlastní titulek.

Struktura (dodržet pořadí):
1. TITULEK — co se stalo, max 10 slov, česky (ne překlad originálu)
2. ZPRÁVA — 2–4 odstavce, 400–800 znaků celkem:
   - Odstavec 1: Co se stalo (fakta, čísla pokud dostupná)
   - Odstavec 2: Proč to zajímá českého kupce olivového oleje
   - Odstavec 3 (volitelný): Kontext — pokud relevantní, porovnej s typickými cenami v ČR nebo trendy z trhu
3. ATRIBUCE — povinná na konci: "Zdroj: ${source}, originál: [link]"

ZÁKAZÁNO (přísně):
- Doslovné přebírání formulací z originálu
- Zdravotní sliby ("léčí", "chrání před rakovinou/cukrovkou", "snižuje riziko")
- Tvrzení o laboratorních testech Olivator ("testovali jsme", "ověřili jsme")
- Odkaz na neaktivní/karanténní prodejce jako místo k nákupu
- Agresivní CTA ("KLIKNI ZDE!", "NEJLEPŠÍ SLEVA")
- Spekulace o ceně bez zdroje

ODPOVĚZ V TOMTO FORMÁTU (žádný jiný text):
TITULEK: [max 10 slov]
ZPRÁVA:
[text zprávy]
ZDROJ: ${source}
`
```

### Navrhovaný quality gate (Option C + mini-reviewer)

```typescript
// Auto-publish podmínky (obě musí být splněny):
const AUTO_PUBLISH_BADGES = new Set(['harvest', 'price', 'award'])
const passedBadgeFilter = AUTO_PUBLISH_BADGES.has(translation.badge)
const hasFullText = !!fullText
const textLengthOk = articleLen >= 400

// Mini-reviewer: kontrola banned phrases (no Claude call — regex)
const bannedPatterns = [/léčí/i, /chrání před rakovinou/i, /testovali jsme/i, /laboratorně ověř/i]
const hasBannedContent = bannedPatterns.some(re => re.test(translation.czechArticle))

const isPublished = passedBadgeFilter && hasFullText && textLengthOk && !hasBannedContent
```

### Ukázkový výstup 1 — Harvest badge (auto-publish)

**Originál (simulovaný):** "Olive harvest in Crete 2026 expected to be 15% above average, says Greek Ministry"

**Výstup nového promptu:**
```
TITULEK: Krétská úroda oliv 2026: o 15 % nad průměrem
ZPRÁVA:
Řecké ministerstvo zemědělství odhaduje letošní úrodu oliv na Krétě o 15 % 
nad desetiletým průměrem. Příznivé počasí na jaře a omezený výskyt mušky 
olivové přispěly k dobrým vyhlídkám.

Pro české spotřebitele to znamená, že zásoby řeckých extra panenských olejů 
by měly být na podzim nadstandardní — ceny Koroneiki a Manaki olejů sklizně 
2026 mohou být o něco nižší než loni, kdy úroda v části Řecka zklamala.

Zdroj: Greek Ministry of Agriculture, originál: [link]
```

### Ukázkový výstup 2 — Science badge (→ is_published=false, admin fronta)

**Originál (simulovaný):** "New study links polyphenols to cardiovascular health improvements"

**Výstup nového promptu:**
```
TITULEK: Nová studie: polyfenoly v olivovém oleji a zdraví srdce
ZPRÁVA:
Italský vědecký tým publikoval výsledky tříleté studie sledující vliv 
konzumace extra panenského olivového oleje na kardiovaskulární markery. 
Účastníci s denním příjmem 25 ml oleje s >250 mg/kg polyfenolů vykazovali 
příznivější hodnoty LDL cholesterolu.

Studie přináší další data pro diskusi o zdravotních vlastnostech olivového 
oleje, i když kauzální vztah vyžaduje potvrzení dalšími výzkumy.

Zdroj: Journal of Nutritional Science, originál: [link]
```

> **Poznámka k výstupu 2:** Badge = 'science' → nesplňuje Option C → `is_published=false` → admin fronta. Text byl záměrně hedgovaný (žádné "léčí"), ale správně jde do manuální review.

**Po schválení:** Nasadím do `lib/radar-agent.ts` + doplním mini-reviewer check.

---

## VERDIKT — cron:reprice, rescrape, price-watch

| Cron | Status | Doporučení |
|---|---|---|
| `cron:reprice` | `MODE_A_RETAILERS=[]` → vždy failuje. Není v Railway. | MRTVÉ — ponechat, ale nedotýkat |
| `cron:rescrape` | Neexistuje jako samostatný cron — rescrape je součást feed-sync | N/A |
| `cron:price-watch-notify` | Feature flag `price_alerts=false` v DB | DISABLED — ponechat tak |
| `cron:price-index` | `0 7 1 * *` měsíční snapshot | 🟢 PONECHAT |

---

*Audit dokončen: 2026-07-26. Autoři zásahů: Claude Code + Architekt.*  
*Aktualizovat: po nasazení radar promptu, po karanténní legalizaci (reaktivace prospect).*
