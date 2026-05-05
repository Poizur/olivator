import type { Product, ProductOffer } from './types'
import { countryName, typeLabel } from './utils'

/** Product description s fallbacky — zaručí že schema vždy má `description`.
 *  Google Search Console hlásí 'Chybí pole description' když je prázdné. */
function buildDescription(product: Product): string {
  if (product.descriptionShort && product.descriptionShort.trim().length > 10) {
    return product.descriptionShort.trim()
  }
  if (product.descriptionLong && product.descriptionLong.trim().length > 10) {
    return product.descriptionLong.trim().slice(0, 200) + '…'
  }
  // Generic fallback z dostupných dat
  const parts: string[] = []
  parts.push(typeLabel(product.type))
  if (product.originCountry) parts.push(`z ${countryName(product.originCountry)}`)
  if (product.volumeMl) parts.push(`${product.volumeMl} ml`)
  if (product.acidity != null) parts.push(`kyselost ${product.acidity}%`)
  if (product.polyphenols != null) parts.push(`${product.polyphenols} mg/kg polyfenolů`)
  return parts.join(', ')
}

/** Český zákonný 14-dní vrácení — platí pro všechny CZ eshopy.
 *  Google vyžaduje hasMerchantReturnPolicy v každém Offer pro Merchant Listings. */
const CZ_RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'CZ',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 14,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
} as const

/** Defaultní shipping pro CZ retailery. Konkrétní hodnoty per-retailer
 *  zatím nesbíráme — typický průměr napříč olivátor partnery (Rohlík, Košík,
 *  reckonasbavi, italyshop atd.) je 79–129 Kč, doručení 1–3 dny. Google
 *  Merchant Listings akceptuje range. */
const CZ_SHIPPING_DETAILS = {
  '@type': 'OfferShippingDetails',
  shippingRate: {
    '@type': 'MonetaryAmount',
    value: 99,
    currency: 'CZK',
  },
  shippingDestination: {
    '@type': 'DefinedRegion',
    addressCountry: 'CZ',
  },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: {
      '@type': 'QuantitativeValue',
      minValue: 0,
      maxValue: 1,
      unitCode: 'DAY',
    },
    transitTime: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 3,
      unitCode: 'DAY',
    },
  },
} as const

export function productSchema(product: Product, offers: ProductOffer[]) {
  const cheapest = offers[0]

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: buildDescription(product),
    ...(product.ean ? { sku: product.ean, gtin13: product.ean } : {}),
    brand: {
      '@type': 'Brand',
      name: product.name.split(' ')[0],
    },
    countryOfOrigin: {
      '@type': 'Country',
      name: countryName(product.originCountry),
    },
    additionalProperty: [
      ...(product.acidity != null ? [{ '@type': 'PropertyValue', name: 'Kyselost', value: `${product.acidity}%` }] : []),
      ...(product.polyphenols != null ? [{ '@type': 'PropertyValue', name: 'Polyfenoly', value: `${product.polyphenols} mg/kg` }] : []),
      { '@type': 'PropertyValue', name: 'Typ', value: typeLabel(product.type) },
    ],
    review: {
      '@type': 'Review',
      author: { '@type': 'Organization', name: 'Olivator.cz' },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: product.olivatorScore,
        bestRating: 100,
        worstRating: 0,
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.olivatorScore,
      bestRating: 100,
      worstRating: 0,
      ratingCount: 1,
    },
    offers: cheapest
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'CZK',
          lowPrice: Math.min(...offers.map(o => o.price)),
          highPrice: Math.max(...offers.map(o => o.price)),
          offerCount: offers.length,
          offers: offers.map(o => ({
            '@type': 'Offer',
            price: o.price,
            priceCurrency: 'CZK',
            availability: o.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: o.retailer.name,
            },
            // Google Merchant Listings (search console) vyžaduje
            // shippingDetails + hasMerchantReturnPolicy v každém Offer.
            shippingDetails: CZ_SHIPPING_DETAILS,
            hasMerchantReturnPolicy: CZ_RETURN_POLICY,
          })),
        }
      : undefined,
  }
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `https://olivator.cz${item.url}`,
    })),
  }
}

export function faqSchema(questions: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  }
}
