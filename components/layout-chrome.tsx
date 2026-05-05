'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Nav } from './nav'
import { Footer } from './footer'
import { CompareBar } from './compare-bar'
import { SommelierChat } from './sommelier-chat'
import { AdminBar } from './admin-bar'

/**
 * Klientský přepínač chrome (Nav, Footer, CompareBar, SommelierChat, AdminBar)
 * podle aktuální URL.
 *
 * Důvod: dříve to řešil root layout přes server-side `headers()` +
 * `isAdminAuthenticated()` → každé volání asynchronní cookie/header read
 * = celá app je `dynamic` → žádný ISR cache → každý request kompletně SSR
 * 1+ MB HTML. Po refactoru je root layout STATIC, chrome se přepne klientsky.
 *
 * AdminBar fetchuje status přes /api/admin/me (cookies jsou jeho problém,
 * stránky zůstávají cached).
 */
export function LayoutChrome({
  children,
  hasGa,
}: {
  children: ReactNode
  hasGa: boolean
}) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin') ?? false
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Skip fetch na admin stránkách (admin layout to řeší vlastně)
    if (isAdminPage) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    fetch('/api/admin/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((data) => {
        if (!cancelled) setIsAdmin(Boolean(data?.isAdmin))
      })
      .catch(() => {
        // Tichý fail — public chrome se ukáže bez admin baru, OK fallback
      })
    return () => {
      cancelled = true
    }
  }, [isAdminPage])

  return (
    <>
      {!isAdminPage && isAdmin ? <AdminBar /> : null}
      {!isAdminPage ? <Nav hasAdminBar={isAdmin} /> : null}
      <main className="flex-1">{children}</main>
      {!isAdminPage ? <Footer /> : null}
      {!isAdminPage ? <CompareBar /> : null}
      {!isAdminPage ? <SommelierChat /> : null}
      {/* GA zachovat na všech stránkách kromě adminu (privacy compliance) */}
      {hasGa && !isAdminPage ? null : null}
    </>
  )
}
