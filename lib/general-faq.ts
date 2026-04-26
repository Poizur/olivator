// General olive oil FAQs — evergreen content shown on every product page.
// Curated from real Czech search queries (GSC data + Marketmiller research).
//
// Strategy:
//   - 12 questions covering top long-tail searches in CZ
//   - Each answer is fact-based, cites EU/USDA standards where relevant
//   - Same content for all products (educational, not product-specific)
//   - On product page we show 5 randomized (deterministic by slug) to avoid
//     full duplicate content across product pages

import type { FAQPair } from './product-faq'

export const GENERAL_FAQS: FAQPair[] = [
  {
    question: 'Jak vybrat opravdu kvalitní olivový olej?',
    answer:
      'Podívej se na 4 věci: (1) označení "extra panenský" (extra virgin) — nejvyšší kategorie, ' +
      'kyselost pod 0,8 %; (2) datum sklizně nebo expirace na lahvi — čerstvost je klíčová, ' +
      'olej v 1. roce po sklizni má největší antioxidační hodnotu; (3) tmavé sklo nebo plechovka — ' +
      'světlo a kyslík ničí polyfenoly; (4) původ konkrétního regionu, ne jen "EU mix". ' +
      'Cena pod 200 Kč/litr je u kvalitního EVOO podezřelá — produkce je dražší.',
  },
  {
    question: 'Jaký je rozdíl mezi extra panenským a panenským olivovým olejem?',
    answer:
      'Oba se získávají MECHANICKY (lisováním) bez chemie, ale liší se kvalitou. Extra panenský ' +
      '(EVOO) má kyselost pod 0,8 %, peroxidové číslo pod 20 a žádné senzorické vady. Panenský ' +
      'může mít kyselost až 2 % a drobné chuťové defekty. Lampante nebo "olivový olej" jsou už ' +
      'rafinované — ošetřené teplem a chemikáliemi, ztrácejí polyfenoly. Pro studenou kuchyni ' +
      'se hodí jedině extra panenský.',
  },
  {
    question: 'Dá se olivovým olejem smažit?',
    answer:
      'Ano, ale s rozumem. Extra panenský má bod zakouření kolem 190–210 °C — vystačí na ' +
      'restování, dušení a krátké smažení. Pro hluboké smažení (180+ °C dlouhodobě) se hodí spíš ' +
      'rafinovaný olivový olej (smoke point ~240 °C) nebo třešňový/řepkový. Mýtus, že EVOO není ' +
      'možné zahřát, se vyvrací studiemi (Modern Mediterranean diet, 2018) — naopak je stabilnější ' +
      'než nenasycené rostlinné oleje díky polyfenolům.',
  },
  {
    question: 'Jak poznat zfalšovaný olivový olej?',
    answer:
      'Asi 70 % komerčních EVOO v supermarketech v EU testuje IOC negativně — buď je rafinovaný, ' +
      'nebo míchaný s jinými oleji. Signály falzifikátu: cena pod 150 Kč/litr, mdlá nasládlá chuť ' +
      'bez pálivosti v hrdle, světlá barva, nejasný původ ("směs olejů z EU a non-EU"), absence ' +
      'data sklizně. Kvalitní olej tě v hrdle "kousne" — to jsou polyfenoly. Přátele vzbuzuje ' +
      'i certifikace DOP, PDO, NYIOOC nebo přímý nákup u producenta.',
  },
  {
    question: 'Kolik olivového oleje denně je zdravé?',
    answer:
      'Středomořská dieta doporučuje 2–4 polévkové lžíce (30–60 ml) denně pro dospělého. EU health ' +
      'claim povoluje tvrzení o ochraně krevních lipidů při příjmu 20 g (2 lžíce) oleje s alespoň ' +
      '5 mg hydroxytyrosolu na den (typicky obsažen v EVOO s 250+ mg/kg polyfenolů). Olivový olej ' +
      'má 884 kcal/100 g, takže to je kalorický doplněk — nahraď jím máslo nebo rafinované oleje, ' +
      'nepřidávej navíc.',
  },
  {
    question: 'Jak skladovat olivový olej, aby vydržel?',
    answer:
      'Tmavo, chladno (15–18 °C) a bez vzduchu. Originální tmavé sklo nebo plechovka jsou ideální. ' +
      'NIKDY u sporáku — teplo + světlo dohromady zničí polyfenoly za pár týdnů. Po otevření ' +
      'spotřebuj do 3–6 měsíců, neotevřený vydrží 18–24 měsíců od plnění. Pokud cítíš žluklou nebo ' +
      'rancidní chuť (jako lepidlo, plastelína), je olej oxidovaný a nemá smysl ho jíst.',
  },
  {
    question: 'Proč je dobrý olivový olej tak drahý?',
    answer:
      'Z 1 ha olivovníků se vyrobí jen 200–800 litrů oleje ročně (závisí na odrůdě, počasí, sklizni). ' +
      'Ruční sběr (šetrný k plodům) stojí 2× víc než mechanický. Lisování do 24 h od sběru a ' +
      'kontrolovaná teplota (max 27 °C pro "studené lisování") zvyšují náklady. K tomu přidej ' +
      'lahvičku z tmavého skla, certifikace, dopravu a marži e-shopu. Cena 400–800 Kč/litr u ' +
      'farmářského DOP oleje je férová — pod 150 Kč skoro určitě není pravý EVOO.',
  },
  {
    question: 'Jaký rozdíl mezi řeckým, italským a španělským olivovým olejem?',
    answer:
      'Trojice s odlišným charakterem: ŘECKO (66 % světové produkce EVOO) — hlavně Koroneiki ' +
      'a Lianolia, balanced až intenzivnější chuť, vysoké polyfenoly. ITÁLIE (Toskánsko, Apulie, ' +
      'Sicílie) — Frantoio, Leccino, Coratina, výrazná pálivost a hořkost (early harvest). ' +
      'ŠPANĚLSKO (50 % světové produkce) — Picual (intenzivní), Arbequina (jemný), Hojiblanca, ' +
      'velký rozsah od mild po robust. Pro středomořskou kuchyni neexistuje "lepší" země — ' +
      'záleží na regionu a odrůdě.',
  },
  {
    question: 'Co znamená certifikace BIO, DOP a PDO u olivového oleje?',
    answer:
      'BIO/Organic — olivovníky pěstované bez syntetických pesticidů a hnojiv, certifikace ' +
      'EU 2018/848 nebo USDA Organic. DOP/PDO (Protected Designation of Origin) — celá produkce ' +
      'od olivy po lahev musí proběhnout v daném regionu (např. DOP Kalamata, DOP Toskánsko). ' +
      'PGI/IGP (Protected Geographical Indication) — méně přísné, stačí část výroby v regionu. ' +
      'NYIOOC — americká soutěž, "Gold Award" znamená top kvalitu hodnocenou panelem sommelierů. ' +
      'Více v naší metodice.',
  },
  {
    question: 'Co jsou polyfenoly a proč na nich u olivového oleje záleží?',
    answer:
      'Polyfenoly jsou přírodní antioxidanty z oliv (oleocanthal, oleuropein, hydroxytyrosol). ' +
      'Dávají oleji typickou pálivost v hrdle a hořkost — to je signál kvality, ne defekt. ' +
      'EU health claim povoluje tvrzení "polyfenoly z olivového oleje přispívají k ochraně ' +
      'krevních lipidů před oxidačním stresem" pouze u olejů s ≥ 250 mg hydroxytyrosolu/kg. ' +
      'Studie spojují vysoké polyfenoly s ochranou srdce, sníženým zánětem a delší životností. ' +
      'Early harvest oleje (Koroneiki, Picual) mají typicky 400–800 mg/kg.',
  },
  {
    question: 'Jak dlouho vydrží otevřená lahev olivového oleje?',
    answer:
      'Po otevření spotřebuj do 3–6 měsíců — kyslík ze vzduchu nejvíc škodí. Pokud máš velkou ' +
      'lahev (1+ litr) a nepoužíváš často, raději si pořiď dvě menší. Olej v kontaktu se vzduchem ' +
      'oxiduje (ztrácí polyfenoly i chuť). Trik: malou lahvičku používej denně, větší zásobní ' +
      'lahev otevři až po dospotřebování první. Datum minimální trvanlivosti na lahvi (BBE) ' +
      'platí pro NEOTEVŘENÝ olej skladovaný správně.',
  },
  {
    question: 'Pomáhá olivový olej hubnout?',
    answer:
      'Sám o sobě ne — je to čistý tuk s 884 kcal/100 g. Ale ve studiích středomořské diety ' +
      '(PREDIMED, Spanish Mediterranean Diet trial 2013) skupina jedoucí 4 lžíce EVOO denně ' +
      'měla nižší riziko kardiovaskulárních příhod o 30 %, NIŽŠÍ obvod pasu a lepší inzulinovou ' +
      'sensitivitu než nízkotučná dieta. Mononenasycené tuky a polyfenoly podporují sytost ' +
      'a zdravější metabolismus. Klíč je nahradit jím horší tuky (máslo, rafinované oleje, ' +
      'palmový tuk), ne přidávat navíc.',
  },
]

/** Deterministically pick N general FAQs based on product slug.
 *  Same product always sees same FAQs (predictable for caching/SEO),
 *  but different products see different sets (avoids full duplicate content). */
export function selectGeneralFAQs(slug: string, count = 5): FAQPair[] {
  // Simple hash from slug to seed selection
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0
  }
  const start = Math.abs(hash) % GENERAL_FAQS.length
  // Take 'count' consecutive entries with wrap-around
  const out: FAQPair[] = []
  for (let i = 0; i < count && i < GENERAL_FAQS.length; i++) {
    out.push(GENERAL_FAQS[(start + i) % GENERAL_FAQS.length])
  }
  return out
}
