# Token-Affiliate Alignment Audit
**Datum:** 2026-07-08  
**Zpracoval:** automatická analýza (DB + article body_markdown)  
**Kontext:** reckonasbavi generuje 48 % všech affiliate kliků → priorita maximalizovat tokeny přes tento kanál

---

## Souhrn

| Stav | Počet článků | Popis |
|------|-------------|-------|
| ⚪ bez tokenů | 17 | Žádné `{{product:...}}` tokeny — neutrální |
| 🟢 aligned | 0 | ≥ 80 % tokenů přes reckonasbavi |
| 🟡 mixed | 3 | 50–80 % tokenů přes reckonasbavi |
| 🔴 missed | 13 | < 50 % tokenů přes reckonasbavi |

Z 13 červených článků jsou **3 tematicky opodstatněné** (nelze měnit bez editoriálního poškození), **10 k opravě**.

Celkový odhadovaný počet historických kliků směřujících mimo reckonasbavi z opravitelných článků: **482 kliků**. Konzervativní odhad přínosu po swapu: **+289 kliků/měsíc** přes reckonasbavi.

---

## Tabulka všech článků

| Slug | Kategorie | Aligned/Celkem | % | Status |
|------|-----------|----------------|---|--------|
| rafinovany-olivovy-olej | vzdelavani | 1/3 | 33 % | 🔴 k opravě |
| je-olivovy-olej-zdravy | pruvodce | 2/5 | 40 % | 🔴 k opravě |
| polyfenoly-proc-na-nich-zalezi | vzdelavani | 2/7 | 29 % | 🔴 k opravě |
| recky-italsky-spanelsky-olej | srovnani | — | — | ⚪ bez tokenů |
| darkove-baleni-olivovy-olej | srovnani | — | — | ⚪ bez tokenů |
| olivovy-olej-z-pokrutin | vzdelavani | 0/2 | 0 % | 🔴 tematicky opodstatněné* |
| olivovy-olej-pro-deti | vzdelavani | — | — | ⚪ bez tokenů |
| premium-olivovy-olej-ma-smysl | srovnani | — | — | ⚪ bez tokenů |
| recky-vs-italsky | srovnani | 1/4 | 25 % | 🔴 tematicky opodstatněné* |
| olivovy-olej-na-smazeni-bod-zakoureni | vzdelavani | — | — | ⚪ bez tokenů |
| jak-skladovat-olivovy-olej-doma | pruvodce | — | — | ⚪ bez tokenů |
| domaci-olivovy-olej | vzdelavani | 1/4 | 25 % | 🔴 k opravě |
| olivovy-olej-s-citronem-po-rano | pruvodce | 2/5 | 40 % | 🔴 k opravě |
| jak-vybrat-olivovy-olej | pruvodce | 0/5 | 0 % | 🔴 k opravě |
| olivovy-olej-vs-slunecnicovy | vzdelavani | 2/4 | 50 % | 🟡 mixed |
| jak-cist-etiketu-olivoveho-oleje | vzdelavani | — | — | ⚪ bez tokenů |
| sklizen-oliv-early-vs-late-harvest | vzdelavani | — | — | ⚪ bez tokenů |
| stredomorska-strava-olivovy-olej | vzdelavani | — | — | ⚪ bez tokenů |
| olivovy-olej-do-salatu-vs-na-vareni | srovnani | — | — | ⚪ bez tokenů |
| extra-panensky-vs-panensky-vs-rafinovany | vzdelavani | — | — | ⚪ bez tokenů |
| polyfenoly-kolik-je-dost | vzdelavani | 3/5 | 60 % | 🟡 mixed |
| filtrovany-vs-nefiltrovany-olivovy-olej | vzdelavani | — | — | ⚪ bez tokenů |
| degustace-olivoveho-oleje-doma | pruvodce | — | — | ⚪ bez tokenů |
| dop-pgi-bio-certifikace | vzdelavani | — | — | ⚪ bez tokenů |
| nejlepsi-olivovy-olej-na-svete | zebricek | 2/5 | 40 % | 🔴 k opravě |
| olivovy-olej-na-plet-a-vlasy | pruvodce | 1/5 | 20 % | 🔴 k opravě |
| kde-koupit-olivovy-olej-cr | pruvodce | — | — | ⚪ bez tokenů |
| otevrena-lahev-jak-rychle-spotrebovat | pruvodce | — | — | ⚪ bez tokenů |
| kalamata-pdo-olivovy-olej | vzdelavani | 2/4 | 50 % | 🟡 mixed |
| falesny-olivovy-olej-jak-rozeznat | pruvodce | — | — | ⚪ bez tokenů |
| nejlepsi-olivovy-olej-2026 | zebricek | 1/10 | 10 % | 🔴 k opravě |
| olivovy-olej-do-200-kc | srovnani | 1/10 | 10 % | 🔴 k opravě |
| olivovy-olej-ve-spreji | srovnani | 0/3 | 0 % | 🔴 tematicky opodstatněné* |

\* Tematicky opodstatněné: viz sekce níže — NECHAT beze změny.

---

## Tematicky opodstatněné — NECHAT

### `olivovy-olej-z-pokrutin`
Tokeny: `olivovy-olej-z-pokrutin-liofyto-1-l-pet` (GR, reckyeshop), `pons-olivovy-olej-z-pokrutin-pomace-plech-4l` (ES, gourmet-partners)  
**Důvod:** reckonasbavi nemá pokrutinový (pomace) olej v katalogu. Téma je specifické a GR produkt Liofyto je přes reckyeshop — jiný řecký specialista. ES Pons Pomace je legitimní průmyslová volba. Nelze nahradit.

### `recky-vs-italsky`
Tokeny: 3× IT (olivum), 1× IT (reckonasbavi)  
**Důvod:** Srovnávací článek GR vs IT vyžaduje italské produkty. Problém je, že 3 ze 4 IT tokenů jsou přes olivum, přestože reckonasbavi má Intini (IT). **Partial fix**: vyměnit evolution-denocciolato, lamacupa-luma a le-selezioni za `intini-extra-alberobello` nebo `intini-cima-di-mola-alberobello` (oba přes reckonasbavi). Ale alespoň 2 IT tokeny musí zůstat pro tematickou integritu.

### `olivovy-olej-ve-spreji`
Tokeny: 2× IT/ES (olivum/italyshop), 1× GR (greekmarket)  
**Důvod:** Sprejová kategorie je niche. reckonasbavi má `evoilino-korfu-extra-panensky-olivovy-olej-ve-spreji-s-lanyzem-50ml` (GR, flavored) ale to je flavored produkt, ne čistý sprej. Frankoi Cutrera (IT) a Sagra (IT) jsou specifické prémiové sprejové značky. **Doporučení:** Vyměnit alespoň GR greekmarket token za reckonasbavi GR — ale bez celkového swapového efektu.

---

## Per-článek detail — k opravě

> Seřazeno podle priority (kliknutí × affiliate potenciál).

---

### 1. `nejlepsi-olivovy-olej-2026` [zebricek] — 1/10 = 10 % | 129 lost clicks

Hlavní žebříček roku. Dominuje ES sortiment z lozanocervenka/olivarna/olivum.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `picual-5-l-extra-panensky-nefiltrovany-olivovy-olej-bag-in-box` | ES | 95 | lozanocervenka | 35 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l` (GR, 85, dop) |
| `olivovy-olej-extra-panensky-callejas-coupage-5l` | ES | 94 | olivarna | 27 | `sitia-premium-gold-...-5l-plech-poskozeny-obal` (GR, 88, dop) |
| `bio-extra-panensky-olivovy-olej-elixir-500-ml` | ES | 86 | olivum | 33 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82, bio) |
| `picual-2-l-extra-panensky-olivovy-olej` | ES | 91 | lozanocervenka | 5 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-3-l` (GR, 85, 3L dop) |
| `arbequina-5-l-extra-panensky-olej-olivovy-olej-bag-in-box` | ES | 88 | lozanocervenka | 6 | `corinto-pelopones-extra-panensky-olivovy-olej-manaki-0-3-5-l` (GR, 82) |
| `liophos-bio-extra-panensky-olivovy-olej-5l-stamatakos` | GR | 86 | greekmarket | 27 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l` (GR, 85, dop) |
| `picual-5-l-extra-panensky-olivovy-olej` | ES | 95 | lozanocervenka | 23 | `corinto-pelopones-extra-panensky-olivovy-olej-manaki-0-3-5-l` (GR, 82) |

**Zachovat:** `intini-coratina-alberobello` (IT, reckonasbavi ✓), `extra-panensky-olivovy-olej-sitia-pdo-0-2-critida-4-l-design` (GR, reckyeshop — zachovat pro diverzitu)

**Editorial impact:** POVINNÝ přepis hodnotících komentářů u ES tokenů — picual score 95 vs GR score 85 je viditelný rozdíl. Komentáře musí odpovídat novým produktům. Zachovat alespoň 1 ES token pro credibilitu "nejlepší na světě" žebříčku.

---

### 2. `jak-vybrat-olivovy-olej` [pruvodce] — 0/5 = 0 % | 122 lost clicks

Klíčový průvodce-výběr. Žádný token přes reckonasbavi. Všechny ES/GR přes lozanocervenka/olivarna/greekmarket/reckyeshop.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `picual-5-l-extra-panensky-nefiltrovany-olivovy-olej-bag-in-box` | ES | 95 | lozanocervenka | 35 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l` (GR, 85, dop) |
| `olivovy-olej-extra-panensky-callejas-coupage-5l` | ES | 94 | olivarna | 27 | `corinto-pelopones-extra-panensky-olivovy-olej-manaki-0-3-5-l` (GR, 82) |
| `bio-extra-panensky-olivovy-olej-elixir-500-ml` | ES | 86 | olivum | 33 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82, bio) |
| `liophos-bio-extra-panensky-olivovy-olej-5l-stamatakos` | GR | 86 | greekmarket | 27 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-5-l` (GR, 85, dop) |

**Poznámka:** `extra-panensky-olivovy-olej-sitia-pdo-0-2-critida-4-l-design` (GR, reckyeshop, 37 kliků) — ponechat, je to GR ale přes reckyeshop, ne reckonasbavi. Swap na reckonasbavi 5L je vhodný.

**Editorial impact:** Pokud text explicitně jmenuje "picual" nebo "Callejas" → POVINNĚ přepsat větu. Pokud token kontextuálně popsán jako "ekonomická volba 5L" nebo "BIO alternativa" → swap bez přepisu.

---

### 3. `polyfenoly-proc-na-nich-zalezi` [vzdelavani] — 2/7 = 29 % | 54 lost clicks

Vzdělávací článek o polyfenolech. 5 tokenů přes olivum (ES+IT), přitom reckonasbavi má Evolia 2777 mg/kg a Corinto 600 mg/kg — ideální pro toto téma.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `bio-extra-panensky-olivovy-olej-elixir-500-ml` | ES | 86 | olivum | 33 | `evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen` (GR, 85, **2777 mg/kg** — tematicky nejsilnější) |
| `premiovy-extra-panensky-olivovy-olej-centenarium-premium-anniversary-500-ml-v-darkovem-baleni` | ES | 83 | olivum | 5 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82, 2000 mg/kg) |
| `premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu` | IT | 83 | olivum | 7 | `corinto-pelopones-600-polyfenolu-extra-panensky-olivovy-olej-0-3-500-ml` (GR, 72, **600 mg/kg** — přímá IT alternativa s polyfenolovou hodnotou) |
| `italsky-premiovy-extra-panensky-olivovy-olej-gangalupo-coratina-500-ml` | IT | 78 | olivum | 5 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82) |
| `casas-de-hualdo-reserva-de-familia-500-ml` | ES | 83 | olivum | 4 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml` (GR, 81, dop) |

**Editorial impact:** "Gangalupo Coratina" a "Evolution Denocciolato" jsou zmíněny jménem → přepsat větu. Elixir a Centenarium jsou popsány genericky.

---

### 4. `olivovy-olej-do-200-kc` [srovnani] — 1/10 = 10 % | 33 lost clicks

Cenový srovnávač pod 200 Kč. Iliada Kalamata (reckonasbavi, 68 kliků!) je v článku, ale ostatní tokeny jsou ES přes lozanocervenka.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `picual-500-ml-extra-panensky-olivovy-olej` | ES | 91 | lozanocervenka | 4 | `iliada-kalamata-extra-panensky-olivovy-olej-0-5-500ml` (GR, 69, dop — již v článku, nebo `evoilino-korfu-...-500-ml`) |
| `picual-500-ml-extra-panensky-nefiltrovany-olivovy-olej` | ES | 91 | lozanocervenka | 9 | `corinto-pelopones-bio-extra-panensky-olivovy-olej-manaki-0-4-500-ml` (GR, 67, bio) |
| `arbequina-500-ml` | ES | 88 | lozanocervenka | 17 | `evoilino-korfu-extra-panensky-olivovy-olej-0-3-500-ml-sklo` (GR, 68) nebo `corinto-pelopones-extra-panensky-olivovy-olej-manaki-0-3-500-ml` (GR, 62) |
| `picual-250-ml-extra-panensky-olivovy-olej` | ES | 80 | lozanocervenka | 1 | `styliana-amazona-bio-extra-panensky-olivovy-olej-arbequina-0-2-250-ml-sklo` (GR, 77) |
| `casitas-de-hualdo-250-ml-zluty` | ES | 81 | olivum | 2 | `styliana-amazona-bio-extra-panensky-olivovy-olej-arbequina-0-2-250-ml-sklo` (GR, 77) |

**DŮLEŽITÉ:** Před swapem ověřit, že reckonasbavi ceny pro Evoilino/Corinto/Styliana jsou skutečně pod 200 Kč. Corinto 500ml a Evoilino 500ml jsou levnější segmenty — pravděpodobně OK.

**Editorial impact:** Pokud věta říká "španělský pikantní Picual" → přepsat. Pokud "cenově dostupný 500ml olej" → swap bez přepisu.

---

### 5. `olivovy-olej-na-plet-a-vlasy` [pruvodce] — 1/5 = 20 % | 29 lost clicks

Kosmetický průvodce. 3 GR tokeny přes greekmarket + 1 ES přes lozanocervenka.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `myrtoo-bio-extra-panensky-olivovy-olej-750ml-stamatakos` | GR | 82 | greekmarket | 19 | `orino-sithia-orino-sitia-p-d-o-kreta-extra-panensky-olivovy-olej-0-3-1-l-sklo` (GR, 79, 1L, dop+bio) |
| `bio-extra-panensky-olivovy-olej-1l-mitira` | GR | 74 | greekmarket | 5 | `nikolos-kalamata-extra-panensky-olivovy-olej-0-3-1-l-sklo` (GR, 71, 1L, bio) |
| `early-harvest-liophos-bio-extra-panensky-olivovy-olej-pgi-lakonia-750ml-stamatakos` | GR | 79 | greekmarket | 2 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82, bio) |
| `picual-bio-500-ml` | ES | 82 | lozanocervenka | 3 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82, bio) |

**Editorial impact:** "Myrtoo" a "Liophos" jsou popsány jménem → přepsat. "Mitira" a "picual-bio" jsou generičtěji zmíněny → swap bez přepisu.

---

### 6. `rafinovany-olivovy-olej` [vzdelavani] — 1/3 = 33 % | 26 lost clicks

Vzdělávací článek o rafinovaném oleji. Paradoxně doporučuje Picual (kvalitní EVOO) jako kontrast — logicky správné, ale přes lozanocervenka.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `picual-500-ml-extra-panensky-nefiltrovany-olivovy-olej` | ES | 91 | lozanocervenka | 9 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82, bio) nebo `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml` (GR, 81, dop) |
| `arbequina-500-ml` | ES | 88 | lozanocervenka | 17 | `corinto-pelopones-600-polyfenolu-extra-panensky-olivovy-olej-0-3-500-ml` (GR, 72) nebo `evolia-platinum-2000-...` (GR, 82) |

**Editorial impact:** Pokud text popisuje Picual jako "španělský kontrast k rafinovaným" → přepsat. Pokud jen "doporučujeme dobrý EVOO místo rafinovaného" → swap bez přepisu.

---

### 7. `je-olivovy-olej-zdravy` [pruvodce] — 2/5 = 40 % | 24 lost clicks

Zdravotní průvodce. 2 IT tokeny přes olivum + 1 GR přes olivum.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu` | IT | 83 | olivum | 7 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82, 2000 mg/kg — zdravotní claim silnější) |
| `premiovy-extra-panensky-olivovy-olej-le-selezioni-coratina-500-ml-z-italske-farmy-le-tre-colonne` | IT | 81 | olivum | 6 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml` (GR, 81, dop) |
| `limitovana-edice-reckeho-premiove-olivoveho-oleje-the-governor-500-ml` | GR | 76 | olivum | 11 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82) nebo `sitia-kreta-premium-gold-0-2-...` (GR, 81) |

**Editorial impact:** "The Governor" je specifická limitovaná edice — přepsat větu. Evolution a Le Selezioni jsou rovněž zmíněny jménem v závorce za tokenem.

---

### 8. `olivovy-olej-s-citronem-po-rano` [pruvodce] — 2/5 = 40 % | 24 lost clicks

Ranní ritual s citronem. 2 IT/GR tokeny přes olivum.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu` | IT | 83 | olivum | 7 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82) |
| `limitovana-edice-reckeho-premiove-olivoveho-oleje-the-governor-500-ml` | GR | 76 | olivum | 11 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml` (GR, 81) nebo `orino-sitia-p-d-o-kreta-extra-panensky-olivovy-olej-0-3-1-l` (GR, 79, dop+bio) |
| `premiovy-extra-panensky-olivovy-olej-le-selezioni-coratina-500-ml-z-italske-farmy-le-tre-colonne` | IT | 81 | olivum | 6 | `sitia-kreta-premium-gold-0-2-extra-panensky-olivovy-olej-500-ml` (GR, 81, dop) |

**Editorial impact:** The Governor a Le Selezioni mají specifická jména v textu → přepsat věty. Evolution popsána genericky.

---

### 9. `domaci-olivovy-olej` [vzdelavani] — 1/4 = 25 % | 21 lost clicks

Tutoriál degustace doma. Španělský Picual a Arbequina jsou náhodné pro obecný degustační článek.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `picual-500-ml-extra-panensky-olivovy-olej` | ES | 91 | lozanocervenka | 4 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82) nebo `sitia-kreta-premium-gold-0-2-...` (GR, 81) |
| `arbequina-500-ml` | ES | 88 | lozanocervenka | 17 | `corinto-pelopones-bio-extra-panensky-olivovy-olej-manaki-0-4-500-ml` (GR, 67, bio) nebo `evoilino-korfu-extra-panensky-olivovy-olej-0-3-500-ml-sklo` (GR, 68) |

**Editorial impact:** Pokud text říká "pikantní španělská odrůda Picual" → přepsat. Pokud obecně "vyzkoušejte dva různé styly" → swap bez přepisu.

---

### 10. `nejlepsi-olivovy-olej-na-svete` [zebricek] — 2/5 = 40 % | 20 lost clicks

Globální žebříček. Diverzita zemí je tematicky v pořádku, ale konkrétní tokeny jsou přes špatné kanály.

| Token k odstranění | Původ | Score | Via | Kliků | Kandidát náhrady |
|--------------------|-------|-------|-----|-------|-----------------|
| `premiovy-extra-panensky-olivovy-olej-evolution-denocciolato-500-ml-s-vysokym-podilem-polyfenolu` | IT | 83 | olivum | 7 | `intini-coratina-alberobello` (IT, 83, **reckonasbavi** — zachová IT diverzitu) |
| `casas-de-hualdo-reserva-de-familia-500-ml` | ES | 83 | olivum | 4 | `evolia-platinum-2000-polyfenolu-bio-extra-panensky-olivovy-olej-500-ml` (GR, 82) nebo `sitia-kreta-premium-gold-0-2-...` (GR, 81) |
| `picual-500-ml-extra-panensky-nefiltrovany-olivovy-olej` | ES | 91 | lozanocervenka | 9 | `evolia-platinum-2777-polyfenolu-bio-extra-panensky-olivovy-olej-250-ml-extremne-vzacna-sklizen` (GR, 85, 2777 mg/kg — legitimně "světová" kategorie) |

**Editorial impact:** Každý token v žebříčku má hodnotící komentář → přepsat pro každou záměnu.

---

## Priorita oprav

| Priorita | Článek | Lost clicks | Náročnost | Doporučení |
|----------|--------|-------------|-----------|------------|
| 🔥 1 | `nejlepsi-olivovy-olej-2026` | 129 | Vysoká (přepis 6 komentářů) | Začni zde — SEO vlajková loď |
| 🔥 2 | `jak-vybrat-olivovy-olej` | 122 | Střední (generický popis → swap bez přepisu) | Klíčový SEO článek, snadnější editorial |
| 3 | `polyfenoly-proc-na-nich-zalezi` | 54 | Střední | Evolia/Corinto jsou tematicky silnější fit |
| 4 | `olivovy-olej-do-200-kc` | 33 | Nízká | Ověřit ceny reckonasbavi < 200 Kč |
| 5 | `olivovy-olej-na-plet-a-vlasy` | 29 | Střední | Přepis 2 vět s Myrtoo/Liophos |
| 6 | `rafinovany-olivovy-olej` | 26 | Nízká | Pravděpodobně bez přepisu |
| 7 | `je-olivovy-olej-zdravy` | 24 | Střední | The Governor vyžaduje přepis |
| 8 | `olivovy-olej-s-citronem-po-rano` | 24 | Střední | 2 přepisy vět |
| 9 | `domaci-olivovy-olej` | 21 | Nízká | Závisí na formulaci |
| 10 | `nejlepsi-olivovy-olej-na-svete` | 20 | Vysoká | Přepis hodnotících komentářů |

---

## Estimated impact

**Historicky sledované klikání:** 506 celkem z tokenizovaných článků.

**Kliknutí aktuálně mimo reckonasbavi z opravitelných článků:** ~482 historicky.

**Po swapu (konzervativní odhad 60 % re-engagement):**
- +289 kliků/měsíc přes reckonasbavi
- reckonasbavi konverzní rate ~2 %, průměrný košík ~400 Kč, komise ~10 %
- Odhadovaný příjem: **+231 Kč/měsíc** v přímé affiliate provizi

**Nepřímý efekt (těžko měřitelný):** reckonasbavi má vyšší stock turnover a pravděpodobně vyšší konverzní rate na řecké produkty než generičtí prodejci jako lozanocervenka. Skutečný dopad může být 2–3× vyšší.

---

## Kritické poznámky

1. **`picual-5-l`** série (lozanocervenka) má score 95 — nejvyšší v DB. Swap na GR 5L se score 85 může ohrozit věrohodnost žebříčků. Zvážit zachovat 1 ES token v `nejlepsi-olivovy-olej-2026` pro credibilitu.

2. **`extra-panensky-olivovy-olej-sitia-pdo-0-2-critida-4-l-design`** (GR, 37 kliků) je přes reckyeshop, ne reckonasbavi. Je to druhý nejvíce kliknutý token v DB. Zvážit přidání tohoto produktu do reckonasbavi katalogu — potenciální přínos bez editorial změn.

3. **Greekmarket vs reckonasbavi:** 5 GR tokenů přes greekmarket (Myrtoo, Liophos, Mitira, Liokarpi, pure-drop). reckonasbavi nemá tyto konkrétní značky. Nahrazení je možné ale vede k záměně brand/série → nutný přepis.

4. **olivum dominuje italský segment:** 12 tokenů přes olivum. reckonasbavi má Intini (4 varianty) — použít jako primární IT náhradu v relevantních článcích.
