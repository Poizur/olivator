'use client'

import type { ReactNode } from 'react'
import { trackAffiliateClick, type AffiliateClickEvent } from '@/lib/analytics'

interface AffiliateLinkProps {
  data: AffiliateClickEvent
  className?: string
  children: ReactNode
  target?: '_blank'
  title?: string
  /** Další query parametry za ?st= (např. UTM ze /slevy) — bez úvodního „?“/„&“. */
  extraParams?: string
}

/**
 * <a href="/go/[retailer]/[slug]"> wrapper that fires a GA4
 * "affiliate_click" event before navigation. gtag uses sendBeacon
 * so the event reliably reaches GA even during the redirect.
 *
 * NIKDY next/link: router by /go/ prefetchnul při zobrazení stránky a server by
 * zalogoval klik + prohlížeč by došel až na eHUB bez kliknutí (nález z 2026-11-19).
 * Prebuild `scripts/check-go-links.ts` to hlídá.
 */
// Mapuje GA4 source hodnoty na DB source_type hodnoty pro ?st= parametr.
const SOURCE_DB: Record<string, string> = {
  product_page: 'product',
  retailer_card: 'product',
  listing_card: 'srovnavac',
  homepage_card: 'homepage',
  ranking: 'zebricek',
  recipe: 'clanek',
  comparator: 'comparator',
}

export function AffiliateLink({ data, className, children, target, title, extraParams }: AffiliateLinkProps) {
  const st = SOURCE_DB[data.source] ?? data.source
  const href = `/go/${data.retailerSlug}/${data.productSlug}?st=${encodeURIComponent(st)}${extraParams ? `&${extraParams}` : ''}`

  return (
    <a
      href={href}
      rel="sponsored nofollow noopener"
      target={target}
      title={title}
      className={className}
      onClick={() => trackAffiliateClick(data)}
    >
      {children}
    </a>
  )
}
