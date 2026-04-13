'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Product } from './types'

interface CompareContextType {
  items: Product[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  clearAll: () => void
  isInCompare: (productId: string) => boolean
}

const CompareContext = createContext<CompareContextType | null>(null)

const STORAGE_KEY = 'olivator_compare'
const MAX_ITEMS = 5

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {}
  }, [items])

  const addItem = useCallback((product: Product) => {
    setItems(prev => {
      if (prev.length >= MAX_ITEMS) return prev
      if (prev.some(p => p.id === product.id)) return prev
      return [...prev, product]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(p => p.id !== productId))
  }, [])

  const clearAll = useCallback(() => setItems([]), [])

  const isInCompare = useCallback(
    (productId: string) => items.some(p => p.id === productId),
    [items]
  )

  return (
    <CompareContext.Provider value={{ items, addItem, removeItem, clearAll, isInCompare }}>
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error('useCompare must be used within CompareProvider')
  return ctx
}
