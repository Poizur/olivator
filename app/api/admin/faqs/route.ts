import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { getAllGeneralFAQs, upsertGeneralFAQ, deleteGeneralFAQ } from '@/lib/data'
import { revalidatePath } from 'next/cache'

/** Triggers revalidation of all public pages that show general FAQs. */
async function revalidateAll() {
  // General FAQs appear on every product page, plus future dedicated FAQ page
  revalidatePath('/')
  revalidatePath('/srovnavac')
  // Product pages — revalidate by catch-all path
  revalidatePath('/olej/[slug]', 'page')
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const faqs = await getAllGeneralFAQs()
    return NextResponse.json({ ok: true, faqs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (!body.question || !body.answer) {
      return NextResponse.json({ error: 'Otázka a odpověď jsou povinné' }, { status: 400 })
    }
    const result = await upsertGeneralFAQ({
      id: body.id,
      question: body.question,
      answer: body.answer,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
      category: body.category ?? 'general',
    })
    await revalidateAll()
    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id je povinné' }, { status: 400 })
    await deleteGeneralFAQ(id)
    await revalidateAll()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
