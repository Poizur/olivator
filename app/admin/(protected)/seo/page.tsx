// SEO action plan dashboard — postupné fajfkování úkolů z SEO_STRATEGY.md.
// 3 taby: Stav (current), Historie (activity log + trendy), Insights (notes).
// Status persistován v seo_tasks DB tabulce.

import { supabaseAdmin } from '@/lib/supabase'
import { TaskRow } from './task-row'
import { TabNav } from './tab-nav'
import { HistorieView } from './historie-view'
import { InsightsView } from './insights-view'
import { RunAuditButton } from './run-audit-button'

export const dynamic = 'force-dynamic'

interface SeoTask {
  task_key: string
  phase: number
  sort_order: number
  title: string
  description: string | null
  estimated_time: string | null
  status: 'pending' | 'in_progress' | 'done' | 'skipped'
  auto_metric: string | null
  notes: string | null
}

interface PhaseInfo {
  num: number
  title: string
  subtitle: string
}

const PHASES: PhaseInfo[] = [
  { num: 0, title: 'Quick Wins',        subtitle: 'Mechanické fixy s velkým dopadem (~2 h)' },
  { num: 1, title: 'Schema & Discoverability', subtitle: 'Plné JSON-LD pokrytí, ItemList, NewsArticle (2-3 dny)' },
  { num: 2, title: 'Entity Foundation', subtitle: 'Fotky, dotáhnout cultivary, draft brandy (3-5 dní)' },
  { num: 3, title: 'Meta Optimization', subtitle: 'Admin UI pro meta, custom titles pro TOP 50 (2-3 dny)' },
  { num: 4, title: 'Topic Authority',   subtitle: '15+ článků, 10+ receptů, dynamické žebříčky (3-4 týdny)' },
  { num: 5, title: 'E-E-A-T Signals',   subtitle: 'Autoři, editorial guidelines, hero images (1-2 týdny)' },
  { num: 6, title: 'Backlink & Outreach', subtitle: 'Mediakit, guest posty, HARO (ongoing)' },
  { num: 7, title: 'Advanced & Future', subtitle: 'Voice search, SGE, multilang, GSC (ongoing)' },
]

interface LiveMetrics {
  productsActive: number
  productsWithoutMetaTitle: number
  productsWithoutMetaDesc: number
  brandsActive: number
  brandsDraft: number
  cultivarsActive: number
  cultivarsWithContent: number
  regionsActive: number
  regionsWithContent: number
  entityPhotos: number
  articlesActive: number
  recipesActive: number
  rankingsInDb: number
}

interface TaskRowMetric {
  label: string
  value: string
  tone: 'green' | 'amber' | 'red' | 'neutral'
}

async function loadMetrics(): Promise<LiveMetrics> {
  const [
    productsActive,
    productsNoMetaTitle,
    productsNoMetaDesc,
    brandsActive,
    brandsDraft,
    cultivarsActive,
    cultivarsContent,
    regionsActive,
    regionsContent,
    entityPhotos,
    articles,
    recipes,
    rankings,
  ] = await Promise.all([
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active').is('meta_title', null),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active').is('meta_description', null),
    supabaseAdmin.from('brands').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('brands').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabaseAdmin.from('cultivars').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('cultivars').select('*', { count: 'exact', head: true }).eq('status', 'active').not('description_long', 'is', null),
    supabaseAdmin.from('regions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('regions').select('*', { count: 'exact', head: true }).eq('status', 'active').not('description_long', 'is', null),
    supabaseAdmin.from('entity_images').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('recipes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('rankings').select('*', { count: 'exact', head: true }),
  ])

  return {
    productsActive: productsActive.count ?? 0,
    productsWithoutMetaTitle: productsNoMetaTitle.count ?? 0,
    productsWithoutMetaDesc: productsNoMetaDesc.count ?? 0,
    brandsActive: brandsActive.count ?? 0,
    brandsDraft: brandsDraft.count ?? 0,
    cultivarsActive: cultivarsActive.count ?? 0,
    cultivarsWithContent: cultivarsContent.count ?? 0,
    regionsActive: regionsActive.count ?? 0,
    regionsWithContent: regionsContent.count ?? 0,
    entityPhotos: entityPhotos.count ?? 0,
    articlesActive: articles.count ?? 0,
    recipesActive: recipes.count ?? 0,
    rankingsInDb: rankings.count ?? 0,
  }
}

function metricForTask(autoMetric: string | null, m: LiveMetrics): TaskRowMetric | undefined {
  if (!autoMetric) return undefined
  switch (autoMetric) {
    case 'products_without_meta_title':
      return {
        label: 'Bez meta_title',
        value: `${m.productsWithoutMetaTitle}/${m.productsActive}`,
        tone: m.productsWithoutMetaTitle === 0 ? 'green' : m.productsWithoutMetaTitle > 100 ? 'red' : 'amber',
      }
    case 'products_without_meta_desc':
      return {
        label: 'Bez meta_desc',
        value: `${m.productsWithoutMetaDesc}/${m.productsActive}`,
        tone: m.productsWithoutMetaDesc === 0 ? 'green' : m.productsWithoutMetaDesc > 50 ? 'red' : 'amber',
      }
    case 'cultivars_with_content':
      return {
        label: 'Cultivary s textem',
        value: `${m.cultivarsWithContent}/${m.cultivarsActive}`,
        tone: m.cultivarsWithContent === m.cultivarsActive ? 'green' : 'amber',
      }
    case 'entity_photos_count':
      return {
        label: 'Entity fotky',
        value: String(m.entityPhotos),
        tone: m.entityPhotos === 0 ? 'red' : m.entityPhotos < 20 ? 'amber' : 'green',
      }
    case 'active_brands':
      return {
        label: 'Aktivní brandy',
        value: `${m.brandsActive} (${m.brandsDraft} draft)`,
        tone: m.brandsActive < 10 ? 'amber' : 'green',
      }
    case 'recipes_count':
      return {
        label: 'Receptů',
        value: String(m.recipesActive),
        tone: m.recipesActive < 10 ? 'amber' : 'green',
      }
    case 'rankings_in_db':
      return {
        label: 'Žebříčků v DB',
        value: String(m.rankingsInDb),
        tone: m.rankingsInDb === 0 ? 'red' : 'green',
      }
    default:
      return undefined
  }
}

export default async function SeoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'stav' } = await searchParams

  // Pro počet badge na Historie + Insights tabech
  const [tasksRes, metrics, activityCount, openNotesCount] = await Promise.all([
    supabaseAdmin
      .from('seo_tasks')
      .select('task_key, phase, sort_order, title, description, estimated_time, status, auto_metric, notes')
      .order('phase')
      .order('sort_order'),
    loadMetrics(),
    supabaseAdmin.from('seo_activity_log').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('seo_notes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  const tasks = (tasksRes.data ?? []) as SeoTask[]

  // Group by phase
  const byPhase = new Map<number, SeoTask[]>()
  for (const t of tasks) {
    if (!byPhase.has(t.phase)) byPhase.set(t.phase, [])
    byPhase.get(t.phase)!.push(t)
  }

  // Overall stats
  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const skippedTasks = tasks.filter(t => t.status === 'skipped').length
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / (totalTasks - skippedTasks)) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-text3 mb-1.5">
            — SEO Plán
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-text">SEO Action Plan</h1>
          <p className="text-[13px] text-text2 mt-1 max-w-[640px]">
            Strategický plán SEO ze 8 fází. <strong>Stav</strong> = aktuální metriky + úkoly,{' '}
            <strong>Historie</strong> = co a kdy se udělalo, <strong>Insights</strong> = strategické poznámky.
          </p>
        </div>
        <RunAuditButton />
      </div>

      <TabNav
        tabs={[
          { key: 'stav', label: 'Stav', badge: `${overallPct}%` },
          { key: 'historie', label: 'Historie', badge: activityCount.count ?? 0 },
          { key: 'insights', label: 'Insights', badge: openNotesCount.count ?? 0 },
        ]}
      />

      {tab === 'historie' && <HistorieView />}
      {tab === 'insights' && <InsightsView />}
      {tab === 'stav' && <StavView
        tasks={tasks}
        byPhase={byPhase}
        metrics={metrics}
        doneTasks={doneTasks}
        totalTasks={totalTasks}
        inProgressTasks={inProgressTasks}
        skippedTasks={skippedTasks}
        overallPct={overallPct}
      />}
    </div>
  )
}

// ── Stav view (původní obsah) ─────────────────────────────────────────────
function StavView({
  tasks,
  byPhase,
  metrics,
  doneTasks,
  totalTasks,
  inProgressTasks,
  skippedTasks,
  overallPct,
}: {
  tasks: SeoTask[]
  byPhase: Map<number, SeoTask[]>
  metrics: LiveMetrics
  doneTasks: number
  totalTasks: number
  inProgressTasks: number
  skippedTasks: number
  overallPct: number
}) {
  return (
    <>
      {/* Overall progress */}
      <div className="bg-white border border-off2 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-0.5">
              Celkový postup
            </div>
            <div className="text-2xl font-[family-name:var(--font-display)] text-text">
              {doneTasks} / {totalTasks - skippedTasks}{' '}
              <span className="text-[14px] text-text3 font-normal">úkolů hotovo</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-[family-name:var(--font-display)] text-olive">{overallPct}%</div>
            {inProgressTasks > 0 && (
              <div className="text-[11px] text-amber-700 mt-0.5">{inProgressTasks} rozpracovaných</div>
            )}
            {skippedTasks > 0 && (
              <div className="text-[11px] text-text3">{skippedTasks} vyřazených</div>
            )}
          </div>
        </div>
        <div className="h-2 bg-off rounded-full overflow-hidden">
          <div
            className="h-full bg-olive transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Live metrics grid */}
      <div className="mb-8">
        <div className="text-[11px] font-bold tracking-widest uppercase text-text3 mb-3">
          Live metriky
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Produkty aktivní"
            value={metrics.productsActive}
            tone="neutral"
          />
          <MetricCard
            label="Bez meta_title"
            value={`${metrics.productsWithoutMetaTitle}/${metrics.productsActive}`}
            tone={metrics.productsWithoutMetaTitle === 0 ? 'green' : metrics.productsWithoutMetaTitle > 100 ? 'red' : 'amber'}
          />
          <MetricCard
            label="Bez meta_desc"
            value={`${metrics.productsWithoutMetaDesc}/${metrics.productsActive}`}
            tone={metrics.productsWithoutMetaDesc === 0 ? 'green' : metrics.productsWithoutMetaDesc > 50 ? 'red' : 'amber'}
          />
          <MetricCard
            label="Entity fotky"
            value={metrics.entityPhotos}
            tone={metrics.entityPhotos === 0 ? 'red' : metrics.entityPhotos < 20 ? 'amber' : 'green'}
          />
          <MetricCard
            label="Brandy aktivní"
            value={`${metrics.brandsActive} (${metrics.brandsDraft} draft)`}
            tone={metrics.brandsActive < 10 ? 'amber' : 'green'}
          />
          <MetricCard
            label="Cultivary s textem"
            value={`${metrics.cultivarsWithContent}/${metrics.cultivarsActive}`}
            tone={metrics.cultivarsWithContent === metrics.cultivarsActive ? 'green' : 'amber'}
          />
          <MetricCard
            label="Článků /pruvodce"
            value={metrics.articlesActive}
            tone={metrics.articlesActive < 10 ? 'amber' : 'green'}
          />
          <MetricCard
            label="Receptů"
            value={metrics.recipesActive}
            tone={metrics.recipesActive < 10 ? 'amber' : 'green'}
          />
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-5">
        {PHASES.map((phase) => {
          const phaseTasks = byPhase.get(phase.num) ?? []
          const phaseDone = phaseTasks.filter(t => t.status === 'done').length
          const phaseSkipped = phaseTasks.filter(t => t.status === 'skipped').length
          const phaseInProgress = phaseTasks.filter(t => t.status === 'in_progress').length
          const phaseTotal = phaseTasks.length - phaseSkipped
          const phasePct = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0

          return (
            <details key={phase.num} className="bg-white border border-off2 rounded-xl overflow-hidden group" open={phasePct < 100 && phase.num <= 3}>
              <summary className="px-5 py-4 cursor-pointer hover:bg-off/50 list-none flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-text3 w-12">
                    Fáze {phase.num}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[16px] font-medium text-text">{phase.title}</div>
                    <div className="text-[12px] text-text3 truncate">{phase.subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[14px] font-medium text-text tabular-nums">
                      {phaseDone}/{phaseTotal}
                    </div>
                    {phaseInProgress > 0 && (
                      <div className="text-[10px] text-amber-700">{phaseInProgress} v práci</div>
                    )}
                  </div>
                  <div className="w-24 h-2 bg-off rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        phasePct === 100 ? 'bg-emerald-500' : phasePct > 0 ? 'bg-olive' : 'bg-off2'
                      }`}
                      style={{ width: `${phasePct}%` }}
                    />
                  </div>
                  <span className="text-text3 group-open:rotate-180 transition-transform">▾</span>
                </div>
              </summary>
              <div className="border-t border-off2 divide-y divide-off2">
                {phaseTasks.length === 0 ? (
                  <div className="px-5 py-4 text-[13px] text-text3 italic">Žádné úkoly v této fázi.</div>
                ) : (
                  phaseTasks.map((task) => (
                    <TaskRow
                      key={task.task_key}
                      taskKey={task.task_key}
                      title={task.title}
                      description={task.description}
                      estimatedTime={task.estimated_time}
                      status={task.status}
                      metric={metricForTask(task.auto_metric, metrics)}
                      notes={task.notes}
                    />
                  ))
                )}
              </div>
            </details>
          )
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-off">
        <p className="text-[11px] text-text3 leading-relaxed">
          Plný plán a detail jednotlivých kroků je v souboru{' '}
          <code className="bg-off rounded px-1 py-0.5">SEO_STRATEGY.md</code> v rootu projektu.
          Když přidáš nový úkol, zapiš ho i tam — slouží jako durable reference.
        </p>
      </div>
    </>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'green' | 'amber' | 'red' | 'neutral'
}) {
  const toneCls = {
    green: 'border-emerald-200 bg-emerald-50/40',
    amber: 'border-amber-200 bg-amber-50/40',
    red: 'border-red-200 bg-red-50/40',
    neutral: 'border-off2 bg-white',
  }[tone]
  const valueCls = {
    green: 'text-emerald-700',
    amber: 'text-amber-800',
    red: 'text-red-700',
    neutral: 'text-text',
  }[tone]
  return (
    <div className={`border rounded-lg p-3 ${toneCls}`}>
      <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1">{label}</div>
      <div className={`text-[18px] font-[family-name:var(--font-display)] ${valueCls}`}>{value}</div>
    </div>
  )
}
