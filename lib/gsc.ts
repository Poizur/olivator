/**
 * Google Search Console API client.
 * Requires GSC_SERVICE_ACCOUNT_KEY (JSON string) and GSC_SITE_URL env vars.
 * Gracefully returns null when not configured.
 */
import { google } from 'googleapis'

export interface GscRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscQueryResult {
  rows: GscRow[]
  fetchedAt: string
}

export interface GscSummary {
  totalClicks: number
  totalImpressions: number
  avgCtr: number
  avgPosition: number
  topQueries: GscRow[]
  topPages: GscRow[]
  fetchedAt: string
}

function getAuth() {
  const keyJson = process.env.GSC_SERVICE_ACCOUNT_KEY
  if (!keyJson) return null
  try {
    const key = JSON.parse(keyJson)
    return new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })
  } catch {
    return null
  }
}

export async function fetchGscSummary(days = 28): Promise<GscSummary | null> {
  const auth = getAuth()
  const siteUrl = process.env.GSC_SITE_URL
  if (!auth || !siteUrl) return null

  try {
    const sc = google.searchconsole({ version: 'v1', auth })
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const fmt = (d: Date) => d.toISOString().slice(0, 10)

    const [queriesRes, pagesRes] = await Promise.all([
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ['query'],
          rowLimit: 20,
          dataState: 'all',
        },
      }),
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ['page'],
          rowLimit: 20,
          dataState: 'all',
        },
      }),
    ])

    const toRow = (r: { keys?: string[] | null; clicks?: number | null; impressions?: number | null; ctr?: number | null; position?: number | null }): GscRow => ({
      keys: r.keys ?? [],
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    })

    const topQueries = (queriesRes.data.rows ?? []).map(toRow)
    const topPages = (pagesRes.data.rows ?? []).map(toRow)

    const totClicks = topQueries.reduce((s, r) => s + r.clicks, 0)
    const totImpressions = topQueries.reduce((s, r) => s + r.impressions, 0)
    const avgCtr = totImpressions > 0 ? totClicks / totImpressions : 0
    const avgPosition =
      topQueries.length > 0
        ? topQueries.reduce((s, r) => s + r.position, 0) / topQueries.length
        : 0

    return {
      totalClicks: totClicks,
      totalImpressions: totImpressions,
      avgCtr,
      avgPosition,
      topQueries,
      topPages,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[GSC] fetch failed:', (err as Error).message)
    return null
  }
}

export async function fetchGscDailyTrend(days = 28): Promise<GscRow[] | null> {
  const auth = getAuth()
  const siteUrl = process.env.GSC_SITE_URL
  if (!auth || !siteUrl) return null

  try {
    const sc = google.searchconsole({ version: 'v1', auth })
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)

    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ['date'],
        rowLimit: 90,
        dataState: 'all',
      },
    })

    return (res.data.rows ?? []).map((r) => ({
      keys: r.keys ?? [],
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }))
  } catch {
    return null
  }
}
