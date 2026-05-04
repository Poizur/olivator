// Shared status pill — sjednocený vzhled napříč admin sekcemi (products,
// regions, brands, cultivars, retailers, articles, recipes).
//
// Před: každá list page měla vlastní StatusBadge funkci s drobnými variacemi
// (různé barvy, texty). Po: jeden komponent, konzistence + jednoduchá údržba.

import type { ReactNode } from 'react'

type Status =
  | 'active'
  | 'draft'
  | 'inactive'
  | 'excluded'
  | 'archived'
  | 'suggested'
  | 'enabled'
  | 'disabled'
  | 'rejected'
  | 'failing'
  | string  // fallback pro custom

interface Props {
  status: Status
  /** Volitelný icon prefix přebitý nad výchozí. */
  icon?: ReactNode
}

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: string }> = {
  active:   { label: 'aktivní',   classes: 'bg-olive-bg text-olive-dark', icon: '●' },
  enabled:  { label: 'zapnuto',   classes: 'bg-olive-bg text-olive-dark', icon: '●' },
  draft:    { label: 'draft',     classes: 'bg-amber-50 text-amber-700',  icon: '○' },
  inactive: { label: 'neaktivní', classes: 'bg-off text-text3',           icon: '○' },
  disabled: { label: 'vypnuto',   classes: 'bg-off text-text3',           icon: '○' },
  excluded: { label: 'vyřazený',  classes: 'bg-red-50 text-red-700',      icon: '🚫' },
  rejected: { label: 'odmítnuto', classes: 'bg-red-50 text-red-700',      icon: '✕' },
  failing:  { label: 'chyba',     classes: 'bg-red-50 text-red-700',      icon: '⚠' },
  archived: { label: 'archivováno', classes: 'bg-off text-text3',         icon: '📦' },
  suggested:{ label: 'navrženo',  classes: 'bg-amber-50 text-amber-700',  icon: '?' },
}

const FALLBACK = { label: 'neznámý', classes: 'bg-off text-text3', icon: '?' }

export function StatusBadge({ status, icon }: Props) {
  const config = STATUS_CONFIG[status] ?? FALLBACK
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex items-center gap-1 ${config.classes}`}
    >
      {icon ?? <span className="text-[9px] opacity-70">{config.icon}</span>}
      {config.label}
    </span>
  )
}
