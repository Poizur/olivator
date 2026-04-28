'use client'

import Link from 'next/link'
import { useCompare } from '@/lib/compare-context'
import { trackCompareOpen } from '@/lib/analytics'
import { countryFlag } from '@/lib/utils'

export function CompareBar() {
  const { items, removeItem, clearAll } = useCompare()
  const empty = 5 - items.length

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-off2 px-10 py-3 flex items-center gap-3 z-[2000] shadow-[0_-4px_24px_rgba(0,0,0,.1)] animate-[slideUp_0.3s_ease-out]">
      <div className="flex gap-2 flex-1">
        {items.map(item => (
          <div
            key={item.id}
            className="w-20 h-14 border border-olive-light bg-olive-bg rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all overflow-hidden"
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
              <span className="text-xl">🫒</span>
            )}
            {item.originCountry && (
              <span className="absolute bottom-3.5 left-1 text-[10px] leading-none bg-white/90 rounded px-0.5">
                {countryFlag(item.originCountry)}
              </span>
            )}
            <span className="text-[9px] text-olive font-medium mt-0.5 text-center px-0.5 leading-tight max-w-[72px] overflow-hidden whitespace-nowrap text-ellipsis">
              {item.nameShort}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-text2 text-white text-[9px] flex items-center justify-center cursor-pointer font-bold border-[1.5px] border-white hover:bg-terra"
            >
              ✕
            </button>
          </div>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-20 h-14 border-[1.5px] border-dashed border-off2 rounded-xl flex flex-col items-center justify-center bg-off"
            style={{ opacity: i > 1 ? 0.4 : 1 }}
          >
            <span className="text-lg text-off2">+</span>
            <span className="text-[9px] text-text3 mt-0.5">Slot {items.length + i + 1}</span>
          </div>
        ))}
      </div>

      <div className="text-[13px] text-text2 font-light whitespace-nowrap">
        <strong className="text-text font-semibold">{items.length}</strong> z 5
      </div>

      <Link
        href={`/porovnani?ids=${items.map(i => i.id).join(',')}`}
        onClick={() => trackCompareOpen(items.length)}
        className={`bg-olive text-white border-none rounded-full px-5 py-2.5 text-[13px] font-medium cursor-pointer whitespace-nowrap transition-colors hover:bg-olive-dark ${
          items.length < 2 ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        Porovnat →
      </Link>

      <button
        onClick={clearAll}
        className="text-xs text-text3 cursor-pointer whitespace-nowrap hover:text-terra"
      >
        Vymazat
      </button>
    </div>
  )
}
