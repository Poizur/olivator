import type { Product, ProductOffer, Retailer } from './types'
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

/** Per-retailer shipping data → schema.org OfferShippingDetails.
 *  Pokud retailer nemá uložená data (XML neobsahoval DELIVERY tagy nebo
 *  auto-research selhal), fallback na CZ default 99 Kč / 1-3 dny. */
function buildShippingDetails(retailer: Retailer) {
  const rate = retailer.shippingRateCzk ?? 99
  const minDays = retailer.deliveryDaysMin ?? 1
  const maxDays = retailer.deliveryDaysMax ?? 3
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: rate,
      currency: 'CZK',
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'CZ',
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: minDays, maxValue: maxDays, unitCode: 'DAY' },
    },
  }
}

/** Per-retailer return policy. Default 14 dní (CZ zákonné minimum). */
function buildReturnPolicy(retailer: Retailer) {
  const days = retailer.returnDays ?? 14
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'CZ',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: days,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  }
}

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
            // Per-retailer shipping + return policy. Fallback na CZ defaults
            // pokud retailer nemá uložená data.
            shippingDetails: buildShippingDetails(o.retailer),
            hasMerchantReturnPolicy: buildReturnPolicy(o.retailer),
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
