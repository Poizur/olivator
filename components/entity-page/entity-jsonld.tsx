// JSON-LD schema markupy pro entity stránky.
// FAQPage — společné pro všechny tři typy.
// Place — pro oblast.
// Organization — pro značku.
// Article — pro odrůdu (jako vzdělávací článek).

import type { FaqItem } from './types'

/**
 * Bezpečně serializuje JSON-LD pro <script>. Zabraňuje XSS přes admin-edited
 * obsah (FAQ odpovědi, terroir text, timeline labely):
 * - </script> v textu by ukončil tag a otevřel injection bod
 * - HTML komentáře <!-- a --> taky
 * - U+2028/U+2029 prolomí JS parser ve starších browserech
 */
function safeJsonLd(data: unknown): string {
  // U+2028 (line sep) a U+2029 (paragraph sep) prolomí JS parser ve starších
  // browserech když jsou v <script>. Použijeme String.fromCharCode v RegExp.
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029')
}

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
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
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
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
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
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
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
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  )
}
