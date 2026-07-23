'use client'

import type { ReactNode } from 'react'
import { trackAffiliateClick, type AffiliateClickEvent } from '@/lib/analytics'

interface AffiliateLinkProps {
  data: AffiliateClickEvent
  className?: string
  children: ReactNode
}

/**
 * <a href="/go/[retailer]/[slug]"> wrapper that fires a GA4
 * "affiliate_click" event before navigation. gtag uses sendBeacon
 * so the event reliably reaches GA even during the redirect.
 *
 * Does NOT use Next.js <Link> because /go is an external redirect
 * route, not an SPA navigation.
 */
// Mapuje GA4 source hodnoty na DB source_type hodnoty pro ?st= parametr.
const SOURCE_DB: Record<string, string> = {
  product_page: 'product',
  listing_card: 'srovnavac',
  homepage_card: 'homepage',
  ranking: 'zebricek',
  recipe: 'clanek',
  comparator: 'comparator',
}

export function AffiliateLink({ data, className, children }: AffiliateLinkProps) {
  const st = SOURCE_DB[data.source] ?? data.source
  const href = `/go/${data.retailerSlug}/${data.productSlug}?st=${encodeURIComponent(st)}`

  return (
    <a
      href={href}
      rel="sponsored nofollow noopener"
      className={className}
      onClick={() => trackAffiliateClick(data)}
    >
      {children}
    </a>
  )
}
