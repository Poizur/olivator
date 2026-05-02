'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  draftId: string
  status: string
  currentSubject: string
  currentPreheader: string
  eligibleRecipients: number
}

export function DraftActions({
  draftId,
  status,
  currentSubject,
  currentPreheader,
  eligibleRecipients,
}: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState(currentSubject)
  const [preheader, setPreheader] = useState(currentPreheader)
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')

  const isFinalState = status === 'sent' || status === 'sending' || status === 'failed'
  const dirty = subject !== currentSubject || preheader !== currentPreheader

  function notify(ok: boolean, msg: string) {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 5000)
  }

  async function saveEdits() {
    setBusy('save')
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
      notify(
        true,
        `✅ Odesláno: ${data.totalSent}, selhalo: ${data.totalFailed}`
      )
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
    if (!confirm('Archivovat draft? Nezobrazí se v seznamu, ale data zůstávají.')) return
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
    <div className="bg-white border border-off2 rounded-2xl p-5 md:p-6 space-y-5">
      {/* Subject + preheader edit */}
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
        {dirty && !isFinalState && (
          <button
            onClick={saveEdits}
            disabled={busy !== null}
            className="text-[12px] bg-olive text-white rounded-full px-4 py-1.5 font-medium"
          >
            {busy === 'save' ? 'Ukládám…' : '💾 Uložit změny'}
          </button>
        )}
      </div>

      {/* Recipient info */}
      <div className="bg-off rounded-xl p-3 text-[12px] text-text2">
        📬 Cílové publikum: <strong className="text-text">{eligibleRecipients}</strong> aktivních
        subscriberů s odpovídající preferencí pro tento typ kampaně
      </div>

      {/* Actions */}
      {!isFinalState && (
        <div className="flex flex-wrap gap-2">
          {/* Test send */}
          <div className="flex items-center gap-1.5 bg-off rounded-full pl-3 pr-1 py-0.5">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@email.cz"
              className="bg-transparent border-none outline-none text-[12px] w-[160px]"
            />
            <button
              onClick={sendTest}
              disabled={busy !== null || !testEmail.trim()}
              className="text-[12px] bg-white border border-off2 text-text rounded-full px-3 py-1 disabled:opacity-40"
            >
              {busy === 'test' ? '⏳' : '📧'} Test
            </button>
          </div>

          {status === 'draft' && (
            <button
              onClick={approve}
              disabled={busy !== null}
              className="text-[12px] bg-white border border-olive-border text-olive-dark rounded-full px-4 py-1.5 font-medium disabled:opacity-40"
            >
              {busy === 'approve' ? 'Schvaluji…' : '✓ Schválit'}
            </button>
          )}

          <button
            onClick={sendNow}
            disabled={busy !== null || eligibleRecipients === 0}
            className="text-[12px] bg-olive text-white rounded-full px-4 py-1.5 font-medium hover:bg-olive-dark disabled:opacity-40"
          >
            {busy === 'send' ? '⏳ Odesílám…' : '⚡ Odeslat všem teď'}
          </button>

          <button
            onClick={archive}
            disabled={busy !== null}
            className="text-[12px] bg-white border border-off2 text-text3 rounded-full px-4 py-1.5 hover:text-red-600 hover:border-red-300 ml-auto"
          >
            {busy === 'archive' ? '⏳' : '🗑 Archivovat'}
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`text-[12px] px-3 py-2 rounded-lg ${
            feedback.ok
              ? 'bg-olive-bg text-olive-dark border border-olive-border'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}
    </div>
  )
}
