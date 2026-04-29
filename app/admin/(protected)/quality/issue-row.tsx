'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface IssueWithProduct {
  id: string
  rule_id: string
  severity: string
  message: string
  status: string
  detected_at: string
  auto_fix_attempted: boolean
  auto_fix_succeeded: boolean | null
  product_id: string
  product_name: string | null
  product_slug: string | null
  rule_name: string | null
  rule_has_auto_fix: boolean
}

const SEVERITY_BADGES: Record<string, string> = {
  error: 'bg-red-100 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/100/10 text-amber-400 border-terra/30',
  info: 'bg-zinc-800/40 text-zinc-400 border-zinc-800',
}

export function IssueRow({ issue }: { issue: IssueWithProduct }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function performAction(action: 'auto_fix' | 'resolve' | 'ignore') {
    setBusy(action)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/quality/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.message) setMessage(data.message)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-start gap-3">
      <span
        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border shrink-0 mt-0.5 ${SEVERITY_BADGES[issue.severity] ?? ''}`}
      >
        {issue.severity}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-white flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/products/${issue.product_id}`}
            className="text-emerald-400 hover:underline truncate"
          >
            {issue.product_name ?? '—'}
          </Link>
          <span className="text-[11px] text-zinc-500">·</span>
          <span className="text-[11px] text-zinc-500">{issue.rule_name ?? issue.rule_id}</span>
        </div>
        <div className="text-[12px] text-zinc-400 mt-0.5">{issue.message}</div>
        {issue.auto_fix_attempted && issue.auto_fix_succeeded === false && (
          <div className="text-[11px] text-amber-400 mt-1">
            Auto-fix selhal — vyřeš ručně
          </div>
        )}
        {message && (
          <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 mt-1">
            {message}
          </div>
        )}
        {error && (
          <div className="text-[11px] text-red-400 bg-red-500/100/10 border border-red-500/20 rounded px-2 py-1 mt-1">
            ⚠ {error}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {issue.status === 'open' && issue.rule_has_auto_fix && (
          <button
            type="button"
            onClick={() => performAction('auto_fix')}
            disabled={busy !== null}
            className="bg-olive text-white rounded-full px-3 py-1 text-[11px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
          >
            {busy === 'auto_fix' ? '...' : '⚡ Opravit'}
          </button>
        )}
        {issue.status === 'open' && (
          <>
            <button
              type="button"
              onClick={() => performAction('resolve')}
              disabled={busy !== null}
              className="text-[11px] text-olive hover:text-emerald-400 px-2 py-1"
            >
              ✓ Vyřešeno
            </button>
            <button
              type="button"
              onClick={() => performAction('ignore')}
              disabled={busy !== null}
              className="text-zinc-500 hover:text-amber-400 text-[11px] px-2 py-1"
            >
              Ignorovat
            </button>
          </>
        )}
      </div>
    </div>
  )
}
