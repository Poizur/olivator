# Homepage UX Audit — 2026-07-08

Diagnostika dvou UX problémů na homepage. Žádné změny kódu — pouze analýza příčin.

---

## PROBLÉM 1 — Loga značek: krajinné fotky místo log

### Postižené značky

| Značka | slug | DB entity_id |
|--------|------|--------------|
| Motakis | `motakis` | `f7f06449-8a6a-44cb-916b-5daaad723c7c` |
| Corinto | `corinto` | `ed45ac58-2528-4a20-ba0b-3c7c6bcc556e` |
| Sitia Kréta | `sitia-kreta` | `23c75372-c763-4b7f-8183-1a6666bbde48` |
| Orino | `orino` | `81efb451-d09a-457a-8c6d-1b325d102ec7` |

### Kde se rozhoduje co zobrazit

**Komponenta**: `components/home/featured-brands-section.tsx:35–80`

```tsx
// line 35-36
const logo = b.logoUrl ?? null
const hero = b.heroUrl ?? null

// line 46: IF hero → krajina jako background cover + logo jako 16px overlay
// line 62: ELSE IF logo → logo centrované na bílém pozadí
// line 72: ELSE → text fallback s názvem značky
```

Priorita je tedy: `hero` > `logo` > `text`. Pokud existuje `heroUrl`, vždy "vyhraje" nad logem.

**Odkud pochází `logoUrl` a `heroUrl`**: `lib/data.ts:getFeaturedBrands()` (řádky 1429–1475)

Query načte všechny záznamy z `entity_images` WHERE `entity_type='brand'` AND `status='active'`, seřazené `sort_order ASC`.

Třídění do map (lib/data.ts:1452–1460):
```typescript
if (row.image_role === 'logo' || (row.is_primary && !logoByEntity.has(...) && row.image_role !== 'gallery')) {
  logoByEntity.set(entity_id, url)   // → logoUrl
} else if (!heroByEntity.has(entity_id)) {
  heroByEntity.set(entity_id, url)   // → heroUrl (editorial, hero, gallery)
}
```

Klíčové: každý záznam s `image_role` != `'logo'` jde do `heroByEntity`, pokud tam entita ještě není.

### Aktuální stav DB pro 4 problémové značky

**Motakis**:
- `editorial` pexels.com krajina (sort_order=0, is_primary=false) → `heroByEntity`
- `logo` motakis-logo.webp (sort_order=0, is_primary=true) → `logoByEntity`
- Výsledek: `heroUrl=pexels_krajina`, `logoUrl=logo.webp`
- Co se zobrazí: krajina jako background + logo jako 16px overlay (téměř neviditelné)

**Corinto**:
- 2× `editorial` pexels.com krajina (sort_order=0 a 1, is_primary=false) → první do `heroByEntity`
- `logo` corinto-logo.webp (sort_order=0, is_primary=true) → `logoByEntity`
- Výsledek: `heroUrl=pexels_krajina`, `logoUrl=logo.webp`
- Co se zobrazí: krajina jako background + logo jako 16px overlay

**Sitia Kréta**:
- 2× `editorial` pexels.com krajina (sort_order=0 a 1, is_primary=false) → první do `heroByEntity`
- `logo` sitia-kreta-logo.webp (sort_order=0, is_primary=true) → `logoByEntity`
- Výsledek: `heroUrl=pexels_krajina`, `logoUrl=logo.webp`
- Co se zobrazí: krajina jako background + logo jako 16px overlay

**Orino**:
- Pouze 1 záznam: `logo` orino-logo.webp (sort_order=0, is_primary=true, image_role='logo')
- Výsledek: `heroUrl=null`, `logoUrl=logo.webp`
- Co by se MĚLO zobrazit: logo na bílém pozadí (kód to správně řeší)
- Logo URL je přístupné (HTTP 200, 21 608 bytes, image/webp)
- Pokud uživatel vidí text fallback s "Orino Gourmet Product": text "Orino Gourmet Product" v DB neexistuje (DB name = "Orino"). Pravděpodobně browser-level selhání (WebP race condition, CSP, cache) nebo nepřesné pozorování.

### Kořenová příčina pro Motakis / Corinto / Sitia Kréta

Loga EXISTUJÍ a jsou přístupná v Supabase Storage. Problém způsobují **editoriální pexels fotky krajin** (`image_role='editorial'`), které byly přidány do `entity_images` jako atmosférické obrázky značky. Protože mají `image_role != 'logo'`, jdou do `heroByEntity` a v komponentě "vyhrají" nad logem.

Výsledek: komponenta zobrazuje krajinnou fotku jako velký background COVER a logo jen jako `h-4` (16px) miniaturní overlay v levém rohu — prakticky neviditelné pro uživatele.

### Návrh oprav (bez prioritizace — jen pro diagnostiku)

**Opce A — Smazat editoriální fotky pro tyto 3 značky z entity_images**
Nejjednodušší. Smazat pexels záznamy pro Motakis, Corinto, Sitia Kréta. Loga pak budou zobrazena správně.

**Opce B — Změnit logiku v `getFeaturedBrands()`**
Pokud je cílem "na homepage vždy ukázat logo", pak ignorovat heroUrl v `FeaturedBrandsSection`. Změna v `lib/data.ts:1465-1472` nebo přímo v `featured-brands-section.tsx:35-36` (force `hero = null`).

**Opce C — Opravit overlay logo**
Pokud je záměrem zobrazovat krajinnou fotku S logem, zvětšit overlay logo z `h-4` (16px) na minimálně `h-8` (32px) a zvýšit kontrast pozadí.

---

## PROBLÉM 2 — Divné/generické názvy produktů

### Kde se sekce renderuje

**Komponenty** (obě na homepage, obě používají `TopProductCard`):
- `components/home/top-product-card.tsx` — sdílená karta
- `components/home/top-by-country.tsx` — sekce "Nejlepší oleje podle země"
- `app/page.tsx:50-55` — sekce "Dvanáct olejů" (topTwelve)

### Jak TopProductCard zobrazuje název

**`components/home/top-product-card.tsx:73–83`**:

```tsx
{/* Původ + vlajka — MALÝ SUBTITLE (10px, šedý) */}
<div className="text-[10px] text-text3 mb-0.5 leading-tight truncate">
  {countryFlag(product.originCountry)}
  {product.nameShort && (
    <span className="ml-1">{product.nameShort}</span>   // ← ZDE "Kréta", "Prémiový" etc.
  )}
</div>

{/* Název produktu — HLAVNÍ (12px, tmavý) */}
<div className="text-[12px] font-medium text-text leading-snug line-clamp-2 flex-1 mb-1.5">
  {product.name}   // ← plný název z DB
</div>
```

`nameShort` je tedy subtitle text (10px, text3 = šedá #aeaeb2), nikoliv hlavní název. Ale na malých kartách a na mobilu vizuálně dominuje jako první čitelný text pod ikonou vlajky.

### Proč divné hodnoty v nameShort

Databáze obsahuje produkty kde `name_short` není distinktivní produktový název, ale generický identifikátor:

| name_short | Počet produktů | Příklad produktu |
|------------|---------------|------------------|
| `"Kréta"` | min 4 | Motakis Kréta Extra panenský olivový olej 5 l – plech |
| `"Prémiový"` | desítky | Prémiový extra panenský olivový olej Marmaro Early Harvest 500 ml |
| `"Alberobello"` | 1–2 | Intini EXTRA Alberobello |
| `"Picual"` | min 10 | Picual 500 ml – Extra panenský olivový olej (Lozano Červenka) |

Tyto hodnoty popisují odrůdu ("Picual"), region ("Kréta", "Alberobello") nebo adjektivum ("Prémiový") — nikoliv unikátní označení konkrétního produktu.

### Proč duplikát "Kréta"

**`components/home/top-by-country.tsx:41–48`**:
```tsx
const byCountry = products.filter(
  (p) => p.originCountry === code && p.cheapestOffer != null && p.olivatorScore != null,
)
const top6 = diverseTopProducts(byCountry, 6, 2)
```

`diverseTopProducts` (`lib/product-selection.ts:19–51`) vybírá max 2 produkty per brand. Pro GR sekci výběr zahrnuje:
- Plakias produkty s `name_short = 'Kréta'` (score 78, brand=plakias)
- Motakis produkty s `name_short = 'Kréta'` (score 68, brand=motakis)

Jsou to různé značky (cap 2 per brand funguje správně), ale obě mají identický `name_short = 'Kréta'`. Výsledek: ve GridU se zobrazí dvě karty obě s podtitulem "🇬🇷 Kréta".

### Proč 0 Kč u některých produktů

V `lib/data.ts:268–300` (`getProductsWithOffers`):
```typescript
.from('product_offers')
.select(...)
.order('price', { ascending: true })   // bez filtru na NOT NULL
```

Pak (lib/data.ts:290):
```typescript
price: Number(row.price),
```

`Number(null) = 0` v JavaScriptu. Pokud má nabídka v DB `price = NULL`, stane se `cheapestOffer.price = 0` a `formatPrice(0)` vrátí "0 Kč".

V aktuálním stavu DB (ověřeno REST API dotazem) jsou 0 nabídky s `price IS NULL` a 0 nabídky s `price = 0`. Takže problém je buď:
1. **Přechodný** — ceny byly dočasně NULL při scrapování (nový produkt přidán bez ceny)
2. **Reproduced via `formatPricePer100ml`** — `Math.round(price/volumeMl*100)` pro produkty s velmi malou cenou na velký objem dá "0 Kč / 100 ml" (ale ne hlavní cenu)
3. **Chybějící filtr** — `getProductsWithOffers` nemá `.not('price', 'is', null)` filtr, takže NULL price = 0 Kč kdykoliv scraper uloží neúplná data

Doporučení pro kód (bez ohledu na aktuální stav DB): přidat `.not('price', 'is', null).gt('price', 0)` do dotazu v `lib/data.ts:273–276` pro robustnost.

### Jak se agregují produkty

Sekce "Dvanáct olejů" (`app/page.tsx:50–55`):
- Vstup: `allProducts.filter(p => p.cheapestOffer != null && p.olivatorScore != null && p.olivatorScore > 0)`
- `diverseTopProducts(filtered, 12, 2)` — max 2 produkty per `brand_slug`
- Seřazeno dle `olivatorScore DESC`
- "9 unikátních" z otázky není text na stránce — je to autorův popis situace kdy Lozano Červenka má 6+ variant se score 95 a cap 2 per brand zajišťuje diverzitu

Sekce "TopByCountry" (`components/home/top-by-country.tsx`):
- Per každou zemi: max 6 produktů, max 2 per brand, dle score
- Produkt může být zároveň v "Dvanáct olejů" i v "TopByCountry" (různé sekce, sdílený pool `allProducts`)

---

## Shrnutí příčin

| # | Problém | Soubor:řádek | Příčina |
|---|---------|--------------|---------|
| 1a | Motakis/Corinto/Sitia Kréta zobrazují krajinu místo loga | `featured-brands-section.tsx:46` + `data.ts:1455–1459` | Editorial Pexels fotky jdou do `heroByEntity` a přebijí logo v prioritní logice |
| 1b | Orino bez viditelného obrázku | `featured-brands-section.tsx:62` | Kód je správně; logo URL je HTTP 200; browser-level issue nebo nepřesné pozorování |
| 2a | "Kréta", "Prémiový", "Picual", "Alberobello" jako subtitle | `top-product-card.tsx:75–77` | `name_short` v DB obsahuje generické identifikátory (odrůda/region/adjektivum) místo distinktivního produktového názvu |
| 2b | Duplikát "Kréta" 2× | `top-by-country.tsx:47` + `product-selection.ts` | Dva různé produkty (Plakias + Motakis) mají shodný `name_short='Kréta'`; cap per brand je 2, ale cap per `name_short` není |
| 2c | 0 Kč | `data.ts:290` | `Number(null) = 0`; chybějící NOT NULL filtr na `price` v offers dotazu; v aktuálním stavu DB bez null cen (přechodný problém) |
