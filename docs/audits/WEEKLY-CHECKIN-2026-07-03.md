# Weekly Check-in — 2026-07-03

> Porovnání s auditem 2026-06-24 (GSC-ANALYSIS.md). GSC window: 28 dní, data k 3.7.2026.

---

## TL;DR

Traffic roste napříč všemi dimenzemi: +13 % kliků, +25 % impresí, pozice zlepšena z 9,38 na 8,77.
Brand stránky vydané 29.6. se okamžitě chytily — `/znacka/corinto` je už #3 stránka podle kliků
s 11,5% CTR. Linkbuilding na `kde-koupit` fungoval: pozice skok z 11,6 na 7,9. Citronový článek
naopak zhoršil CTR (1,1 % → 0,6 %) — title fix potřebuje dalších 7–14 dní na propagaci.
Cron:validate-tokens a cron:manager nejsou nasazeny na Railway → žádné automatické reporty
ani token validace od 24.6.

---

## ČÁST 1 — GSC metriky (28denní okno)

| Metrika | 24.6. audit | 3.7. snapshot | Delta |
|---------|------------|---------------|-------|
| Clicks 28d | 155 | **176** | +21 (+13,5 %) |
| Impressions 28d | 5 929 | **7 385** | +1 456 (+24,6 %) |
| Avg position | 9,38 | **8,77** | -0,61 ✅ |
| CTR | 2,61 % | **2,38 %** | -0,23 pp ⚠️ |

**Interpretace:** Impressions rostou rychleji než kliky → nové stránky jsou
discoveredovány Googlem, ale ještě nezískaly CTR autoritu (normální pro čerstvé stránky).
CTR pokles je dočasný efekt „diluce" — průměruje etablované stránky s novými, které
mají přirozeně nižší CTR v prvních týdnech.

### Daily trend (po-24.6.)

| Datum | Clicks | Impressions | Poznámka |
|-------|--------|-------------|---------|
| 25.6. | 6 | 273 | |
| 26.6. | 4 | 318 | |
| 27.6. | 6 | 278 | |
| 28.6. | 6 | 263 | |
| 29.6. | 6 | 292 | Brand stránky live |
| 30.6. | 7 | 305 | |
| **1.7.** | **15** | **543** | **Spike — největší den v datasetu** |
| 2.7. | 9 | 358 | |

Spike 1.7. (+2,4× průměr) — pravděpodobně kombinace brand stránek + sezonní signal
(letní vaření/dovolené). Potřeba sledovat — pokud se opakuje každý týden v úterý,
jde o sezonní cyklus.

---

## ČÁST 2 — T-14 Per-URL verdikt

### `/pruvodce/olivovy-olej-s-citronem-po-rano` — title fix
- **Cíl:** CTR z 1,1 % na 2,5 %+
- **Aktuálně:** 3 kliky, 466 imp, **CTR 0,64 %**, pos 11,0
- **Verdikt:** ❌ NESPLNĚNO — CTR se zhoršil (1,1 % → 0,64 %), impressions narostly (+28 %)
- **Analýza:** Title fix byl commitnut 24.6. — Google ho pravděpodobně ještě nezaindexoval
  (propagace trvá 2–4 týdny). Zároveň growth impresí přišel z long-tail dotazů s nižší
  click propensity. **Re-check 17.7.**

### `/pruvodce/olivovy-olej-z-pokrutin` — title fix
- **Cíl:** CTR pod 1,5 % na 2,5 %+
- **Aktuálně:** Článek se **nevyskytl v top 30 stránek** (0 kliků)
- Produktová stránka `/olej/olivovy-olej-z-pokrutin-liofyto-5-l-pet`: 2 kl, 31 imp, 6,5 % CTR
- **Verdikt:** ❌ NESPLNĚNO — stejný důvod jako citron (propagace), ale horší pozice

### `/pruvodce/polyfenoly-proc-na-nich-zalezi` — internal linky
- **Cíl:** z 0 impresí na měřitelná data
- **Aktuálně:** Stále **nevyskytuje se v top 30** — 0 kliků, ~0 impresí
- **Verdikt:** ❌ NESPLNĚNO — interní linky přidány 24.6., Google ještě nepropagoval
- **Poznámka:** Tato URL je nejdelší opravit — nulová historická autorita. Čekat 4–6 týdnů.

### `/pruvodce/kde-koupit-olivovy-olej-cr` — internal linky
- **Cíl:** pozice z 11,6 na 8–10
- **Aktuálně:** 8 kliků, 223 imp, **3,59 % CTR**, **pos 7,94**
- **Verdikt:** ✅ SPLNĚNO (a překonáno) — pozice 7,94 překonala cíl 8–10

---

## ČÁST 3 — Brand stránky (baseline po vydání 29.6.)

| Stránka | Clicks | Impressions | CTR | Pozice |
|---------|--------|------------|-----|--------|
| `/znacka/corinto` | **7** | 61 | **11,5 %** | 6,4 |
| `/znacka/evoilino` | 4 | 197 | 2,0 % | 7,7 |
| `/znacka/sitia-kreta` | 3 | 103 | 2,9 % | 10,7 |
| `/znacka/motakis` | 1 | 19 | 5,3 % | 5,4 |

**Výjimečný výsledek:** `/znacka/corinto` je #3 stránka webu podle kliků při tak krátké době
existence. CTR 11,5 % = velmi cílená audience (search intent přesně matchuje stránku).

Klíčový dotaz generující motakis traffic: `"motakis kréta extra panenský olivový olej"` —
5,3 % CTR na pozici 5,4 = zdravý základ.

---

## ČÁST 4 — Manager report status

| Report | Datum | offersWithoutAffiliate |
|--------|-------|----------------------|
| Stará verze | 2026-05-11 | 452 (špatná metrika) |
| Nová verze (bug) | 2026-06-24T06:52 | 492 (ještě bez fixu) |
| **Nová verze (fix)** | **2026-06-24T08:05** | **361** ✅ |

✅ Oprava metriky (commit 698ff05) funguje: 361 místo 492.

⚠️ Žádný report od 24.6. — cron:manager není nasazen na Railway jako service.
Pondělní report 30.6. a 7.7. se nespustil. **Viz Task #29.**

---

## ČÁST 5 — Token validator status

- `agent_decisions` pro `agent_name='token-validator'`: **0 záznamů**
- Cron:validate-tokens nebyl spuštěn od doby nasazení kódu (25.6.)
- **Příčina:** Script existuje (`scripts/cron/validate-tokens.ts`), ale není nasazen jako
  Railway cron service. **Viz Task #29.**
- Stav tokenů neznámý — manuálně spustit nebo nasadit

---

## ČÁST 6 — Nové nálezy

### Pozitivní

**1. Plet & vlasy dominuje** — `/pruvodce/olivovy-olej-na-plet-a-vlasy` je #1 stránka:
19 kliků, 711 impresí, pos 8,8. Jde o kosmetický use-case, ne kulinarický — nečekaně silné.

**2. Produktové stránky s high CTR:**
- Evolia Platinum: 5 kl, 29 imp, **17,2 % CTR** (brand query = nakupovací intent)
- Intini Bio Coratina: 2 kl, 9 imp, **22,2 % CTR** (velmi cílená)
- The Governor 500ml: 2 kl, 12 imp, **16,7 % CTR**

**3. Mezinárodní traffic roste:**
GRC (Řecko): 6 kl, 300 imp — content čtou i výrobci/dodavatelé. DEU + ITA celkem 8 kliků.

**4. Evoilino query potvrzen:** `"evoilino olej"` = 1 klik, 25 imp, pos 8,6 —
brand stránka dostává branded traffic hned po vydání.

### Pozor

**5. `olivovy-olej-s-citronem-po-rano` impressions rostou, ale CTR padá:**
364 imp → 466 imp (+28 %), ale CTR: 1,1 % → 0,64 %. Stránka je na pozici 11,0 
(dříve ~9). Buď title fix ještě nepropagoval, nebo stránka "sklouzla" při velkém
growth impresí z wider query setu.

**6. Theikos s nízkým CTR ale vysokými impresemi:**
`/olej/theikos-kreta-extra-panensky-olivovy-olej-0-3-1-l` — 196 impresí, pouze 1 % CTR,
pos 13,2. Typický kandidát na title/meta optimalizaci.

**7. Italské žebříčky se duplují:** `/zebricek/nejlepsi-italsky-olej` (3 kl, 84 imp)
a `/zebricek/nejlepsi-italsky-olivovy-olej` (3 kl, 89 imp) — potenciální kanibalizace
(viz L-006). Zkontrolovat zda jsou to různé stránky nebo jedna má redirect.

---

## ČÁST 7 — Top 5 doporučených akcí (ROI pořadí)

### 1. 🚀 Nasadit cron:manager + cron:validate-tokens na Railway (Task #29)
- **Čas:** 15 min (Railway dashboard)
- **Dopad:** Týdenní manager reporty obnoví; token validace začne chránit 23+ článků
- **Proč teď:** Každý týden bez reportu = slepá skvrna v rozhodování

### 2. 📈 Interní linky na `/znacka/corinto` a ostatní brand stránky
- **Čas:** 30 min (5–8 linků do relevantních článků)
- **Dopad:** Brand stránky mají natural CTR 11,5 % — rychlejší pozice growth s více linky
- **Proč teď:** Corinto je outperforming, linkbuilding to urychlí

### 3. 🔍 Title+meta optimalizace `/olej/theikos-*` (196 imp, 1 % CTR)
- **Čas:** 10 min
- **Dopad:** 196 impresí měsíčně na pos 13,2 — zlepšení na 2,5 % CTR = +3 kl/měs
- **Jak:** Zkontrolovat current meta_title, přidat "| Recenze & cena" nebo konkrétní
  hodnotu (0,3 % kyselost, polyfenoly)

### 4. ⏳ Re-check T-14 citron/pokrutiny za 14 dní (17.7.)
- **Čas:** 0 min teď
- **Dopad:** Ověřit zda title fixy z 24.6. propagovaly
- **Pokud ne po 4 týdnech:** zvážit jiný title angle nebo structured data push

### 5. 🎯 Investigace italských žebříčků (potenciální kanibalizace)
- **Čas:** 15 min
- **Dopad:** `/zebricek/nejlepsi-italsky-olej` vs `/zebricek/nejlepsi-italsky-olivovy-olej` —
  pokud dvě různé URL indexované, konsolidovat (jeden 301 redirect)
- **Jak:** Ověřit v DB `WHERE slug LIKE '%italsky%'`

