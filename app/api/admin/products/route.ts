import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createProduct, updateProductFacts } from '@/lib/data'
import { extractFactsFromText } from '@/lib/fact-extractor'

export const maxDuration = 45 // fact extraction adds ~5s

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: 'Název a slug jsou povinné' }, { status: 400 })
    }

    const result = await createProduct({ ...body, status: body.status ?? 'draft' })

    // Fact extraction (fire-and-await): when creating from import with
    // raw description, extract specific technical facts for later use
    // by AI rewrite. Uses Claude Haiku (~$0.005/call).
    // Prefer rawDescription (untouched scrape) over AI-generated text.
    const rawText = body.rawDescription || body.descriptionLong || body.descriptionShort || ''
    if (rawText && rawText.length > 30) {
      try {
        const facts = await extractFactsFromText(rawText)
        if (facts.length > 0) {
          await updateProductFacts(result.id, facts)
        }
      } catch (err) {
        console.warn('[fact extraction at import] non-fatal:', err)
      }
    }

    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    console.error('[products POST]', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
