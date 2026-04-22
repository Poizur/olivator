import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Playfair_Display, Inter } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { CompareProvider } from '@/lib/compare-context'
import { CompareBar } from '@/components/compare-bar'
import './globals.css'

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
})

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://olivator.cz'),
  title: {
    default: 'Olivator — Největší srovnávač olivových olejů v ČR',
    template: '%s | Olivator',
  },
  description: 'Objektivní Olivator Score, aktuální ceny ze 18 prodejců a expertní průvodce olivovými oleji.',
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: 'https://olivator.cz',
    siteName: 'Olivator',
    title: 'Olivator — Největší srovnávač olivových olejů v ČR',
    description: 'Objektivní Olivator Score, aktuální ceny ze 18 prodejců a expertní průvodce olivovými oleji.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Olivator — Největší srovnávač olivových olejů v ČR',
    description: 'Objektivní Olivator Score, aktuální ceny ze 18 prodejců a expertní průvodce olivovými oleji.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://olivator.cz',
  },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const gaId = process.env.NEXT_PUBLIC_GA4_ID
  return (
    <html lang="cs" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <CompareProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
          <CompareBar />
        </CompareProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  )
}
