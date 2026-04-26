// Helper to revalidate Next.js static pages after admin writes.
// Pages are pre-rendered at build time via generateStaticParams() — without
// explicit revalidation, edits in admin don't show up on public pages until
// next deploy.

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from './supabase'

/** Revalidate all public pages that depend on a product. */
export async function revalidateProduct(productId: string): Promise<void> {
  // Look up slug for product detail path
  const { data } = await supabaseAdmin
    .from('products')
    .select('slug')
    .eq('id', productId)
    .maybeSingle()

  // Always revalidate listings
  revalidatePath('/')                  // homepage (uses getProductsWithOffers)
  revalidatePath('/srovnavac')         // catalog listing

  // Revalidate product detail
  if (data?.slug) {
    revalidatePath(`/olej/${data.slug as string}`)
  }
}
