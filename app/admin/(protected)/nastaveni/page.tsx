import { getAllSettings, SETTINGS } from '@/lib/settings'
import { SettingsForm } from './settings-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const values = await getAllSettings()
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-2">
        Nastavení
      </h1>
      <p className="text-sm text-text3 mb-6 max-w-[640px]">
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
