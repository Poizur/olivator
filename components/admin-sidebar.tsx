// Sticky left sidebar for admin pages — dark theme (Linear/Vercel style).
// Renders navigation groups + counter badges for items that need attention
// (drafts, pending discovery, quality issues).

import { headers } from 'next/headers'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

type NavLink = { href: string; label: string; badge?: number; badgeTone?: 'amber' | 'red' | 'olive' }
type NavSection = { group?: string; items: NavLink[] }

async function getBadges(): Promise<Record<string, { value: number; tone: 'amber' | 'red' | 'olive' }>> {
  const [drafts, pendingDiscovery, qualityIssues] = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabaseAdmin.from('discovery_candidates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).lt('completeness_score', 50),
  ])

  const badges: Record<string, { value: number; tone: 'amber' | 'red' | 'olive' }> = {}
  if ((drafts.count ?? 0) > 0) badges['/admin/products'] = { value: drafts.count!, tone: 'amber' }
  if ((pendingDiscovery.count ?? 0) > 0) badges['/admin/discovery'] = { value: pendingDiscovery.count!, tone: 'olive' }
  if ((qualityIssues.count ?? 0) > 0) badges['/admin/quality'] = { value: qualityIssues.count!, tone: 'red' }
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
        { href: '/admin/brands', label: 'Značky' },
        { href: '/admin/cultivars', label: 'Odrůdy' },
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
    <aside className="hidden lg:flex w-[240px] shrink-0 bg-zinc-950 border-r border-zinc-800/80 flex-col sticky top-0 h-screen text-zinc-300">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-zinc-800/80">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-olive3/15 border border-olive3/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-olive3" />
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-lg text-white leading-none">
              Olivátor
            </div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
              Admin
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV.map((section, i) => (
          <div key={i} className={section.group ? 'mt-5 first:mt-0' : ''}>
            {section.group && (
              <div className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500 px-2.5 mb-1.5">
                {section.group}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = activeMatch?.href === item.href
                const dotColor = active
                  ? 'bg-olive3'
                  : item.badge
                    ? item.badgeTone === 'red'
                      ? 'bg-red-500/70'
                      : item.badgeTone === 'amber'
                        ? 'bg-amber-500/70'
                        : 'bg-olive3/70'
                    : 'bg-zinc-700'
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-md transition-colors ${
                        active
                          ? 'bg-white/5 text-white'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span
                          className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 tabular-nums ${
                            item.badgeTone === 'red'
                              ? 'bg-red-500/15 text-red-400'
                              : item.badgeTone === 'amber'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-olive3/15 text-olive3'
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

      {/* Footer link to public site */}
      <div className="px-2.5 py-3 border-t border-zinc-800/80">
        <Link
          href="/"
          className="flex items-center justify-between px-2.5 py-1.5 text-[12px] text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
        >
          <span>Zobrazit web</span>
          <span className="text-zinc-600">→</span>
        </Link>
      </div>
    </aside>
  )
}
