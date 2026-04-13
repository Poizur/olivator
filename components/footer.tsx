import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-off border-t border-off2 mt-12">
      <div className="max-w-[1080px] mx-auto px-10 py-8 flex items-center justify-between">
        <div>
          <div className="font-[family-name:var(--font-display)] text-[17px] text-olive-dark">
            Olivator
          </div>
          <div className="text-xs text-text3 mt-1">
            Největší srovnávač olivových olejů v ČR &middot; &copy; 2025
          </div>
        </div>
        <div className="flex gap-5">
          {[
            { href: '/metodika', label: 'Metodika' },
            { href: '/', label: 'O nás' },
            { href: '/', label: 'Partneři' },
            { href: '/', label: 'GDPR' },
          ].map(l => (
            <Link
              key={l.label}
              href={l.href}
              className="text-xs text-text3 hover:text-olive transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
