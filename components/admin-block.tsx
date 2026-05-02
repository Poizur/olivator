// Sdílený wrapper pro admin sekce — vizuální blok s hlavičkou a odkazem na
// odpovídající sekci na veřejné stránce. Pomáhá adminovi pochopit kde se
// daná data objeví.
//
// Variants:
//  - 'card' (default): white card s header strip + body padding. Pro flush
//    children co nemají vlastní wrapper (entity-photos-manager, faq-editor…).
//  - 'header-only': pouze header strip nad children. Pro children co už mají
//    vlastní card wrapper (product panels, retailer form…).

import type { ReactNode } from 'react'

interface Props {
  /** Číslo bloku — odpovídá sekci na veřejné stránce (1, 2, 3…). */
  number: number
  /** Krátký nadpis bloku (např. "Stručně", "Editorial obsah"). */
  title: string
  /** Emoji ikona vedle nadpisu. */
  icon: string
  /** Volitelný popis — kde se data objeví na webu. */
  publicLocation?: string
  /** Volitelný subtitle pod hlavičkou. */
  description?: string
  /** Akční tlačítka napravo v hlavičce (např. AI generovat). */
  actions?: ReactNode
  /** Vizuální varianta. */
  variant?: 'card' | 'header-only'
  children: ReactNode
}

function Header({
  number,
  title,
  icon,
  publicLocation,
  description,
  actions,
  inline,
}: Omit<Props, 'children' | 'variant'> & { inline?: boolean }) {
  return (
    <div
      className={
        inline
          ? 'flex items-start justify-between gap-3 mb-3'
          : 'bg-off/40 border-b border-off2 px-5 py-3 flex items-start justify-between gap-3'
      }
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="bg-olive-bg text-olive-dark text-[11px] font-bold tabular-nums w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold text-text flex items-center gap-2 leading-tight">
            <span>{icon}</span>
            <span>{title}</span>
          </h2>
          {publicLocation && (
            <p className="text-[11px] text-text3 mt-0.5 leading-snug">
              <span className="text-olive">↗</span> Zobrazí se: {publicLocation}
            </p>
          )}
          {description && (
            <p className="text-[12px] text-text3 mt-1 leading-snug">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function AdminBlock({
  number,
  title,
  icon,
  publicLocation,
  description,
  actions,
  variant = 'card',
  children,
}: Props) {
  if (variant === 'header-only') {
    // Header strip nad children. Children renderují vlastní card.
    return (
      <section>
        <Header
          number={number}
          title={title}
          icon={icon}
          publicLocation={publicLocation}
          description={description}
          actions={actions}
          inline
        />
        {children}
      </section>
    )
  }

  return (
    <section className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
      <Header
        number={number}
        title={title}
        icon={icon}
        publicLocation={publicLocation}
        description={description}
        actions={actions}
      />
      <div className="p-5 md:p-6">{children}</div>
    </section>
  )
}
