import type { MetadataRoute } from 'next'

// Rozlišujeme dva typy AI crawlerů:
//
// AI SEARCH crawlery — indexují web PRO UŽIVATELE (ChatGPT Search, Perplexity,
// Claude search) → POVOLENI. Přinášejí provoz a citace. Blokovat = neexistujeme
// v AI vyhledávačích.
//
// AI TRAINING crawlery — stahují obsah pro trénink LLM bez attribuce,
// nepřinášejí žádný zpětný provoz → BLOKOVÁNI. Šetří egress.
const AI_SEARCH_BOTS = [
  'GPTBot',            // ChatGPT Search + training (OpenAI) — search přináší provoz
  'OAI-SearchBot',     // ChatGPT real-time web search (OpenAI)
  'PerplexityBot',     // Perplexity AI search — citace s backlinkem
  'Perplexity-User',   // Perplexity user-triggered fetches
  'ClaudeBot',         // Anthropic — připravuje search, ať jsme ready
  'Claude-Web',        // Anthropic web rendering
] as const

const AI_TRAINING_ONLY = [
  'ChatGPT-User',       // starší OpenAI bot bez search
  'anthropic-ai',       // Anthropic training (ne search)
  'CCBot',              // Common Crawl (training corpora)
  'Bytespider',         // ByteDance / TikTok training
  'Diffbot',            // komerční data extraction
  'Amazonbot',          // Amazon training
  'Applebot-Extended',  // Apple AI training
  'cohere-ai',          // Cohere training
  'FacebookBot',        // Meta training
  'meta-externalagent', // Meta training
  'YouBot',             // You.com training
] as const

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default — Google, Bing, DuckDuckGo, Yandex et al. + AI search bots
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/go/'],
      },
      // Training-only crawlery — žádný zpětný provoz, jen egress náklady
      ...[...AI_TRAINING_ONLY].map(ua => ({
        userAgent: ua,
        disallow: '/',
      })),
    ],
    sitemap: 'https://olivator.cz/sitemap.xml',
  }
}
