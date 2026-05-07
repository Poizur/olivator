'use client'

import { useState, useTransition } from 'react'
import { applyProposal, dismissProposal } from './actions'

interface Props {
  id: string
  title: string
  reason: string | null
  severity: 'low' | 'medium' | 'high'
  targetSlug: string | null
  targetType: string
  action: Record<string, unknown>
}

export function ProposalRow({ id, title, reason, severity, targetSlug, targetType, action }: Props) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handleApply() {
    setResult(null)
    startTransition(async () => {
      const r = await applyProposal(id)
      setResult(r.ok ? `✓ ${r.note}` : `✗ ${r.note}`)
    })
  }

  function handleDismiss() {
    if (!confirm('Ignorovat tento návrh? Můžeš ho znovu vidět při příštím auditu.')) return
    startTransition(async () => {
      await dismissProposal(id)
    })
  }

  // Build target link
  const targetHref = targetSlug
    ? targetType === 'product' ? `/admin/products?search=${targetSlug}`
    : targetType === 'brand' ? `/admin/brands/${targetSlug}`
    : targetType === 'article' ? `/admin/articles/${targetSlug}`
    : targetType === 'recipe' ? `/admin/recipes/${targetSlug}`
    : null
    : null

  const actionLabel = (action.action as string | undefined) ?? 'unknown'

  return (
    <div className={`px-4 py-3 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] text-text">{title}</span>
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
              severity === 'high' ? 'bg-red-100 text-red-800' :
              severity === 'medium' ? 'bg-amber-100 text-amber-800' :
              'bg-off text-text2'
            }`}>
              {severity === 'high' ? 'kritické' : severity === 'medium' ? 'středně' : 'nízká'}
            </span>
            <span className="text-[10px] text-text3 font-mono">{actionLabel}</span>
          </div>
          {reason && (
            <div className="text-[12px] text-text2 mt-1 leading-relaxed">{reason}</div>
          )}
          {targetHref && (
            <a href={targetHref} className="inline-block mt-1 text-[11px] text-olive hover:text-olive-dark">
              Zobrazit v adminu →
            </a>
          )}
          {result && (
            <div className={`text-[11px] mt-2 ${result.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>
              {result}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleApply}
            disabled={pending}
            className={`text-[12px] bg-olive text-white hover:bg-olive2 rounded-md px-3 py-1.5 transition-colors ${pending ? 'opacity-60' : ''}`}
          >
            {pending ? '…' : '✓ Opravit'}
          </button>
          <button
            onClick={handleDismiss}
            disabled={pending}
            className="text-[12px] text-text3 hover:text-text2 px-2 py-1.5"
            title="Ignorovat — opraví se při příštím auditu znovu navržené, pokud platí"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
