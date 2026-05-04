// Shared status filter row pro admin list pages.
// Před: pro každou entitu (products, regions, brands, cultivars) byl
// duplikátní inline kód s buttony + URLSearchParams. Tady je generic.

import Link from 'next/link'

interface FilterOption {
  value: string | undefined  // undefined = "Vše"
  label: string
  count: number
}

interface Props {
  options: FilterOption[]
  /** Aktuální status z URL. undefined = "Vše". */
  active: string | undefined
  /** Base URL pro odkazy (např. '/admin/products'). */
  basePath: string
  /** Další URL params které mají přežít kliknutí (např. brand, sort). */
  preserveQuery?: Record<string, string | undefined>
}

export function StatusFilters({ options, active, basePath, preserveQuery = {} }: Props) {
  function href(value: string | undefined): string {
    const params = new URLSearchParams()
    if (value) params.set('status', value)
    for (const [key, val] of Object.entries(preserveQuery)) {
      if (val) params.set(key, val)
    }
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <div className="mb-3">
      <div className="text-[11px] font-semibold tracking-wider uppercase text-text3 mb-1.5">
        Stav
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => {
          const isActive = active === opt.value || (!active && !opt.value)
          return (
            <Link
              key={opt.label}
              href={href(opt.value)}
              className={`text-[13px] px-3 py-1.5 rounded-full transition-colors ${
                isActive
                  ? 'bg-olive text-white'
                  : 'bg-white border border-off2 text-text2 hover:border-olive3 hover:text-olive'
              }`}
            >
              {opt.label} ({opt.count})
            </Link>
          )
        })}
      </div>
    </div>
  )
}
