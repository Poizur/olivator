import type { ReactNode } from 'react'

export const metadata = {
  title: 'Admin | Olivator',
  robots: { index: false, follow: false },
}

/** Admin pages share the AdminBar (rendered globally in root layout)
 *  — admin navigation lives there. This layout only provides the page
 *  container & background. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-off">
      <div className="max-w-[1200px] mx-auto px-8 py-8">{children}</div>
    </div>
  )
}
