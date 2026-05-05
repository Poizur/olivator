// Lehký endpoint pro zjištění admin auth statusu z client komponent.
// Důvod: root layout volá isAdminAuthenticated() (čte cookies) → Next.js
// označí celou app jako dynamic → žádný ISR cache → každý request 1+ MB
// SSR HTML. Refactor: root layout je STATIC, AdminBar fetchuje status
// klientsky přes tento endpoint.

import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
// Sám endpoint je dynamic (čte cookies) ale je VOLÁN klientsky až po
// načtení stránky → root layout může zůstat static.

export async function GET() {
  const isAdmin = await isAdminAuthenticated()
  // Žádné no-store — endpoint je beztak per-user (cookie scoped)
  return NextResponse.json({ isAdmin })
}
