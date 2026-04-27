import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export const maxDuration = 60

/** Mark a discovery candidate as approved.
 *  - If candidate already has resulting_product_id → just flip status to active
 *  - If not, the candidate is just queued data; create + publish requires
 *    re-running the full pipeline (TODO: defer to a separate publish endpoint).
 *  For MVP we just mark approved + flip resulting product to 'active' if exists.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { data: candidate, error: readErr } = await supabaseAdmin
      .from('discovery_candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (readErr || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // If a product was already created — flip it to active
    if (candidate.resulting_product_id) {
      await supabaseAdmin
        .from('products')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', candidate.resulting_product_id)
      revalidatePath('/')
      revalidatePath('/srovnavac')
    }

    await supabaseAdmin
      .from('discovery_candidates')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin',
      })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
