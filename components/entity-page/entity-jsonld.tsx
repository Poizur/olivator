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

// Hardcoded geo coordinates for known olive oil regions
// Eliminates need for DB migration — extended when new regions are added
const REGION_GEO: Record<string, { lat: number; lon: number }> = {
  kreta: { lat: 35.24, lon: 24.81 },
  peloponnes: { lat: 37.50, lon: 22.50 },
  kalamata: { lat: 37.04, lon: 22.11 },
  lesbos: { lat: 39.20, lon: 26.30 },
  korfu: { lat: 39.62, lon: 19.92 },
  zakynthos: { lat: 37.79, lon: 20.90 },
  chalkidiki: { lat: 40.30, lon: 23.30 },
  arcadia: { lat: 37.50, lon: 22.30 },
  korinthie: { lat: 37.90, lon: 22.70 },
  messinia: { lat: 37.00, lon: 22.10 },
  messara: { lat: 35.05, lon: 24.93 },
  sitia: { lat: 35.21, lon: 26.10 },
  kolymbari: { lat: 35.54, lon: 23.73 },
  kolymvari: { lat: 35.54, lon: 23.73 },
  lakonia: { lat: 36.90, lon: 22.40 },
  festos: { lat: 35.05, lon: 24.83 },
  skillountia: { lat: 37.62, lon: 21.62 },
  toskansko: { lat: 43.77, lon: 11.25 },
  apulie: { lat: 40.90, lon: 16.60 },
  sicilie: { lat: 37.50, lon: 14.00 },
  molise: { lat: 41.50, lon: 14.50 },
  umbrie: { lat: 43.10, lon: 12.40 },
  alberobello: { lat: 40.79, lon: 17.24 },
  andalusie: { lat: 37.54, lon: -4.73 },
  jaen: { lat: 37.78, lon: -3.78 },
  'terra-alta': { lat: 41.00, lon: 0.45 },
  'castilla-la-mancha': { lat: 39.50, lon: -3.00 },
  'kastilie-la-mancha': { lat: 39.50, lon: -3.00 },
  istrie: { lat: 45.20, lon: 13.90 },
  alentejo: { lat: 38.50, lon: -7.90 },
  douro: { lat: 41.20, lon: -7.60 },
}

interface PlaceJsonLdProps {
  name: string
  description: string
  countryName: string
  url: string
  imageUrl?: string | null
  /** Wikipedia, Wikidata, GeoNames URL — Knowledge Graph signál */
  sameAs?: string[]
  /** Region slug for geo coordinate lookup */
  regionSlug?: string
}

export function PlaceJsonLd({ name, description, countryName, url, imageUrl, sameAs, regionSlug }: PlaceJsonLdProps) {
  const geo = regionSlug ? REGION_GEO[regionSlug] : undefined
  const data: Record<string, unknown> = {
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
    ...(geo ? { geo: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lon } } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(sameAs && sameAs.length > 0 ? { sameAs } : {}),
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
  /** Extra sameAs URLs (Wikipedia, Wikidata, social) — kombinuje s websiteUrl */
  extraSameAs?: string[]
}

export function OrganizationJsonLd({
  name,
  description,
  url,
  websiteUrl,
  foundedYear,
  countryName,
  imageUrl,
  extraSameAs,
}: OrganizationJsonLdProps) {
  const sameAs = [websiteUrl, ...(extraSameAs ?? [])].filter((u): u is string => !!u)
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    ...(sameAs.length > 0 ? { sameAs } : {}),
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

interface BreadcrumbItem {
  name: string
  url: string  // path only (e.g. '/oblast/peloponnes'), prefixed with origin
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `https://olivator.cz${item.url}`,
    })),
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
  /** Wikipedia/Wikidata URLs — pro entity articles (cultivary) */
  sameAs?: string[]
}

export function ArticleJsonLd({
  headline,
  description,
  url,
  datePublished,
  imageUrl,
  sameAs,
}: ArticleJsonLdProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url,
    datePublished,
    inLanguage: 'cs-CZ',
    author: {
      '@type': 'Organization',
      name: 'Olivator',
      url: 'https://olivator.cz',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Olivator',
      url: 'https://olivator.cz',
      logo: {
        '@type': 'ImageObject',
        url: 'https://olivator.cz/logo-wordmark.png',
      },
    },
    ...(imageUrl ? { image: { '@type': 'ImageObject', url: imageUrl } } : {}),
    ...(sameAs && sameAs.length > 0 ? { sameAs } : {}),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  )
}
