import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'

export interface FetchedPage {
  url: string
  html: string
  $: CheerioAPI
  statusCode: number
  is404: boolean
}

const UA = 'Olivator-Scanner/1.0 (+https://olivator.cz)'

export async function fetchPage(url: string, timeoutMs = 20_000): Promise<FetchedPage | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    })
    clearTimeout(timer)
    const html = res.ok ? await res.text() : ''
    const $ = cheerio.load(html)
    return { url, html, $, statusCode: res.status, is404: res.status === 404 }
  } catch (err) {
    clearTimeout(timer)
    console.warn(`[scanner] fetch failed: ${url} — ${(err as Error).message}`)
    return null
  }
}
