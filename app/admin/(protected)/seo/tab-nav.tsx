'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface Tab {
  key: string
  label: string
  badge?: number | string
}

export function TabNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('tab') ?? 'stav'

  return (
    <div className="border-b border-off2 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = current === tab.key
          const params = new URLSearchParams(searchParams.toString())
          if (tab.key === 'stav') params.delete('tab')
          else params.set('tab', tab.key)
          const href = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
          return (
            <Link
              key={tab.key}
              href={href}
              className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors -mb-[2px] ${
                isActive
                  ? 'text-text border-olive'
                  : 'text-text2 border-transparent hover:text-text hover:border-off2'
              }`}
            >
              {tab.label}
              {tab.badge != null && (
                <span
                  className={`ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-olive text-white' : 'bg-off text-text2'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
