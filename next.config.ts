import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'dyaloliwynmfnpjemzrh.supabase.co'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // GSC 404 — slug 2026 nikdy neexistoval v DB, statický obsah má slug 2025 — 2026-07-22
      { source: '/zebricek/nejlepsi-olivovy-olej-2026', destination: '/zebricek/nejlepsi-olivovy-olej-2025', permanent: true },
      // Italská žebříčková kanibalizace — 2026-07-03
      { source: '/zebricek/nejlepsi-italsky-olej', destination: '/zebricek/nejlepsi-italsky-olivovy-olej', permanent: true },
      // Kanibalizace merge — 2026-06-01
      { source: '/pruvodce/olivovy-olej-a-zdravi-veda-2026', destination: '/pruvodce/je-olivovy-olej-zdravy',   permanent: true },
      // Sitia mis-kategorizace (T-08/T-15) — 2026-06-24
      { source: '/znacka/sitia',                 destination: '/znacka/sitia-kreta',                              permanent: true },
      // Staré/smazané URL z GSC — opraveno 2026-05-18
      { source: '/znacka/antica',               destination: '/znacka/antica-sicilia',                           permanent: true },
      { source: '/zebricek/olivovy-olej-do-200-kc', destination: '/zebricek/nejlepsi-olivovy-olej-do-200-kc',   permanent: true },
      { source: '/olej/gaea-fresh-extra-virgin', destination: '/srovnavac',                                     permanent: true },
      { source: '/olej/frantoio-franci-igp',     destination: '/srovnavac',                                     permanent: true },
      { source: '/znacka/vanocni',               destination: '/srovnavac',                                     permanent: true },
      // Motakis POSKOZEN outlet SKU (status=inactive 2026-07-23) → plech (aktivní produkt)
      { source: '/olej/motakis-kreta-extra-panensky-olivovy-olej-5-l', destination: '/olej/motakis-kreta-extra-panensky-olivovy-olej-5-l-plech', permanent: true },
    ]
  },
  images: {
    // Default 60s = boti (Google, Bing, OpenAI/Anthropic crawlers) re-fetchují
    // za minutu → každé kolo znova egress ze Supabase Storage. 30 dní (≈ 2.6M s)
    // znamená 1× transformace per image, pak Next.js Image cache servíruje
    // optimalizovaný WebP přímo z Railway. Klíčové pro Supabase free egress.
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**',
      },
      // External e-shop CDNs — fallback while admin migrates images to our storage.
      // Long-term every image should land in Supabase Storage via Gallery Manager.
      { protocol: 'https', hostname: 'cdn.myshoptet.com' },
      // shop.reckonasbavi.cz — přímé URL (ne CDN) pro starší produktové fotky
      { protocol: 'https', hostname: 'shop.reckonasbavi.cz' },
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
      { protocol: 'https', hostname: 'static.openfoodfacts.org' },
      { protocol: 'https', hostname: 'world.openfoodfacts.org' },
      // Unsplash — fallback obrázky pro produkty/articles/recipes/entity bez
      // primary image (auto-resolver + entity photo importer).
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
}

export default nextConfig
