# BACKLOG — Olivator.cz + 5litru.cz
<!-- Aktualizováno: 2026-08-12 -->
<!-- Nedělní brief (cron:executive-brief) zvýrazňuje položky starší 14 dní červeně. -->
<!-- Formát: | Datum vzniku | Priorita | Popis | Blokátor | -->

## ČEKÁ NA MAJITELE (SQL / Dashboard)

| Datum | P | Popis | Akce majitele |
|-------|---|-------|---------------|
| 2026-08-06 | P1 | Olivator: přidat `is_test` do `partner_inquiries` | Spustit `supabase/migrations/20260806_partner_inquiries_is_test.sql` v Supabase SQL Editor |
| 2026-07-31 | P1 | 5litru: SK migrace (market, price_eur, product_url_sk) | Spustit `supabase/migrations/20260731_sk_setup.sql` v 5litru Supabase |
| 2026-08-12 | P2 | Olivator: `action_price` do `product_offers` (pro /slevy stránku) | Spustit SQL blok níže v sekci "SQL pro majitele" |
| 2026-08-12 | P3 | 5litru: Reckyeshop commission_pct = NULL v DB | Dohledat % v eHUB dashboardu (kampan Reckyeshop a_bid=b44af70e) a UPDATE |
| 2026-08-12 | P3 | 5litru: DNS 5litrov.sk → Railway (aktuálně Wedos) | Změnit DNS záznamy přes Wedos panel |
| 2026-08-12 | P3 | Olivator: GSC — kliknout "Ověřit opravu" pro 2 varování (Products with offers, Missing price field) | Google Search Console |

## SCHVÁLENÍ OBSAHU ČEKÁ

| Datum | P | Popis | Stav |
|-------|---|-------|------|
| 2026-08-01 | P2 | 5litru: Wave 2 SK drafty (4 soubory: acidita, polyfenoly, pro-deti, nejlepsi-recky) | Commit abd0644 — čeká na schválení/odmítnutí |

## V KÓDU — NAPLÁNOVÁNO

| Datum | P | Popis | Soubor |
|-------|---|-------|--------|
| 2026-08-12 | P2 | Olivator: /slevy stránka — Návrh B (price_history detekce) | Čeká na action_price migraci |
| 2026-08-12 | P2 | 5litru: /olivovy-olej-5l-akce — poškozený obal badge → "trvale výhodná cena" | `content/pages/olivovy-olej-5l-akce.mdx` |
| 2026-08-12 | P3 | Olivator: /go/ route přidat is_active check (dnes 0 kliků na deaktivované retailery) | `app/go/[retailer]/[slug]/route.ts` |
| 2026-08-12 | P3 | Olivator: Heureka XML feed ACTION_PRICE import (přidat parser do cron:feed-sync) | `scripts/cron/feed-sync.ts` |
| 2026-08-12 | P4 | 5litru: list-card.tsx — `offer.inStock !==  false` → `offer.inStock === true` | `app/(site)/_components/list-card.tsx:105` |

## SLEDOVÁNÍ (data sbíraná, stránka plánovaná)

| Datum | P | Popis |
|-------|---|-------|
| 2026-05 | P2 | Price history graf — data se sbírají od startu, frontend plán Fáze 2 |
| 2026-05 | P3 | AI Sommelier chat — feature flag `ai_sommelier=false`, plán Fáze 2 |

---

## SQL PRO MAJITELE — vše najednou

> Spustit v Supabase SQL Editor **jednoho kliknutí** — jeden blok, žádné opakování.

### Olivator (`dyaloliwynmfnpjemzrh.supabase.co`)

```sql
-- 1. partner_inquiries: přidat is_test
ALTER TABLE partner_inquiries
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN partner_inquiries.is_test IS 'true = testovací dotaz (curl, bot, interní)';

-- 2. product_offers: přidat action_price pro detekci slev z XML feedů
ALTER TABLE product_offers
  ADD COLUMN IF NOT EXISTS action_price DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS action_price_start DATE DEFAULT NULL;

COMMENT ON COLUMN product_offers.action_price IS 'Akční cena z Heureka XML ACTION_PRICE. NULL = žádná akce.';
COMMENT ON COLUMN product_offers.action_price_start IS 'Datum začátku akce (z XML feedu nebo manuálně).';
```

### 5litru (`xpilzmjiprvtquvzjegx.supabase.co`)

```sql
-- 1. SK setup: market tracking + SK URLs + EUR cena
ALTER TABLE affiliate_clicks
  ADD COLUMN IF NOT EXISTS market VARCHAR(5) NOT NULL DEFAULT 'CZ';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_eur DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS product_url_sk TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_market ON affiliate_clicks(market);
```

> Po spuštění SQL: spusť `npm run schema:snapshot` v obou repozitech a commitni `supabase/schema-snapshot.json`.
