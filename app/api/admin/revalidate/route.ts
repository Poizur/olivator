// POST { path: string } → okamžitě invaliduje ISR cache pro danou cestu
// Použití: admin klikne "Obnovit stránku" bez nutnosti ukládat formulář.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { path } = await req.json().catch(() => ({})) as { path?: string }
  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }
  revalidatePath(path)
  return NextResponse.json({ ok: true, revalidated: path })
}
