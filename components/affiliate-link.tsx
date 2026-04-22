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
export function AffiliateLink({ data, className, children }: AffiliateLinkProps) {
  const href = `/go/${data.retailerSlug}/${data.productSlug}`

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
