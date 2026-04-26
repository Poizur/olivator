import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { upsertGeneralFAQ, getAllGeneralFAQs } from '@/lib/data'
import { GENERAL_FAQS } from '@/lib/general-faq'
import { revalidatePath } from 'next/cache'

/** One-shot seed: insert all 12 hardcoded GENERAL_FAQS. Idempotent — won't
 *  duplicate if rows with same question already exist. */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const existing = await getAllGeneralFAQs()
    const existingQuestions = new Set(existing.map(f => f.question.trim().toLowerCase()))

    let inserted = 0
    for (let i = 0; i < GENERAL_FAQS.length; i++) {
      const f = GENERAL_FAQS[i]
      if (existingQuestions.has(f.question.trim().toLowerCase())) continue
      await upsertGeneralFAQ({
        question: f.question,
        answer: f.answer,
        sortOrder: existing.length + i,
        isActive: true,
        category: 'general',
      })
      inserted++
    }

    revalidatePath('/')
    revalidatePath('/srovnavac')
    revalidatePath('/olej/[slug]', 'page')

    return NextResponse.json({
      ok: true,
      inserted,
      skipped: GENERAL_FAQS.length - inserted,
      total: existing.length + inserted,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
