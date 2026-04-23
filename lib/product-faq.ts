// Generates FAQ Q&A pairs from product data.
// Used both for visible FAQ section on product page and Schema.org FAQPage.

import type { Product, ProductOffer } from './types'
import { countryName, certLabel, useCaseLabel, formatPrice } from './utils'

export interface FAQPair {
  question: string
  answer: string
}

export function generateProductFAQ(
  product: Product,
  cheapestOffer: ProductOffer | null
): FAQPair[] {
  const faqs: FAQPair[] = []

  // Q1: What is Olivator Score for this product
  if (product.olivatorScore) {
    const scoreLevel =
      product.olivatorScore >= 85
        ? 'vysoký — řadí se k nejlépe hodnoceným olejům v databázi'
        : product.olivatorScore >= 70
        ? 'nadprůměrný'
        : 'průměrný'
    faqs.push({
      question: `Jaké má olej ${product.name} Olivator Score?`,
      answer: `Olivator Score tohoto oleje je ${product.olivatorScore}/100 — ${scoreLevel}. Score počítáme transparentně z kyselosti (35%), certifikací (25%), polyfenolů a chemické kvality (25%) a poměru cena/kvalita (15%). Kompletní metodika je na stránce Metodika.`,
    })
  }

  // Q2: Acidity — only if we have it
  if (product.acidity != null) {
    const interpretation =
      product.acidity <= 0.2
        ? 'výjimečně nízká — olivy byly zpracovány velmi rychle po sklizni'
        : product.acidity <= 0.4
        ? 'velmi dobrá — typická pro kvalitní extra panenský olej'
        : product.acidity <= 0.8
        ? 'splňuje normu pro extra panenský olivový olej (max 0,8%)'
        : 'nad limit pro extra panenský (přes 0,8%)'
    faqs.push({
      question: `Co znamená kyselost ${product.acidity} % u tohoto oleje?`,
      answer: `Kyselost ${product.acidity} % u oleje ${product.name} je ${interpretation}. Kyselost (volné mastné kyseliny) je hlavní indikátor čerstvosti a kvality zpracování. EU norma pro extra panenský olivový olej povoluje maximum 0,8 %.`,
    })
  }

  // Q3: Polyphenols — only if we have them
  if (product.polyphenols != null && product.polyphenols > 0) {
    const healthClaim =
      product.polyphenols >= 250
        ? ' Splňuje EU health claim (min 250 mg/kg polyfenolů) — polyfenoly z olivového oleje přispívají k ochraně krevních lipidů před oxidačním stresem.'
        : ''
    faqs.push({
      question: `Kolik obsahuje olej polyfenolů?`,
      answer: `${product.polyphenols} mg/kg polyfenolů.${healthClaim} Polyfenoly jsou přírodní antioxidanty, které dávají oleji lehce hořkou a pálivou chuť. Vyšší obsah = více zdravotních benefitů i intenzivnější chuť.`,
    })
  }

  // Q4: Origin
  if (product.originRegion && product.originCountry) {
    faqs.push({
      question: `Odkud olej pochází?`,
      answer: `Olej ${product.name} pochází z regionu ${product.originRegion}, ${countryName(product.originCountry)}. Původ je klíčový pro chuťový profil — oleje ze stejného regionu mají často podobné vlastnosti díky místním odrůdám oliv a klimatu.`,
    })
  }

  // Q5: Certifications
  if (product.certifications.length > 0) {
    faqs.push({
      question: `Jaké má olej certifikace?`,
      answer: `Tento olej má certifikace: ${product.certifications.map(certLabel).join(', ')}. Co znamenají jednotlivé certifikace (DOP, BIO, NYIOOC a další) najdeš na stránce Metodika v sekci „Co znamenají certifikace".`,
    })
  }

  // Q6: Use cases
  if (product.useCases.length > 0) {
    const uses = product.useCases.map(useCaseLabel).join(', ')
    faqs.push({
      question: `Na co je olej nejvhodnější?`,
      answer: `Díky chuťovému profilu a chemickým vlastnostem se hodí zejména na: ${uses}. Doporučení vychází z intenzity, pálivosti a hořkosti oleje — jemnější oleje patří na salát, intenzivní na dipping nebo finishing hotových jídel.`,
    })
  }

  // Q7: Cheapest offer
  if (cheapestOffer) {
    faqs.push({
      question: `Kde koupit ${product.name} nejlevněji?`,
      answer: `Aktuálně nejlevněji u ${cheapestOffer.retailer.name} za ${formatPrice(cheapestOffer.price)}. Ceny sledujeme denně u všech partnerských prodejců. Kliknutím na tlačítko „Koupit" budeš přesměrován přímo na produkt u prodejce.`,
    })
  }

  // Q8: Storage (always — universal olive oil knowledge)
  faqs.push({
    question: `Jak olivový olej správně skladovat?`,
    answer: `Skladuj v tmavém chladném místě (15–18 °C), nejlépe v originálním tmavém skleněném obalu. Nedávej ho blízko sporáku. Extra panenský olivový olej vydrží 18–24 měsíců od data plnění, ale nejlepší chuť má během prvních 12 měsíců. Po otevření spotřebuj do 3 měsíců.`,
  })

  // Q9: Health benefits (always — universal)
  faqs.push({
    question: `Je extra panenský olivový olej zdravý?`,
    answer: `Ano, extra panenský olivový olej je jeden z nejzdravějších tuků v kuchyni. Obsahuje mononenasycené kyseliny (hlavně kyselinu olejovou), vitamín E a polyfenoly. Studie spojují jeho pravidelnou konzumaci se zdravím srdce a cév, nižší zánětlivostí a ochranou proti oxidačnímu stresu.`,
  })

  return faqs
}
