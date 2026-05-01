'use client'

// Klientská část admin baru — čte aktuální URL přes usePathname()
// (spolehlivé i při ISR/SSG stránkách kde by headers() v layout mohl být stale).

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface EditLink {
  href: string
  label: string
}

async function resolveEditLink(pathname: string): Promise<EditLink | null> {
  // Region/Brand/Cultivar — slug → přímý admin link (nepotřebuje DB lookup)
  const regionMatch = pathname.match(/^\/oblast\/([^/?#]+)/)
  if (regionMatch) return { href: `/admin/regions/${regionMatch[1]}`, label: 'Upravit oblast' }

  const brandMatch = pathname.match(/^\/znacka\/([^/?#]+)/)
  if (brandMatch) return { href: `/admin/brands/${brandMatch[1]}`, label: 'Upravit značku' }

  const cultivarMatch = pathname.match(/^\/odruda\/([^/?#]+)/)
  if (cultivarMatch) return { href: `/admin/cultivars/${cultivarMatch[1]}`, label: 'Upravit odrůdu' }

  // Recept / průvodce / žebříček
  if (pathname.match(/^\/recept\//)) return { href: '/admin/recipes', label: 'Recepty v adminu' }
  if (pathname.match(/^\/pruvodce\//) || pathname.match(/^\/zebricek\//)) {
    return { href: '/admin/faq', label: 'Obsah v adminu' }
  }

  // Product — potřebuje DB lookup slug → id
  const productMatch = pathname.match(/^\/olej\/([^/?#]+)/)
  if (productMatch) {
    try {
      const res = await fetch(`/api/admin/product-id?slug=${encodeURIComponent(productMatch[1])}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const { id } = await res.json()
        if (id) return { href: `/admin/products/${id}`, label: 'Upravit olej' }
      }
    } catch { /* ignore */ }
    return null
  }

  return null
}

export function AdminBarEdit() {
  const pathname = usePathname()
  const [edit, setEdit] = useState<EditLink | null>(null)

  useEffect(() => {
    let cancelled = false
    resolveEditLink(pathname).then((link) => {
      if (!cancelled) setEdit(link)
    })
    return () => { cancelled = true }
  }, [pathname])

  if (!edit) return <span className="text-white/40 text-[11px]">Admin</span>

  return (
    <Link
      href={edit.href}
      className="px-3 py-1 bg-terra/80 hover:bg-terra rounded transition-colors whitespace-nowrap text-[12px]"
    >
      ✎ {edit.label}
    </Link>
  )
}
