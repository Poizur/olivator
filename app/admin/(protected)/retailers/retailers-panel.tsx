'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Retailer } from '@/lib/types'
import type { DiscoveryProposal } from '@/lib/data'

type LegalizationStatus = 'email_sent' | 'consented_free' | 'consented_affiliate' | 'declined' | 'no_response'

const LEGAL_STATUS_LABELS: Record<LegalizationStatus, string> = {
  email_sent: '📧 Email odeslán',
  consented_free: '✓ Souhlas (zdarma)',
  consented_affiliate: '✓ Souhlas (affiliate)',
  declined: '✗ Odmítl',
  no_response: '⏳ Bez odpovědi',
}

const LEGAL_STATUS_COLORS: Record<LegalizationStatus, string> = {
  email_sent: 'bg-blue-50 text-blue-700 border-blue-200',
  consented_free: 'bg-olive-bg text-olive-dark border-olive-border',
  consented_affiliate: 'bg-olive-bg text-olive-dark border-olive-border',
  declined: 'bg-red-50 text-red-600 border-red-200',
  no_response: 'bg-gray-50 text-gray-500 border-gray-200',
}

interface Props {
  active: Retailer[]
  quarantine: Retailer[]
  removedLegal: Retailer[]
  offerCounts: Record<string, number>
  proposals: DiscoveryProposal[]
}

function LegalizationCell({ r }: { r: Retailer }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const current = r.legalizationStatus as LegalizationStatus | null

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as LegalizationStatus | ''
    setSaving(true)
    try {
      await fetch(`/api/admin/retailers/${r.id}/legalization-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value || null }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <select
        value={current ?? ''}
        onChange={handleChange}
        disabled={saving}
        className={[
          'text-[11px] rounded-full border px-2.5 py-1 font-medium transition-colors cursor-pointer appearance-none',
          'focus:outline-none focus:ring-1 focus:ring-olive/40',
          saving ? 'opacity-50 cursor-wait' : '',
          current ? LEGAL_STATUS_COLORS[current] : 'bg-gray-50 text-gray-400 border-gray-200',
        ].join(' ')}
      >
        <option value="">— kampaň —</option>
        {(Object.keys(LEGAL_STATUS_LABELS) as LegalizationStatus[]).map(s => (
          <option key={s} value={s}>{LEGAL_STATUS_LABELS[s]}</option>
        ))}
      </select>
      {r.legalizationStatusAt && (
        <div className="text-[10px] text-text3 tabular-nums pl-1">
          {new Date(r.legalizationStatusAt).toLocaleDateString('cs')}
        </div>
      )}
    </div>
  )
}

function RetailerRow({
  r,
  offerCount,
  onToggle,
  showLegal,
}: {
  r: Retailer
  offerCount: number
  onToggle?: (retailer: Retailer) => void
  showLegal?: boolean
}) {
  const status = r.retailerStatus ?? 'active'
  return (
    <tr className="border-t border-off2 hover:bg-off/60">
      <td className="px-4 py-3 text-sm font-medium text-text">
        <div>{r.name}</div>
        {r.domain && <div className="text-[11px] text-text3">{r.domain}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-text2 hidden md:table-cell">{r.affiliateNetwork || '—'}</td>
      <td className="px-4 py-3 text-sm text-text text-right tabular-nums hidden md:table-cell">
        {r.defaultCommissionPct > 0 ? `${r.defaultCommissionPct}%` : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        {r.affiliateNetwork ? (
          <span className="text-[11px] bg-olive-bg text-olive-dark px-2 py-0.5 rounded-full font-medium">{r.affiliateNetwork}</span>
        ) : (
          <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">⚠</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-text text-right tabular-nums">{offerCount}</td>
      {showLegal && (
        <td className="px-4 py-3">
          <LegalizationCell r={r} />
        </td>
      )}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {status !== 'removed_legal' && onToggle && (
            <button
              type="button"
              onClick={() => onToggle(r)}
              className={[
                'text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors',
                status === 'active'
                  ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                  : 'border-olive-border text-olive-dark hover:bg-olive-bg',
              ].join(' ')}
            >
              {status === 'active' ? '→ Karanténa' : '→ Aktivovat'}
            </button>
          )}
          <Link href={`/admin/retailers/${r.id}`} className="text-[12px] text-olive hover:text-olive-dark">
            Upravit →
          </Link>
        </div>
      </td>
    </tr>
  )
}

function Section({
  title,
  badge,
  badgeColor,
  retailers,
  offerCounts,
  onToggle,
  footer,
  showLegal,
}: {
  title: string
  badge: string
  badgeColor: string
  retailers: Retailer[]
  offerCounts: Record<string, number>
  onToggle?: (retailer: Retailer) => void
  footer?: React.ReactNode
  showLegal?: boolean
}) {
  if (retailers.length === 0 && !footer) return null
  const colSpan = showLegal ? 7 : 6
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[13px] font-semibold text-text">{title}</h2>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
      </div>
      <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-off">
            <tr>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-text3">Jméno</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-text3 hidden md:table-cell">Síť</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-text3 hidden md:table-cell">Komise</th>
              <th className="text-center px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-text3">Affiliate</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-text3">Nabídek</th>
              {showLegal && (
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-text3">Kampaň</th>
              )}
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {retailers.map(r => (
              <RetailerRow
                key={r.id}
                r={r}
                offerCount={offerCounts[r.id] ?? 0}
                onToggle={onToggle}
                showLegal={showLegal}
              />
            ))}
            {retailers.length === 0 && (
              <tr><td colSpan={colSpan} className="px-4 py-6 text-center text-[13px] text-text3">Žádní prodejci</td></tr>
            )}
          </tbody>
        </table>
        {footer && <div className="border-t border-off2 px-4 py-3 text-[12px] text-text3 bg-off/60">{footer}</div>}
      </div>
    </div>
  )
}

function ProposalsSection({ proposals, onUpdateProposal }: { proposals: DiscoveryProposal[]; onUpdateProposal: (id: string, status: 'contacted' | 'ignored') => void }) {
  if (proposals.length === 0) return null
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[13px] font-semibold text-text">Návrhy discovery</h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">{proposals.length} čekají</span>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-card)] overflow-hidden">
        <div className="px-4 py-3 text-[12px] text-amber-800 border-b border-amber-200">
          Discovery navrhuje tyto shopy k oslovení. <strong>Žádný se nepřidá automaticky.</strong> Přidání jde výhradně přes &quot;+ Nový prodejce&quot; s povinným právním základem.
        </div>
        <table className="w-full">
          <thead className="bg-amber-100/60">
            <tr>
              <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase text-amber-800">Shop</th>
              <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase text-amber-800">Produktů</th>
              <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase text-amber-800">Datum</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {proposals.map(p => (
              <tr key={p.id} className="border-t border-amber-200 hover:bg-amber-50">
                <td className="px-4 py-3">
                  <div className="text-[13px] font-medium text-text">{p.shopName ?? p.domain ?? p.shopUrl}</div>
                  <div className="text-[11px] text-text3">{p.shopUrl}</div>
                </td>
                <td className="px-4 py-3 text-right text-[13px] text-text2 tabular-nums">
                  {p.productCountEstimate ?? '—'}
                </td>
                <td className="px-4 py-3 text-right text-[11px] text-text3">
                  {new Date(p.createdAt).toLocaleDateString('cs')}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateProposal(p.id, 'contacted')}
                      className="text-[11px] px-2 py-1 rounded-full border border-olive-border text-olive-dark hover:bg-olive-bg transition-colors"
                    >
                      Osloven →
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateProposal(p.id, 'ignored')}
                      className="text-[11px] px-2 py-1 rounded-full border border-off2 text-text3 hover:bg-off transition-colors"
                    >
                      Ignorovat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface ConfirmState {
  retailer: Retailer
  targetStatus: 'active' | 'quarantine'
}

export function RetailersPanel({ active, quarantine, removedLegal, offerCounts, proposals: initialProposals }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [proposals, setProposals] = useState(initialProposals)
  const [error, setError] = useState<string | null>(null)

  async function executeToggle(retailer: Retailer, targetStatus: 'active' | 'quarantine') {
    setError(null)
    setConfirm(null)
    try {
      const res = await fetch(`/api/admin/retailers/${retailer.id}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Chyba'); return }
      startTransition(() => router.refresh())
    } catch {
      setError('Síťová chyba')
    }
  }

  function handleToggle(retailer: Retailer) {
    const targetStatus = (retailer.retailerStatus ?? 'active') === 'active' ? 'quarantine' : 'active'
    const offersAffected = offerCounts[retailer.id] ?? 0
    if (targetStatus === 'quarantine' && offersAffected > 0) {
      setConfirm({ retailer, targetStatus })
    } else {
      executeToggle(retailer, targetStatus)
    }
  }

  async function handleUpdateProposal(id: string, status: 'contacted' | 'ignored') {
    const res = await fetch(`/api/admin/discovery-proposals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setProposals(prev => prev.filter(p => p.id !== id))
    }
  }

  const pendingProposals = proposals.filter(p => p.status === 'pending')

  return (
    <div className={isPending ? 'opacity-70 pointer-events-none' : ''}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">⚠ {error}</div>
      )}

      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-text text-[17px] mb-2">Přesunout do karantény?</h3>
            <p className="text-[13px] text-text2 mb-4">
              <strong>{confirm.retailer.name}</strong> má{' '}
              <strong>{offerCounts[confirm.retailer.id] ?? 0} nabídek</strong> — ty přestanou
              být viditelné na webu. Aktivní produkty tím nezměníme.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 text-[13px] text-text2 border border-off2 rounded-full hover:bg-off transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={() => executeToggle(confirm.retailer, confirm.targetStatus)}
                className="px-4 py-2 text-[13px] font-semibold bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors"
              >
                Přesunout
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingProposals.length > 0 && (
        <ProposalsSection proposals={pendingProposals} onUpdateProposal={handleUpdateProposal} />
      )}

      <Section
        title="Aktivní partneři"
        badge={`${active.length} aktivních`}
        badgeColor="bg-olive-bg text-olive-dark"
        retailers={active}
        offerCounts={offerCounts}
        onToggle={handleToggle}
      />

      <Section
        title="Karanténa"
        badge={`${quarantine.length} v karanténě`}
        badgeColor="bg-amber-50 text-amber-700 border border-amber-200"
        retailers={quarantine}
        offerCounts={offerCounts}
        onToggle={handleToggle}
        showLegal
        footer={
          <>
            Partneři dočasně pozastaveni — bez aktivních nabídek. Pro reaktivaci klikni → Aktivovat po obdržení souhlasu.{' '}
            Sloupec <em>Kampaň</em> sleduje stav legalizační komunikace.
          </>
        }
      />

      {removedLegal.length > 0 && (
        <Section
          title="Odstraněni (právní)"
          badge={`${removedLegal.length} odstraněn`}
          badgeColor="bg-red-50 text-red-500 border border-red-200"
          retailers={removedLegal}
          offerCounts={offerCounts}
          footer={<>Trvalé odstranění na žádost provozovatele — bez nabídek, vyloučeni z discovery. Reaktivace jen ručně v DB.</>}
        />
      )}
    </div>
  )
}
