import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminSession, verifyPassword } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_FAILS = 5
const LOCKOUT_MINUTES = 15

function hashIp(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  return createHash('sha256').update(ip).digest('hex')
}

/**
 * Spočítá neúspěšné pokusy z dané IP za posledních LOCKOUT_MINUTES.
 * Při ≥ MAX_FAILS vrátí počet zbývajících minut, jinak 0.
 */
async function checkLockout(ipHash: string): Promise<number> {
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('admin_login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('success', false)
    .gte('attempted_at', since)

  if ((count ?? 0) >= MAX_FAILS) {
    // Najdi nejstarší fail v okně → odčítej, vypočti zbývající čas lockoutu
    const { data } = await supabaseAdmin
      .from('admin_login_attempts')
      .select('attempted_at')
      .eq('ip_hash', ipHash)
      .eq('success', false)
      .gte('attempted_at', since)
      .order('attempted_at', { ascending: true })
      .limit(1)
    const oldest = data?.[0]?.attempted_at
    if (oldest) {
      const oldestMs = new Date(oldest).getTime()
      const elapsedMin = (Date.now() - oldestMs) / 60000
      const remaining = Math.max(0, Math.ceil(LOCKOUT_MINUTES - elapsedMin))
      return remaining
    }
    return LOCKOUT_MINUTES
  }
  return 0
}

async function logAttempt(ipHash: string, success: boolean): Promise<void> {
  // Best-effort — když log selže, login se nezablokuje
  try {
    await supabaseAdmin.from('admin_login_attempts').insert({
      ip_hash: ipHash,
      success,
    })
  } catch (err) {
    console.warn('[admin/login] attempt log failed:', err)
  }
}

export async function POST(request: NextRequest) {
  const ipHash = hashIp(request)

  // 1. Rate-limit check
  const lockedFor = await checkLockout(ipHash)
  if (lockedFor > 0) {
    return NextResponse.json(
      { error: `Příliš mnoho neúspěšných pokusů. Zkus to za ${lockedFor} min.` },
      { status: 429 }
    )
  }

  try {
    const { password } = await request.json()
    if (typeof password !== 'string') {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 })
    }

    if (!verifyPassword(password)) {
      await logAttempt(ipHash, false)
      // Throttle ~200ms — chrání před fast brute force i při nezalogovaném selhání
      await new Promise((r) => setTimeout(r, 200))
      return NextResponse.json({ error: 'Nesprávné heslo' }, { status: 401 })
    }

    await logAttempt(ipHash, true)
    await createAdminSession()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/login]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
