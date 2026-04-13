import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
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
  title: {
    default: 'Olivator — Největší srovnávač olivových olejů v ČR',
    template: '%s | Olivator',
  },
  description: 'Objektivní Olivator Score, aktuální ceny ze 18 prodejců a expertní průvodce olivovými oleji.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <CompareProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
          <CompareBar />
        </CompareProvider>
      </body>
    </html>
  )
}
