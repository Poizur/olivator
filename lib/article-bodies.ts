// Plný obsah editorial článků. Pravidla z CLAUDE.md sec 16:
// aktivní hlas, konkrétní data, sommelier tón Wirecutter+Wine Folly,
// žádné marketing fráze typu 'výjimečný' a 'prémiový'.
//
// Sekce začínají `## ` (H2) nebo `### ` (H3). Odstavce odděleny prázdným
// řádkem. Renderer tohle parsuje na základní HTML.

export const ARTICLE_BODIES: Record<string, string> = {
  'jak-vybrat-olivovy-olej': `
Olivový olej v supermarketu vypadá jako jeden produkt v desítkách provedení. Není. Mezi olejem za 89 Kč a 1 200 Kč jsou rozdíly, které poznáš na lžičce — a hlavně na zdraví. Tento průvodce ti vysvětlí, na co se reálně koukat na etiketě.

## Kategorie oleje rozhoduje o všem ostatním

Označení na etiketě určuje kvalitu. Tady je hierarchie od nejlepšího:

### Extra panenský olivový olej (EVOO)
Nejvyšší kategorie. EU norma vyžaduje kyselost pod 0,8 %, lisování za studena (pod 27 °C) bez rafinace. Bohaté na polyfenoly, vitamín E a chuťové aroma. Použití: studené pokrmy, saláty, dipping, dochucování. Cena: 200–800 Kč za 0,5 l u kvalitního.

### Panenský olivový olej (Virgin)
Také lisován bez rafinace, ale připouští se kyselost do 2 %. Méně intenzivní chuť, méně polyfenolů. Stále zdravý, ale ne výjimečný.

### "Olivový olej" (bez přívlastku)
Směs panenského a rafinovaného oleje. Marketingová past — vypadá jako extra panenský, ale není. Vyhni se.

### Pokrutinový olej (Pomace)
Z odpadu po lisování, chemicky extrahovaný. Levný, neutrální, používá se ve fast food kuchyních. Ne na zdraví.

## Kyselost — první číslo, které kontroluješ

Kyselost (volných mastných kyselin) ukazuje, jak rychle a šetrně se olej zpracoval. Čím nižší, tím čerstvější olivy a kratší doba mezi sběrem a lisováním.

### Co je dobrá hodnota
- Pod 0,3 % = výborný (NYIOOC level)
- 0,3–0,5 % = velmi dobrý
- 0,5–0,8 % = standard pro EVOO
- Nad 0,8 % = už ne extra panenský

Olivator Score odměňuje nízkou kyselost — produkt s 0,2 % má v komponentě "kyselost" maximální 35 bodů.

## Polyfenoly — proč na nich záleží zdravotně

Polyfenoly jsou antioxidanty zodpovědné za hořkou až pálivou chuť čerstvého oleje. Mají prokázané benefity pro srdce, mozek a metabolismus. EU schválené tvrzení (Health Claim 432/2012): oleje s minimálně 250 mg/kg polyfenolů "přispívají k ochraně tuků v krvi před oxidačním poškozením".

### Co je dobrá hodnota
- Pod 100 mg/kg = chudý na polyfenoly
- 100–250 mg/kg = standard
- 250–500 mg/kg = bohatý
- Nad 500 mg/kg = funkční elixír (high phenolic)

Většina supermarketových olejů má 80–150 mg/kg. Specialty oleje typu EVOLIA PLATINUM dosahují 2 000+ mg/kg.

## Certifikace — které mají váhu

### DOP (Designation of Origin)
Chráněné označení původu. Olej musí být kompletně vyroben v dané oblasti — od oliv po stáčení. Nejvyšší garance kvality a místa původu. Nejčastější u řeckých (Kalamata, Sitia, Lesbos) a italských (Toskánsko, Apulie) olejů.

### BIO / Organic
Olivy bez syntetických pesticidů a hnojiv. Certifikace bývá EU Bio + národní (CZ-BIO-001 v ČR, IT-BIO-014 v Itálii). Bere zhruba 6 měsíců přechodového období + roční audity.

### NYIOOC Award
New York International Olive Oil Competition — nejprestižnější chuťová soutěž. Gold/Silver award znamená jasné chuťové kvality, ale nejde o certifikaci procesu (jako DOP).

## Cena — jak interpretovat částku

Smysluplná jednotka je cena za 100 ml, ne za lahev. Lahve mají různé objemy (250, 500, 750, 1000 ml).

- Pod 30 Kč/100 ml = obvykle low-quality nebo směsi
- 30–60 Kč/100 ml = mid-range, slušná kvalita
- 60–120 Kč/100 ml = premium EVOO
- Nad 120 Kč/100 ml = specialty / single estate / NYIOOC

Cena nezaručuje kvalitu (jsou drahé špatné oleje), ale opravdu kvalitní olej pod 30 Kč/100 ml prakticky neexistuje.

## Kde olej koupit

Specializované e-shopy mají typicky čerstvější skladování a lepší rotaci než supermarkety. Olivator porovnává ceny napříč 15+ prodejci — najdeš stejný produkt často o 30 % levněji než v Tesco.

## Tři quick-tips na závěr

1. **Tmavé sklo nebo plech.** Olej v průhledné lahvi se rychleji kazí (foto-oxidace). Plech je nejlepší kvůli stálé teplotě.

2. **Datum sklizně, ne minimální trvanlivost.** Top oleje uvádějí "harvest 2024/2025" — kupuj nejnovější ročník. Olivový olej není víno, neuleží.

3. **Otevři, čich, ochutnej.** Kvalitní olej vyvolá v hrdle lehké šimrání nebo kašel — to jsou polyfenoly. Hořký, pálivý, voní po čerstvé trávě, mandlích, rajčatovém listu. Plochý, žluklý, mastný = problém.
`.trim(),

  'polyfenoly-proc-na-nich-zalezi': `
Polyfenoly jsou hlavní důvod, proč je olivový olej součástí středomořské diety s nejdéle prokazatelnými zdravotními benefity. Tento článek vysvětluje, co to konkrétně dělá s tělem a kolik mg/kg má smysl hledat.

## Co jsou polyfenoly v olivovém oleji

Skupina rostlinných látek s antioxidačním účinkem — hlavními zástupci jsou **oleocanthal**, **oleuropein**, **hydroxytyrosol** a **tyrosol**. Vznikají v olivách jako přirozená obrana proti UV a oxidaci. V oleji se zachovají jen při šetrném zpracování za studena.

V hořké a pálivé chuti čerstvého oleje rozpoznáš právě je. Olej, který vůbec nepálí v hrdle, má polyfenolů málo.

## EU Health Claim — oficiální zdravotní tvrzení

EU schválila v Nařízení 432/2012 jediné zdravotní tvrzení pro olivový olej:

> "Olivové polyfenoly přispívají k ochraně tuků v krvi před oxidačním poškozením."

Aby olej mohl tvrdit, musí obsahovat **minimálně 5 mg hydroxytyrosolu a derivátů na 20 g** = zhruba **250 mg/kg total polyphenols**. Pod tuto hranici tvrzení nesmí být.

To je důvod, proč 250 mg/kg je v naší [metodice Olivator Score](/metodika) prahová hodnota pro "bohatý na polyfenoly".

## Co konkrétně dělají s tělem

### Kardiovaskulární zdraví
PREDIMED studie (2018, ~7 500 účastníků) ukázala 30% pokles infarktu u skupiny s vysokou konzumací EVOO oproti nízko-tukové dietě. Mechanismus: oleocanthal blokuje COX enzymy podobně jako ibuprofen, snižuje zánět cév.

### Mozek a kognitivní funkce
Hydroxytyrosol prochází přes hematoencefalickou bariéru. Studie ukazují asociaci s nižším rizikem Alzheimerovy choroby u středomořské populace.

### Trávicí trakt
Oleuropein má antimikrobiální vlastnosti — působí proti H. pylori (žaludeční bakterie spojená s vředy).

## Kolik mg/kg má smysl hledat

| Pásmo | mg/kg | Doporučení |
|---|---|---|
| Chudý | < 100 | Vyhni se — pravděpodobně rafinovaný |
| Standard | 100–250 | Většina supermarketu, OK pro vaření |
| Bohatý | 250–500 | Pro každodenní zdravotní benefit |
| High phenolic | 500–1 000 | Funkční potravina |
| Extreme | > 1 000 | Lžička denně místo doplňku stravy |

## Jak polyfenoly nezničit

1. **Nepřehřívej.** Nad 180 °C se polyfenoly degradují. Kuchař extra panenský používá na finish, ne na fritování.
2. **Skladuj ve tmě a chladu.** Světlo + teplo + kyslík = oxidace.
3. **Spotřebuj do 12 měsíců po sklizni.** Polyfenoly se přirozeně rozpadají i v zavřené lahvi. Datum sklizně > minimální trvanlivost.

## Praktická volba

Pokud kupuješ olivový olej kvůli zdraví (ne jen na chuť), podívej se na číselnou hodnotu polyfenolů na etiketě — pokud chybí, výrobce ji pravděpodobně nezná. Specialty producenti hodnotu uvádějí (často 600–2 000 mg/kg) a je to nejjednodušší filtr kvality.

V Olivator katalogu najdeš [oleje seřazené podle polyfenolů](/zebricek/nejlepsi-vysokopolyfenolovy-olej) — od 600 mg/kg výše.
`.trim(),

  'recky-vs-italsky': `
Řecký a italský olivový olej tvoří 70 % evropské produkce. Obě země mají tisíce let tradice, podobné odrůdy, ale jiný styl chuti i přístup ke kvalitě. Tento článek shrnuje, který si vybrat pro jaký účel.

## Geografie a tradice

### Řecko
Klima a půda Kréty, Peloponésu a egejských ostrovů produkují přibližně 350 000 tun ročně, z toho **75 % v kategorii extra panenský** — nejvyšší podíl ze všech zemí. Hlavní odrůdy: Koroneiki (jemná, vysoké polyfenoly), Manaki (vyvážená), Athinolia.

### Itálie
Produkce ~270 000 tun ročně, ale jen ~30 % je extra panenský. Většina italského "Italian olive oil" v supermarketech je BLENDED z dovezených oliv (často právě z Řecka a Španělska) — Itálie je jen místo finálního stáčení. Pokud chceš opravdu italský, hledej DOP nebo IGP označení regionu.

## Chuťový profil

### Řecký
Tendence k jemnější, máslovější chuti s ovocnými tóny — banán, jablko, mandle. Pálivost spíše střední. Vhodný pro lidi, kteří začínají s kvalitním olejem a hořkost je odrazuje.

### Italský
Výrazněji hořký a pálivý, vegetativní (čerstvá tráva, artyčok, rajský list). Toskánské oleje (Frantoio, Leccino) jsou intenzivnější, apulské (Coratina) mají rekordní polyfenoly — často 600+ mg/kg.

## Certifikace v praxi

### Řecké top regiony
- **Sitia P.D.O. (Kréta)** — DOP od 1996, jednodruhový Koroneiki
- **Kalamata P.D.O. (Peloponés)** — historicky první řecký DOP
- **Lesvos P.D.O.** — egejský ostrov, ostře jemná Adramyttini odrůda

### Italské top regiony
- **Toscano IGP** — chráněné zeměpisné označení Toskánska
- **Terra di Bari DOP (Apulie)** — high-polyphenol Coratina
- **Chianti Classico DOP** — premium, často 80+ Kč/100 ml

## Cena

V průměru je řecký EVOO o **15–25 % levnější** než srovnatelný italský. Důvod: nižší marketingová prémie. Italian brand image (Toskánsko, Sicílie) si producenti nechávají platit.

Pokud porovnáváš stejnou kategorii (DOP, single estate, čerstvost), kvalita je srovnatelná. Cenový rozdíl je často brand premium, ne kvalita.

## Co kupovat na co

| Účel | Doporučení |
|---|---|
| Salát, dipping | Řecký Koroneiki — jemně ovocný |
| Bruschetta, pizza | Italský Toscano — hořký, výrazný |
| Vaření / pečení | Řecký standard — neutrální |
| Lžička denně (zdraví) | Apulský Coratina — high polyphenol |
| Dárek | DOP cokoli — etiketa prodá |

## Olivator katalog

Aktuálně máme v katalogu **45+ řeckých olejů** (převážně Sitia, Kalamata, Manaki) a **8+ italských** (Apulie, Toskánsko). Filtruj v [srovnávači](/srovnavac) podle původu, nebo se podívej na [top řecké](/zebricek/nejlepsi-recky-olej) a [top italské](/zebricek/nejlepsi-italsky-olej) žebříčky.

## Závěr

Pro každodenní použití doporučujeme řecký olej z Kréty s DOP — **dobrý poměr cena/kvalita**, jemná chuť, vysoká kyselostní disciplína. Pro speciální příležitosti nebo intenzivní chuť (bruschetta, drsné saláty) si připlatíš za apulský Coratina nebo toskánský Frantoio. Oboje jsou kvalitní cesty — jen různá chuť.
`.trim(),

  'nejlepsi-olivovy-olej-2025': `
Náš pravidelně aktualizovaný žebříček olejů dostupných v ČR. Hodnotíme **Olivator Score** — vážený index kyselosti (35 %), polyfenolů + chemických parametrů (25 %), certifikací (25 %) a poměru cena/kvalita (15 %).

## Metodika hodnocení

### Co měříme
1. **Kyselost (35 %)** — volné mastné kyseliny v %. Lineární škálování: 0,2 % = 35 bodů, 0,8 % = 15 bodů.
2. **Polyfenoly + chemická čistota (25 %)** — total polyphenols mg/kg, případně peroxidové číslo, K232/K270/DK ze parameter tabulek e-shopů.
3. **Certifikace (25 %)** — DOP, BIO, PGP, NYIOOC. DOP+BIO = max 25 bodů.
4. **Cena za 100 ml (15 %)** — fair value: ne nejlevnější, ale rozumný za danou kvalitu.

### Co NEHODNOTÍME
- Marketing claim ("prémiový", "ručně sbíraný" bez evidence)
- Brand recognition
- Obal a design
- Subjektivní chuťové preference (chuť je individuální)

### Zdroje dat
Strukturovaná data scrapujeme z e-shopů (Shoptet/WooCommerce parametr tabulky), web výrobců, Open Food Facts API, EU DOOR (DOP/CHOP databáze) a NYIOOC databáze. Cenová data aktualizujeme každý den.

## Top 8 olejů 2025

> Přesný aktuální žebříček je v sekci [Žebříčky → Nejlepší olivový olej 2025](/zebricek/nejlepsi-olivovy-olej-2025) — Score se mění s každým nascrapeováním (typicky týdně).

### 1. SITIA Kréta PREMIUM GOLD 0,2 % (5 l)
Score 85. Kréta DOP, kyselost 0,26 %, polyfenoly 646 mg/kg. Plech, čerstvá sklizeň každý rok. Cena za 100 ml ~32 Kč → unikátní hodnota za premium kvalitu.

### 2. EVOLIA PLATINUM 2000+ polyfenolů BIO (250 ml)
Score 77. Peloponés, BIO, kyselost 0,2 %, polyfenoly **2 012 mg/kg** — funkční elixír na lžičky. Cena 716 Kč/100 ml — drahý, ale léčivá kvalita.

### 3. SITIA Kréta PREMIUM GOLD 0,2 % (1 l)
Score 72. Stejný olej jako #1, jen v menší lahvi (vyšší cena za 100 ml).

### 4. Intini Coratina Alberobello (500 ml)
Score 62. Apulie, italský DOP, kyselost 0,16 % (excelentní), polyfenoly 623 mg/kg. Tvrdá pálivost — pro hardcore fanoušky.

### 5. Iliada Kalamata DOP (500 ml)
Score 62. Kalamata DOP, kyselost 0,5 %, široce dostupný v ČR za ~280 Kč. Dobrý vstup do kvality bez nutnosti specialty e-shopu.

### 6.–8. Další top 3
Včetně Intini EXTRA Alberobello (Apulie, 903 mg/kg polyfenolů) a dalších SITIA variant.

## Co v žebříčku NEnajdeš

### Známé brands z TV reklamy
Většinou nesplňují prahové hodnoty. Marketing platí supermarketové umístění, ne kvalitu oleje.

### "Italské" oleje pod 200 Kč/litr
S vysokou pravděpodobností směs dovezeného oleje, jen stáčení v Itálii. Bez DOP/PGP nemáš garanci.

### Oleje bez data sklizně
Pokud výrobce neuvádí harvest date, něco skrývá. Reálně staré oleje mají oxidovaná chuťová látka i polyfenoly degradované.

## Jak žebříček sledovat

Žebříček aktualizujeme:
- **Týdně** (pondělí 4:00 UTC) — discovery agent znovu projde 15+ e-shopů, scrapuje aktuální ceny + dostupnost
- **Při nových produktech** — když se objeví nový kvalitní olej, dostane Score a může vstoupit do top 8
- **Při sezonní změně sklizně** — top oleje obnovují harvest date, Score přepočítáváme

V GSC + email newsletter ti můžem dát vědět, když dojde k velké změně v top 3.

## Závěr

V Q4 2025 dominují řecké oleje z Kréty (SITIA, Iliada) díky kombinaci nízké kyselosti, DOP a férové ceny. Italské Apulie (Intini) vede v polyfenolech ale za vyšší cenu. Pro každodenní použití doporučujeme **Iliada Kalamata** nebo **SITIA 1 l**, pro zdravotní lžičku **EVOLIA PLATINUM**.

[Spustit srovnávač →](/srovnavac) nebo se podívej na [komplet žebříček](/zebricek/nejlepsi-olivovy-olej-2025).
`.trim(),

  'bruschetta-s-rajcaty': `
Italská klasika, kde olej dělá rozdíl. Bez kvalitního EVOO chutná jen jako toast s rajčaty. S ním se mění celý zážitek.

## Suroviny (pro 4 ks)

- 4 plátky kvalitního chleba (ciabatta nebo pain de campagne)
- 4 zralá rajčata (heirloom nebo San Marzano)
- 1 stroužek česneku
- Hrst čerstvé bazalky
- Mořská sůl, čerstvě mletý černý pepř
- **3 lžíce kvalitního EVOO** — viz doporučení níže

## Postup

1. Chléb opeč na grilu nebo v troubě (200 °C, 4 min) dozlatova.
2. Teplý chléb potři jednou stranou rozkrojeným česnekem.
3. Rajčata nakrájej na kostky ~1 cm. Zlehka osol — sůl vytáhne šťávu.
4. Polož kostky rajčat na chléb. Zalij EVOO velkoryse — minimálně 1 lžíci na kus.
5. Přidej trhanou bazalku, špetku pepře, doladí solí.

## Olej dělá 80 % chuti

Bruschetta je test oleje. Když olej voní po čerstvé trávě, mandlích a rajčatovém listu, sedne s rajčaty perfektně. Plochý oil-of-the-supermarket schová rajčata pod mastnou vrstvou.

### Co konkrétně doporučujeme
- **Intini EXTRA Alberobello** — apulský olej s tóny rajčatového listu. Téměř jakoby byl vyrobený přesně pro bruschettu. Score 61, polyfenoly 903 mg/kg.
- **Iliada Kalamata DOP** — řecká alternativa, jemnější, ale s pěknou pálivostí. Score 62.
- **Cokoli s DOP** v cenovce 50–100 Kč/100 ml — bezpečná volba.

### Čemu se vyhnout
- Refined olive oil (nebo "Olive Oil" bez extra panenský) — neutrální chuť, plochá bruschetta.
- Pomace — chemicky extrahovaný odpadní olej, na bruschettu zločin.

## Tip nakonec

Bruschettu jez ihned po servírování. Chléb se rychle nasákne šťávou a měkne. Po 10 minutách už není to ono.

Pokud máš zbytky mizajícího chleba, polij ho čerstvým EVOO a popraš solí. Slow food breakfast.
`.trim(),

  'domaci-pesto': `
Pravé pesto alla genovese vyžaduje jen 7 surovin. Ale kvalita každé z nich rozhoduje. Olej je jednou z nich a často nejvíc kompromitovanou.

## Suroviny (cca 200 g pesta)

- 50 g čerstvé bazalky (nejlépe Genovese DOP)
- 30 g piniových oříšků
- 1 stroužek česneku
- 50 g Parmigiano Reggiano DOP, nastrouhaný
- 25 g Pecorino Romano DOP
- **120 ml kvalitního EVOO**
- ½ lžičky mořské soli

## Postup (klasická metoda v hmoždíři)

1. **Bazalku** opláchni a osuš (vlhká rozmaže olej). Listy odtrhej od stonků.
2. V hmoždíři nejprve rozdrť česnek se solí. Sůl zde funguje jako abrazivum.
3. Přidej piniové oříšky, drť na hladkou pastu.
4. Po hrstech přidávej bazalku, drcením rotujícím pohybem (ne lisem). Při tlučení se uvolní éterické oleje.
5. Vmíchej oba sýry.
6. Postupně přilévej olej, stále míchej, dokud nedostaneš krémovou konzistenci.

## Mixér místo hmoždíře

Funguje, ale dej pozor na 2 věci:
- **Krátké pulsace** ne kontinuální mixování — třeným teplem se bazalka oxiduje a hořkne.
- **Studené nože** — ideálně mixér chvíli v lednici, ostří méně zahřejí směs.

## Které oleje sednou

Pesto vyžaduje **jemný až středně výrazný olej** — moc pálivý ho přebije, plochý nepodpoří.

### Doporučení
- **Iliada Kalamata DOP** — řecká jemná chuť, neperebíjí bazalku. ~280 Kč/500 ml.
- **Olej z ligurské oblasti** (Frantoio, Taggiasca) — autentická volba, ale v ČR vzácný a drahý.
- **Cokoli s kyselostí pod 0,4 %** a polyfenoly 200–500 mg/kg.

### Čemu se vyhnout
- Apulský Coratina — moc pálivý, schová bazalku.
- Toskánský early harvest — moc hořký a vegetativní, kolize s bazalkou.
- Oleje bez kategorie "extra panenský".

## Servírování

Pesto na čerstvé těstoviny (trofie, gnocchi, tagliatelle):
1. Uvař těstoviny al dente.
2. Před scezením odeber **2–3 lžíce vařicí vody**.
3. Pesto NEdávej na pánev — teplem se bazalka oxiduje. Smíchej se studeným pestem v míse + 1–2 lžíce vařicí vody pro emulgaci.
4. Servíruj okamžitě s extra strouhaným parmazánem.

## Skladování

V lednici v uzavřené nádobě 5 dní. Přelij vrstvou EVOO nahoře — chrání před oxidací (zelené pesto na vzduchu rychle hnědne).

Mraz: ano, ale bez sýrů. Sýry přidávej až po rozmrazení. Ledové formičky → 1 lžíce pesta na porci.
`.trim(),
}
