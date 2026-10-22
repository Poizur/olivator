import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { answerOlik, maskPii, type OlikMessage } from '@/lib/olik'

export async function POST(req: NextRequest) {
  try {
    const { messages, session_id, source_page } = (await req.json()) as {
      messages: OlikMessage[]
      session_id?: string
      source_page?: string
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 })
    }

    const lastUserMsg = messages.filter((m) => m.role === 'user').at(-1)?.content ?? ''
    const result = await answerOlik(messages)

    // Log do olik_conversations — fire-and-forget, neblokuje odpověď. Uchování 12 měsíců.
    supabaseAdmin
      .from('olik_conversations')
      .insert({
        session_id: session_id ?? null,
        query: maskPii(lastUserMsg),
        response_summary: result.text.slice(0, 300),
        response_full: maskPii(result.text),
        recommended_slugs: result.recommendedSlugs,
        no_recommendation: result.recommendedSlugs.length === 0,
        source_page: source_page?.slice(0, 200) ?? null,
        tokens_used: result.tokens,
        validation: { attempts: result.attempts, fallback: result.fallback, issues: result.issues },
      })
      .then(({ error }) => {
        if (error) console.error('[chat] log failed:', error.message)
      })

    return NextResponse.json({ reply: result.text })
  } catch (err) {
    console.error('[chat] error', err)
    return NextResponse.json(
      { error: 'Sommelier je momentálně nedostupný, zkus to za chvíli.' },
      { status: 500 }
    )
  }
}
