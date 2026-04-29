'use client'

interface Props {
  variant?: 'dark' | 'light'
}

export function AdminBarLogout({ variant = 'dark' }: Props = {}) {
  async function onLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/'
  }
  const className =
    variant === 'light'
      ? 'text-[12px] text-text2 hover:text-text border border-off2 rounded-full px-3 py-1 hover:border-olive/40 transition-colors'
      : 'px-2 py-0.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white'
  return (
    <button type="button" onClick={onLogout} className={className}>
      Odhlásit
    </button>
  )
}
