'use client'

import { useRef, useState, useEffect, useId } from 'react'
import Link from 'next/link'

interface Props {
  tip: string
  href?: string
  hrefLabel?: string
}

export function ClaimTooltip({ tip, href, hrefLabel = 'Více v metodice →' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex items-center group">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="Vysvětlení tvrzení"
        onClick={() => setOpen(v => !v)}
        className="ml-1 inline-flex items-center justify-center w-[15px] h-[15px] rounded-full border border-text3 text-text3 text-[9px] font-bold leading-none hover:border-olive hover:text-olive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive focus-visible:ring-offset-1 shrink-0 cursor-pointer"
      >
        i
      </button>

      {/* Popover — visible on hover (desktop) or toggle (mobile/keyboard) */}
      <span
        id={id}
        role="tooltip"
        className={[
          'absolute z-50 bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2',
          'w-[220px] bg-[#1d1d1f] text-white text-[11px] leading-relaxed rounded-lg px-3 py-2.5 shadow-lg',
          'pointer-events-none group-hover:pointer-events-auto',
          open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
          'group-hover:opacity-100 group-hover:translate-y-0',
          'transition-all duration-150',
          // Arrow
          "after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-[#1d1d1f]",
        ].join(' ')}
      >
        {tip}
        {href && (
          <Link
            href={href}
            className="block mt-1.5 text-olive4 hover:text-white transition-colors pointer-events-auto"
            onClick={() => setOpen(false)}
          >
            {hrefLabel}
          </Link>
        )}
      </span>
    </span>
  )
}
