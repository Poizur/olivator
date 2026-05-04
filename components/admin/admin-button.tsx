// Shared admin button — sjednocený vzhled napříč adminem.
// Před: 15+ variant `bg-olive text-white rounded-full px-X py-Y` v různých
// kombinacích (px-3 vs px-4 vs px-5, py-1.5 vs py-2 vs py-2.5, text-[12px]
// vs text-[13px] vs text-sm). Po: jeden komponent, 3 varianty × 3 velikosti.
//
// Použití:
//   <AdminButton variant="primary" size="md">Save</AdminButton>
//   <AdminButton variant="danger" size="sm" onClick={...}>Delete</AdminButton>
//
// Pro Link variantu použij `as="a"` + href (next/link wrap):
//   <AdminButton as="link" href="/admin/...">Open</AdminButton>

import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'olive-outline'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-olive text-white border border-transparent hover:bg-olive2 disabled:opacity-40',
  secondary:
    'bg-white border border-off2 text-text2 hover:border-olive3 hover:text-olive disabled:opacity-40',
  ghost:
    'bg-transparent border border-transparent text-text2 hover:bg-off hover:text-text disabled:opacity-40',
  danger:
    'bg-white border border-off2 text-text3 hover:border-red-300 hover:text-red-700 hover:bg-red-50 disabled:opacity-40',
  'olive-outline':
    'bg-white border border-olive-border text-olive-dark hover:bg-olive-bg/40 disabled:opacity-40',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1 text-[12px]',
  md: 'px-4 py-2 text-[13px]',
  lg: 'px-5 py-2.5 text-sm',
}

const BASE = 'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors'

interface BaseProps {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}

interface ButtonProps extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  as?: 'button'
}

interface LinkProps extends BaseProps {
  as: 'link'
  href: string
  target?: string
  rel?: string
  title?: string
}

type Props = ButtonProps | LinkProps

export function AdminButton(props: Props) {
  const variant: Variant = props.variant ?? 'primary'
  const size: Size = props.size ?? 'md'
  const className = `${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${props.className ?? ''}`.trim()

  if (props.as === 'link') {
    const { children, href, target, rel, title } = props
    return (
      <Link href={href} target={target} rel={rel} title={title} className={className}>
        {children}
      </Link>
    )
  }

  // Button variant — preserve onClick / disabled / type / form / title etc.
  const { children, as: _, variant: __, size: ___, className: ____, ...rest } = props as ButtonProps & { as?: 'button' }
  return (
    <button {...rest} className={className}>
      {children}
    </button>
  )
}
