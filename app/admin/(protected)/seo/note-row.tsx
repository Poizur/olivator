'use client'

import { useState, useTransition } from 'react'
import { setNoteStatus, deleteNote } from './actions'

interface Props {
  id: string
  title: string
  body: string | null
  category: string
  relatedPhase: number | null
  status: string
  createdAt: string
  config: { label: string; emoji: string; tone: string }
}

export function NoteRow({ id, title, body, category, relatedPhase, status, createdAt, config }: Props) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function changeStatus(next: 'open' | 'done' | 'archived') {
    startTransition(async () => {
      await setNoteStatus(id, next)
    })
  }

  function remove() {
    if (!confirm('Smazat poznámku?')) return
    startTransition(async () => {
      await deleteNote(id)
    })
  }

  const isDone = status === 'done'
  const isArchived = status === 'archived'

  return (
    <div className={`bg-white border border-off2 rounded-lg overflow-hidden ${pending ? 'opacity-60' : ''} ${isDone ? 'bg-emerald-50/30' : isArchived ? 'opacity-60' : ''}`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className={`text-[10px] rounded-full px-2 py-0.5 border whitespace-nowrap ${config.tone}`}>
            {config.emoji} {config.label}
          </span>
          {relatedPhase != null && (
            <span className="text-[10px] rounded-full px-2 py-0.5 bg-off text-text2 border border-off2 whitespace-nowrap">
              F{relatedPhase}
            </span>
          )}
          <span className="text-[10px] text-text3 ml-auto whitespace-nowrap">
            {new Date(createdAt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className={`text-[14px] mt-1.5 ${isDone || isArchived ? 'text-text3 line-through' : 'text-text'}`}>
          {title}
        </div>
        {body && open && (
          <div className="text-[12px] text-text2 mt-2 leading-relaxed whitespace-pre-line border-l-2 border-off2 pl-3">
            {body}
          </div>
        )}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-text3">
          {body && (
            <button onClick={() => setOpen(!open)} className="hover:text-text2">
              {open ? 'sbalit' : 'detail'}
            </button>
          )}
          {!isDone && (
            <button
              onClick={() => changeStatus('done')}
              disabled={pending}
              className="text-emerald-700 hover:text-emerald-900"
            >
              ✓ vyřešeno
            </button>
          )}
          {isDone && (
            <button
              onClick={() => changeStatus('open')}
              disabled={pending}
              className="hover:text-text2"
            >
              ↻ obnovit
            </button>
          )}
          {!isArchived && (
            <button
              onClick={() => changeStatus('archived')}
              disabled={pending}
              className="hover:text-text2"
            >
              📦 archivovat
            </button>
          )}
          <button
            onClick={remove}
            disabled={pending}
            className="text-red-600 hover:text-red-800 ml-auto"
          >
            smazat
          </button>
        </div>
      </div>
    </div>
  )
}
