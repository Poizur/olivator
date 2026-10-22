import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { answerOlik, maskPii, type OlikMessage } from '@/lib/olik'

// Ochrana nákladů: max. 10 zpráv za 10 minut z jedné IP, max. 200 zpráv denně celkem. Nad limit žádné volání modelu.
const IP_LIMIT = 10
const IP_WINDOW_MS = 10 * 60 * 1000
const DAILY_LIMIT = 200

function startOfPragueDay(now = new Date()): Date {
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Prague' }))
  const offsetMs = local.getTime() - now.getTime()
  local.setHours(0, 0, 0, 0)
  return new Date(local.getTime() - offsetMs)
}

async function rateLimitReply(ipHash: string): Promise<string | null> {
  const [{ count: ipCount }, { count: dayCount }] = await Promise.all([
    supabaseAdmin
      .from('olik_rate_events')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', new Date(Date.now() - IP_WINDOW_MS).toISOString()),
    supabaseAdmin
      .from('olik_rate_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfPragueDay().toISOString()),
  ])
  if ((ipCount ?? 0) >= IP_LIMIT) {
    return 'Díky za spoustu otázek! Teď si na pár minut dám pauzu — zkus to prosím znovu za chvíli. Mezitím můžeš procházet oleje ve srovnávači: /srovnavac'
  }
  if ((dayCount ?? 0) >= DAILY_LIMIT) {
    return 'Dnes jsem už odpověděl na hodně otázek a potřebuju si odpočinout — zkus to prosím zítra. Všechny oleje s cenami najdeš ve srovnávači: /srovnavac'
  }
  return null
}

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
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const ipHash = createHash('sha256').update(rawIp).digest('hex')
    const limited = await rateLimitReply(ipHash)
    if (limited) return NextResponse.json({ reply: limited, limited: true })
    await supabaseAdmin.from('olik_rate_events').insert({ ip_hash: ipHash })

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
