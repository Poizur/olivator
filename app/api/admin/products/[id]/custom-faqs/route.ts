import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { getProductCustomFAQs, setProductCustomFAQs, type CustomFAQ } from '@/lib/data'
import { revalidateProduct } from '@/lib/revalidate'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const faqs = await getProductCustomFAQs(id)
    return NextResponse.json({ ok: true, faqs })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const faqs: CustomFAQ[] = Array.isArray(body.faqs)
      ? body.faqs
          .filter((f: unknown): f is CustomFAQ => typeof f === 'object' && f !== null
            && typeof (f as CustomFAQ).question === 'string'
            && typeof (f as CustomFAQ).answer === 'string')
          .map((f: CustomFAQ) => ({
            question: f.question.trim(),
            answer: f.answer.trim(),
            source: f.source === 'auto' ? 'auto' : 'manual',
          }))
          .filter((f: CustomFAQ) => f.question && f.answer)
      : []
    await setProductCustomFAQs(id, faqs)
    await revalidateProduct(id)
    return NextResponse.json({ ok: true, count: faqs.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
