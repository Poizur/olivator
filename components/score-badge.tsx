// Sdílený badge pro Olivator Score na produktových kartách.
// Tři stavy:
//   1) flavored type → "Aroma" badge (terra, čitelně označené že nedostává score)
//   2) score == null nebo 0 → "—" badge (data se připravují)
//   3) score 0-100 → klasický terra badge s číslem
//
// Důvod: scoring čistého EVOO škálou nemá smysl pro aromatizované oleje
// (přidaná aromata diluují parametry). UI by mělo dát uživateli jasně vědět
// že "Bartolini s lanýžem 10/100" není férové hodnocení.

interface ScoreBadgeProps {
  score: number | null
  type?: string | null
  /** "small" 7×7 (~28px), "medium" default, "large" pro hero. */
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function ScoreBadge({ score, type, size = 'small', className = '' }: ScoreBadgeProps) {
  const sizeClasses = {
    small: 'text-[10px] w-7 h-7',
    medium: 'text-[12px] w-9 h-9',
    large: 'text-[14px] w-12 h-12',
  }[size]

  const baseClasses = `font-bold bg-terra text-white rounded-full flex items-center justify-center tabular-nums ${sizeClasses} ${className}`

  if (type === 'flavored') {
    // Aroma štítek — nahrazuje skóre, sděluje "tento olej se nehodnotí EVOO škálou"
    return (
      <span
        className={`text-[9px] font-bold bg-terra text-white rounded-full px-2 py-0.5 uppercase tracking-wider ${className}`}
        title="Aromatizovaný olej — nehodnotíme EVOO škálou"
      >
        Aroma
      </span>
    )
  }

  if (score == null || score === 0) {
    return (
      <span
        className={baseClasses}
        title="Hodnocení připravujeme — chybí lab data"
      >
        —
      </span>
    )
  }

  return <span className={baseClasses}>{score}</span>
}
