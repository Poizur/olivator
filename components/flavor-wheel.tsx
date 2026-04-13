import type { FlavorProfile } from '@/lib/types'

const LABELS: Record<keyof FlavorProfile, string> = {
  fruity: 'Ovocnost',
  herbal: 'Byliny',
  bitter: 'Hořkost',
  spicy: 'Pálivost',
  mild: 'Jemnost',
  nutty: 'Oříšky',
  buttery: 'Máslový',
}

export function FlavorWheel({ profile }: { profile: FlavorProfile }) {
  const entries = (Object.entries(LABELS) as [keyof FlavorProfile, string][])
    .filter(([key]) => profile[key] > 0)

  return (
    <div className="bg-off rounded-xl p-5 mt-5">
      <div className="text-[13px] font-semibold text-text mb-3.5">Chuťový profil</div>
      <div className="flex flex-col gap-2">
        {entries.map(([key, label]) => (
          <div key={key} className="flex items-center gap-2.5">
            <span className="text-xs text-text2 w-[70px] shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-off2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-olive-light"
                style={{ width: `${profile[key]}%` }}
              />
            </div>
            <span className="text-[11px] text-text3 w-6 text-right">{profile[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
