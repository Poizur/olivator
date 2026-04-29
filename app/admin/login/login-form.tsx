'use client'

import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin'
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.href = redirect
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Nesprávné heslo')
      }
    } catch {
      setError('Chyba sítě — zkus znovu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="password"
        placeholder="Admin heslo"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoFocus
        required
        className="w-full px-4 py-3 border border-off2 rounded-lg text-sm focus:outline-none focus:border-olive"
      />
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full bg-olive text-white rounded-lg py-3 text-sm font-medium hover:bg-olive-dark disabled:opacity-40 transition-colors"
      >
        {loading ? 'Přihlašuji...' : 'Přihlásit se'}
      </button>
    </form>
  )
}
