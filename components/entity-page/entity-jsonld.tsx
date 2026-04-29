// JSON-LD schema markupy pro entity stránky.
// FAQPage — společné pro všechny tři typy.
// Place — pro oblast.
// Organization — pro značku.
// Article — pro odrůdu (jako vzdělávací článek).

import type { FaqItem } from './types'

export function FaqJsonLd({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

interface PlaceJsonLdProps {
  name: string
  description: string
  countryName: string
  url: string
  imageUrl?: string | null
}

export function PlaceJsonLd({ name, description, countryName, url, imageUrl }: PlaceJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name,
    description,
    address: {
      '@type': 'PostalAddress',
      addressCountry: countryName,
      addressRegion: name,
    },
    url,
    ...(imageUrl ? { image: imageUrl } : {}),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

interface OrganizationJsonLdProps {
  name: string
  description: string
  url: string
  websiteUrl?: string | null
  foundedYear?: number | null
  countryName?: string | null
  imageUrl?: string | null
}

export function OrganizationJsonLd({
  name,
  description,
  url,
  websiteUrl,
  foundedYear,
  countryName,
  imageUrl,
}: OrganizationJsonLdProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    ...(websiteUrl ? { sameAs: [websiteUrl] } : {}),
    ...(foundedYear ? { foundingDate: String(foundedYear) } : {}),
    ...(imageUrl ? { logo: imageUrl, image: imageUrl } : {}),
    ...(countryName
      ? {
          address: {
            '@type': 'PostalAddress',
            addressCountry: countryName,
          },
        }
      : {}),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

interface ArticleJsonLdProps {
  headline: string
  description: string
  url: string
  datePublished: string  // ISO
  imageUrl?: string | null
}

export function ArticleJsonLd({
  headline,
  description,
  url,
  datePublished,
  imageUrl,
}: ArticleJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url,
    datePublished,
    author: {
      '@type': 'Organization',
      name: 'Olivator',
      url: 'https://olivator.cz',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Olivator',
      url: 'https://olivator.cz',
    },
    ...(imageUrl ? { image: imageUrl } : {}),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
