'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ManualResearchResult {
  descriptionShort: string | null
  descriptionLong: string | null
  story: string | null
  philosophy: string | null
  foundedYear: number | null
  headquarters: string | null
  familyOwned: boolean | null
  certifications: string[]
  websiteUrl: string | null
  logoUrl: string | null
  pagesScanned: string[]
  warnings: string[]
}

interface PolishedDraft {
  tldr: string | null
  descriptionShort: string | null
  descriptionLong: string | null
  story: string | null
  philosophy: string | null
  foundedYear: number | null
  headquarters: string | null
  websiteUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
  timeline: Array<{ year: number; label: string }>
}

interface UrlCandidate {
  url: string
  confidence: number
  reasoning: string
  source: 'web_search' | 'heuristic'
}

interface VerifyResult {
  verified: boolean
  confidence: number
  reason: string
}

interface AutoFillReport {
  brandSlug: string
  status: 'applied' | 'pending_review' | 'no_url' | 'rejected' | 'error'
  candidate: UrlCandidate | null
  verification: VerifyResult | null
  polished: PolishedDraft | null
  appliedFields: string[]
  logoSaved: boolean
  galleryAdded: number
  message: string
}

interface Props {
  slug: string
  brandName: string
  currentWebsiteUrl: string | null
  hasPrimaryLogo: boolean
}

type FieldKey =
  | 'tldr'
  | 'description_short'
  | 'description_long'
  | 'story'
  | 'philosophy'
  | 'founded_year'
  | 'headquarters'
  | 'website_url'
  | 'meta_title'
  | 'meta_description'

export function BrandAutoResearchPanel({ slug, brandName, currentWebsiteUrl, hasPrimaryLogo }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'auto' | 'manual'>('idle')
  const [autoStage, setAutoStage] = useState<string>('')
  const [autoReport, setAutoReport] = useState<AutoFillReport | null>(null)

  // Manual mode state
  const [manualUrl, setManualUrl] = useState(currentWebsiteUrl ?? '')
  const [manualResult, setManualResult] = useState<ManualResearchResult | null>(null)
  const [logoSavedNow, setLogoSavedNow] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState<FieldKey | 'all' | 'draft' | null>(null)
  const [applied, setApplied] = useState<Set<FieldKey>>(new Set())

  async function runAuto() {
    setBusy(true)
    setError(null)
    setAutoReport(null)
    setApplied(new Set())
    setMode('auto')
    setAutoStage('Hledám web výrobce…')
    try {
      const res = await fetch(`/api/admin/brands/${slug}/auto-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Auto-fill selhal')
      setAutoReport(data.report as AutoFillReport)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setBusy(false)
      setAutoStage('')
    }
  }

  async function runManual() {
    if (!manualUrl.trim()) {
      setError('Zadej URL výrobce — např. https://oliointini.it')
      return
    }
    setBusy(true)
    setError(null)
    setManualResult(null)
    setLogoSavedNow(false)
    setApplied(new Set())
    setMode('manual')
    try {
      const res = await fetch(`/api/admin/brands/${slug}/auto-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'manual', url: manualUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Manuální research selhal')
      setManualResult(data.result as ManualResearchResult)
      setLogoSavedNow(Boolean(data.logoSaved))
      if (data.logoSaved) router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setBusy(false)
    }
  }

  async function applyDraft() {
    if (!autoReport?.polished) return
    setApplying('draft')
    setError(null)
    try {
      const res = await fetch(`/api/admin/brands/${slug}/apply-draft`, { method: 'POST' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Apply selhal')
      setAutoReport((prev) => (prev ? { ...prev, status: 'applied', appliedFields: data.applied ?? [] } : prev))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setApplying(null)
    }
  }

  async function rejectDraft() {
    if (!confirm('Opravdu zahodit tento návrh? Můžeš poté spustit znovu nebo zadat URL ručně.')) return
    try {
      await fetch(`/api/admin/brands/${slug}/apply-draft`, { method: 'DELETE' })
      setAutoReport(null)
      setMode('idle')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    }
  }

  function buildPatch(fields: FieldKey[]): Record<string, unknown> | null {
    if (!manualResult) return null
    const patch: Record<string, unknown> = {}
    const m = manualResult
    for (const f of fields) {
      switch (f) {
        case 'description_short':
          if (m.descriptionShort) patch.description_short = m.descriptionShort
          break
        case 'description_long':
          if (m.descriptionLong) patch.description_long = m.descriptionLong
          break
        case 'story':
          if (m.story) patch.story = m.story
          break
        case 'philosophy':
          if (m.philosophy) patch.philosophy = m.philosophy
          break
        case 'founded_year':
          if (m.foundedYear) patch.founded_year = m.foundedYear
          break
        case 'headquarters':
          if (m.headquarters) patch.headquarters = m.headquarters
          break
        case 'website_url':
          if (m.websiteUrl) patch.website_url = m.websiteUrl
          break
      }
    }
    return Object.keys(patch).length > 0 ? patch : null
  }

  async function applyManualFields(fields: FieldKey[], scope: FieldKey | 'all') {
    const patch = buildPatch(fields)
    if (!patch) return
    setApplying(scope)
    setError(null)
    try {
      const res = await fetch('/api/admin/entities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'brand', slug, data: patch }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Uložení selhalo')
      setApplied((prev) => {
        const next = new Set(prev)
        for (const f of fields) next.add(f)
        return next
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setApplying(null)
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-olive-bg/40 border border-olive-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-olive-dark">
          ✨ Auto-fill ze značky
        </h3>
        <p className="text-[12px] text-olive-dark/80 mt-0.5">
          Najde web výrobce, ověří že je to opravdu <strong>{brandName}</strong>, přeloží do češtiny a uloží do DB. ~30–60 s, ~$0,05.
        </p>
      </div>

      {/* PRIMARY: Plně automatický */}
      {mode !== 'manual' && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={runAuto}
            disabled={busy}
            className="bg-olive text-white rounded-full px-5 py-2 text-[13px] font-medium hover:bg-olive2 disabled:opacity-40 transition-colors"
          >
            {busy && mode === 'auto' ? '⏳ ' + (autoStage || 'Pracuji…') : '🚀 Plně automaticky'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manual')
              setAutoReport(null)
              setError(null)
            }}
            disabled={busy}
            className="text-[12px] text-olive-dark hover:underline disabled:opacity-40"
          >
            …nebo zadat URL ručně
          </button>
        </div>
      )}

      {/* MANUAL form */}
      {mode === 'manual' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://oliointini.it"
              className="flex-1 px-3 py-2 border border-olive-border rounded-lg text-[13px] bg-white focus:outline-none focus:border-olive"
              disabled={busy}
            />
            <button
              type="button"
              onClick={runManual}
              disabled={busy || !manualUrl.trim()}
              className="bg-olive text-white rounded-full px-4 py-2 text-[12px] font-medium hover:bg-olive2 disabled:opacity-40 transition-colors shrink-0"
            >
              {busy ? 'Načítám…' : 'Spustit'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('idle')
                setManualResult(null)
                setError(null)
              }}
              disabled={busy}
              className="text-[12px] text-text2 hover:text-text disabled:opacity-40"
            >
              Zpět
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          ⚠ {error}
        </div>
      )}

      {/* AUTO REPORT */}
      {autoReport && <AutoReportView report={autoReport} hasPrimaryLogo={hasPrimaryLogo} applying={applying === 'draft'} onApply={applyDraft} onReject={rejectDraft} />}

      {/* MANUAL RESULT (per-field apply) */}
      {manualResult && (
        <ManualResultView
          result={manualResult}
          logoSavedNow={logoSavedNow}
          hasPrimaryLogo={hasPrimaryLogo}
          applied={applied}
          applying={applying}
          onApplyAll={() =>
            applyManualFields(
              [
                'description_short',
                'description_long',
                'story',
                'philosophy',
                'founded_year',
                'headquarters',
                'website_url',
              ],
              'all'
            )
          }
          onApplyField={(f) => applyManualFields([f], f)}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

function AutoReportView({
  report,
  hasPrimaryLogo,
  applying,
  onApply,
  onReject,
}: {
  report: AutoFillReport
  hasPrimaryLogo: boolean
  applying: boolean
  onApply: () => void
  onReject: () => void
}) {
  const overallConf =
    report.candidate && report.verification
      ? Math.min(report.candidate.confidence, report.verification.confidence)
      : report.candidate?.confidence ?? 0

  const statusColor: Record<AutoFillReport['status'], string> = {
    applied: 'bg-green-50 border-green-200 text-green-800',
    pending_review: 'bg-amber-50 border-amber-200 text-amber-800',
    no_url: 'bg-red-50 border-red-200 text-red-800',
    rejected: 'bg-red-50 border-red-200 text-red-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  }

  const statusLabel: Record<AutoFillReport['status'], string> = {
    applied: '✓ Aplikováno',
    pending_review: '⚠ K revizi',
    no_url: '✗ Web nenalezen',
    rejected: '✗ Cross-check nesedí',
    error: '✗ Chyba',
  }

  return (
    <div className="border-t border-olive-border pt-3 space-y-3">
      <div className={`rounded-lg px-3 py-2 text-[12px] border ${statusColor[report.status]}`}>
        <div className="font-medium">{statusLabel[report.status]}</div>
        <div className="text-[11px] mt-0.5">{report.message}</div>
      </div>

      {report.candidate && (
        <div className="text-[11px] space-y-1 bg-white rounded-lg border border-olive-border p-3">
          <div>
            <span className="text-text3">Web výrobce:</span>{' '}
            <a href={report.candidate.url} target="_blank" rel="noopener" className="text-olive border-b border-olive-border">
              {report.candidate.url}
            </a>{' '}
            <span className="text-text3">
              ({report.candidate.source === 'web_search' ? 'Claude vyhledávání' : 'heuristický odhad'}, conf{' '}
              {report.candidate.confidence})
            </span>
          </div>
          <div className="text-text2">{report.candidate.reasoning}</div>
          {report.verification && (
            <div className="pt-1 border-t border-off2 mt-1">
              <span className="text-text3">Cross-check:</span>{' '}
              <strong className={report.verification.verified ? 'text-olive' : 'text-amber-700'}>
                {report.verification.verified ? 'OK' : 'pochybný'}
              </strong>
              {' · '}
              <span className="text-text3">conf {report.verification.confidence}</span>
              <div className="text-text2 mt-0.5">{report.verification.reason}</div>
            </div>
          )}
          <div className="text-text3 pt-1 border-t border-off2 mt-1">Celková confidence: <strong>{overallConf}/100</strong></div>
        </div>
      )}

      {report.polished && (
        <div className="bg-white rounded-lg border border-olive-border p-3 space-y-2">
          <div className="text-[11px] font-medium text-olive-dark uppercase tracking-wider">Návrh draftu (CZ)</div>
          <DraftPreviewRow label="TL;DR" value={report.polished.tldr} />
          <DraftPreviewRow label="Krátký popis" value={report.polished.descriptionShort} />
          <DraftPreviewRow label="Dlouhý popis" value={report.polished.descriptionLong} preview />
          <DraftPreviewRow label="Příběh" value={report.polished.story} preview />
          <DraftPreviewRow label="Filozofie" value={report.polished.philosophy} preview />
          <DraftPreviewRow label="Rok založení" value={report.polished.foundedYear?.toString() ?? null} />
          <DraftPreviewRow label="Sídlo" value={report.polished.headquarters} />
          <DraftPreviewRow label="Web" value={report.polished.websiteUrl} />
          <DraftPreviewRow label="Meta title" value={report.polished.metaTitle} />
          <DraftPreviewRow label="Meta description" value={report.polished.metaDescription} />
          {report.polished.timeline.length > 0 && (
            <div className="text-[12px]">
              <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">Časová osa</div>
              <ul className="text-text leading-snug">
                {report.polished.timeline.map((t, i) => (
                  <li key={i}>
                    <strong>{t.year}</strong> — {t.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {report.status === 'applied' && (
        <div className="text-[11px] text-text2">
          Aplikovaná pole: <strong>{report.appliedFields.join(', ') || '(žádná)'}</strong>
          {report.logoSaved && ' · logo uloženo'}
          {!report.logoSaved && hasPrimaryLogo && ' · logo už existovalo'}
          {report.galleryAdded > 0 && ` · ${report.galleryAdded} fotek do galerie`}
        </div>
      )}

      {report.status === 'pending_review' && report.polished && (
        <div className="flex gap-2 flex-wrap pt-1">
          <button
            type="button"
            onClick={onApply}
            disabled={applying}
            className="bg-olive text-white rounded-full px-4 py-1.5 text-[12px] font-medium hover:bg-olive2 disabled:opacity-40 transition-colors"
          >
            {applying ? 'Ukládám…' : '✓ Schválit a aplikovat'}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={applying}
            className="text-[12px] text-red-700 hover:underline disabled:opacity-40"
          >
            ✗ Zahodit návrh
          </button>
        </div>
      )}
    </div>
  )
}

function DraftPreviewRow({ label, value, preview }: { label: string; value: string | null; preview?: boolean }) {
  if (!value) return null
  const display = preview && value.length > 250 ? value.slice(0, 250) + '…' : value
  return (
    <div className="text-[12px]">
      <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
      <div className="text-text whitespace-pre-wrap leading-snug">{display}</div>
    </div>
  )
}

function ManualResultView({
  result,
  logoSavedNow,
  hasPrimaryLogo,
  applied,
  applying,
  onApplyAll,
  onApplyField,
}: {
  result: ManualResearchResult
  logoSavedNow: boolean
  hasPrimaryLogo: boolean
  applied: Set<FieldKey>
  applying: FieldKey | 'all' | 'draft' | null
  onApplyAll: () => void
  onApplyField: (f: FieldKey) => void
}) {
  return (
    <div className="border-t border-olive-border pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-olive-dark">
          Načteno {result.pagesScanned.length} stránek
          {logoSavedNow && <span className="ml-2 text-olive">· logo uloženo</span>}
          {!logoSavedNow && hasPrimaryLogo && <span className="ml-2 text-text3">· logo už existuje</span>}
          {!result.logoUrl && <span className="ml-2 text-amber-700">· logo nenalezeno</span>}
        </div>
        <button
          type="button"
          onClick={onApplyAll}
          disabled={applying !== null}
          className="text-[11px] bg-olive text-white rounded-full px-3 py-1 hover:bg-olive2 disabled:opacity-40 transition-colors"
        >
          {applying === 'all' ? 'Ukládám…' : 'Použít vše ↓'}
        </button>
      </div>
      <SuggestionRow label="Krátký popis" value={result.descriptionShort} applied={applied.has('description_short')} applying={applying === 'description_short'} onApply={() => onApplyField('description_short')} />
      <SuggestionRow label="Dlouhý popis" value={result.descriptionLong} preview applied={applied.has('description_long')} applying={applying === 'description_long'} onApply={() => onApplyField('description_long')} />
      <SuggestionRow label="Příběh" value={result.story} preview applied={applied.has('story')} applying={applying === 'story'} onApply={() => onApplyField('story')} />
      <SuggestionRow label="Filozofie" value={result.philosophy} preview applied={applied.has('philosophy')} applying={applying === 'philosophy'} onApply={() => onApplyField('philosophy')} />
      <SuggestionRow label="Rok založení" value={result.foundedYear?.toString() ?? null} applied={applied.has('founded_year')} applying={applying === 'founded_year'} onApply={() => onApplyField('founded_year')} />
      <SuggestionRow label="Sídlo" value={result.headquarters} applied={applied.has('headquarters')} applying={applying === 'headquarters'} onApply={() => onApplyField('headquarters')} />
      <SuggestionRow label="Web značky" value={result.websiteUrl} applied={applied.has('website_url')} applying={applying === 'website_url'} onApply={() => onApplyField('website_url')} />
      {result.warnings.length > 0 && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          ⚠ {result.warnings.join(' · ')}
        </div>
      )}
    </div>
  )
}

function SuggestionRow({
  label,
  value,
  preview = false,
  applied,
  applying,
  onApply,
}: {
  label: string
  value: string | null
  preview?: boolean
  applied: boolean
  applying: boolean
  onApply: () => void
}) {
  const display = value ? (preview && value.length > 200 ? value.slice(0, 200) + '…' : value) : null
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-text3 mb-0.5">{label}</div>
        <div className={`leading-snug whitespace-pre-wrap ${value ? 'text-text' : 'text-text3 italic'}`}>
          {display ?? '(nenalezeno)'}
        </div>
      </div>
      {value && (
        <button
          type="button"
          onClick={onApply}
          disabled={applying || applied}
          className={`text-[11px] rounded-full px-2.5 py-0.5 shrink-0 transition-colors border ${
            applied
              ? 'text-olive-dark bg-olive-bg border-olive-border'
              : 'text-olive border-olive-border hover:bg-olive-bg disabled:opacity-40'
          }`}
        >
          {applied ? '✓ Uloženo' : applying ? '…' : 'Použít'}
        </button>
      )}
    </div>
  )
}
