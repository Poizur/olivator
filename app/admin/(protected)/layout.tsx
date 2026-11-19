import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin-sidebar'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export const metadata = {
  title: 'Admin | Olivator',
  robots: { index: false, follow: false },
}

/** Admin: sidebar-only layout. Žádný topbar — search a logout jsou v sidebaru.
 *  Inspirace Linear/Vercel/Stripe Dashboard — flat, hairline borders.
 *  Druhá vrstva ochrany vedle middleware (matcher vynechává přípony) — bez cookie nic nerenderujeme. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminAuthenticated())) redirect('/admin/login')
  return (
    <div className="min-h-screen bg-off flex text-text">
      <AdminSidebar />
      <main className="flex-1 min-w-0 bg-off">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-8">{children}</div>
      </main>
    </div>
  )
}
