'use client'

import { useState, useTransition } from 'react'
import { setTaskStatus } from './actions'

type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped'

interface TaskRowProps {
  taskKey: string
  title: string
  description: string | null
  estimatedTime: string | null
  status: TaskStatus
  metric?: { label: string; value: string; tone: 'green' | 'amber' | 'red' | 'neutral' }
  notes: string | null
}

const STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  pending: 'done',
  in_progress: 'done',
  done: 'pending',
  skipped: 'pending',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '○',
  in_progress: '◐',
  done: '●',
  skipped: '⊘',
}

const TONE_CLS: Record<'green' | 'amber' | 'red' | 'neutral', string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-off text-text2 border-off2',
}

export function TaskRow({ taskKey, title, description, estimatedTime, status, metric, notes }: TaskRowProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function toggle() {
    setError(null)
    const next = STATUS_NEXT[status]
    startTransition(async () => {
      const res = await setTaskStatus(taskKey, next)
      if (!res.ok) setError(res.error ?? 'Chyba')
    })
  }

  function setSkipped() {
    setError(null)
    startTransition(async () => {
      const res = await setTaskStatus(taskKey, status === 'skipped' ? 'pending' : 'skipped')
      if (!res.ok) setError(res.error ?? 'Chyba')
    })
  }

  function setInProgress() {
    setError(null)
    startTransition(async () => {
      const res = await setTaskStatus(taskKey, status === 'in_progress' ? 'pending' : 'in_progress')
      if (!res.ok) setError(res.error ?? 'Chyba')
    })
  }

  const isDone = status === 'done'
  const isSkipped = status === 'skipped'
  const isInProgress = status === 'in_progress'

  return (
    <div className={`px-4 py-3 ${pending ? 'opacity-60' : ''} ${isDone ? 'bg-emerald-50/30' : isInProgress ? 'bg-amber-50/30' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={toggle}
          disabled={pending}
          aria-label={isDone ? 'Označit jako nehotové' : 'Označit jako hotové'}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-[11px] transition-colors ${
            isDone
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : isInProgress
              ? 'bg-amber-100 border-amber-500 text-amber-700'
              : isSkipped
              ? 'bg-off2 border-text3 text-text3'
              : 'border-text3 hover:border-olive text-transparent hover:text-olive'
          }`}
        >
          {isDone ? '✓' : isInProgress ? '◐' : isSkipped ? '⊘' : '✓'}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[14px] ${isDone ? 'line-through text-text3' : isSkipped ? 'text-text3' : 'text-text'}`}
            >
              {title}
            </span>
            {estimatedTime && (
              <span className="text-[10px] bg-off rounded-full px-1.5 py-0.5 text-text3 whitespace-nowrap">
                {estimatedTime}
              </span>
            )}
            {metric && (
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 border whitespace-nowrap ${TONE_CLS[metric.tone]}`}>
                {metric.label}: <span className="font-semibold">{metric.value}</span>
              </span>
            )}
            {isInProgress && (
              <span className="text-[10px] bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5 font-medium">
                rozpracované
              </span>
            )}
          </div>

          {description && (
            <div className={`text-[12px] mt-1 leading-relaxed ${isDone || isSkipped ? 'text-text3' : 'text-text2'}`}>
              {description}
            </div>
          )}

          {(notes || open) && (
            <div className="mt-2">
              {notes && !open && (
                <div className="text-[11px] bg-off rounded px-2 py-1.5 text-text2">
                  📝 {notes}
                </div>
              )}
            </div>
          )}

          <div className="mt-1.5 flex items-center gap-3 text-[10px]">
            {!isDone && !isSkipped && (
              <button
                onClick={setInProgress}
                disabled={pending}
                className="text-text3 hover:text-amber-700"
              >
                {isInProgress ? '↩ pending' : '◐ rozpracovat'}
              </button>
            )}
            <button
              onClick={setSkipped}
              disabled={pending}
              className="text-text3 hover:text-text2"
            >
              {isSkipped ? '↩ obnovit' : '⊘ vyřadit'}
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="text-text3 hover:text-text2"
            >
              {open ? 'sbalit' : 'detail'}
            </button>
          </div>

          {error && <div className="text-[11px] text-red-600 mt-1">{error}</div>}
        </div>
      </div>
    </div>
  )
}
