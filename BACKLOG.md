# BACKLOG — Čekající migrace a technický dluh

## Priorita: VYSOKÁ — DB migrace (schema:ignore blokováno)

Tyto 3 migrace jsou nutné pro odstranění `// schema:ignore` komentářů.
Dokud nejsou aplikovány, build je `OK` (ignoruje je), ale funkce nefungují.

### M-001: `products.completeness_score`
**Soubor s ignorem:** `components/admin-sidebar.tsx:20`
**Funkce:** Admin sidebar počítá produkty pod 50 % completeness (badge "Kvalita dat")
**SQL:**
```sql
ALTER TABLE products ADD COLUMN completeness_score INTEGER DEFAULT NULL;
CREATE INDEX idx_products_completeness ON products(completeness_score) WHERE completeness_score IS NOT NULL;
```
**Po migraci:** `npm run schema:snapshot` → odeber `// schema:ignore` na řádku 20

---

### M-002: `retailers.quarantine_status`
**Soubory s ignorem:** `lib/manager-agent.ts:218`, `lib/executive-director.ts:430`
**Funkce:** Manager Agent + Orchestrátor filtrují karanténní retailery (čekají na legalizaci smluv)
**SQL:**
```sql
ALTER TABLE retailers ADD COLUMN quarantine_status VARCHAR(50) DEFAULT NULL;
-- Hodnoty: NULL = OK, 'contract_pending' = čeká smlouva, 'suspended' = pozastaveno
```
**Po migraci:** `npm run schema:snapshot` → odeber `// schema:ignore` na obou místech

---

### M-003: `products.delta_k`
**Soubor s ignorem:** `lib/product-rescrape.ts:190`
**Funkce:** Rescraper parsuje ΔK (spektrofotometrická čistota oleje — laboratorní hodnota)
**SQL:**
```sql
ALTER TABLE products ADD COLUMN delta_k DECIMAL(5,3) DEFAULT NULL;
```
**Po migraci:** `npm run schema:snapshot` → odeber `// schema:ignore` na řádku 190

---

## Priorita: STŘEDNÍ

### M-004: `article_drafts.hero_image_url`
Tabulka `article_drafts` nemá sloupec `hero_image_url` — hero se fetchuje z Unsplash
při publishování a zapisuje se přímo do `articles`. Pokud by admin UI chtělo
preview před publikací, je potřeba tento sloupec přidat.
**SQL:**
```sql
ALTER TABLE article_drafts ADD COLUMN hero_image_url TEXT DEFAULT NULL;
```
**Priorita:** Nízká, dokud admin UI neimplementuje preview

---

## Hotovo

- `product_offers.action_price` — ✅ migrováno 2026-08-12
- `product_offers.action_price_start` — ✅ migrováno 2026-08-12
- `affiliate_clicks.is_test` — ✅ migrováno dříve
- `partner_inquiries.is_test` — ✅ migrováno dříve
