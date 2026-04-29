import type { ReactNode } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'
import { AdminTopbar } from '@/components/admin-topbar'

export const metadata = {
  title: 'Admin | Olivator',
  robots: { index: false, follow: false },
}

/** Admin uses sidebar (left) + slim topbar layout, distinct from public pages.
 *  Inspired by Linear/Vercel/Stripe Dashboard — flat, hairline borders, sentence
 *  case, light gray sidebar. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar />
        <main className="flex-1 bg-off/40">
          <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
