import type { MetadataRoute } from 'next'

// AI training crawlers byly identifikovány jako klíčový egress driver
// — každý chodí denně přes celou sitemapu (71 produktů + entity stránky)
// a stahuje plný HTML payload. Pro Olivator nepřinášejí návštěvníky
// (LLM odpovědi nezavedou na web), jen platíme egress.
//
// Block je legitimní — sitepolicy odpovídá ai.txt convention 2024+.
// Google + Bing zůstávají allow (organic search = naše hlavní akviziční kanál).
const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'CCBot',           // Common Crawl (LLM training corpora)
  'PerplexityBot',
  'Perplexity-User',
  'Bytespider',      // ByteDance / TikTok
  'Diffbot',
  'Amazonbot',
  'Applebot-Extended', // Apple AI training
  'cohere-ai',
  'FacebookBot',
  'meta-externalagent',
  'YouBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default — Google, Bing, DuckDuckGo, Yandex et al.
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/go/'],
      },
      // AI crawlers — block kompletně. Šetří egress + chrání před scrapingem
      // do training corpora bez attribuce.
      ...AI_CRAWLERS.map(ua => ({
        userAgent: ua,
        disallow: '/',
      })),
    ],
    sitemap: 'https://olivator.cz/sitemap.xml',
  }
}
