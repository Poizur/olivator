// Slim topbar for admin pages. Shows the current section title (derived from
// path), an "admin only" badge, and the logout button. Sidebar handles
// navigation, so this is intentionally minimal.

import { headers } from 'next/headers'
import { AdminBarLogout } from './admin-bar-logout'

const SECTION_TITLES: Record<string, string> = {
  '/admin': 'Přehled',
  '/admin/products': 'Produkty',
  '/admin/regions': 'Regiony',
  '/admin/brands': 'Značky',
  '/admin/cultivars': 'Odrůdy',
  '/admin/discovery': 'Discovery',
  '/admin/discovery/sources': 'Zdroje',
  '/admin/bulk-jobs': 'Historie běhů',
  '/admin/quality': 'Kvalita dat',
  '/admin/retailers': 'Prodejci',
  '/admin/faq': 'FAQ',
  '/admin/newsletter': 'Newsletter',
  '/admin/manager': 'Manager Agent',
  '/admin/nastaveni': 'Nastavení',
}

function pickTitle(pathname: string): string {
  const matches = Object.keys(SECTION_TITLES)
    .filter((k) => pathname === k || pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)
  return SECTION_TITLES[matches[0] ?? '/admin'] ?? 'Admin'
}

export async function AdminTopbar() {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const title = pickTitle(pathname)

  return (
    <div className="h-12 border-b border-off2 bg-white flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="text-[13px] text-text2">
        <span className="text-text3">Admin</span>
        <span className="mx-2 text-off2">/</span>
        <span className="text-text font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-text3 hidden md:inline">vidíš jen ty</span>
        <AdminBarLogout variant="light" />
      </div>
    </div>
  )
}
