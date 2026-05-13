# OLIVATOR — /metodika kompletní redesign
# Cíl: nejlepší kus obsahu na celém webu, showcase pro projekt
# Estimated cost: ~$0.50 (hlavně AI generování + Unsplash image fetching)

---

## FILOZOFIE

Stránka /metodika musí být **lepší než email**, ne stejná. Proč?
- Email: krátký pohled, motivace přečíst víc
- Stránka: **definitivní reference** — když uživatel chce vědět "úplně všechno"
- Sdílí se na LinkedIn, novinářům, partnerům
- SEO power page — vážná autorita

3 vrstvy:
- **Level 1** — newcomer (10 sekund přečtení)
- **Level 2** — zájemce (2 minuty přečtení)
- **Level 3** — vědecké vysvětlení (8-10 minut přečtení)

---

## STRUKTURA STRÁNKY

### Hero sekce
```
[Velký hero obrázek: detail kapek olivového oleje s vědeckou estetikou
 nebo lab equipment + olivy. Apple style.]

# Jak počítáme Olivator Score
## Číslo, kterému můžeš věřit

Olivator Score je vážený průměr 4 měřitelných složek. Žádné dojmy.
Žádný marketing. Jenom data — z etiket, lab reportů, EU databází
a reálných cen.
```

### Quick navigation (sticky sidebar)
```
[Sticky TOC s odkazy:]
1. Co je Olivator Score
2. 4 složky vážené
   - Kyselost
   - Certifikace
   - Polyfenoly
   - Hodnota
3. Jak se počítá (kalkulačka)
4. Odkud bereme data
5. Vědecké vysvětlení
6. Co Score NEMĚŘÍ
7. Často kladené otázky
```

---

## SEKCE 1 — Co je Olivator Score (Level 1)

Z welcome email 2 styl:

```
## Score 0–100, vážený průměr 4 složek

Olivator Score říká jak kvalitní olej je. Číslo 0 až 100. Vážený 
průměr ze čtyř měřitelných složek. Každá složka má svou váhu — 
protože ne všechny mají stejný význam.

100 = perfektní olej. Pod 50 = slabý. 

Skóre se přepočítává **každou hodinu** — když přijde nová cena, 
nový lab report, nová certifikace.

[Vizuální: ukázka score badge + breakdown s ohraničením 
"olej s Score 87 vypadá takhle:"]

Příklad: 
Score 87 = Kyselost 33/35 + Certifikace 25/25 + Polyfenoly 18/25 + 
Hodnota 11/15
```

---

## SEKCE 2 — 4 složky vážené

### 2.1 Kyselost (35 %)

**Hero obrázek pro tuto sekci:** Detail olivy + chemická struktura kyseliny olejové vedle.

**Level 1:**
> *"Kyselost ukazuje jak je olej čerstvý. Čím nižší, tím lepší."*

**Level 2:**
> *"Kyselost měří kolik volných mastných kyselin olej obsahuje. Vzniká když se olivy špatně zpracují nebo když olej dlouho stojí ve špatných podmínkách. Extra panenský olej musí mít kyselost pod 0,8 %. Ty nejlepší mají pod 0,2 % — to je důkaz čerstvosti a precizní výroby."*

**Level 3 — Vědecké vysvětlení (accordion expand):**

```
## Co se děje na chemické úrovni

Olivový olej je tvořen převážně triglyceridy — to jsou molekuly 
kyseliny olejové (a dalších mastných kyselin) vázané na glycerolu.
Když se olivy poškodí, kvasí, nebo se olej oxiduje, enzym **lipáza**
začne triglyceridy rozkládat.

Volné mastné kyseliny (Free Fatty Acids — FFA) jsou tedy znakem 
"poškození". Měříme je laboratorně jako % volné kyseliny olejové.

### Co způsobuje vyšší kyselost

1. **Pozdní sklizeň** — přezrálé olivy mají víc enzymové aktivity
2. **Poškozené olivy** — zlomené, nahnité, napadené olivovou muškou
3. **Pomalá zpracování** — víc než 24 hodin od sklizně do lisu
4. **Vysoká teplota při lisování** — nad 27°C aktivuje enzymy
5. **Špatné skladování** — kyslík, teplo, světlo

### EU standardy

| Kategorie | Maximální kyselost |
|---|---|
| Extra panenský (EVOO) | 0,8 % |
| Panenský | 2,0 % |
| Lampante (na rafinaci) | nad 2,0 % |

Source: Nařízení Komise (EHS) č. 2568/91 + IOC Trade Standards

### Olivator bodování

| Kyselost | Body |
|---|---|
| Pod 0,2 % | 35/35 (maximum) |
| 0,2–0,3 % | 30–34 |
| 0,3–0,5 % | 22–29 |
| 0,5–0,8 % | 15–21 |
| Nad 0,8 % | 0 (není EVOO) |
```

---

### 2.2 Certifikace (25 %)

**Hero obrázek:** Detail certifikačního razítka DOP / BIO logo na láhvi.

**Level 1:**
> *"Certifikáty = razítka která potvrzují kvalitu nezávislí kontroloři."*

**Level 2:**
> *"Certifikáty dávají třetí strany, ne výrobce. Nejdůležitější jsou DOP (Chráněné označení původu — olej z přesné oblasti dle tradičních metod), BIO (bez pesticidů), a NYIOOC (vítězství na světové soutěži v New Yorku). Čím víc certifikátů, tím spolehlivější kvalita."*

**Level 3 — současný detailní rozbor zachovat ALE rozšířit:**

Současný obsah o DOP/PGP/BIO/Demeter/NYIOOC zůstává, ale přidat:

```
### Proč certifikace váží 25 % v Score

Certifikace je **nezávislá ověřitelná informace.** Výrobce může 
tvrdit cokoli — "premium", "z nejlepších oliv", "ručně vyráběný". 
Certifikace musí získat od regulátora po kontrole.

DOP/PGP kontrolují akreditované úřady (např. ICEA v Itálii, ELOG 
v Řecku). BIO kontroluje certifikační orgán každý rok (ABCERT, 
KEZ, Soil Association). NYIOOC slepá soutěž s 600+ panelisty.

[Tabulka současná zůstává]

### Spojení certifikací — Olivator bodování

| Kombinace | Body |
|---|---|
| DOP + BIO + NYIOOC Gold | 25/25 |
| DOP + BIO | 23–24 |
| DOP nebo BIO + ocenění | 18–22 |
| Jen DOP nebo BIO | 15–18 |
| NYIOOC Gold/Silver bez DOP/BIO | 12–16 |
| Žádné certifikace | 0 |

### Kde certifikace ověřit

- DOP/PGP: [EU eAmbrosia Register](https://ec.europa.eu/info/food-farming-fisheries/food-safety-and-quality/certification/quality-labels/geographical-indications-register/)
- BIO: certifikační orgán uvedený na etiketě (CZ-BIO-001, IT-BIO-008 atd.)
- NYIOOC: [bestoliveoils.com](https://bestoliveoils.com)
```

---

### 2.3 Polyfenoly + chemická kvalita (25 %)

**Hero obrázek:** Olivy řezem (zelená dužina) + makro detail s chemickými vzorci hydroxytyrosolu.

**Level 1:**
> *"Polyfenoly jsou přírodní antioxidanty které dělají olej zdravým. Čím víc, tím lepší."*

**Level 2:**
> *"Polyfenoly jsou skupina rostlinných látek které dělají olej zároveň zdravým, chuťově bohatým a trvanlivým. Když cítíš v krku to pálení po doušku kvalitního EVOO — to jsou polyfenoly. EU schválila zdravotní tvrzení: olej s 250+ mg/kg polyfenolů chrání tělo před oxidačním stresem. Top oleje mají 400–800 mg/kg."*

**Level 3 — Vědecké vysvětlení:**

```
## Hlavní polyfenoly v olivovém oleji

V kvalitním EVOO najdeme více než 30 různých polyfenolů. Tři jsou 
nejdůležitější:

### Oleokantal (oleocanthal)

- Zodpovědný za pálivost a "kop v krku"
- Strukturálně podobný ibuprofenu → "tekutý ibuprofen"
- 50 g EVOO s vysokým obsahem oleokantalu = 10 % protizánětlivého
  efektu jednoho ibuprofenu (studie Beauchamp et al., Nature 2005)
- Vyšší u early harvest olejů (sklizeň říjen-listopad)

### Oleocein (oleacein)

- Nejsilnější antioxidant v EVOO
- Inhibice oxidace LDL cholesterolu
- Studie: 30 ml EVOO s vysokým oleoceinem snižuje krevní tlak

### Hydroxytyrosol

- Mocnější antioxidant než vitamin E
- ORAC value 27 000 µmol TE/100g (pro srovnání: borůvky 9 000)
- EFSA schválila zdravotní tvrzení 432/2012:
  *"Hydroxytyrosol a jeho deriváty chrání LDL cholesterol
  před oxidací."*
- Minimum pro tvrzení: 5 mg / 20 g olej = ~250 mg/kg

### Tyrosol

- Doplňkový antioxidant
- Stabilizuje neurony (studie Alzheimer)

## Co ovlivňuje obsah polyfenolů

| Faktor | Vliv |
|---|---|
| **Odrůda** | Coratina, Picual = vysoký obsah. Arbequina = nižší. |
| **Doba sklizně** | Early harvest (zelené olivy) má 2-3× víc než pozdní |
| **Region** | Apulie, Andalusie typicky výš. Toskánsko střední. |
| **Zpracování** | Cold pressed do 30 minut zachová maximum |
| **Skladování** | Tmavá láhev, pod 18°C, žádný vzduch |
| **Stáří** | Polyfenoly klesají ~20 % za rok skladování |

## EU Health Claim 432/2012

Olej s minimálně **250 mg/kg polyfenolů** může nést tvrzení:
> *"Polyfenoly v olivovém oleji přispívají k ochraně lipidů v krvi
> před oxidačním stresem."*

To je oficiální EU schválené tvrzení — výrobce ho musí dokázat 
laboratorním rozborem.

## Olivator bodování

| Polyfenoly | Body |
|---|---|
| Nad 500 mg/kg | 22–25 |
| 400–500 mg/kg | 18–22 |
| 300–400 mg/kg | 14–18 |
| 250–300 mg/kg (EU Health Claim splněn) | 10–14 |
| 150–250 mg/kg | 5–10 |
| Pod 150 mg/kg | 0–4 |

## Senzorické rozpoznání

Bez laboratorního rozboru poznáš polyfenoly podle:

- **Hořkost** na jazyku (Coratina, Picual)
- **Pálivost** v krku po několika sekundách
- **Zelenkavá barva** (chlorofyl koreluje s polyfenoly)
- **Vůně po čerstvě sečené trávě** (early harvest)

Mírný olej (Arbequina, jemné EVOO) má méně polyfenolů, ale ne nutně
nižší kvalitu. Záleží na použití.
```

---

### 2.4 Hodnota — cena vs kvalita (15 %)

**Hero obrázek:** Vizualizace ceny vs kvalita — možná dva srovnávané oleje vedle sebe.

**Level 1:**
> *"Měříme jestli platíš za chuť a kvalitu, ne za marketing a krásnou láhev."*

**Level 2:**
> *"Některé oleje mají skvělé Score a stojí 200 Kč. Jiné stejně dobré stojí 800 Kč — rozdíl je v značce, balení a marketingu. Naše hodnota počítá kolik kvality dostaneš za sto korun. Pomáhá ti najít olej s nejlepším poměrem cena/kvalita pro tvůj rozpočet."*

**Level 3:**

```
## Jak počítáme hodnotu

Vzorec:
```
Hodnota = (Kyselost_body + Certifikace_body + Polyfenoly_body) / cena_za_100ml
```

Pak normalizováno na škálu 0-15.

## Příklady

### Vynikající hodnota
- **Picual BIO 500 ml za 249 Kč** (Score 82)
  Cena za 100 ml: 49,80 Kč
  Score body bez hodnoty: 71
  Poměr: 71/49,80 = 1,43 → 13/15 bodů

### Slabší hodnota
- **Premium značka 250 ml za 599 Kč** (Score 78)
  Cena za 100 ml: 239,60 Kč
  Score body bez hodnoty: 65
  Poměr: 65/239,60 = 0,27 → 3/15 bodů

Stejná kvalita, jiný poměr = jiné body. Platíš za to že je olej 
dobrý, ne za to že má krásné víko.

## Co NEMĚŘÍME do hodnoty

- Estetiku obalu — krásná láhev neznamená lepší olej
- Brand premium — značka sama o sobě
- Dárkové balení — okolnosti prodeje
- Marketing claims bez certifikace

## Cílem hodnoty NENÍ "nejlevnější vyhrává"

Olej za 100 Kč s polyfenoly 150 mg/kg má nižší skóre než olej 
za 300 Kč s 500 mg/kg. Důvod: lepší kvalita váží víc než cena.
Hodnota pomáhá rozlišit mezi dvěma podobnými oleji.
```

---

## SEKCE 3 — Interaktivní kalkulačka

```
## Spočítej si Score sám

[Interaktivní widget:]
Kyselost (%):     [slider 0 - 1] 
Certifikace:      [checkboxes: DOP, PGP, BIO, NYIOOC Gold/Silver/Bronze, Demeter]
Polyfenoly:       [slider 0 - 1000 mg/kg]
Cena za 100ml:    [input v Kč]

→ Výsledek: Score 84/100
   Breakdown: Kyselost 33 | Cert 22 | Polyfenoly 18 | Hodnota 11

[Vysvětlení: "Tvůj olej by získal Score 84. Kompletně vyplněné body 
napovídají na vyšší certifikace nebo lepší cenu."]
```

---

## SEKCE 4 — Odkud bereme data

**Současný obsah zachovat ALE doplnit:**

```
### Verifikace každého data pointu

1. **Kyselost** — Etiketa nebo lab report. Pokud chybí → ne-Score
2. **Polyfenoly** — Lab report od výrobce nebo NYIOOC databáze
3. **Certifikace** — Cross-check s EU eAmbrosia + certifikační orgán
4. **Cena** — Náš scraper 1× denně přes 18+ prodejců
5. **Region** — Etiketa + DOP/PGP registry
6. **Odrůda** — Etiketa nebo specifikace výrobce

Žádné odhady. Když data chybí — Score je nižší nebo skryté.

### Update frekvence

| Data | Frekvence |
|---|---|
| Ceny | každých 24 hodin |
| Score | každou hodinu (pokud změna) |
| Certifikace | manuální cross-check + audit 1× měsíčně |
| Lab data | při novém produktu + pravidelný refresh |
```

---

## SEKCE 5 — Vědecké zdroje (NOVÁ)

```
## Vědecké základy

Olivator Score nevznikl v marketingovém oddělení. Vychází z:

### Regulační rámec
- IOC Trade Standards (International Olive Council)
- EU Regulation 432/2012 (Health Claims)
- EU Regulation 2568/91 (EVOO categorization)
- ISO 660:2009 (Acidity determination)

### Klíčové vědecké studie

1. **Beauchamp et al. (Nature, 2005)** — "Phytochemistry: Ibuprofen-like
   activity in extra-virgin olive oil" → objev oleokantalu jako 
   protizánětlivého agentu

2. **Estruch et al. (NEJM, 2013)** — PREDIMED studie: mediterranean
   diet s EVOO snižuje kardiovaskulární riziko o 30 %

3. **Bendini et al. (Molecules, 2007)** — komprehensivní review
   polyfenolů a jejich měření

4. **EFSA Panel on Dietetic Products (2011)** — opinion on substantiation
   of health claims related to polyphenols (Article 13(1) of Regulation
   (EC) No 1924/2006)

### Naši techničtí konzultanti
- [Pokud máme experta na board — uvést]
- Kontakty s českými univerzitami pro lab analýzy
- Členství v Asociaci olivového oleje (pokud máme)
```

---

## SEKCE 6 — Co Score NEMĚŘÍ (NOVÁ — transparentnost)

```
## Co Score NEZAHRNUJE

Olivator Score je objektivní, ale není všezahrnující. Tady je 
co NEMĚŘÍME:

### Subjektivní chuť
Někomu se líbí jemný Arbequina, jiný preferuje pálivou Coratinu.
To je individuální preference, ne kvalita. Místo toho měříme
chuťový profil samostatně.

### Sezónní kvalita
Score odráží aktuální data. Olivový olej je živý produkt — co 
bylo top před rokem, dnes může být horší.

### Dostupnost
Krásný DOP olej z malé italské farmy ve 300 lahvích/rok získá 
vysoké Score, ale moc lidí ho nesežene. Hodnotíme produkt, ne 
jeho dostupnost.

### Etika producenta
Férové podmínky pro zaměstnance, udržitelné zemědělství, životní
prostředí — to jsou důležité věci, ale měříme je certifikací 
Fairtrade nebo Demeter, ne samostatně.

### Záměrné ochucení
Chilli, česnek, lanýž, citron — ochucené oleje hodnotíme zvlášť.
Nejsou EVOO ve standardním slova smyslu.
```

---

## SEKCE 7 — FAQ

```
## Často kladené otázky

### Proč ne 100 % polyfenoly?
Polyfenoly jsou klíčové ale ne jediné. Olej s 800 mg/kg ale 
kyselostí 0,7 % je horší než olej s 400 mg/kg a kyselostí 0,15 %.

### Co když výrobce neuvádí polyfenoly?
Score se počítá z toho co máme. Bez polyfenolů max ~75/100.
Žádné Score = nemáme dost dat.

### Funguje to i pro ochucené oleje?
Ne. Lanýžový/chilli/citronový olej hodnotíme jinou metrikou.

### Jak často se Score mění?
Hodinová aktualizace pokud přijde nová cena. Polyfenoly/cert 
zůstávají stejné dokud nepřijde nový lab report.

### Co dělat když najdu chybu?
Napiš na info@olivator.cz s linkem na produkt. Opravíme do 24h.
```

---

## OBRÁZKY — SEZNAM K ZÍSKÁNÍ

Total: ~8-10 obrázků. Source: Unsplash + případně AI vygenerované (Midjourney).

### Hero
1. **Velký hero**: Detail kapek olivového oleje s vědeckou estetikou
   Search: "olive oil drop macro" / "scientific olive oil"

### Per sekce (4 hlavní složky)
2. **Kyselost**: Detail olivy / oliv při lisování
3. **Certifikace**: DOP/BIO razítko / certifikační logo na láhvi
4. **Polyfenoly**: Olivy řezem (zelená dužina) / makro chlorofylu
5. **Hodnota**: Vizualizace 2 olejů vedle sebe / cena vs kvalita scéna

### Doplňkové
6. **Vědecké zdroje**: Lab equipment / vědecká scéna
7. **Sklizeň**: Early harvest scéna (zelené olivy, listopad)
8. **Skladování**: Tmavá láhev / sklep s oleji
9. **Senzorické**: Doušek oleje / ochutnání

### Implementace
- Použít existing image library (Unsplash API už máme — `UNSPLASH_ACCESS_KEY` v env)
- Topic-specific queries (viz Junk Image learning z dřívějška)
- Alt texty popisné pro SEO

---

## TECHNICKÉ DETAILY

### Layout
- Hero full-width
- Content max-width: 760px (čitelný odstavec)
- Sticky TOC sidebar na desktopu (lg:block hidden)
- Image full-width v sekci, text se obtéká
- Accordion pro Level 3 (žádné dlouhé scrollování)

### Typografie
- H1: Playfair Display, 48-56px
- H2: Playfair Display, 36px
- H3: Inter Semibold, 24px
- Body: Inter, 18px, line-height 1.7
- Reading time indikátor nahoře

### Interaktivita
- Sticky TOC
- Smooth scroll na linky
- Accordion expand/collapse pro Level 3
- Score kalkulačka (React component)
- Reading progress bar nahoře

### SEO
- Title: "Olivator Score — Jak hodnotíme olivový olej | Olivator"
- Meta description: 150 znaků, klíčová slova "olivator score", "metodika"
- Schema.org Article markup s author, datePublished
- Internal links na produkty s vysokým Score (4-5)
- External links na EU regulace + studie

---

## IMPLEMENTAČNÍ POSTUP

1. **Backup current /metodika** — pro případ rollbacku
2. **Update content** podle této struktury
3. **Fetch obrázky** přes Unsplash API
4. **Implementuj interaktivní kalkulačku** (React komponenta)
5. **Sticky TOC + accordion** pro Level 3
6. **Schema.org markup**
7. **Internal linking** na 4-5 produktů s vysokým Score
8. **Mobile responsive check**
9. **TypeScript clean**
10. **Deploy**

---

## ŽÁDOST PRO CLAUDE CODE

Pošli mi screenshot **před** a **po** redesignu.

Test na mobilu (Chrome DevTools 375px width) — funguje vše?

Cena: ~$0.50 — hlavně AI generování vědeckých sekcí + Unsplash image fetching.

🫒
