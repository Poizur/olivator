'use client'

import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'score', label: 'Co je Score' },
  { id: 'brackets', label: 'Co číslo znamená' },
  { id: 'slozky', label: '4 složky' },
  { id: 'bonus', label: 'Bonus pro funkční oleje' },
  { id: 'kalkulator', label: 'Kalkulačka' },
  { id: 'data', label: 'Odkud bereme data' },
  { id: 'veda', label: 'Vědecké základy' },
  { id: 'nezmeri', label: 'Co Score neměří' },
  { id: 'je-neni', label: 'Co máme a co nemáme' },
  { id: 'nezavislost', label: 'Kontrola nezávislosti' },
  { id: 'changelog', label: 'Changelog' },
  { id: 'oprava', label: 'Oprava dat' },
  { id: 'faq', label: 'Časté otázky' },
]

export function MetodikaToc() {
  const [active, setActive] = useState('score')

  useEffect(() => {
    const els = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="space-y-0.5" aria-label="Obsah stránky">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-text3 mb-3 px-2">
        Obsah
      </div>
      {SECTIONS.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={e => {
            e.preventDefault()
            document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className={`block px-2 py-1.5 rounded-md text-[13px] leading-snug transition-colors ${
            active === s.id
              ? 'bg-olive-bg text-olive font-medium'
              : 'text-text3 hover:text-text2'
          }`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  )
}
