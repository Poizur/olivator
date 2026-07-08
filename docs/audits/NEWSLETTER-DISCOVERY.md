# Newsletter AI Reviewer — Discovery Fáze 0

> Datum: 2026-07-08 | Autor: Claude Code diagnostika | Stav: DISCOVERY (nic neimplementováno)

---

## 1. Current pipeline (schema)

```
Středa 18:00 UTC
      │
      ▼
cron:newsletter-generate (scripts/cron/newsletter-generate.ts)
      │
      ├─ lib/newsletter-composer.ts :: generateWeeklyDraft()
      │     │
      │     ├─ composeWeeklyDraft()
      │     │     ├─ getNewsletterStats()          → počty new/drops/total z DB
      │     │     ├─ recentlyFeaturedIds            → posledních 8 draftů → LRU exclusion
      │     │     ├─ pickOilOfTheWeek()             → score DESC, má aktivní offer, není v LRU
      │     │     ├─ pickDeals(threshold=5%, max=5) → price_history srovnání
      │     │     ├─ pickNewArrival()               → nejnovější aktivní produkt
      │     │     ├─ pickRecipe()                   → náhodná recipe z DB
      │     │     ├─ pickFact()                     → náhodná fakta z newsletter_facts
      │     │     └─ generateHook()                 → Claude Haiku → subject + preheader + hook
      │     │
      │     └─ saveDraftToDb()                      → newsletter_drafts (status='draft')
      │
      ├─ Admin notification email                   → sendTransactionalEmail()
      │   "Draft čeká na schválení → odkaz"
      │
      └─ EXIT

            ← Admin schvaluje manuálně v /admin/newsletter/drafts/[id] →

Čtvrtek 8:00 UTC
      │
      ▼
cron:newsletter-send (scripts/cron/newsletter-send.ts)
      │
      ├─ Kontroluje newsletter_auto_send setting   ← AKTUÁLNĚ: NOT SET → skip auto-send
      │   (pokud false/unset → "admin schvaluje ručně" → exit)
      │
      └─ Pokud approved + auto_send=true:
            newsletter_drafts (status='approved')
                  │
                  ▼
            /api/admin/newsletter/drafts/[id]/send → lib/newsletter-sender.ts
                  │
                  ├─ newsletter_signups (confirmed=true, unsubscribed=false) → 5 recipients
                  ├─ Per recipient: Resend API → HTML email s personalizovaným unsubscribe linkem
                  └─ newsletter_sends (draft_id, signup_id, resend_message_id, status='sent')
```

**Klíčový poznatek:** `newsletter_auto_send` je `NOT SET` (null/false). Každý draft se posílá **manuálně** administrátorem přes `/admin/newsletter/drafts/[id]` nebo přes `/api/admin/newsletter/drafts/[id]/send`. Cron:newsletter-send existuje, ale v praxi se nepoužívá — skočí, protože podmínka `autoSend=false` je splněna.

---

## 2. Posledních 5 draftů — reálná data

| Datum generace | Předmět | Olej týdne (slug) | Sends | Stav |
|---|---|---|---|---|
| 2026-07-01 | 10 nových olejů. Coupage týdne 🫒 | `olivovy-olej-extra-panensky-callejas-coupage-5l` | 4 | sent |
| 2026-06-24 | Picual má sezonu. 14 nových přírůstků 🫒 | `picual-5-l-extra-panensky-olivovy-olej` | 4 | sent |
| 2026-06-17 | Picual kraluje. 9 nových olejů v katalogu 🫒 | `picual-5-l-extra-panensky-olivovy-olej-bag-in-box` | 4 | sent |
| 2026-06-10 | Picual sezóna: 444 olejů v katalogu 🫒 | `picual-5-l-extra-panensky-nefiltrovany-olivovy-olej` | 3 | sent |
| 2026-05-12 | 377 nových olejů: Picual v centru 🫒 | `picual-5-l-extra-panensky-nefiltrovany-olivovy-olej-bag-in-box` | 1 | sent |

### Opakování — analýza

**Olej týdne:**
- 4× z 5 = **Picual** (různé slugy, ale vždy Picual odrůda)
- 1× výjimka: Coupage Callejas (2026-07-01)
- Příčina: LRU exclusion pracuje s `productId`, ne s odrůdou. Picual 5L PET ≠ Picual 5L Bag-in-Box ≠ Picual nefiltrovany → každý má unikátní ID → LRU exclusion je obejita

**Deals blok:**
- Opakuje se `Peloponés Manaki` 2× v každém draftu (dva záznamy — nabídka 1L i větší balení mají oba cenu pod historickým minimem)
- Příčina: `pickDeals(threshold=5%)` je nízký práh, Manaki dlouhodobě drží cenu → vždy projde

**Deals prázdné:**
- 2026-05-12 a 2026-06-10: 0 deals — katalog byl nový, bez dostatečné price_history

**Sezónní relevance:**
- Žádná logika pro sezónnost. Picual je španělská odrůda, sklizeň říjen–prosinec → červen/červenec je mimo sezónu. Newsletter to nijak nereflektuje.

**Formulaičnost:**
- Subject pattern: `[číslo] nových olejů. [Produkt] [emoji]` — 3× z 5 stejná struktura
- Přes LRU exclusion systém existuje, ale neřeší odrůdovou duplicitu

---

## 3. Subscribers + send history

| Metrika | Hodnota |
|---|---|
| newsletter_signups celkem | 5 |
| Confirmed + active | 5 |
| Unsubscribed | 0 |
| Tabulka newsletter_subscribers | neexistuje (správná je `newsletter_signups`) |
| Resend skutečně odesláno | ✅ ANO — všech 5 draftů bylo reálně odesláno (resend_message_id přítomen) |
| Příjemci | 1 recipient v 05/12, 3 v 06/10, 4 v dalších (postupný nárůst signupů) |
| notification_log typ "newsletter" | 0 — newsletter emaily nejdou přes `notification_log` ale přes `newsletter_sends` |
| newsletter_auto_send | NOT SET = manuální schvalování |

**Závěr:** Newsletter **skutečně žije** — 5 odeslaných emailů, 5 real subscriberů, Resend API potvrdil doručení. Není to demo/staging setup.

---

## 4. Reviewer insertion point — doporučení

### Mapa pipeline s candidate místy

```
composeWeeklyDraft()      [MÍSTO A]
        │
        ▼
saveDraftToDb()  →  newsletter_drafts (status='draft')
                          [MÍSTO B]
        │
        ▼
Admin notification email → admin schvaluje v /admin/...
                          [MÍSTO C — admin UI]
        │
        ▼
/api/admin/newsletter/drafts/[id]/send
                          [MÍSTO D]
        │
        ▼
newsletter_sends → Resend → doručeno
```

### Hodnocení míst

**Místo A — uvnitř composeWeeklyDraft(), před saveDraftToDb()**
- ✅ Reviewer vidí `blocks` ještě jako TypeScript objekt (strukturovaná data, ne HTML)
- ✅ Může modifikovat výběr (vyměnit oilOfWeek, odebrat Manaki z deals)
- ❌ Prodlužuje generation čas (Claude API call navíc)
- ❌ Zasahuje do existující generation logiky

**Místo B — po saveDraftToDb(), před odesláním admin notifikace**
- ✅ Draft je v DB → reviewer může číst strukturovaná data z DB
- ✅ Může zapsat review výsledek jako sloupec `reviewer_notes` / `reviewer_flags` do draftu
- ✅ Nezasahuje do generation logiky — wrapper po uložení
- ✅ Admin email může obsahovat reviewer výsledek ("⚠️ Picual 3× za sebou")
- ❌ Nelze modifikovat výběr bez re-generation (jen flagovat)

**Místo C — admin UI, zobrazení při schvalování**
- ✅ Reviewer výsledek zobrazit v admin review UI (jednoduchý display)
- ✅ Admin může ignorovat / akceptovat doporučení
- ❌ Reviewer musí být spuštěn dřív (B nebo before C)

**Místo D — bezprostředně před send**
- ✅ Hard-block: pokud reviewer vrátí `block: true`, send se neprovede
- ❌ Admin draft schválil → blocking v D vytvoří surprise (draft approved, ale nejde poslat)
- ❌ Pozdě na modifikaci obsahu

### Doporučení: Místo B s notifikací do C

```
generateWeeklyDraft()
        │
        ▼
saveDraftToDb()  →  status='draft'
        │
        ▼
  ┌─────────────────────────────────────┐
  │         AI REVIEWER                 │
  │  reviewNewsletter(draftId, blocks)  │
  │                                     │
  │  Vstupy:                            │
  │  • blocks (structured)              │
  │  • posledních 8 draftů z DB        │
  │  • current date / month             │
  │                                     │
  │  Výstupy:                           │
  │  • flags: string[]     (varování)   │
  │  • suggestions: string[] (návrhy)   │
  │  • severity: 'ok' | 'warn' | 'block'│
  └─────────────────────────────────────┘
        │
        ▼
PATCH newsletter_drafts SET reviewer_notes = {...}, reviewer_severity = 'warn'
        │
        ▼
Admin notification email (obohacený o reviewer výsledek):
  "⚠️ Reviewer flags: Picual 3× za sebou / Deals blok prázdný / sezónně mimo"
  "→ Přejdi na draft a rozhoduj"
        │
        ▼
Admin schvaluje v /admin/newsletter/drafts/[id]
  (reviewer výsledek viditelný v UI — navrhovaná změna: zobrazit reviewer box)
```

**Proč Místo B:**
1. Reviewer nepotřebuje vidět vygenerovaný HTML — pracuje se strukturovanými `blocks`
2. Může zapsat do DB bez zásahu do generation pipeline
3. Admin notification email je přirozené místo pro "reviewer report"
4. Hard-block lze přidat volitelně v Místě D jako druhé pojistky (severity='block')
5. Testovatelné samostatně: `reviewNewsletter(draftId)` = pure function, dryrun mode zdarma

---

## 5. Otevřené otázky (před implementací)

### Technické

**OT-1: Kde uložit reviewer výsledek v DB?**
- Varianta A: Nový sloupec `reviewer_notes JSONB` + `reviewer_severity VARCHAR` v `newsletter_drafts`
  → Vyžaduje migraci, ale čisté schema
- Varianta B: Přidat do existujícího `blocks` JSONB jako `_reviewer` klíč
  → Bez migrace, ale pollutes content data s meta-daty
- **Doporučení: Varianta A** (čisté oddělení content vs. metadata)

**OT-2: Haiku nebo Sonnet pro reviewer?**
- Reviewer analyzuje ~1 KB strukturovaných dat (blocks JSON) + ~500 B kontextu (posledních 5 oilOfWeek)
- Haiku: rychlý (~2s), levný, dostatečný pro pattern detection
- Sonnet: pomalejší, dražší, nutný jen pro složitou reasoning (ne zde)
- **Doporučení: Haiku**

**OT-3: Má reviewer moci modifikovat draft nebo jen flagovat?**
- Modifikace (výměna oilOfWeek) = komplexnější, riziko neočekávaných změn
- Flagování = jednodušší, admin rozhoduje
- **Doporučení: Phase 1 = flagování pouze. Phase 2 = modifikace se schválením.**

**OT-4: Co dělat pokud Reviewer API call selže?**
- Option A: Generate + save pokračuje bez reviewer výsledku (warn do logu, ale draft vznikne)
- Option B: Draft vznikne s `reviewer_severity='skipped'` + note "reviewer nedostupný"
- **Doporučení: Option A** (reviewer je enhancement, ne blocker generace)

### Pravidlová

**OT-5: Která pravidla Reviewer kontroluje? (finální seznam)**

Navrhovaná sada pro Phase 1:

| Pravidlo | Trigger | Severity |
|---|---|---|
| Duplicita odrůdy | oilOfWeek stejná odrůda jako N posledních draftů | warn (N=2), block (N=3+) |
| Prázdné deals | deals.length === 0 && valuePicks.length === 0 | warn |
| Sezónní nesoulad | oilOfWeek je odrůda mimo sezónu (Picual: říjen–leden) | warn |
| Subject formulaičnost | subject začíná stejně jako minulý draft (Levenshtein < 0.3) | warn |
| Deals opakování | stejný produkt v deals 3× za sebou | warn |
| Chybějící newArrival | newArrival === null | info (ne warn) |
| Stará fakta | fact byl použit v posledních 4 draftech | warn |

**OT-6: Co se stane při severity='block'?**
- V Phase 1: Reviewer nikdy neblokuje, jen flaguje (admin rozhoduje)
- V Phase 2 (po validaci): block = draft se neuloží jako 'draft' ale jako 'blocked', admin musí override
- **Doporučení: Phase 1 bez hard-block.** Block implementovat až po 4–6 týdnech dat.

**OT-7: Jak testovat reviewer před produkčním deployem?**
- `scripts/test-newsletter-reviewer.ts --draft-id=<id>` → dryrun, žádný zápis do DB
- Nebo: spustit reviewer na existujících 5 draftech → vidíme které by byly flagovány

**OT-8: Newsletter je první případ, pak manager + discovery — sdílená lib nebo per-agent?**
- Reviewer logika bude specifická per use-case (newsletter ≠ manager ≠ discovery)
- Ale wrapper (callClaude + parse + severity mapping + logDecision) je sdílený pattern
- **Doporučení:** `lib/ai-reviewer.ts` jako generický runner + per-agent prompt factory
  (`lib/newsletter-reviewer.ts`, `lib/manager-reviewer.ts` atd.)

---

## Shrnutí pro design rozhodnutí

**Co funguje:**
- Newsletter generace je plně funkční a reálně se posílá 5 subscriberům
- LRU exclusion existuje (posledních 8 draftů) — ale funguje na productId, ne odrůdě
- Admin schvalování je manuální krok → reviewer se přirozeně vejde před toto schválení

**Co je problém (potvrzeno daty):**
- Picual 4× z 5 = dominance jedné odrůdy potvrzena
- Subject formula `[N] nových olejů. [Produkt] [emoji]` opakuje se
- Deals blok může být prázdný (2× z 5) nebo opakovat Manaki
- Žádná sezónní logika

**Doporučená architektura:**
- Místo B (po saveDraftToDb, před admin notifikací)
- Claude Haiku jako model
- Pouze flagování v Phase 1, bez modifikace
- Nová migrace: `reviewer_notes JSONB` + `reviewer_severity VARCHAR` v `newsletter_drafts`
- Shared runner: `lib/ai-reviewer.ts` + `lib/newsletter-reviewer.ts` jako první implementace
