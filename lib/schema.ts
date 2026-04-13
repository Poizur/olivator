import type { Product, ProductOffer } from './types'
import { countryName, typeLabel } from './utils'

export function productSchema(product: Product, offers: ProductOffer[]) {
  const cheapest = offers[0]

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.descriptionShort,
    sku: product.ean,
    gtin13: product.ean,
    brand: {
      '@type': 'Brand',
      name: product.name.split(' ')[0],
    },
    countryOfOrigin: {
      '@type': 'Country',
      name: countryName(product.originCountry),
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Kyselost', value: `${product.acidity}%` },
      { '@type': 'PropertyValue', name: 'Polyfenoly', value: `${product.polyphenols} mg/kg` },
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
