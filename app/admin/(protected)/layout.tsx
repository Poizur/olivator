import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Admin | Olivator',
  robots: { index: false, follow: false },
}

const LINKS = [
  { href: '/admin', label: 'Přehled' },
  { href: '/admin/retailers', label: 'Prodejci' },
  { href: '/admin/products', label: 'Produkty' },
  { href: '/admin/faq', label: 'FAQ' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-off">
      <div className="bg-white border-b border-off2">
        <div className="max-w-[1200px] mx-auto px-8 h-14 flex items-center gap-8">
          <Link
            href="/admin"
            className="font-[family-name:var(--font-display)] text-lg text-olive-dark flex items-center gap-2 shrink-0"
          >
            <span className="text-xl">🫒</span>
            <span>Admin</span>
          </Link>
          <nav className="flex gap-6 flex-1">
            {LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] text-text2 hover:text-olive transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            target="_blank"
            className="text-[12px] text-text3 hover:text-olive transition-colors"
          >
            Web ↗
          </Link>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-[12px] text-text3 hover:text-terra transition-colors cursor-pointer"
            >
              Odhlásit
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-8 py-8">{children}</div>
    </div>
  )
}
