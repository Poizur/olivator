/**
 * Returns the best short display name for a product.
 * Uses name_short when available and non-empty; falls back to full name.
 */
export function getDisplayName(product: { name_short: string | null; name: string }): string {
  return product.name_short?.trim() || product.name
}
