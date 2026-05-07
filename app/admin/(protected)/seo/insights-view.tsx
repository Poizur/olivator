// Insights tab — strategické poznámky, výhry, překážky, otázky.
// Server component pro list, client component pro add/edit form.

import { getNotes } from '@/lib/seo-activity'
import { AddNoteForm } from './add-note-form'
import { NoteRow } from './note-row'

const CATEGORY_LABEL: Record<string, { label: string; emoji: string; tone: string }> = {
  strategy:  { label: 'Strategie',  emoji: '🎯', tone: 'text-olive-dark bg-olive-bg border-olive-border' },
  obstacle:  { label: 'Překážka',   emoji: '🚧', tone: 'text-red-700 bg-red-50 border-red-200' },
  win:       { label: 'Výhra',      emoji: '🏆', tone: 'text-amber-800 bg-amber-50 border-amber-200' },
  question:  { label: 'Otázka',     emoji: '❓', tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  idea:      { label: 'Nápad',      emoji: '💡', tone: 'text-purple-700 bg-purple-50 border-purple-200' },
  retro:     { label: 'Retrospektiva', emoji: '🔄', tone: 'text-text2 bg-off border-off2' },
}

export async function InsightsView() {
  const notes = await getNotes()

  const open = notes.filter(n => n.status === 'open')
  const done = notes.filter(n => n.status === 'done')
  const archived = notes.filter(n => n.status === 'archived')

  return (
    <div>
      {/* Add new note form */}
      <div className="bg-white border border-off2 rounded-xl p-5 mb-6">
        <div className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-3">
          Přidat insight / poznámku
        </div>
        <AddNoteForm />
      </div>

      {/* Open notes */}
      {open.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-3">
            Aktivní ({open.length})
          </div>
          <div className="space-y-2">
            {open.map((n) => (
              <NoteRow
                key={n.id}
                id={n.id}
                title={n.title}
                body={n.body}
                category={n.category}
                relatedPhase={n.related_phase}
                status={n.status}
                createdAt={n.created_at}
                config={CATEGORY_LABEL[n.category] ?? CATEGORY_LABEL.idea}
              />
            ))}
          </div>
        </div>
      )}

      {/* Done notes */}
      {done.length > 0 && (
        <details className="mb-4">
          <summary className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-3 cursor-pointer">
            Hotové ({done.length}) ▾
          </summary>
          <div className="space-y-2 mt-3">
            {done.map((n) => (
              <NoteRow
                key={n.id}
                id={n.id}
                title={n.title}
                body={n.body}
                category={n.category}
                relatedPhase={n.related_phase}
                status={n.status}
                createdAt={n.created_at}
                config={CATEGORY_LABEL[n.category] ?? CATEGORY_LABEL.idea}
              />
            ))}
          </div>
        </details>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <details className="mb-4">
          <summary className="text-[11px] font-bold tracking-widest uppercase text-text3 cursor-pointer">
            Archivované ({archived.length}) ▾
          </summary>
          <div className="space-y-2 mt-3">
            {archived.map((n) => (
              <NoteRow
                key={n.id}
                id={n.id}
                title={n.title}
                body={n.body}
                category={n.category}
                relatedPhase={n.related_phase}
                status={n.status}
                createdAt={n.created_at}
                config={CATEGORY_LABEL[n.category] ?? CATEGORY_LABEL.idea}
              />
            ))}
          </div>
        </details>
      )}

      {open.length === 0 && done.length === 0 && archived.length === 0 && (
        <div className="bg-off/30 border border-off2 rounded-xl p-10 text-center">
          <div className="text-3xl mb-3">💡</div>
          <h2 className="text-[15px] font-medium text-text mb-1">Zatím žádné insighty</h2>
          <p className="text-[12px] text-text3 max-w-[400px] mx-auto">
            Použij formulář nahoře k zápisu strategických poznámek, otázek nebo postřehů.
            Užitečné pro retro a sledování myšlenek mezi sessions.
          </p>
        </div>
      )}
    </div>
  )
}
