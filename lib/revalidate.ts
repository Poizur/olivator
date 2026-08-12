// Helper to revalidate Next.js static pages after admin writes.
// Pages are pre-rendered at build time via generateStaticParams() — without
// explicit revalidation, edits in admin don't show up on public pages until
// next deploy.
//
// DŮLEŽITÉ: revalidatePath() funguje POUZE v Next.js request kontextu
// (API routes, server actions). Když je voláno z cron skriptů (čistý
// Node.js proces), selže s "Invariant: static generation store missing".
// Řešení: try/catch — cron skripty skončí úspěšně, ISR revaliduje
// stránky přirozeně při dalším requestu.

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from './supabase'

function tryRevalidatePath(path: string): void {
  try {
    revalidatePath(path)
  } catch {
    // Mimo Next.js request kontext (cron skripty) — ISR revaliduje přirozeně
  }
}

/** Revalidate all public pages that depend on a product. */
export async function revalidateProduct(productId: string): Promise<void> {
  // Look up slug for product detail path
  const { data } = await supabaseAdmin
    .from('products')
    .select('slug')
    .eq('id', productId)
    .maybeSingle()

  // Always revalidate listings
  tryRevalidatePath('/')                  // homepage (uses getProductsWithOffers)
  tryRevalidatePath('/srovnavac')         // catalog listing

  // Revalidate product detail
  if (data?.slug) {
    tryRevalidatePath(`/olej/${data.slug as string}`)
  }
}
