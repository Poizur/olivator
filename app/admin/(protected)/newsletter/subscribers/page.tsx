// Subscribers — current list s preference filtrem.

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface SignupRow {
  id: string
  email: string
  source: string | null
  created_at: string
  confirmed: boolean
  unsubscribed: boolean
  preferences: Record<string, boolean> | null
  last_emailed_at: string | null
}

async function getSignups(): Promise<SignupRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('newsletter_signups')
      .select('id, email, source, created_at, confirmed, unsubscribed, preferences, last_emailed_at')
      .order('created_at', { ascending: false })
      .limit(500)
    return (data ?? []) as SignupRow[]
  } catch {
    return []
  }
}

const PREF_LABELS: Record<string, string> = {
  weekly: 'Týden',
  deals: 'Slevy',
  harvest: 'Sklizeň',
  alerts: 'Alerty',
}

export default async function SubscribersPage() {
  const signups = await getSignups()
  const active = signups.filter((s) => !s.unsubscribed && s.confirmed)
  const unsubbed = signups.filter((s) => s.unsubscribed)

  // Counts per preference
  const prefCounts: Record<string, number> = { weekly: 0, deals: 0, harvest: 0, alerts: 0 }
  for (const s of active) {
    for (const [k, v] of Object.entries(s.preferences ?? {})) {
      if (v && k in prefCounts) prefCounts[k]++
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin/newsletter" className="text-olive">Newsletter</Link>
        {' › '}Subscribers
      </div>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          Subscribers
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          {active.length} aktivních · {unsubbed.length} odhlášených
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(prefCounts).map(([k, v]) => (
          <div key={k} className="bg-white border border-off2 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest font-medium text-text3 mb-1">
              {PREF_LABELS[k]}
            </div>
            <div className="font-[family-name:var(--font-display)] text-2xl text-text">{v}</div>
          </div>
        ))}
      </div>

      {signups.length === 0 ? (
        <div className="bg-white border border-off2 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-[13px] text-text3">Zatím žádní subscribers.</p>
        </div>
      ) : (
        <div className="bg-white border border-off2 rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-off">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Email</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Preference</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Zdroj</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Stav</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text3">Datum</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id} className="border-t border-off2 hover:bg-off/40">
                  <td className="px-4 py-3 font-mono text-[12px] text-text">{s.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(s.preferences ?? {}).map(([k, v]) =>
                        v ? (
                          <span
                            key={k}
                            className="text-[10px] bg-olive-bg text-olive-dark border border-olive-border rounded-full px-1.5 py-0.5"
                          >
                            {PREF_LABELS[k] ?? k}
                          </span>
                        ) : null
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text2 text-[12px]">{s.source ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.unsubscribed ? (
                      <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">odhlášen</span>
                    ) : s.confirmed ? (
                      <span className="text-[10px] bg-olive-bg text-olive-dark border border-olive-border rounded-full px-2 py-0.5">aktivní</span>
                    ) : (
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">čeká</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] text-text3 tabular-nums whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString('cs-CZ', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
