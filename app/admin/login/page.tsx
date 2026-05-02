import Image from 'next/image'
import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata = {
  title: 'Admin login',
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-off px-6">
      <div className="w-full max-w-[380px] bg-white border border-off2 rounded-[var(--radius-card)] p-8 shadow-sm">
        <div className="text-center mb-6">
          <Image
            src="/logo-mark.png"
            alt="olivátor"
            width={112}
            height={112}
            className="w-28 h-28 mx-auto mb-4 rounded-2xl"
          />
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-text mb-1">
            Admin
          </h1>
          <p className="text-sm text-text2 font-light">olivátor administrace</p>
        </div>
        <Suspense fallback={<div className="text-center text-text3 text-sm">...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
