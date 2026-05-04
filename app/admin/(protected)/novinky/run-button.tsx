'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminButton } from '@/components/admin/admin-button'

export function RunRadarButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    saved: number
    skipped: number
    errors: number
    msg: string
    ok: boolean
  } | null>(null)

  async function run() {
    if (!confirm('Spustit Radar teď?\n\nFetch RSS feedů, AI překlad, uložení do DB. Trvá 30-60s. Cena ~$0.005.')) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/radar/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Spuštění selhalo')
      const saved = data.itemsSaved ?? 0
      const total = data.itemsTotal ?? 0
      const skipped = (data.itemsAfterFpDedup ?? 0) - saved
      setResult({
        saved,
        skipped,
        errors: data.errors?.length ?? 0,
        ok: true,
        msg:
          saved > 0
            ? `✅ ${saved} nových zpráv uloženo (z ${total} ve feedech, ${skipped} duplikát)`
            : `Žádné nové zprávy. ${total} ve feedech, vše už známé nebo nerelevantní.`,
      })
      router.refresh()
    } catch (err) {
      setResult({
        saved: 0,
        skipped: 0,
        errors: 1,
        ok: false,
        msg: `❌ ${err instanceof Error ? err.message : 'Chyba'}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <AdminButton variant="primary" size="md" onClick={run} disabled={busy}>
        {busy ? '⏳ Skenuju RSS feedy…' : '📡 Spustit teď'}
      </AdminButton>
      {result && (
        <span className={`text-[12px] ${result.ok ? 'text-olive-dark' : 'text-red-700'}`}>
          {result.msg}
        </span>
      )}
    </div>
  )
}
