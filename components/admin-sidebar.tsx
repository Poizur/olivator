// Sticky left sidebar for admin pages — dark theme (Linear/Vercel style).
// Renders navigation groups + counter badges for items that need attention
// (drafts, pending discovery, quality issues).
//
// Server component fetches badges (counts), client component (admin-sidebar-nav)
// renders the nav with active state via usePathname() — to active state
// reaguje na client-side navigaci, ne jen na refresh.

import Image from 'next/image'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminCommandPalette } from './admin-command-palette'
import { AdminBarLogout } from './admin-bar-logout'
import { AdminSidebarNav, type AdminNavSection } from './admin-sidebar-nav'

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

export async function AdminSidebar() {
  const badges = await getBadges()

  const NAV: AdminNavSection[] = [
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
        { href: '/admin/articles', label: 'Články (průvodci)' },
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
        { href: '/admin/novinky', label: 'Novinky' },
        {
          href: '/admin/newsletter',
          label: 'Newsletter',
          subItems: [
            { href: '/admin/newsletter/drafts', label: 'Drafty' },
            { href: '/admin/newsletter/sends', label: 'Odeslané' },
            { href: '/admin/newsletter/subscribers', label: 'Odběratelé' },
            { href: '/admin/newsletter/facts', label: 'Fakta' },
            { href: '/admin/newsletter/legend', label: 'Legenda' },
            { href: '/admin/newsletter/settings', label: 'Nastavení' },
          ],
        },
        { href: '/admin/manager', label: 'Manager Agent' },
      ],
    },
    {
      group: 'Analytika',
      items: [
        { href: '/admin/analytics', label: 'Affiliate clicks' },
      ],
    },
    {
      group: 'Systém',
      items: [
        { href: '/admin/nastaveni', label: 'Nastavení' },
        { href: '/admin/learnings', label: 'Learnings' },
      ],
    },
  ]

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 bg-off border-r border-off2 flex-col sticky top-0 h-screen text-text2">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <Link href="/admin" className="flex items-center gap-3">
          <Image
            src="/logo-mark.png"
            alt="olivátor"
            width={56}
            height={56}
            className="w-12 h-12 rounded-lg shrink-0"
          />
          <div>
            <Image
              src="/logo-wordmark.png"
              alt="olivátor"
              width={200}
              height={50}
              className="h-9 w-auto"
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

      {/* Nav — client component for usePathname() reactivity on client-nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        <AdminSidebarNav sections={NAV} />
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
