// Score brackets dle SCORE_EXPLANATION_STRATEGY.md:
// 🏆 90-100  🥇 80-89  🥈 70-79  🥉 60-69  ⚪ 50-59  🔴 <50

interface ScoreBadgeProps {
  score: number | null
  type?: string | null
  /** "small" 7×7 (~28px), "medium" default, "large" pro hero. */
  size?: 'small' | 'medium' | 'large'
  className?: string
}

function bracketStyle(score: number): { background: string } {
  if (score >= 90) return { background: '#b5860d' } // 🏆 gold
  if (score >= 80) return { background: '#2d6a4f' } // 🥇 olive
  if (score >= 70) return { background: '#c4711a' } // 🥈 terra
  if (score >= 60) return { background: '#6e6e73' } // 🥉 gray
  if (score >= 50) return { background: '#9ca3af' } // ⚪ light gray
  return { background: '#dc2626' }                  // 🔴 red
}

export function ScoreBadge({ score, type, size = 'small', className = '' }: ScoreBadgeProps) {
  const sizeClasses = {
    small: 'text-[10px] w-7 h-7',
    medium: 'text-[12px] w-9 h-9',
    large: 'text-[14px] w-12 h-12',
  }[size]

  const baseClasses = `font-bold text-white rounded-full flex items-center justify-center tabular-nums ${sizeClasses} ${className}`

  if (type === 'flavored') {
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
        className={`font-bold bg-terra text-white rounded-full flex items-center justify-center tabular-nums ${sizeClasses} ${className}`}
        title="Hodnocení připravujeme — chybí lab data"
      >
        —
      </span>
    )
  }

  return (
    <span
      className={baseClasses}
      style={bracketStyle(score)}
      title={
        score >= 90 ? 'Top tier (90+)' :
        score >= 80 ? 'Vynikající (80–89)' :
        score >= 70 ? 'Velmi dobré (70–79)' :
        score >= 60 ? 'Dobré (60–69)' :
        score >= 50 ? 'Průměrné (50–59)' : 'Slabší (<50)'
      }
    >
      {score}
    </span>
  )
}
