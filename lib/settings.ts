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
    default: ['reckonasbavi', 'olivio', 'gaea', 'mujbio', 'zdravasila'],
    description: 'Aktivní e-shopy (slug v retailers tabulce), které Discovery scanuje',
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
