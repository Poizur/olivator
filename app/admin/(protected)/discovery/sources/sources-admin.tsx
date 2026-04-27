'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Source {
  id: string
  domain: string
  slug: string
  name: string | null
  crawler_type: string
  category_url: string | null
  status: string
  source: string | null
  reasoning: string | null
  found_at: string
  last_scanned_at: string | null
  last_scan_url_count: number | null
  last_scan_error: string | null
  total_products_imported: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  enabled: { label: 'Aktivní', color: 'bg-olive-bg border-olive-border text-olive-dark' },
  disabled: { label: 'Vypnuto', color: 'bg-off border-off2 text-text2' },
  suggested: { label: 'Návrh', color: 'bg-terra-bg border-terra/30 text-terra' },
  rejected: { label: 'Zamítnuto', color: 'bg-off border-off2 text-text3' },
  failing: { label: 'Selhává', color: 'bg-red-50 border-red-200 text-red-700' },
}

export function SourcesAdmin({ initialSources }: { initialSources: Source[] }) {
  const router = useRouter()
  const [sources, setSources] = useState<Source[]>(initialSources)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function notifyError(msg: string) {
    setError(msg)
    setTimeout(() => setError(null), 6000)
  }
  function notifySuccess(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 4000)
  }

  async function refreshSources() {
    try {
      const res = await fetch('/api/admin/discovery/sources')
      const data = await res.json()
      if (data.ok) setSources(data.sources)
    } catch {
      // noop
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="bg-olive-bg border border-olive-border text-olive-dark rounded-lg px-4 py-3 mb-4 text-sm">
          ✓ {success}
        </div>
      )}

      {!showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="bg-olive text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-olive-dark mb-4"
        >
          + Přidat e-shop
        </button>
      )}

      {showAdd && (
        <AddSourceForm
          onClose={() => setShowAdd(false)}
          onAdded={(s) => {
            setSources(prev => [s, ...prev])
            setShowAdd(false)
            notifySuccess(`E-shop ${s.domain} přidán jako "${s.status}"`)
          }}
          onError={notifyError}
          onSuccess={notifySuccess}
          existingDomains={sources.map(s => s.domain.toLowerCase())}
        />
      )}

      {/* List */}
      <div className="space-y-2">
        {sources.length === 0 && (
          <div className="bg-white border border-off2 rounded-lg p-6 text-center text-text3 text-sm">
            Zatím žádný e-shop. Přidej první výše.
          </div>
        )}
        {sources.map(s => (
          <SourceRow
            key={s.id}
            source={s}
            onChanged={async () => {
              await refreshSources()
              router.refresh()
            }}
            onError={notifyError}
            onSuccess={notifySuccess}
          />
        ))}
      </div>
    </div>
  )
}

function AddSourceForm({
  onClose,
  onAdded,
  onError,
  onSuccess,
  existingDomains,
}: {
  onClose: () => void
  onAdded: (s: Source) => void
  onError: (m: string) => void
  onSuccess: (m: string) => void
  existingDomains: string[]
}) {
  const [domain, setDomain] = useState('')
  const [name, setName] = useState('')
  const [crawlerType, setCrawlerType] = useState('shoptet_sitemap')
  const [categoryUrl, setCategoryUrl] = useState('')
  const [status, setStatus] = useState('enabled')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ urls: number; error: string | null } | null>(null)
  const [saving, setSaving] = useState(false)

  // Live duplicate hint
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
  const dupHint: boolean = !!normalized && existingDomains.includes(normalized)

  async function onTest() {
    if (!domain.trim()) {
      onError('Doména je povinná')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/discovery/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          crawler_type: crawlerType,
          category_url: categoryUrl || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestResult({
        urls: data.result.urls?.length ?? 0,
        error: data.result.error ?? null,
      })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Test selhal')
    } finally {
      setTesting(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!domain.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/discovery/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          name: name || null,
          crawler_type: crawlerType,
          category_url: categoryUrl || null,
          status,
        }),
      })
      const data = await res.json()
      if (res.status === 409 && data.duplicate) {
        onError(data.message)
        setSaving(false)
        return
      }
      if (!res.ok) throw new Error(data.error)
      onAdded(data.source)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Uložení selhalo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-off2 rounded-[var(--radius-card)] p-5 mb-4 space-y-3">
      <div className="text-base font-semibold text-text mb-1">Přidat e-shop</div>

      <div>
        <Label>Doména *</Label>
        <input
          type="text"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="shop.foo.cz nebo foo.cz"
          className="w-full px-3 py-2 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
          required
        />
        {dupHint && (
          <div className="mt-1 text-[12px] text-terra bg-terra-bg border border-terra/30 rounded px-2 py-1">
            ⚠ Doména {normalized} už je v registru — zkontroluj seznam pod formulářem
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Název (volitelné)</Label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Foo Olive Oil"
            className="w-full px-3 py-2 border border-off2 rounded-lg text-sm"
          />
        </div>
        <div>
          <Label>Typ crawleru</Label>
          <select
            value={crawlerType}
            onChange={e => setCrawlerType(e.target.value)}
            className="w-full px-3 py-2 border border-off2 rounded-lg text-sm"
          >
            <option value="shoptet_sitemap">Shoptet (sitemap.xml)</option>
            <option value="shoptet_category">Shoptet (kategorie)</option>
            <option value="custom">Vlastní (TBD)</option>
          </select>
        </div>
      </div>

      {crawlerType === 'shoptet_category' && (
        <div>
          <Label>URL kategorie olivových olejů</Label>
          <input
            type="text"
            value={categoryUrl}
            onChange={e => setCategoryUrl(e.target.value)}
            placeholder="https://foo.cz/kategorie/olivovy-olej/"
            className="w-full px-3 py-2 border border-off2 rounded-lg text-sm font-mono"
          />
        </div>
      )}

      <div>
        <Label>Status po vytvoření</Label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-off2 rounded-lg text-sm"
        >
          <option value="enabled">Aktivní (Discovery ho prochází)</option>
          <option value="suggested">Návrh (čeká, neprochází)</option>
          <option value="disabled">Vypnuto</option>
        </select>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`text-[12px] rounded-lg px-3 py-2 ${
          testResult.error
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-olive-bg border border-olive-border text-olive-dark'
        }`}>
          {testResult.error
            ? `❌ ${testResult.error}`
            : `✓ Nalezeno ${testResult.urls} olejů`
          }
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-off">
        <button
          type="button"
          onClick={onTest}
          disabled={testing || !domain.trim()}
          className="bg-off border border-off2 text-text rounded-full px-4 py-1.5 text-[12px] font-medium hover:bg-off2 disabled:opacity-40"
        >
          {testing ? '🧪 Testuji...' : '🧪 Otestovat crawler'}
        </button>
        <button
          type="submit"
          disabled={saving || !domain.trim() || dupHint}
          className="bg-olive text-white rounded-full px-4 py-1.5 text-[12px] font-medium hover:bg-olive-dark disabled:opacity-40"
        >
          {saving ? '...' : '💾 Uložit'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-text3 hover:text-text text-[12px] px-2"
        >
          Zrušit
        </button>
      </div>
    </form>
  )
}

function SourceRow({
  source: s,
  onChanged,
  onError,
  onSuccess,
}: {
  source: Source
  onChanged: () => void
  onError: (m: string) => void
  onSuccess: (m: string) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const status = STATUS_LABELS[s.status] ?? STATUS_LABELS.suggested

  async function patch(action: string, payload: Record<string, unknown>) {
    setBusy(action)
    try {
      const res = await fetch(`/api/admin/discovery/sources/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      onSuccess(`Aktualizováno: ${s.domain}`)
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function deleteSource() {
    if (!confirm(`Smazat ${s.domain} z registru? Discovery už ho nebude procházet.`)) return
    setBusy('delete')
    try {
      const res = await fetch(`/api/admin/discovery/sources/${s.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      onSuccess(`Smazáno: ${s.domain}`)
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function bulkImport() {
    if (!confirm(`Spustit bulk import na ${s.domain}? Discovery najde a publikuje všechny olive oily. Trvá 5-15 min.`)) return
    setBusy('import')
    try {
      const res = await fetch(`/api/admin/discovery/sources/${s.id}/import`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSuccess(`Bulk import dokončen: ${data.newCandidates ?? 0} kandidátů, ${data.autoPublished ?? 0} publikováno`)
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function testCrawler() {
    setBusy('test')
    try {
      const res = await fetch('/api/admin/discovery/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: s.domain,
          crawler_type: s.crawler_type,
          category_url: s.category_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const result = data.result
      if (result.error) {
        onError(`${s.domain}: ${result.error}`)
      } else {
        onSuccess(`${s.domain}: ✓ Nalezeno ${result.urls?.length ?? 0} olejů`)
      }
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Test selhal')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-white border border-off2 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://${s.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] font-medium text-text hover:text-olive truncate"
            >
              {s.name ?? s.domain}
            </a>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${status.color}`}>
              {status.label}
            </span>
            <span className="text-[11px] text-text3">{s.domain}</span>
          </div>
          <div className="text-[11px] text-text3 mt-1 flex items-center gap-2 flex-wrap">
            <code className="bg-off px-1.5 py-0.5 rounded">{s.crawler_type}</code>
            {s.last_scan_url_count != null && (
              <span>· naposled <strong>{s.last_scan_url_count}</strong> URL</span>
            )}
            {s.total_products_imported > 0 && (
              <span>· importováno <strong>{s.total_products_imported}</strong></span>
            )}
            {s.source && <span>· zdroj: {s.source}</span>}
          </div>
          {s.reasoning && (
            <div className="text-[12px] text-text2 italic mt-1">{s.reasoning}</div>
          )}
          {s.last_scan_error && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mt-1">
              ⚠ {s.last_scan_error}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          {s.status !== 'enabled' && (
            <button
              type="button"
              onClick={() => patch('enable', { status: 'enabled' })}
              disabled={busy !== null}
              className="bg-olive text-white rounded-full px-3 py-1 text-[11px] font-medium hover:bg-olive-dark disabled:opacity-40"
            >
              {busy === 'enable' ? '...' : '✓ Aktivovat'}
            </button>
          )}
          {s.status === 'enabled' && (
            <>
              <button
                type="button"
                onClick={testCrawler}
                disabled={busy !== null}
                className="bg-off border border-off2 text-text rounded-full px-3 py-1 text-[11px] font-medium hover:border-olive-light disabled:opacity-40"
              >
                {busy === 'test' ? '🧪...' : '🧪 Test'}
              </button>
              <button
                type="button"
                onClick={bulkImport}
                disabled={busy !== null}
                className="bg-terra text-white rounded-full px-3 py-1 text-[11px] font-medium hover:opacity-90 disabled:opacity-40"
              >
                {busy === 'import' ? '⏳ Importuji...' : '🚀 Bulk import'}
              </button>
              <button
                type="button"
                onClick={() => patch('disable', { status: 'disabled' })}
                disabled={busy !== null}
                className="text-text2 hover:text-terra text-[11px] px-2 py-1"
              >
                Vypnout
              </button>
            </>
          )}
          <button
            type="button"
            onClick={deleteSource}
            disabled={busy !== null}
            className="text-text3 hover:text-red-600 text-[11px] px-2 py-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-wider text-text3 mb-1">{children}</div>
}
