# Tematická misalignace článků — Analýza

> Vygenerováno: 2026-05-29  
> Účel: Identifikace článků kde produktový kontext neodpovídá tematickému zaměření

---

## 1. TOP 15 DB produktů podle polyfenolů

| # | Produkt | Polyfenoly (mg/kg) | Score | Kyselost | Slug |
|---|---------|-------------------|-------|----------|------|
| 1 | EVOLIA PLATINUM 2777 BIO | **2777** | 85 | 0,21 % | `evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen` |
| 2 | EVOLIA PLATINUM 2000+ BIO (250 ml) | **2012** | 82 | 0,20 % | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml` |
| 3 | EVOLIA PLATINUM 2000+ BIO (500 ml) | **2012** | 82 | 0,20 % | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` |
| 4 | Evolution Denocciolato 500 ml (dárkové) | **1088** | 83 | 0,19 % | `darkove-baleni-extra-panenskeho-olivoveho-oleje-evolution-denocciolato-500-ml-s-vysokym-podilem-poly` |
| 5 | Evolution Denocciolato 500 ml (prémiový) | **1088** | 83 | 0,19 % | `premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu` |
| 6 | The Governor 500 ml | **966** | 76 | 0,29 % | `limitovana-edice-reckeho-premiove-olivoveho-oleje-the-governor-500-ml` |
| 7 | Le Selezioni Coratina 500 ml | **966** | 81 | 0,21 % | `premiovy-extra-panensky-olivovy-olej-le-selezioni-coratina-500-ml-z-italske-farmy-le-tre-colonne` |
| 8 | Le Selezioni Coratina 500 ml (dárkové) | **966** | 81 | 0,21 % | `premiovy-extra-panensky-olivovy-olej-le-selezioni-coratina-500-ml-darkovem-baleni` |
| 9 | GangaLupo Coratina 500 ml | **954** | 78 | 0,22 % | `italsky-premiovy-extra-panensky-olivovy-olej-gangalupo-coratina-500-ml` |
| 10 | Intini EXTRA Alberobello | **903** | 81 | 0,21 % | `intini-extra-alberobello` |
| 11 | Nobleza del Sur NOVO 500 ml | **837** | 77 | 0,15 % | `premiovy-extra-panensky-olivovy-olej-nobleza-del-sur-novo-500-ml-nova-sklizen` |
| 12 | Terracuza Biologico 500 ml | **788** | 80 | 0,13 % | `bio-extra-panensky-olivovy-olej-terracuza-biologico-500-ml-ze-sardinie` |
| 13 | Lamacupa Luma 500 ml | **729** | 83 | 0,19 % | `lamacupa-luma-500-ml-premiovy-extra-panensky-olivovy-olej` |
| 14 | Lamacupa Luma 100 ml | **729** | 83 | 0,19 % | `premiovy-extra-panensky-olivovy-olej-lamacupa-luma-100-ml-s-vyraznou-ovocnou-chuti` |
| 15 | Casas de Hualdo Reserva de Familia 500 ml | **724** | 83 | 0,10 % | `casas-de-hualdo-reserva-de-familia-500-ml` |

---

## 2. Propast v polyfenolových článcích

### 2A. Článek: `polyfenoly-proc-na-nich-zalezi`

#### Aktuálně tokenizované/linkované produkty
| Produkt | Polyfenoly (mg/kg) | Score |
|---------|-------------------|-------|
| 2777 Polyfenolů BIO (EVOLIA) | 2777 | 85 |
| Evolution Denocciolato (dárkové) | 1088 | 83 |
| Evolution Denocciolato (prémiový) | 1088 | 83 |
| GangaLupo Coratina 500 ml | 954 | 78 |
| Casas de Hualdo Reserva 500 ml | 724 | 83 |
| Sitia Premium Gold 5 l | 646 | 85 |
| Centenarium Premium Anniversary | 632 | 83 |
| Elixír BIO | 541 | 86 |
| Stamatakos BIO (Liophos) | 466 | 86 |

**Stav:** Článek JE v dobré kondici. EVOLIA Platinum 2777 (top DB produkt) je přítomen jako link. Tokenizovány jsou i produkty s poly > 1000 mg/kg. Výrazná propast neexistuje — ale chybí EVOLIA 2000+ (ranks 2–3 v DB).

**Chybějící top produkty:**
- EVOLIA PLATINUM 2000+ 250 ml (2012 mg/kg) — chybí token i link
- EVOLIA PLATINUM 2000+ 500 ml (2012 mg/kg) — chybí token i link
- The Governor 500 ml (966 mg/kg) — chybí
- Le Selezioni Coratina (966 mg/kg) — chybí

### 2B. Článek: `polyfenoly-kolik-je-dost`

#### Aktuálně linkované produkty
| Produkt | Polyfenoly (mg/kg) | Score |
|---------|-------------------|-------|
| Evolution Denocciolato (dárkové) | 1088 | 83 |
| Evolution Denocciolato (prémiový) | 1088 | 83 |
| GangaLupo Coratina 500 ml | 954 | 78 |
| Sitia Premium Gold 5 l | 646 | 85 |
| Elixír BIO | 541 | 86 |

**Propast:** ŽÁDNÝ z top-3 produktů (EVOLIA 2777, EVOLIA 2000+) není v článku!
- Článek o tom "kolik polyfenolů je dost" nedoporučuje produkt s 2777 mg/kg
- Maximální hodnota v článku: 1088 mg/kg — přitom v DB existují produkty s 2×+ více

> **Propast: 3 produkty s 1000+ mg/kg chybí, 2 produkty s 2000+ mg/kg (!) chybí**

---

## 3. Tematická analýza všech 24 článků

### Tematicky fokusované — s misalignací nebo problémem

#### `polyfenoly-kolik-je-dost` — dimenze: polyphenols — KRITICKÁ MISALIGNACE
- Produkty max. do 1088 mg/kg, přitom DB má 2777 mg/kg
- Chybí: EVOLIA 2777, EVOLIA 2000+ (×2), Le Selezioni Coratina, The Governor

#### `olivovy-olej-do-200-kc` — dimenze: price — LOGICKÁ NEKONZISTENCE
- Chiavalon 100ml série: 189 Kč/100ml = jedna z nejdražších možností vůbec
- Tyto produkty byly patrně doporučeny pro "sous vide testování" kontext (pod 200 Kč za lahev), ne pro "levný olej" kontext
- Pokud záměr = pod 200 Kč **za lahev**: Picual 250ml za 110 Kč (44 Kč/100ml) je korektní, Chiavalon 100ml za 189 Kč za lahev taky
- Pokud záměr = best cena/výkon: 5L oleje (Echinac Coupage 21,98 Kč/100ml) jsou výrazně lepší

#### `recky-vs-italsky` — dimenze: origin — ZÁVAŽNÁ MISALIGNACE
- Produkt Picual 5L (ES, španělský, score 95) doporučen v článku "Řecký vs italský"
- Callejas Coupage 5L (ES, španělský, score 94) doporučen v článku "Řecký vs italský"
- Pouze 1 ze 4 produktů (Critida DOP) je řecký — žádný italský!
- DB obsahuje 44 IT produktů se score a 116 GR produktů se score, nikde z nich se nečerpá

#### `recky-italsky-spanelsky-olej` — dimenze: origin — BEZ PRODUKTŮ
- Článek "Řecký, italský nebo španělský: srovnání" nemá žádné produkty/tokeny
- Ideální místo pro systematické origin srovnání s top 2-3 produkty per land

#### `olivovy-olej-na-smazeni-bod-zakoureni` — dimenze: usage — BEZ PRODUKTŮ
- Článek o smažení nemá žádné produktové linky
- Pro usage=frying jsou vhodné rafinované nebo EVOO s nízkou kyselostí

#### `sklizen-oliv-early-vs-late-harvest` — dimenze: harvest — DÍLČÍ PROBLÉM
- Produkty jsou OK (Evolution Denocciolato = early harvest high-poly)
- Ale chybí Evolia Platinum jako ukázkový extrém early harvest (2777 mg/kg!)

### Obecné články (bez specifické dimenzionální fokus)

Těchto 15 článků doporučuje produkty podle obecného score (top-35 vzor) — správné chování:

| Slug | Produktů |
|------|---------|
| `darkove-baleni-olivovy-olej` | 5 |
| `degustace-olivoveho-oleje-doma` | 5 |
| `extra-panensky-vs-panensky-vs-rafinovany` | 5 |
| `falesny-olivovy-olej-jak-rozeznat` | 5 |
| `filtrovany-vs-nefiltrovany-olivovy-olej` | 4 |
| `jak-cist-etiketu-olivoveho-oleje` | 4 |
| `jak-skladovat-olivovy-olej-doma` | 4 |
| `jak-vybrat-olivovy-olej` | 6 |
| `kde-koupit-olivovy-olej-cr` | 5 |
| `nejlepsi-olivovy-olej-2026` | 10 |
| `olivovy-olej-a-zdravi-veda-2026` | 5 |
| `olivovy-olej-pro-deti` | 4 |
| `otevrena-lahev-jak-rychle-spotrebovat` | 4 |
| `premium-olivovy-olej-ma-smysl` | 4 |
| `stredomorska-strava-olivovy-olej` | 5 |

Poznámka: `dop-pgi-bio-certifikace` (certification dimenze) je v dobré kondici — všechny 4 produkty mají DOP nebo BIO certifikaci.

Poznámka: `olivovy-olej-do-salatu-vs-na-vareni` (usage dimenze) — produkty OK pro salátový kontext, žádná zjevná misalignace.

---

## 4. Navrhované systémové řešení pro generate-articles.ts

### Kontextualizace problému

Stávající `fetchProductCatalog()` vždy vrací top-35 podle `olivator_score DESC`. To je správné pro obecné články, ale kontraproduktivní pro tematicky focusované: Score agreguje více dimenzí (kyselost 35%, certifikace 25%, polyfenoly 25%, cena/kvalita 15%), takže nejlepší score produkt nemusí být nejlepší v dimenzích polyphenols, price_per_100ml nebo origin.

---

### Možnost A — Explicitní `focus_dimension` pole v briefu

Brief dostane nové pole:
```
focus_dimension: 'polyphenols' | 'price_per_100ml' | 'acidity' | 'certification' | 'origin:GR' | 'origin:IT' | 'origin:ES' | 'volume' | null
```

`fetchProductCatalog(dimension)` řadí podle dané dimenze:
- `polyphenols` → `ORDER BY polyphenols DESC`
- `price_per_100ml` → JOIN product_offers, `ORDER BY min(price)/volume_ml ASC`
- `acidity` → `ORDER BY acidity ASC`
- `certification` → `WHERE 'bio' = ANY(certifications) OR 'dop' = ANY(certifications) ORDER BY score DESC`
- `origin:GR` → `WHERE origin_country = 'GR' ORDER BY score DESC`
- `null` → zachování stávajícího chování (score DESC)

**Výhody:**
- Deterministic — víš přesně jaká data dostane každý brief
- Snadno testovatelné a auditovatelné
- Explicitní záměr editora je zjevný z briefu

**Nevýhody:**
- Vyžaduje manuální doplnění pole pro každý nový brief
- Starší briefy bez pole se chovají jako dřív (null = score DESC)
- Autor briefu musí znát datové dimenze

---

### Možnost B — Automatická detekce z target_keyword + brief textu

Regex/keyword scan na `target_keyword` a `brief` při volání `fetchProductCatalog()`:

```
"polyfenol" / "polyphenol" / "antioxidant" → dimension = polyphenols
"do 200 Kč" / "levný" / "budget" / "nejlevnější" → dimension = price_per_100ml
"DOP" / "BIO certif" / "organický" → dimension = certification
"řecký" / "z Řecka" / "Kréta" / "Koroneiki" → dimension = origin:GR
"italský" / "z Itálie" / "Puglia" / "Coratina" → dimension = origin:IT
"španělský" / "Picual" / "Andalusie" → dimension = origin:ES
"early harvest" / "pozdní sklizeň" → dimension = polyphenols (proxy)
```

**Výhody:**
- Nulová změna workflow — stávající briefy fungují lépe automaticky
- Retroaktivně opravuje i existující briefy při regeneraci

**Nevýhody:**
- Fragile — false positives (článek "nejlevnější italský olej" → price nebo origin:IT?)
- Ambiguita u overlap dimenzí (polyphenols + origin:GR jsou časté společně)
- Obtížné ladit bez explicitního výstupu "detekováno X"
- Keyword "polyfenol" je zmíněno v 22 ze 24 článků v body textu → falešný hit

---

### Možnost C — Hybridní (doporučení)

Explicitní `focus_dimension` jako **override**, automatická detekce jako **fallback** pouze pro nové briefy bez pole.

Logika:
1. Pokud brief má `focus_dimension` → použij přímo (Možnost A)
2. Pokud `focus_dimension` chybí nebo je null → skenuj jen `target_keyword` a `slug` (ne body — příliš noisy)
3. Pokud detekce vrátí confidence < threshold → fallback na score DESC

Konkrétní pravidlo pro fallback: sken **pouze na slug a target_keyword**, ne na body_markdown. Slug je dostatečně specifický ("polyfenoly-kolik-je-dost" → polyphenols, "olivovy-olej-do-200-kc" → price) a nenese false positives jako body text.

**Výhody:**
- Nové briefy se score lepší automaticky bez ruční práce
- Existující briefy s explicitním polem jsou deterministic
- Retroaktivní fix: regenerace starých článků s novou logikou opraví misalignaci
- Transparentní: logguj detekovanou dimenzi do `agent_decisions` tabulky

**Nevýhody:**
- Složitější implementace (dvě cesty)
- Stále vyžaduje manuální review pro edge cases

### Doporučení

**Zvolte Možnost C — hybridní přístup.**

Odůvodnění:
1. Slug-based detekce je spolehlivá pro ~70 % budoucích briefů (typické struktury jako "oleje-do-200-kc", "polyfenoly-*", "recky-*")
2. Explicitní pole zachovává autorský záměr pro ambiguní případy
3. Kritická podmínka: detekci provádět **pouze na slug a target_keyword**, nikdy na body_markdown — body obsahuje zmínky polyfenolů v kontextu u 22/24 článků

Priorita implementace:
1. Přidat `focus_dimension` do brief schématu (nullable)
2. Upravit `fetchProductCatalog(dimension?)` pro dimenzionální řazení
3. Přidat slug-based auto-detekci jako fallback
4. Logovat detekovanou dimenzi do `agent_decisions` pro audit

---

## 5. Souhrn misalignací (prioritizace opravy)

| Závažnost | Článek | Dimenze | Problém |
|-----------|--------|---------|---------|
| KRITICKÁ | `polyfenoly-kolik-je-dost` | polyphenols | EVOLIA 2777 a 2000+ chybí; max v článku 1088 mg/kg |
| ZÁVAŽNÁ | `recky-vs-italsky` | origin | 3 ze 4 produktů jsou španělské (ES), žádný italský |
| STŘEDNÍ | `olivovy-olej-do-200-kc` | price | Chiavalon 100ml = 189 Kč/100ml ≠ "levný olej" |
| STŘEDNÍ | `polyfenoly-proc-na-nich-zalezi` | polyphenols | EVOLIA 2000+ chybí (ale 2777 přítomen) |
| NÍZKÁ | `recky-italsky-spanelsky-olej` | origin | Žádné produkty (prázdný článek) |
| NÍZKÁ | `olivovy-olej-na-smazeni-bod-zakoureni` | usage | Žádné produkty |
| NÍZKÁ | `sklizen-oliv-early-vs-late-harvest` | harvest | Chybí EVOLIA jako early harvest extrém |

---

*Tento dokument je analytický podklad — neobsahuje návrh kódu ani DB změny.*  
*Implementace: viz sekce 4 a CLAUDE.md sekce 15 (Agenti → Content Agent).*
