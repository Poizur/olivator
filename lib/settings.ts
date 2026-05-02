// App-wide settings stored in Supabase `app_settings` table (key/JSONB value).
// Admin manages them via /admin/nastaveni — code reads via getSetting() helper
// with sensible defaults that work even if migration hasn't run.

import { supabaseAdmin } from './supabase'

export type SettingKey =
  | 'notification_email'
  | 'discovery_daily_limit'
  | 'discovery_auto_publish'
  | 'discovery_enabled_shops'
  | 'discovery_schedule_cron'
  | 'cron_secret'
  // Newsletter settings
  | 'newsletter_enabled'
  | 'newsletter_weekly_enabled'
  | 'newsletter_weekly_day'
  | 'newsletter_weekly_send_hour'
  | 'newsletter_deals_enabled'
  | 'newsletter_deals_min_drop_pct'
  | 'newsletter_alerts_enabled'
  | 'newsletter_auto_send'
  | 'newsletter_test_mode'

interface SettingDef<T> {
  key: SettingKey
  default: T
  description: string
}

// Source of truth for all app settings + their defaults.
// Adding a new setting → add here AND it shows up in admin UI automatically.
export const SETTINGS: Record<SettingKey, SettingDef<unknown>> = {
  notification_email: {
    key: 'notification_email',
    default: 'italienasbavi@gmail.com',
    description: 'E-mailová adresa pro notifikace z Discovery agenta a alertů',
  },
  discovery_daily_limit: {
    key: 'discovery_daily_limit',
    default: 5,
    description: 'Maximální počet nových kandidátů, které agent zpracuje za 1 běh',
  },
  discovery_auto_publish: {
    key: 'discovery_auto_publish',
    default: true,
    description: 'Auto-publikovat HIGH-confidence nálezy bez ručního schválení',
  },
  discovery_enabled_shops: {
    key: 'discovery_enabled_shops',
    // Default jen ověřené e-shopy s klasickým olivovým olejem.
    // Olivio.cz / mujbio.cz mají DNS issues, gaea.cz / zdravasila.cz mají
    // jiný sortiment (kosmetika, doplňky). Lze přidat zpět z Nastavení
    // až budou crawlery doladěné.
    default: ['reckonasbavi'],
    description: 'Aktivní e-shopy které Discovery scanuje. Začínáme s reckonasbavi.cz (specialty řecký shop, 62 olejů). Další lze přidat z Nastavení.',
  },
  discovery_schedule_cron: {
    key: 'discovery_schedule_cron',
    default: '0 4 * * 1',
    description: 'Cron schedule (UTC). Default: pondělí 4:00 ráno',
  },
  cron_secret: {
    key: 'cron_secret',
    default: '',
    description: 'Tajný klíč v hlavičce X-Cron-Secret pro autentizaci /api/cron/* endpointů',
  },
  // ── Newsletter ──────────────────────────────────────────────────────────
  newsletter_enabled: {
    key: 'newsletter_enabled',
    default: true,
    description: 'Master switch — pokud false, žádné newsletter automatizace neběží.',
  },
  newsletter_weekly_enabled: {
    key: 'newsletter_weekly_enabled',
    default: true,
    description: 'Týdenní souhrn (čtvrtek). Auto-generuje draft který admin schválí.',
  },
  newsletter_weekly_day: {
    key: 'newsletter_weekly_day',
    default: 4, // Thursday
    description: 'Den v týdnu kdy se posílá týdenní souhrn (1=pondělí … 7=neděle)',
  },
  newsletter_weekly_send_hour: {
    key: 'newsletter_weekly_send_hour',
    default: 8,
    description: 'Hodina kdy se posílá týdenní souhrn (0-23, UTC). Default 8 ráno.',
  },
  newsletter_deals_enabled: {
    key: 'newsletter_deals_enabled',
    default: true,
    description: 'Slevová kampaň — když najdeme významný drop, vytvoří se draft.',
  },
  newsletter_deals_min_drop_pct: {
    key: 'newsletter_deals_min_drop_pct',
    default: 15,
    description: 'Minimální % poklesu ceny aby se olej dostal do slevové kampaně',
  },
  newsletter_alerts_enabled: {
    key: 'newsletter_alerts_enabled',
    default: true,
    description: 'Cenové alerty — uživatelé sledují konkrétní oleje, email po triggeru',
  },
  newsletter_auto_send: {
    key: 'newsletter_auto_send',
    default: false,
    description: 'POZOR: pokud true, draft se odešle automaticky bez schválení (jen pro pokročilé)',
  },
  newsletter_test_mode: {
    key: 'newsletter_test_mode',
    default: false,
    description: 'Test mode — odesílá pouze adminovi (nikdy ne všem subscribers)',
  },
}

/** Read a setting from DB. Falls back to default if missing/error. */
export async function getSetting<T = unknown>(key: SettingKey): Promise<T> {
  const def = SETTINGS[key]
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error || !data) return def.default as T
    return data.value as T
  } catch {
    return def.default as T
  }
}

/** Read multiple settings in one query. */
export async function getSettings(keys: SettingKey[]): Promise<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', keys)
    if (error) {
      // table missing — return all defaults
      return Object.fromEntries(keys.map(k => [k, SETTINGS[k].default]))
    }
    const out: Record<string, unknown> = {}
    for (const k of keys) out[k] = SETTINGS[k].default
    for (const row of data ?? []) {
      out[row.key as string] = row.value
    }
    return out
  } catch {
    return Object.fromEntries(keys.map(k => [k, SETTINGS[k].default]))
  }
}

/** Save a setting. Upserts. */
export async function setSetting<T>(key: SettingKey, value: T): Promise<void> {
  const def = SETTINGS[key]
  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({
      key,
      value: value as unknown,
      description: def.description,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
}

/** Read all settings as a map (for admin settings page). */
export async function getAllSettings(): Promise<Record<SettingKey, unknown>> {
  const result: Record<string, unknown> = {}
  for (const k of Object.keys(SETTINGS) as SettingKey[]) {
    result[k] = SETTINGS[k].default
  }
  try {
    const { data } = await supabaseAdmin.from('app_settings').select('key, value')
    for (const row of data ?? []) {
      const key = row.key as string
      if (key in SETTINGS) {
        result[key] = row.value
      }
    }
  } catch {
    // table missing — return defaults only
  }
  return result as Record<SettingKey, unknown>
}
