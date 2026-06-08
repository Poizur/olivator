'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  draftId: string
  status: string
  currentSubject: string
  currentPreheader: string
  currentHtmlBody: string
  currentTextBody: string
  eligibleRecipients: number
  defaultTestEmail?: string
}

interface ExtractedLink {
  url: string
  text: string
  type: 'affiliate' | 'internal' | 'external' | 'unsub'
}

function extractLinks(html: string): ExtractedLink[] {
  const seen = new Set<string>()
  const results: ExtractedLink[] = []
  const hrefRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = hrefRe.exec(html)) !== null) {
    const url = m[1].trim()
    const rawText = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (!url || url.startsWith('#') || seen.has(url)) continue
    seen.add(url)
    const type: ExtractedLink['type'] = url.includes('/go/')
      ? 'affiliate'
      : url.includes('unsubscribe') || url.includes('unsub')
      ? 'unsub'
      : url.startsWith('https://olivator.cz') || url.startsWith('/')
      ? 'internal'
      : 'external'
    results.push({ url, text: rawText || url.slice(0, 60), type })
  }
  return results
}

const TYPE_LABEL: Record<ExtractedLink['type'], string> = {
  affiliate: '💰 affiliate',
  internal: '🔗 interní',
  external: '🌐 externí',
  unsub: '🚫 unsub',
}

export function DraftActions({
  draftId,
  status,
  currentSubject,
  currentPreheader,
  currentHtmlBody,
  currentTextBody,
  eligibleRecipients,
  defaultTestEmail = '',
}: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState(currentSubject)
  const [preheader, setPreheader] = useState(currentPreheader)
  const [htmlBody, setHtmlBody] = useState(currentHtmlBody)
  const [textBody, setTextBody] = useState(currentTextBody)
  const [showHtmlEditor, setShowHtmlEditor] = useState(false)
  const [showLinkChecker, setShowLinkChecker] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testEmail, setTestEmail] = useState(defaultTestEmail)

  const isFinalState = status === 'sent' || status === 'sending' || status === 'failed'
  const metaDirty = subject !== currentSubject || preheader !== currentPreheader
  const htmlDirty = htmlBody !== currentHtmlBody || textBody !== currentTextBody

  const links = useMemo(() => extractLinks(htmlBody), [htmlBody])

  function notify(ok: boolean, msg: string) {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 5000)
  }

  async function saveMeta() {
    setBusy('saveMeta')
    try {
      const res = await fetch(`/api/admin/newsletter/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, preheader }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      notify(true, '✅ Uloženo')
      router.refresh()
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function saveHtml() {
    setBusy('saveHtml')
    try {
      const res = await fetch(`/api/admin/newsletter/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_body: htmlBody, text_body: textBody }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      notify(true, '✅ HTML uloženo')
      router.refresh()
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function approve() {
    setBusy('approve')
    try {
      const res = await fetch(`/api/admin/newsletter/drafts/${draftId}/approve`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      notify(true, '✅ Schváleno — odešle se v dalším cron běhu (čtvrtek 8:00) nebo ručně níže')
      router.refresh()
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function sendNow() {
    if (!confirm(`Odeslat všem ${eligibleRecipients} subscriberům? Tohle nelze vrátit.`)) return
    setBusy('send')
    try {
      const res = await fetch(`/api/admin/newsletter/drafts/${draftId}/send`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      notify(true, `✅ Odesláno: ${data.totalSent}, selhalo: ${data.totalFailed}`)
      router.refresh()
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function sendTest() {
    if (!testEmail.trim()) {
      notify(false, 'Zadej email pro test')
      return
    }
    setBusy('test')
    try {
      const res = await fetch(`/api/admin/newsletter/drafts/${draftId}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      notify(true, `📧 Test odeslán na ${data.target}`)
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
    } finally {
      setBusy(null)
    }
  }

  async function archive() {
    const isHardDelete = ['draft', 'approved', 'failed', 'archived'].includes(status)
    const msg = isHardDelete
      ? 'Smazat draft natvrdo? Nelze vrátit.'
      : 'Archivovat odeslanou kampaň? Stats zůstanou v historii.'
    if (!confirm(msg)) return
    setBusy('archive')
    try {
      const res = await fetch(`/api/admin/newsletter/drafts/${draftId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.push('/admin/newsletter/drafts')
    } catch (err) {
      notify(false, err instanceof Error ? err.message : 'Chyba')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Metadata (subject + preheader) ── */}
      <div className="bg-white border border-off2 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="text-[11px] font-bold tracking-widest uppercase text-text3">Předmět a preheader</div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider mb-1.5">
              Subject (max 100 znaků)
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isFinalState}
              maxLength={100}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-olive disabled:opacity-60"
            />
            <div className="text-[10px] text-text3 mt-0.5">{subject.length}/100</div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider mb-1.5">
              Preheader (zobrazí se v inboxu vedle subject — max 200)
            </label>
            <input
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              disabled={isFinalState}
              maxLength={200}
              className="w-full border border-off2 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-olive disabled:opacity-60"
            />
            <div className="text-[10px] text-text3 mt-0.5">{preheader.length}/200</div>
          </div>
          {metaDirty && !isFinalState && (
            <button
              onClick={saveMeta}
              disabled={busy !== null}
              className="text-[12px] bg-olive text-white rounded-full px-4 py-1.5 font-medium disabled:opacity-40"
            >
              {busy === 'saveMeta' ? 'Ukládám…' : '💾 Uložit'}
            </button>
          )}
        </div>
      </div>

      {/* ── HTML editor ── */}
      <div className="bg-white border border-off2 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowHtmlEditor((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-text3">
              ✏️ Upravit obsah emailu (HTML)
            </span>
            {htmlDirty && <span className="ml-2 text-[10px] text-amber-600 font-medium">● neuloženo</span>}
          </div>
          <span className="text-text3 text-[12px]">{showHtmlEditor ? '▲ Skrýt' : '▼ Rozbalit'}</span>
        </button>

        {showHtmlEditor && (
          <div className="border-t border-off2 p-5 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Textarea */}
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider">
                  HTML tělo
                </label>
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  disabled={isFinalState}
                  rows={30}
                  className="w-full font-mono text-[11px] border border-off2 rounded-xl p-3 focus:outline-none focus:border-olive resize-y disabled:opacity-60"
                  spellCheck={false}
                />
                <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider mt-3">
                  Plain text (fallback)
                </label>
                <textarea
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  disabled={isFinalState}
                  rows={8}
                  className="w-full font-mono text-[11px] border border-off2 rounded-xl p-3 focus:outline-none focus:border-olive resize-y disabled:opacity-60"
                  spellCheck={false}
                />
                {!isFinalState && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveHtml}
                      disabled={busy !== null || !htmlDirty}
                      className="text-[12px] bg-olive text-white rounded-full px-4 py-1.5 font-medium disabled:opacity-40"
                    >
                      {busy === 'saveHtml' ? 'Ukládám…' : '💾 Uložit HTML'}
                    </button>
                    <button
                      onClick={() => { setHtmlBody(currentHtmlBody); setTextBody(currentTextBody) }}
                      disabled={busy !== null || !htmlDirty}
                      className="text-[12px] bg-white border border-off2 text-text3 rounded-full px-4 py-1.5 disabled:opacity-40"
                    >
                      Zahodit změny
                    </button>
                  </div>
                )}
              </div>

              {/* Live preview */}
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider">
                  Live preview
                </label>
                <iframe
                  srcDoc={htmlBody}
                  title="HTML preview"
                  className="w-full bg-white rounded-xl border border-off2"
                  style={{ minHeight: '700px' }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Link checker ── */}
      <div className="bg-white border border-off2 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowLinkChecker((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-[11px] font-bold tracking-widest uppercase text-text3">
            🔗 Ověření odkazů ({links.length})
          </span>
          <span className="text-text3 text-[12px]">{showLinkChecker ? '▲ Skrýt' : '▼ Rozbalit'}</span>
        </button>

        {showLinkChecker && (
          <div className="border-t border-off2 p-5">
            {links.length === 0 ? (
              <p className="text-[12px] text-text3">Žádné odkazy nenalezeny.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] text-text3 mb-3">
                  Klikni na každý odkaz a ověř že funguje. Affiliate linky jdou přes <code>/go/</code> — ověř i cílový shop.
                </p>
                {links.map((link, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] py-1 border-b border-off last:border-0">
                    <span className="text-[10px] text-text3 w-5 shrink-0 pt-0.5">{i + 1}.</span>
                    <span className="shrink-0 text-[10px] bg-off rounded-full px-2 py-0.5 text-text2">
                      {TYPE_LABEL[link.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-text font-medium truncate">{link.text}</div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-olive hover:underline break-all"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Recipient info + actions ── */}
      <div className="bg-white border border-off2 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="bg-off rounded-xl p-3 text-[12px] text-text2">
          📬 Cílové publikum: <strong className="text-text">{eligibleRecipients}</strong> aktivních
          subscriberů s odpovídající preferencí pro tento typ kampaně
        </div>

        {!isFinalState && (
          <div className="space-y-3">
            {/* Test send */}
            <div>
              <label className="block text-[11px] font-medium text-text2 uppercase tracking-wider mb-1.5">
                Test send — pošle skutečný email (s uloženým obsahem)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@email.cz"
                  className="border border-off2 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-olive w-64"
                />
                <button
                  onClick={sendTest}
                  disabled={busy !== null || !testEmail.trim()}
                  className="text-[12px] bg-white border border-off2 text-text rounded-full px-4 py-2 font-medium disabled:opacity-40 hover:border-olive hover:text-olive"
                >
                  {busy === 'test' ? '⏳ Posílám…' : '📧 Odeslat test'}
                </button>
              </div>
              <p className="text-[10px] text-text3 mt-1">
                Test odešle aktuálně uložené HTML — před odesláním testu nezapomeň uložit případné změny.
              </p>
            </div>

            {/* Approve + send */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-off">
              {status === 'draft' && (
                <button
                  onClick={approve}
                  disabled={busy !== null}
                  className="text-[12px] bg-white border border-olive text-olive rounded-full px-4 py-1.5 font-medium disabled:opacity-40"
                >
                  {busy === 'approve' ? 'Schvaluji…' : '✓ Schválit (odešle čtvrtek 8:00)'}
                </button>
              )}
              <button
                onClick={sendNow}
                disabled={busy !== null || eligibleRecipients === 0}
                className="text-[12px] bg-olive text-white rounded-full px-4 py-1.5 font-medium hover:bg-olive2 disabled:opacity-40"
              >
                {busy === 'send' ? '⏳ Odesílám…' : `⚡ Odeslat všem teď (${eligibleRecipients})`}
              </button>
              <button
                onClick={archive}
                disabled={busy !== null}
                className="text-[12px] bg-white border border-off2 text-text3 rounded-full px-4 py-1.5 hover:text-red-600 hover:border-red-300 ml-auto"
              >
                {busy === 'archive'
                  ? '⏳'
                  : ['draft', 'approved', 'failed', 'archived'].includes(status)
                  ? '🗑 Smazat'
                  : '📦 Archivovat'}
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={`text-[12px] px-3 py-2 rounded-lg ${
              feedback.ok
                ? 'bg-olive4 text-olive2 border border-olive5'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {feedback.msg}
          </div>
        )}
      </div>
    </div>
  )
}
