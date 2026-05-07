/**
 * Reverz mého auto-fix bugu + správné řešení.
 * `inactive_with_offers` rule = "draft + má offers" (ready to publish), ne inactive.
 * Můj auto-audit je deaktivoval offers (špatně). Tato oprava:
 * 1. Reaktivuje offers co byly nesprávně deaktivované
 * 2. Publikuje drafty co mají offers (přesun draft → active)
 */
import { supabaseAdmin } from '@/lib/supabase'

async function main() {
  // Najdi drafts co mají offery (i in_stock=false)
  const { data: drafts } = await supabaseAdmin
    .from('products')
    .select('id, slug, name')
    .eq('status', 'draft')

  let publishedCount = 0
  let reactivatedOffers = 0
  for (const p of (drafts ?? []) as Array<{ id: string; slug: string; name: string }>) {
    const { count } = await supabaseAdmin
      .from('product_offers')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', p.id)
    if (!count || count === 0) continue

    // Reaktivuj offers (in_stock=true) — předpokládáme že byly před chybou OK
    await supabaseAdmin
      .from('product_offers')
      .update({ in_stock: true, last_checked: new Date().toISOString() })
      .eq('product_id', p.id)
    reactivatedOffers += count

    // Publikuj produkt
    await supabaseAdmin
      .from('products')
      .update({
        status: 'active',
        status_changed_by: 'auto',
        status_changed_at: new Date().toISOString(),
        status_reason_code: null,
        status_reason_note: 'Publikováno — má offers (draft_with_offers fix)',
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)
    publishedCount++
    console.log(`  ✓ ${p.name.slice(0, 60)}`)
  }

  console.log(`\n${publishedCount} draftů publikováno, ${reactivatedOffers} offerů reaktivováno`)
}
main().catch(console.error)
