'use client'

// Typed GA4 event helpers.
// Use sendGAEvent for custom events; standard pageview is automatic via
// @next/third-parties' <GoogleAnalytics>.

import { sendGAEvent } from '@next/third-parties/google'

export interface AffiliateClickEvent {
  productSlug: string
  productName: string
  retailerSlug: string
  retailerName: string
  price: number
  source: 'product_page' | 'listing_card' | 'homepage_card' | 'ranking' | 'recipe' | 'comparator'
}

export function trackAffiliateClick(data: AffiliateClickEvent) {
  sendGAEvent('event', 'affiliate_click', {
    product_slug: data.productSlug,
    product_name: data.productName,
    retailer: data.retailerSlug,
    retailer_name: data.retailerName,
    price_czk: data.price,
    source: data.source,
    currency: 'CZK',
    value: data.price,
  })
}

export function trackCompareAdd(productSlug: string, productName: string) {
  sendGAEvent('event', 'compare_add', {
    product_slug: productSlug,
    product_name: productName,
  })
}

export function trackCompareRemove(productSlug: string, productName: string) {
  sendGAEvent('event', 'compare_remove', {
    product_slug: productSlug,
    product_name: productName,
  })
}

export function trackCompareOpen(itemCount: number) {
  sendGAEvent('event', 'compare_open', {
    item_count: itemCount,
  })
}

export function trackFilterApply(key: string, value: string) {
  sendGAEvent('event', 'filter_apply', {
    filter_key: key,
    filter_value: value,
  })
}

export function trackSortChange(sort: string) {
  sendGAEvent('event', 'sort_change', { sort_by: sort })
}
