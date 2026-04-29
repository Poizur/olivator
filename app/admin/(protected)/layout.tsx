import type { ReactNode } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'

export const metadata = {
  title: 'Admin | Olivator',
  robots: { index: false, follow: false },
}

/** Admin: sidebar-only layout. Žádný topbar — search a logout jsou v sidebaru.
 *  Inspirace Linear/Vercel/Stripe Dashboard — flat, hairline borders. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-off flex text-text">
      <AdminSidebar />
      <main className="flex-1 min-w-0 bg-off">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-8">{children}</div>
      </main>
    </div>
  )
}
