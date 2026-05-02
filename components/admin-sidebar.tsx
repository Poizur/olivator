// Sticky left sidebar for admin pages — dark theme (Linear/Vercel style).
// Renders navigation groups + counter badges for items that need attention
// (drafts, pending discovery, quality issues).

import { headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminCommandPalette } from './admin-command-palette'
import { AdminBarLogout } from './admin-bar-logout'

type NavLink = { href: string; label: string; badge?: number; badgeTone?: 'amber' | 'red' | 'olive' }
type NavSection = { group?: string; items: NavLink[] }

async function getBadges(): Promise<Record<string, { value: number; tone: 'amber' | 'red' | 'olive' }>> {
  const [drafts, pendingDiscovery, qualityIssues, draftBrands] = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabaseAdmin.from('discovery_candidates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).lt('completeness_score', 50),
    // Auto-vytvořené brand stubs (status='draft') — admin musí doplnit obsah
    supabaseAdmin.from('brands').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
  ])

  const badges: Record<string, { value: number; tone: 'amber' | 'red' | 'olive' }> = {}
  if ((drafts.count ?? 0) > 0) badges['/admin/products'] = { value: drafts.count!, tone: 'amber' }
  if ((pendingDiscovery.count ?? 0) > 0) badges['/admin/discovery'] = { value: pendingDiscovery.count!, tone: 'olive' }
  if ((qualityIssues.count ?? 0) > 0) badges['/admin/quality'] = { value: qualityIssues.count!, tone: 'red' }
  if ((draftBrands.count ?? 0) > 0) badges['/admin/brands'] = { value: draftBrands.count!, tone: 'amber' }
  return badges
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export async function AdminSidebar() {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const badges = await getBadges()

  const NAV: NavSection[] = [
    {
      items: [
        { href: '/admin', label: 'Přehled' },
      ],
    },
    {
      group: 'Katalog',
      items: [
        {
          href: '/admin/products',
          label: 'Produkty',
          badge: badges['/admin/products']?.value,
          badgeTone: badges['/admin/products']?.tone,
        },
        { href: '/admin/regions', label: 'Regiony' },
        {
          href: '/admin/brands',
          label: 'Značky',
          badge: badges['/admin/brands']?.value,
          badgeTone: badges['/admin/brands']?.tone,
        },
        { href: '/admin/cultivars', label: 'Odrůdy' },
        { href: '/admin/recipes', label: 'Recepty' },
      ],
    },
    {
      group: 'Discovery',
      items: [
        {
          href: '/admin/discovery',
          label: 'Návrhy',
          badge: badges['/admin/discovery']?.value,
          badgeTone: badges['/admin/discovery']?.tone,
        },
        { href: '/admin/discovery/sources', label: 'Zdroje' },
        { href: '/admin/bulk-jobs', label: 'Historie běhů' },
        {
          href: '/admin/quality',
          label: 'Kvalita dat',
          badge: badges['/admin/quality']?.value,
          badgeTone: badges['/admin/quality']?.tone,
        },
      ],
    },
    {
      group: 'Obchod',
      items: [
        { href: '/admin/retailers', label: 'Prodejci' },
      ],
    },
    {
      group: 'Obsah',
      items: [
        { href: '/admin/faq', label: 'FAQ' },
        { href: '/admin/newsletter', label: 'Newsletter' },
        { href: '/admin/manager', label: 'Manager Agent' },
      ],
    },
    {
      group: 'Systém',
      items: [
        { href: '/admin/nastaveni', label: 'Nastavení' },
      ],
    },
  ]

  const all = NAV.flatMap((g) => g.items)
  const activeMatch = all
    .filter((l) => isActive(pathname, l.href))
    .sort((a, b) => b.href.length - a.href.length)[0]

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 bg-off border-r border-off2 flex-col sticky top-0 h-screen text-text2">
      {/* Brand */}
      <div className="px-5 pt-5 pb-3">
        <Link href="/admin" className="flex items-center gap-3">
          <Image
            src="/logo-mark.png"
            alt="olivátor"
            width={36}
            height={36}
            className="w-9 h-9 rounded-lg shrink-0"
          />
          <div>
            <Image
              src="/logo-wordmark.png"
              alt="olivátor"
              width={110}
              height={28}
              className="h-5 w-auto"
            />
            <div className="text-[10px] uppercase tracking-widest text-text3 mt-1">
              Admin
            </div>
          </div>
        </Link>
      </div>

      {/* Command palette / search */}
      <div className="px-3 pb-3 border-b border-off2">
        <AdminCommandPalette />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV.map((section, i) => (
          <div key={i} className={section.group ? 'mt-5 first:mt-0' : ''}>
            {section.group && (
              <div className="text-[10px] font-semibold tracking-widest uppercase text-text3 px-2.5 mb-1.5">
                {section.group}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = activeMatch?.href === item.href
                const dotColor = active
                  ? 'bg-olive'
                  : item.badge
                    ? item.badgeTone === 'red'
                      ? 'bg-red-500/70'
                      : item.badgeTone === 'amber'
                        ? 'bg-amber-500/70'
                        : 'bg-olive'
                    : 'bg-off2'
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-md transition-colors ${
                        active
                          ? 'bg-off/60 text-text'
                          : 'text-text2 hover:text-text hover:bg-off'
                      }`}
                    >
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span
                          className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 tabular-nums ${
                            item.badgeTone === 'red'
                              ? 'bg-red-50 text-red-700'
                              : item.badgeTone === 'amber'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-olive-bg text-olive'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: web + admin profile + logout */}
      <div className="border-t border-off2 px-2.5 py-3 space-y-0.5">
        <Link
          href="/"
          className="flex items-center justify-between px-2.5 py-1.5 text-[12px] text-text2 hover:text-text transition-colors rounded-md hover:bg-off"
        >
          <span>Zobrazit web</span>
          <span className="text-text3">→</span>
        </Link>
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <div className="w-7 h-7 rounded-full bg-olive-bg border border-olive-border flex items-center justify-center text-[11px] font-semibold text-olive shrink-0">
            MN
          </div>
          <div className="flex-1 min-w-0 text-[12px] text-text2">Admin</div>
          <AdminBarLogout variant="dark-ghost" />
        </div>
      </div>
    </aside>
  )
}
