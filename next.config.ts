import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'dyaloliwynmfnpjemzrh.supabase.co'

const nextConfig: NextConfig = {
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
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
      { protocol: 'https', hostname: 'static.openfoodfacts.org' },
      { protocol: 'https', hostname: 'world.openfoodfacts.org' },
    ],
  },
}

export default nextConfig
