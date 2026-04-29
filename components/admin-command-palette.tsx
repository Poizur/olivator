'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  group: string
  href: string
}

const ROUTES: CommandItem[] = [
  { id: 'r-overview', label: 'Přehled', group: 'Navigace', href: '/admin' },
  { id: 'r-products', label: 'Produkty', group: 'Katalog', href: '/admin/products' },
  { id: 'r-products-new', label: 'Importovat produkt z URL', group: 'Katalog', href: '/admin/products/import' },
  { id: 'r-regions', label: 'Regiony', group: 'Katalog', href: '/admin/regions' },
  { id: 'r-brands', label: 'Značky', group: 'Katalog', href: '/admin/brands' },
  { id: 'r-cultivars', label: 'Odrůdy', group: 'Katalog', href: '/admin/cultivars' },
  { id: 'r-discovery', label: 'Návrhy nových olejů', group: 'Discovery', href: '/admin/discovery' },
  { id: 'r-sources', label: 'Discovery zdroje', group: 'Discovery', href: '/admin/discovery/sources' },
  { id: 'r-bulk', label: 'Historie běhů', group: 'Discovery', href: '/admin/bulk-jobs' },
  { id: 'r-quality', label: 'Kvalita dat', group: 'Discovery', href: '/admin/quality' },
  { id: 'r-retailers', label: 'Prodejci', group: 'Obchod', href: '/admin/retailers' },
  { id: 'r-retailer-new', label: 'Přidat prodejce', group: 'Obchod', href: '/admin/retailers/new' },
  { id: 'r-faq', label: 'FAQ', group: 'Obsah', href: '/admin/faq' },
  { id: 'r-newsletter', label: 'Newsletter', group: 'Obsah', href: '/admin/newsletter' },
  { id: 'r-manager', label: 'Manager Agent', group: 'Obsah', href: '/admin/manager' },
  { id: 'r-settings', label: 'Nastavení', group: 'Systém', href: '/admin/nastaveni' },
  { id: 'r-public', label: 'Otevřít veřejný web', group: 'Systém', href: '/' },
]

interface ProductHit {
  slug: string
  name: string
  id: string
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function AdminCommandPalette({ currentTitle = '' }: { currentTitle?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<ProductHit[]>([])
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Open on ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Focus input when open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
    if (!open) {
      setQuery('')
      setHighlight(0)
    }
  }, [open])

  // Fetch products on type (debounced)
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setProducts([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`)
        if (!res.ok) return
        const data = (await res.json()) as { products: ProductHit[] }
        setProducts(data.products ?? [])
      } catch {
        setProducts([])
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query, open])

  const q = normalize(query.trim())
  const filteredRoutes = q
    ? ROUTES.filter((r) => normalize(r.label).includes(q) || normalize(r.group).includes(q))
    : ROUTES

  const productItems: CommandItem[] = products.map((p) => ({
    id: `p-${p.id}`,
    label: p.name,
    group: 'Produkty',
    href: `/admin/products/${p.id}`,
  }))

  const allItems = [...filteredRoutes, ...productItems]
  const grouped = allItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? []
    acc[item.group].push(item)
    return acc
  }, {})

  const flatList = Object.values(grouped).flat()

  const navigate = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, flatList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatList[highlight]
      if (item) navigate(item.href)
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Trigger / collapsed state */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 h-9 px-3 bg-white border border-off2 hover:border-off2 rounded-md text-[13px] text-text3 hover:text-text2 transition-colors"
        >
          <Search size={14} strokeWidth={1.75} className="text-text3 shrink-0" />
          <span className="flex-1 text-left truncate">
            Hledat…
            {currentTitle && <span className="ml-2 text-text3">· {currentTitle}</span>}
          </span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-mono text-text3 bg-off2 border border-off2 rounded px-1.5 py-0.5">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>
      ) : (
        <div className="w-full flex items-center gap-3 h-9 px-3 bg-white border border-off2 rounded-md text-[13px] focus-within:border-olive-border">
          <Search size={14} strokeWidth={1.75} className="text-text3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHighlight(0)
            }}
            onKeyDown={onListKey}
            placeholder="Napiš co hledáš…"
            className="flex-1 bg-transparent outline-none text-text placeholder:text-text3"
          />
          <kbd className="text-[10px] font-mono text-text3 bg-off2 border border-off2 rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>
      )}

      {/* Dropdown menu */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[420px] max-w-[calc(100vw-2rem)] bg-white border border-off2 rounded-md shadow-2xl overflow-hidden">
          <div className="max-h-[480px] overflow-y-auto py-2">
            {flatList.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-text3">
                Žádné výsledky pro „{query}"
              </div>
            ) : (
              Object.entries(grouped).map(([groupName, items]) => (
                <div key={groupName} className="mb-1.5 last:mb-0">
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-text3 px-3 py-1">
                    {groupName}
                  </div>
                  {items.map((item) => {
                    const flatIndex = flatList.indexOf(item)
                    const isActive = flatIndex === highlight
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setHighlight(flatIndex)}
                        onClick={() => navigate(item.href)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-left transition-colors ${
                          isActive
                            ? 'bg-off/60 text-text'
                            : 'text-text2 hover:bg-off'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isActive && (
                          <span className="text-[11px] text-text3 ml-3 shrink-0">↵</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-off2 px-3 py-1.5 flex items-center gap-3 text-[10px] text-text3">
            <span className="flex items-center gap-1">
              <kbd className="bg-off2 border border-off2 rounded px-1.5 py-0.5">↑↓</kbd>
              navigovat
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-off2 border border-off2 rounded px-1.5 py-0.5">↵</kbd>
              otevřít
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-off2 border border-off2 rounded px-1.5 py-0.5">esc</kbd>
              zavřít
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
