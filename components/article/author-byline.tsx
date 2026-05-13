import Image from 'next/image'
import Link from 'next/link'

interface Props {
  publishedAt?: string | null
  updatedAt?: string | null
  readTime?: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function AuthorByline({ publishedAt, updatedAt, readTime }: Props) {
  const displayDate =
    updatedAt && publishedAt && new Date(updatedAt) > new Date(publishedAt)
      ? `Aktualizováno ${formatDate(updatedAt)}`
      : publishedAt
        ? `Publikováno ${formatDate(publishedAt)}`
        : null

  return (
    <div className="flex items-center gap-3 py-4 border-y border-off2 mb-6">
      <Link href="/autor/olik" className="flex items-center gap-2.5 group shrink-0">
        <Image
          src="/olik.png"
          alt="Olík"
          width={48}
          height={48}
          className="rounded-full"
        />
        <div>
          <div className="text-[13px] font-medium text-text group-hover:text-olive leading-tight">
            Olík
          </div>
          <div className="text-[11px] text-text3 leading-tight">Hlavní degustátor</div>
        </div>
      </Link>

      {(displayDate || readTime) && (
        <div className="text-[11px] text-text3 ml-auto text-right">
          {displayDate && <div>{displayDate}</div>}
          {readTime && <div>{readTime}</div>}
        </div>
      )}
    </div>
  )
}
