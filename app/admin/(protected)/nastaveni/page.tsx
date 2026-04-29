import { getAllSettings, SETTINGS } from '@/lib/settings'
import { SettingsForm } from './settings-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const values = await getAllSettings()
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-1.5">— Systém</div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white mb-1">
        Nastavení
      </h1>
      <p className="text-[13px] text-zinc-400 mb-6 max-w-[640px]">
        Globální konfigurace agenta a notifikací. Změny se uloží do DB
        a propíšou se do běžícího systému okamžitě.
      </p>
      <SettingsForm
        initialValues={values as Record<string, unknown>}
        defs={SETTINGS as Record<string, { description: string }>}
      />
    </div>
  )
}
