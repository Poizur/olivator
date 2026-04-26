'use client'

export function AdminBarLogout() {
  async function onLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/'
  }
  return (
    <button
      type="button"
      onClick={onLogout}
      className="px-2 py-0.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
    >
      Odhlásit
    </button>
  )
}
