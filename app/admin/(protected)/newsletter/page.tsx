import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface SignupRow {
  id: string
  email: string
  source: string | null
  created_at: string
  confirmed: boolean
  unsubscribed: boolean
  resend_contact_id: string | null
}

async function getSignups(): Promise<SignupRow[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('newsletter_signups')
      .select('id, email, source, created_at, confirmed, unsubscribed, resend_contact_id')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return []
      throw error
    }
    return (data ?? []) as SignupRow[]
  } catch {
    return []
  }
}

export default async function NewsletterAdminPage() {
  const signups = await getSignups()
  const active = signups.filter((s) => !s.unsubscribed && s.confirmed)
  const bySource = new Map<string, number>()
  for (const s of active) {
    const src = s.source ?? 'unknown'
    bySource.set(src, (bySource.get(src) ?? 0) + 1)
  }
  const synced = signups.filter((s) => s.resend_contact_id).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-2">
          📬 Newsletter
        </h1>
        <p className="text-sm text-text3 max-w-[640px]">
          Newsletter signups z homepage hero boxu a footeru. Synchronizuji do Resend Audiences,
          pokud máš nastavený <code className="bg-off rounded px-1 text-[12px]">NEWSLETTER_AUDIENCE_ID</code>.
        </p>
      </div>

      {signups.length === 0 ? (
        <div className="bg-white border border-off2 rounded-[var(--radius-card)] p-8 text-center">
          <div className="text-2xl mb-2">📭</div>
          <div className="text-sm font-medium text-text mb-1">Zatím žádné přihlášky</div>
          <div className="text-xs text-text3 mb-4">
            Pokud nejsou ani po pár dnech, zkontroluj že migrace
            <code className="bg-off rounded px-1 mx-1 text-[12px]">20260428_newsletter_signups.sql</code>
            byla aplikována v Supabase.
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat label="Aktivní přihlášky" value={active.length} />
            <Stat label="Z homepage" value={bySource.get('homepage') ?? 0} />
            <Stat label="Z footeru" value={bySource.get('footer') ?? 0} />
            <Stat label="Synchronizováno do Resend" value={synced} />
          </div>

          <div className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-off">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text3">Email</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text3">Zdroj</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text3">Resend ID</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text3">Stav</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text3">Datum</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id} className="border-t border-off">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-text">{s.email}</td>
                    <td className="px-4 py-2.5 text-text2">{s.source ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-text3">{s.resend_contact_id ? s.resend_contact_id.slice(0, 12) + '…' : '—'}</td>
                    <td className="px-4 py-2.5">
                      {s.unsubscribed ? (
                        <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 font-medium">odhlášen</span>
                      ) : s.confirmed ? (
                        <span className="text-[10px] bg-olive-bg text-olive-dark border border-olive-border rounded-full px-2 py-0.5 font-medium">aktivní</span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">čeká</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12px] text-text3 tabular-nums">
                      {new Date(s.created_at).toLocaleDateString('cs-CZ', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-off/40 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-text3 mb-1">{label}</div>
      <div className="text-lg font-semibold text-text tabular-nums">{value}</div>
    </div>
  )
}
