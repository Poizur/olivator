// Admin toolbar — zobrazuje se na veřejném webu jen přihlášenému adminovi.
// Auth check teď dělá <LayoutChrome> klientsky přes /api/admin/me, tady
// jen renderujeme UI. Bez tohoto refactoru by import isAdminAuthenticated
// z client-side <LayoutChrome> selhal (next/headers je server-only).

import Link from 'next/link'
import { AdminBarEdit } from './admin-bar-edit'

export function AdminBar() {
  return (
    <>
      <div aria-hidden className="h-9" />
      <div className="fixed top-0 left-0 right-0 z-[60] bg-text/95 backdrop-blur-sm text-white text-[12px] font-medium border-b border-black/20 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-5 h-9 flex items-center gap-2">
          <AdminBarEdit />
          <div className="ml-auto">
            <Link
              href="/admin"
              className="px-3 py-1 border border-white/20 hover:border-white/40 hover:bg-white/10 rounded transition-colors whitespace-nowrap text-[12px] text-white/80 hover:text-white"
            >
              Admin menu →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
