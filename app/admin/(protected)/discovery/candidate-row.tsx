'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Candidate {
  id: string
  source_url: string
  source_domain: string
  scraped_at: string | null
  matched_product_id: string | null
  match_type: string | null
  match_confidence: number | null
  candidate_data: Record<string, unknown>
  status: string
  reasoning: string | null
  resulting_product_id: string | null
  resulting_offer_id: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Čeká', color: 'bg-zinc-800/40 border-zinc-800 text-zinc-400' },
  needs_review: { label: 'Ke schválení', color: 'bg-amber-500/100/10 border-terra/30 text-amber-400' },
  auto_published: { label: 'Auto-publikováno', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  auto_added_offer: { label: 'Nový offer', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  approved: { label: 'Schváleno', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  rejected: { label: 'Zamítnuto', color: 'bg-zinc-800/40 border-zinc-800 text-zinc-500' },
  failed: { label: 'Selhalo', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
}

export function CandidateRow({ candidate }: { candidate: Candidate }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const data = candidate.candidate_data
  const name = (data.name as string) ?? '—'
  const price = data.price as number | null
  const ean = data.ean as string | null
  const imageUrl = data.imageUrl as string | null
  const volumeMl = data.volumeMl as number | null
  const status = STATUS_LABELS[candidate.status] ?? STATUS_LABELS.pending

  async function approve() {
    if (!confirm(`Schválit a publikovat: "${name}"?`)) return
    setBusy('approve')
    setError(null)
    try {
      const res = await fetch(`/api/admin/discovery/${candidate.id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function reject() {
    if (!confirm(`Zamítnout: "${name}"? Příště se nezobrazí.`)) return
    setBusy('reject')
    setError(null)
    try {
      const res = await fetch(`/api/admin/discovery/${candidate.id}/reject`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-start gap-3">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="w-16 h-16 object-contain bg-zinc-800/40 rounded shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <a
            href={candidate.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-medium text-white hover:text-olive truncate"
          >
            {name}
          </a>
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${status.color} shrink-0`}>
            {status.label}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5">
          {candidate.source_domain}
          {price && ` · ${price} Kč`}
          {volumeMl && ` · ${volumeMl} ml`}
          {ean && ` · EAN ${ean}`}
        </div>
        {candidate.reasoning && (
          <div className="text-[11px] text-zinc-400 mt-1 italic">{candidate.reasoning}</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {candidate.resulting_product_id && (
          <Link
            href={`/admin/products/${candidate.resulting_product_id}`}
            className="text-[11px] text-olive hover:text-emerald-400 px-2 py-1"
            title="Otevřít produkt"
          >
            Otevřít →
          </Link>
        )}
        {(candidate.status === 'pending' || candidate.status === 'needs_review') && (
          <>
            <button
              type="button"
              onClick={approve}
              disabled={busy !== null}
              className="bg-olive text-white rounded-full px-3 py-1 text-[11px] font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
            >
              {busy === 'approve' ? '...' : '✓ Schválit'}
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={busy !== null}
              className="text-zinc-500 hover:text-amber-400 px-2 py-1 text-[11px]"
              title="Zamítnout"
            >
              ✕
            </button>
          </>
        )}
        {candidate.status === 'failed' && (
          <>
            <button
              type="button"
              onClick={approve}
              disabled={busy !== null}
              className="bg-terra text-white rounded-full px-3 py-1 text-[11px] font-medium hover:opacity-90 disabled:opacity-40 transition-colors"
              title="Spustit pipeline znovu — pokud jsi mezitím opravil chybu, projde"
            >
              {busy === 'approve' ? '...' : '↻ Zkusit znovu'}
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={busy !== null}
              className="text-zinc-500 hover:text-amber-400 px-2 py-1 text-[11px]"
              title="Zamítnout — neukazuje se v aktivní queue, zůstane v historii"
            >
              ✕
            </button>
          </>
        )}
      </div>
      {error && (
        <span className="text-[11px] text-red-400 bg-red-500/100/10 border border-red-500/20 rounded px-2 py-1">
          ⚠ {error}
        </span>
      )}
    </div>
  )
}
