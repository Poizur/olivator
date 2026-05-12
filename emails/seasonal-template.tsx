// Sdílená šablona pro všechny sezónní emaily (Fáze C).
// Dispatcher generuje `intro` přes Claude Haiku + validateCzechStyle.
// `sections` = specifický obsah per email-type, dodaný dispatcherem.

import { Button, Section, Text, Hr } from '@react-email/components'
import { NewsletterLayout } from './_layout'

export interface SeasonalSection {
  heading: string
  body: string
  ctaText?: string
  ctaHref?: string
}

export interface SeasonalEmailProps {
  unsubscribeUrl: string
  subject: string
  preheader: string
  intro: string           // AI generovaný úvod (Haiku, validovaný)
  sections: SeasonalSection[]
  footerNote?: string
}

export function SeasonalEmail({
  unsubscribeUrl,
  preheader,
  intro,
  sections,
  footerNote,
}: SeasonalEmailProps) {
  return (
    <NewsletterLayout preheader={preheader} unsubscribeUrl={unsubscribeUrl}>
      <Section className="mt-2 mb-4">
        <Text className="text-[15px] text-text2 leading-relaxed m-0 mt-2" style={{ fontStyle: 'italic' }}>
          {intro}
        </Text>
      </Section>

      {sections.map((s, i) => (
        <Section key={i} className="mb-5">
          <Text className="text-[11px] text-olive font-bold tracking-widest uppercase m-0">
            {s.heading}
          </Text>
          <Text className="text-[14px] text-text leading-relaxed m-0 mt-2">
            {s.body}
          </Text>
          {s.ctaText && s.ctaHref && (
            <Button
              href={s.ctaHref}
              style={{
                display: 'inline-block',
                background: '#2d6a4f',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 18px',
                borderRadius: '16px',
                textDecoration: 'none',
                marginTop: '10px',
              }}
            >
              {s.ctaText}
            </Button>
          )}
        </Section>
      ))}

      {footerNote && (
        <>
          <Hr style={{ borderColor: '#e8e8ed', margin: '16px 0' }} />
          <Text className="text-[12px] text-text3 m-0">{footerNote}</Text>
        </>
      )}
    </NewsletterLayout>
  )
}

// Statický obsah per template_name — dispatcher ho mergne s AI intro.
export const SEASONAL_CONTENT: Record<string, Omit<SeasonalEmailProps, 'unsubscribeUrl' | 'subject' | 'intro'>> = {
  'harvest-start': {
    preheader: 'Sklizňová sezóna začíná — co letos čekat od nové úrody.',
    sections: [
      {
        heading: 'Proč na sklizni záleží',
        body: 'Extra panenský olivový olej se vyrábí jednou ročně. Datum sklizně určuje kyselost, obsah polyfenolů i trvanlivost. Early harvest (říjen–listopad) = vyšší polyfenoly, výraznější chuť. Late harvest (prosinec–leden) = jemnější, mírnější.',
      },
      {
        heading: 'Co sledovat v katalogu',
        body: 'V příštích týdnech přibudou oleje s rokem sklizně 2026. Hledej označení "new harvest" nebo rok 2026/27 na etiketě — to jsou nejčerstvější lahve.',
        ctaText: 'Sledovat katalog',
        ctaHref: 'https://olivator.cz/srovnavac',
      },
    ],
    footerNote: 'Sklizňové novinky hlídáme za tebe. Přibudou do katalogu průběžně.',
  },
  'harvest-arrived': {
    preheader: 'První lahve z letošní sklizně jsou v prodeji — tady jsou.',
    sections: [
      {
        heading: 'Letošní sklizeň v číslech',
        body: 'Nové oleje z úrody tohoto roku jsou v katalogu. Score jsme přepočítali na základě aktuálních analytických dat — porovnej s loňskými lahvemi.',
        ctaText: 'Nová sklizeň v katalogu',
        ctaHref: 'https://olivator.cz/srovnavac?sort=newest',
      },
      {
        heading: 'Early vs. late harvest',
        body: 'Oleje označené "early harvest" nebo "novello" mají typicky nejvyšší obsah polyfenolů — sklízeny v říjnu, hořčí a pikantnější. Ideální na salát nebo dipování. Late harvest lahve budou přibývat v lednu.',
      },
    ],
  },
  'gift-guide': {
    preheader: 'Olivový olej jako dárek — co koupit a co se vyhnout.',
    sections: [
      {
        heading: 'Proč olej jako dárek funguje',
        body: 'Kvalitní extra panenský olej je věcný a praktický dárek — spotřebuje se, nepráší se, potěší i toho, kdo "nemá žádná přání". Víme to z nákupních dat: dárkové balení se nejlépe prodává v prosinci.',
      },
      {
        heading: 'Jak vybrat správně',
        body: 'Score 80+ = bezpečná volba. Dárkové balení (skleněná lahev, kartonová krabička) přidá. BIO nebo DOP certifikace = extra váha. Na cenu: 250–400 Kč = střední segment, 400–800 Kč = prémiový.',
        ctaText: 'Zobrazit dárková balení',
        ctaHref: 'https://olivator.cz/srovnavac?cert=gift',
      },
    ],
  },
  'fake-oils-warning': {
    preheader: 'Jak poznáš falšovaný olivový olej — a co s tím dělat.',
    sections: [
      {
        heading: 'Falšování je reálné',
        body: 'Studie EU pravidelně nacházejí oleje označené jako "extra virgin", které nesplňují parametry. Nejčastější praktiky: míchání s levnějšími oleji (slunečnicový, řepkový), antedatování sklizně, zavádějící původ.',
      },
      {
        heading: 'Jak se chránit',
        body: 'Olivator Score zohledňuje certifikace (DOP, PGI, BIO), které vyžadují nezávislou kontrolu původu a kvality. Score 80+ s DOP certifikací = výrazně nižší riziko. Vyhni se neznačkovým oleji bez certifikace pod 150 Kč/lahev.',
        ctaText: 'Oleje s DOP certifikací',
        ctaHref: 'https://olivator.cz/srovnavac?cert=dop',
      },
    ],
  },
  'winter-recap': {
    preheader: 'Co se v zimě kupovalo a co z toho vyplývá.',
    sections: [
      {
        heading: 'Zimní sezona v datech',
        body: 'Prosinec a leden jsou pro olivový olej nejsilnější měsíce — vánoční dárky + novoroční resoluace. V katalogu přibyly nové oleje, ceny se stabilizovaly.',
        ctaText: 'Aktuální top 10',
        ctaHref: 'https://olivator.cz/zebricek',
      },
      {
        heading: 'Co koupit teď',
        body: 'Zimní zásoby se doplňují. Early harvest lahve z října jsou ještě v prodeji — polyfenoly na vrcholu. V únoru přibydou pozdní sklizně s mírnější chutí.',
      },
    ],
  },
  'spring-oils': {
    preheader: 'Jaro = lehčí jídla = jiné oleje. Tady je výběr.',
    sections: [
      {
        heading: 'Proč jaro mění výběr oleje',
        body: 'Saláty, zelenina, ryby — jarní kuchyně preferuje lehčí oleje s ovocnými notami. Arbequina nebo Koroneiki early harvest jsou přirozenou volbou: nízká kyselost, příjemná hořkost, žádná agresivita.',
      },
      {
        heading: 'Jarní doporučení',
        body: 'Španělské Arbequiny a řecké Koroneiki jsou nejoblíbenější pro jarní saláty. Hledej kyselost pod 0,3 % a ovocný chuťový profil.',
        ctaText: 'Lehké ovocné oleje',
        ctaHref: 'https://olivator.cz/srovnavac?flavor=fruity',
      },
    ],
  },
  'nyiooc-results': {
    preheader: 'NYIOOC 2026 — světoví vítězové a co z toho plyne pro tvůj výběr.',
    sections: [
      {
        heading: 'Co je NYIOOC',
        body: 'New York International Olive Oil Competition je největší světová soutěž olivových olejů — přes 1 000 vzorků z 30+ zemí. Gold/Double Gold = celosvětové uznání kvality.',
      },
      {
        heading: 'Vítězové v katalogu',
        body: 'Oleje s NYIOOC oceněním jsou v Olivatoru označeny certifikací "nyiooc". Po každoroční aktualizaci výsledků přepočítáváme Score — ocenění z aktuálního roku váží více.',
        ctaText: 'NYIOOC oceněné oleje',
        ctaHref: 'https://olivator.cz/srovnavac?cert=nyiooc',
      },
    ],
  },
  'summer-pairing': {
    preheader: 'Letní saláty a grilování — který olej kam.',
    sections: [
      {
        heading: 'Pairing základy',
        body: 'Na saláty: lehký ovocný olej (Arbequina, Hojiblanca) — nízká hořkost, přirozená sladkost. Na grilovanou zeleninu: výraznější pikantní olej (Koroneiki, Coratina) — udrží charakter i po ohřevu. Na carpaccio nebo bruschetta: prémiový single-estate.',
      },
      {
        heading: 'Letní tip',
        body: 'Mražené olivové ice cube — zalij do formy na led, nech ztuhnou, přidej do studených polévek (gazpacho). Polyfenoly se dochucují při nižší teplotě výrazněji.',
        ctaText: 'Letní recepty s olejem',
        ctaHref: 'https://olivator.cz/recept',
      },
    ],
  },
  'pre-harvest': {
    preheader: 'Za pár týdnů začíná sklizeň — co čekat od cen a kvality.',
    sections: [
      {
        heading: 'Před sklizní ceny rostou',
        body: 'Zásoby z loňské sklizně se tenčí — ceny se v září typicky zvyšují. Pokud máš oblíbený olej, je teď vhodná chvíle pro větší nákup (3–5 l kanystr = lepší cena za ml).',
      },
      {
        heading: 'Co čekat letos',
        body: 'První early harvest oleje z Řecka (Kréta, Peloponés) a Itálie (Toskánsko) dorazí do katalog u v říjnu–listopadu. Klimatická data naznačují průměrnou úrodu — bez extrémů.',
        ctaText: 'Sledovat nové přírůstky',
        ctaHref: 'https://olivator.cz/srovnavac?sort=newest',
      },
    ],
  },
}
