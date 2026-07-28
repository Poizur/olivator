'use client'

import Link from 'next/link'

interface QuickChipProps {
  label: string
  href: string
  variant?: 'default' | 'featured' | 'danger'
}

export function QuickChip({ label, href, variant = 'default' }: QuickChipProps) {
  function track() {
    // Fire & forget — never blocks navigation
    navigator.sendBeacon?.('/api/track-chip', JSON.stringify({ element: label }))
  }

  return (
    <Link
      href={href}
      onClick={track}
      className={`text-[13px] font-medium whitespace-nowrap rounded-full px-3.5 py-2 transition-all shrink-0 flex items-center gap-1.5 ${
        variant === 'featured'
          ? 'bg-amber-bg text-amber-text hover:bg-amber-mid hover:text-white'
          : variant === 'danger'
          ? 'bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#A32D2D] hover:text-white'
          : 'bg-off text-text2 hover:bg-olive-bg hover:text-olive'
      }`}
    >
      {label}
    </Link>
  )
}
