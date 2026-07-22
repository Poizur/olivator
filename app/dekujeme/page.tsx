import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Děkujeme! Průvodce je na cestě | olivátor.cz',
  description: 'Průvodce výběrem olivového oleje byl odeslán na váš email. Mezitím prozkoumejte náš srovnávač.',
  robots: 'noindex',
}

export default function DekujemePage({
  searchParams,
}: {
  searchParams: { source?: string }
}) {
  const isLeadMagnet = searchParams.source === 'lead_magnet'

  return (
    <main style={{ minHeight: '100vh', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>

        {/* Icon */}
        <div style={{ fontSize: 56, marginBottom: 24, lineHeight: 1 }}>🫒</div>

        {/* Heading */}
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 400, color: '#1a1a1a', margin: '0 0 16px', lineHeight: 1.25 }}>
          {isLeadMagnet ? 'Email potvrzení je na cestě' : 'Děkujeme za přihlášení!'}
        </h1>

        <p style={{ fontSize: 16, color: '#3d3d3d', lineHeight: 1.7, margin: '0 0 12px' }}>
          {isLeadMagnet
            ? 'Zkontrolujte svou schránku — pošleme vám potvrzovací email. Po kliknutí na odkaz obdržíte průvodce ihned.'
            : 'Brzy se vám ozveme s prvním tipem na skvělý olivový olej.'}
        </p>

        {isLeadMagnet && (
          <p style={{ fontSize: 14, color: '#878779', lineHeight: 1.6, margin: '0 0 36px' }}>
            Email nenašli? Zkontrolujte složku Spam nebo Hromadná pošta.
          </p>
        )}

        {!isLeadMagnet && (
          <div style={{ height: 36 }} />
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e8e8ed', margin: '0 0 32px' }} />

        {/* CTAs */}
        <p style={{ fontSize: 14, color: '#878779', margin: '0 0 18px' }}>Mezitím prozkoumejte:</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <Link
            href="/srovnavac"
            style={{ display: 'inline-block', background: '#2d6a4f', color: '#fff', textDecoration: 'none', padding: '12px 22px', borderRadius: 6, fontSize: 14, fontWeight: 600 }}
          >
            Srovnávač olejů →
          </Link>
          <Link
            href="/zebricek"
            style={{ display: 'inline-block', background: 'transparent', color: '#2d6a4f', textDecoration: 'none', padding: '12px 22px', borderRadius: 6, fontSize: 14, fontWeight: 600, border: '1.5px solid #c8ddcf' }}
          >
            Žebříčky
          </Link>
          <Link
            href="/pruvodce"
            style={{ display: 'inline-block', background: 'transparent', color: '#2d6a4f', textDecoration: 'none', padding: '12px 22px', borderRadius: 6, fontSize: 14, fontWeight: 600, border: '1.5px solid #c8ddcf' }}
          >
            Průvodce
          </Link>
        </div>

        {/* Footer trust */}
        <p style={{ marginTop: 40, fontSize: 12, color: '#aeaeb2' }}>
          olivátor.cz · Nezávislé hodnocení · Žádná reklama
        </p>
      </div>
    </main>
  )
}
