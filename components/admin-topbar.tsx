// Slim dark topbar for admin pages. Search/command palette trigger,
// settings/notifications icons, avatar.

import { headers } from 'next/headers'
import { Settings, Bell } from 'lucide-react'
import { AdminCommandPalette } from './admin-command-palette'
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
    <div className="h-14 border-b border-off2 bg-off flex items-center gap-3 px-5 sticky top-0 z-40">
      {/* Search / command palette trigger */}
      <div className="flex-1 max-w-[640px]">
        <AdminCommandPalette currentTitle={title} />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Nastavení"
          className="w-9 h-9 rounded-md flex items-center justify-center text-text2 hover:text-text hover:bg-off transition-colors border border-transparent hover:border-off2"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Notifikace"
          className="relative w-9 h-9 rounded-md flex items-center justify-center text-text2 hover:text-text hover:bg-off transition-colors border border-transparent hover:border-off2"
        >
          <Bell size={16} strokeWidth={1.75} />
        </button>
        <div className="w-9 h-9 rounded-full bg-olive-bg border border-olive-border flex items-center justify-center text-[12px] font-semibold text-olive ml-1">
          MN
        </div>
        <div className="ml-2">
          <AdminBarLogout variant="dark-ghost" />
        </div>
      </div>
    </div>
  )
}
