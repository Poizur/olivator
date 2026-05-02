'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  draftId: string
  status: string
  subject: string
}

const HARD_DELETE_STATUSES = ['draft', 'approved', 'failed', 'archived']

export function DeleteDraftButton({ draftId, status, subject }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const isHardDelete = HARD_DELETE_STATUSES.includes(status)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const message = isHardDelete
      ? `Smazat draft "${subject}" natvrdo?\n\nNelze vrátit. Pokud byl odeslán, smažou se i tracking data.`
      : `Archivovat odeslanou kampaň "${subject}"?\n\nZachová se historie + stats, ale nezobrazí se v hlavním listu.`
    if (!confirm(message)) return

    setBusy(true)
    try {
      const res = await fetch(`/api/admin/newsletter/drafts/${draftId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Smazání selhalo')
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Chyba')
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="text-text3 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-[14px] transition-colors disabled:opacity-40"
      title={isHardDelete ? 'Smazat natvrdo' : 'Archivovat (zachovat data)'}
    >
      {busy ? '⏳' : isHardDelete ? '🗑' : '📦'}
    </button>
  )
}
