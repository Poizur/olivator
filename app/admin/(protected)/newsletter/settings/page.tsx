// Newsletter automation settings — toggle automatizací + threshold + schedule.

import Link from 'next/link'
import { getAllSettings } from '@/lib/settings'
import { SettingsForm } from './settings-form'

export const dynamic = 'force-dynamic'

export default async function NewsletterSettingsPage() {
  const settings = await getAllSettings()

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="text-xs text-text3 mb-4">
        <Link href="/admin/newsletter" className="text-olive">Newsletter</Link>
        {' › '}Automatizace
      </div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text leading-tight">
          Automatizace
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          Zapni nebo vypni jednotlivé typy kampaní. Změny platí okamžitě (žádný restart, žádný deploy).
        </p>
      </div>

      <SettingsForm initial={settings} />
    </div>
  )
}
