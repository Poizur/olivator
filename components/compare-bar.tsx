'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, Sparkles } from 'lucide-react'
import { useCompare } from '@/lib/compare-context'
import { trackCompareOpen } from '@/lib/analytics'

export function CompareBar() {
  const pathname = usePathname()
  const { items, removeItem, clearAll } = useCompare()
  const empty = 5 - items.length

  // Defense-in-depth: compare bar je veřejný UI, na /admin se nezobrazuje
  if (pathname.startsWith('/admin')) return null
  // Na samotném srovnávači není potřeba duplikovat
  if (pathname.startsWith('/porovnani')) return null

  // ── PRÁZDNÝ STAV — kompaktní pill uprostřed dole, vždy viditelný ──
  if (items.length === 0) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[2000] animate-[slideUp_0.4s_ease-out]">
        <Link
          href="/porovnani"
          className="group flex items-center gap-3 bg-white border border-off2 rounded-full pl-2 pr-5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:shadow-[0_12px_36px_rgba(45,106,79,0.18)] hover:border-olive-border transition-all"
        >
          <div className="w-9 h-9 rounded-full bg-olive-bg flex items-center justify-center group-hover:bg-olive group-hover:text-white transition-colors">
            <ArrowLeftRight size={15} strokeWidth={2.25} className="text-olive group-hover:text-white transition-colors" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-text">Porovnej oleje vedle sebe</span>
            <span className="text-[11px] text-text3 hidden sm:inline-flex items-center gap-1">
              <Sparkles size={9} strokeWidth={2} className="text-olive" />
              Score · cena · polyfenoly · původ
            </span>
          </div>
          <span className="hidden sm:inline-block text-[12px] font-semibold text-olive group-hover:text-olive-dark transition-colors ml-1">
            Vyzkoušet →
          </span>
        </Link>
      </div>
    )
  }

  // ── S POLOŽKAMI — vystředěný floating bar ──
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[2000] w-[calc(100%-1.5rem)] max-w-[920px] animate-[slideUp_0.3s_ease-out]">
      <div className="bg-white border border-off2 rounded-2xl px-4 sm:px-5 py-3 flex items-center gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {items.map(item => (
            <div
              key={item.id}
              className="w-20 h-14 shrink-0 border border-olive-light bg-olive-bg rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all"
              title={item.name}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-9 h-9 object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="font-[family-name:var(--font-display)] text-xl italic text-olive/40 leading-none">
                  {item.name.charAt(0)}
                </span>
              )}
              <span className="text-[9px] text-olive font-medium mt-0.5 text-center px-0.5 leading-tight max-w-[72px] overflow-hidden whitespace-nowrap text-ellipsis">
                {item.nameShort}
              </span>
              {/* X tlačítko mimo bounding box karty — ne v parent overflow-hidden,
                  jinak by se odřízlo. Větší 18×18 + tap padding pro mobil. */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  removeItem(item.id)
                }}
                className="absolute -top-2 -right-2 w-[18px] h-[18px] rounded-full bg-terra text-white text-[10px] flex items-center justify-center cursor-pointer font-bold border-[1.5px] border-white hover:bg-text shadow-sm z-10"
                aria-label={`Odebrat ${item.name} z porovnání`}
              >
                ✕
              </button>
            </div>
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-20 h-14 shrink-0 border-[1.5px] border-dashed border-off2 rounded-xl flex flex-col items-center justify-center bg-off"
              style={{ opacity: i > 1 ? 0.4 : 1 }}
            >
              <span className="text-lg text-off2">+</span>
              <span className="text-[9px] text-text3 mt-0.5">Slot {items.length + i + 1}</span>
            </div>
          ))}
        </div>

        <div className="text-[13px] text-text2 font-light whitespace-nowrap hidden sm:block">
          <strong className="text-text font-semibold">{items.length}</strong> z 5
        </div>

        <Link
          href={items.length >= 2
            ? `/porovnani/${items.map(i => i.slug).join('-vs-')}`
            : `/porovnani`
          }
          onClick={() => trackCompareOpen(items.length)}
          className={`bg-olive text-white border-none rounded-full px-5 py-2.5 text-[13px] font-medium cursor-pointer whitespace-nowrap transition-colors hover:bg-olive-dark ${
            items.length < 2 ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          Porovnat →
        </Link>

        <button
          onClick={clearAll}
          className="text-xs text-text3 cursor-pointer whitespace-nowrap hover:text-terra hidden sm:inline"
        >
          Vymazat
        </button>
      </div>
    </div>
  )
}
