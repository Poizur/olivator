import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata = {
  title: 'Admin login',
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-800/40 px-6">
      <div className="w-full max-w-[380px] bg-zinc-900 border border-zinc-800 rounded-[var(--radius-card)] p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-olive mx-auto mb-4 flex items-center justify-center text-2xl">
            🫒
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-white mb-1">
            Admin
          </h1>
          <p className="text-sm text-zinc-400 font-light">Olivator administrace</p>
        </div>
        <Suspense fallback={<div className="text-center text-zinc-500 text-sm">...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
