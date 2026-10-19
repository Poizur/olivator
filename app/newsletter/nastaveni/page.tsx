import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { PreferencesForm } from './preferences-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Nastavení odběru | Olivátor' },
  robots: { index: false, follow: false },
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`
}

export default async function NewsletterPreferencesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  const valid = /^[a-f0-9]{32,128}$/i.test(token)
  const { data: signup } = valid
    ? await supabaseAdmin
        .from('newsletter_signups')
        .select('email, preferences, unsubscribed')
        .eq('unsubscribe_token', token)
        .maybeSingle()
    : { data: null }

  const prefs = (signup?.preferences as Record<string, boolean> | null) ?? {}
  const initial = {
    weekly: prefs.weekly ?? true,
    deals: prefs.deals ?? true,
    harvest: prefs.harvest ?? false,
    alerts: prefs.alerts ?? false,
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 md:px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-text mb-2">Nastavení odběru</h1>
      {!signup ? (
        <p className="text-[15px] text-text2">
          Odkaz je neplatný. Použijte prosím odkaz „Spravovat preference“ z posledního e-mailu, nebo nám napište na{' '}
          <a href="mailto:info@makyoutdoors.com" className="text-olive underline">info@makyoutdoors.com</a>.
        </p>
      ) : signup.unsubscribed ? (
        <p className="text-[15px] text-text2">
          Adresa {maskEmail(signup.email as string)} je odhlášená, žádné e-maily jí neposíláme.
        </p>
      ) : (
        <>
          <p className="text-[15px] text-text2 mb-6">
            Vyberte, jaké e-maily chcete dostávat na adresu {maskEmail(signup.email as string)}.
          </p>
          <PreferencesForm
            token={token}
            initial={initial}
            unsubscribeUrl={`/api/newsletter/unsubscribe?token=${token}`}
          />
        </>
      )}
    </div>
  )
}
