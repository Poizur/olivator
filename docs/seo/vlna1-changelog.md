# KROK 1 — Vlna 1: Title/H1/intro fixy (2026-05-28)

Všechny změny jsou **DB changes v Supabase** (tabulky `articles` a `regions`).
Branch `seo/vlna1-title-fixes` dokumentuje, co bylo změněno.

## Změny

### 1. /pruvodce/recky-vs-italsky
- **title / H1:** Řecký vs italský olivový olej — který vybrat? → **Nejlepší řecký olivový olej — srovnání s italským**
- **meta_title:** → Nejlepší řecký olivový olej 2026 | Srovnání s italským (55 znaků)
- **meta_description:** → "Nejlepší řecký olivový olej 2026: PDO z Kréty nebo Lesbosu? Srovnáme chuť, kyselost i cenu s italskou konkurencí." (112 znaků)
- **1. odstavec:** Přidán keyword + opravena faktická chyba (70–80 % řecké produkce, ne světové)
- **Cílový keyword:** nejlepší řecký olivový olej (460 vol, comp 0)

### 2. /pruvodce/kde-koupit-olivovy-olej-cr
- **title / meta_title:** beze změny (keyword byl přítomný)
- **1. odstavec:** Přidán keyword "kde koupit kvalitní olivový olej" do první věty
- **Cílový keyword:** kde koupit kvalitní olivový olej (380 vol, comp 0)

### 3. /pruvodce/olivovy-olej-a-zdravi-veda-2026
- **title / H1:** Olivový olej a zdraví: co tvrdí věda v roce 2026 → **Olivový olej a zdraví: zdravotní účinky podle vědy**
- **meta_title:** → Je olivový olej zdravý? Zdravotní účinky dle vědy 2026 (51 znaků)
- **meta_description:** → "Je olivový olej zdravý? PREDIMED studie, oleocanthal a vliv na srdce — co věda skutečně potvrdila. Bez přehánění." (112 znaků)
- **1. odstavec:** Přidán keyword "je olivový olej zdravý" + opravena formulace PREDIMED (byl součástí stravy, ne "hrál klíčovou roli")
- **Cílové keywords:** je olivový olej zdravý (410 vol), olivový olej zdravotní účinky (420 vol)

### 4. /pruvodce/olivovy-olej-na-smazeni-bod-zakoureni
- **title / meta_title:** beze změny (keyword byl přítomný)
- **1. odstavec:** Přidán keyword "olivový olej na smažení" do první věty
- **Cílový keyword:** olivový olej na smažení (480 vol, comp 15)

### 5. /oblast/kreta
- **H1:** "Olivový olej z Kréty" (hardcoded via genitive(), žádná kódová změna)
- **meta_title:** Olivový olej z Kréty | Olivator → **Olivový olej z Kréty 2026 — nejlepší krétské oleje | Olivátor**
- **meta_description:** → "Krétský olivový olej — PDO Sitia, Koroneiki, nejnižší kyselost. Srovnání 10+ krétských olejů s Olivator Score a cenami od 18 prodejců."
- **Cílové keywords:** olivový olej kréta (460 vol), krétský olivový olej (370 vol)

## Poznámka k "draft" požadavku
DB changes jsou live okamžitě — `force-dynamic` na průvodci + region pages znamená,
že Supabase data se načtou při každém requestu. Výsledky jsou viditelné živě.
