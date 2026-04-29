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

export function AdminCommandPalette({ currentTitle }: { currentTitle: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<ProductHit[]>([])
  const [highlight, setHighlight] = useState(0)
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
    <>
      {/* Trigger — looks like a search input in the topbar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 h-9 px-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Search size={14} strokeWidth={1.75} className="text-zinc-500 shrink-0" />
        <span className="flex-1 text-left truncate">
          Hledat produkty, sekce…
          <span className="ml-2 text-zinc-600">· {currentTitle}</span>
        </span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-[600px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 h-12 border-b border-zinc-800">
                <Search size={16} strokeWidth={1.75} className="text-zinc-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setHighlight(0)
                  }}
                  onKeyDown={onListKey}
                  placeholder="Hledat produkty, sekce, nastavení…"
                  className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-zinc-500"
                />
                <kbd className="text-[10px] font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[420px] overflow-y-auto py-2">
                {flatList.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[13px] text-zinc-500">
                    Žádné výsledky pro „{query}"
                  </div>
                ) : (
                  Object.entries(grouped).map(([groupName, items]) => (
                    <div key={groupName} className="mb-2 last:mb-0">
                      <div className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500 px-4 py-1">
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
                            className={`w-full flex items-center justify-between px-4 py-2 text-[13px] text-left transition-colors ${
                              isActive
                                ? 'bg-white/5 text-white'
                                : 'text-zinc-300 hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {isActive && (
                              <span className="text-[11px] text-zinc-500 ml-3 shrink-0">↵</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="border-t border-zinc-800 px-4 py-2 flex items-center gap-4 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <kbd className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">↑↓</kbd>
                  navigovat
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">↵</kbd>
                  otevřít
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">esc</kbd>
                  zavřít
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
