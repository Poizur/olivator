import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRecipeBySlug, type RecipeFull } from '@/lib/recipes-db'
import { getArticleBySlug, getArticles } from '@/lib/static-content'
import { getProductsWithOffers } from '@/lib/data'
import type { Product, ProductOffer } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

type ProductWithOffers = Product & { cheapestOffer: ProductOffer | null }
import { ArticleBody } from '@/components/article-body'

export const revalidate = 60

const CUISINE_LABEL: Record<string, string> = {
  italian: 'italská',
  greek: 'řecká',
  spanish: 'španělská',
  czech: 'česká',
  french: 'francouzská',
  mediterranean: 'středomořská',
}
const CUISINE_SCHEMA: Record<string, string> = {
  italian: 'Italian',
  greek: 'Greek',
  spanish: 'Spanish',
  czech: 'Czech',
  french: 'French',
  mediterranean: 'Mediterranean',
}
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'snadné',
  medium: 'střední',
  hard: 'náročnější',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  // Static fallback
  const fallback = !recipe ? getArticleBySlug(slug) : null

  if (!recipe && !fallback) return { title: 'Recept nenalezen' }

  const title = recipe?.metaTitle || recipe?.title || fallback?.title || ''
  const description = recipe?.metaDescription || recipe?.excerpt || fallback?.excerpt || ''

  return {
    title,
    description,
    alternates: { canonical: `https://olivator.cz/recept/${slug}` },
    openGraph: {
      type: 'article',
      url: `https://olivator.cz/recept/${slug}`,
      title,
      description,
    },
  }
}

/** Find products that match recipe pairing hints. Match podle originRegion textu
 *  (lowercase contains) — DB má originRegion jako lidský text "Apulie", "Kréta" atd.
 *  Cultivar match přes Product name (stringové substring), ne ideální ale funkční. */
function pickPairedProducts(
  recipe: RecipeFull,
  allProducts: ProductWithOffers[]
): ProductWithOffers[] {
  const regions = recipe.recommendedRegions.map((s) => s.toLowerCase())
  const cultivars = recipe.recommendedCultivars.map((s) => s.toLowerCase())

  const scored = allProducts
    .map((p) => {
      let score = 0
      const region = (p.originRegion ?? '').toLowerCase()
      if (regions.length > 0 && regions.some((r) => region.includes(r))) score += 2
      const productName = p.name.toLowerCase()
      if (cultivars.length > 0 && cultivars.some((c) => productName.includes(c))) score += 3
      return { product: p, score }
    })
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.product.olivatorScore ?? 0) - (a.product.olivatorScore ?? 0)
    )

  if (scored.length > 0) return scored.slice(0, 3).map((x) => x.product)
  return allProducts
    .sort((a, b) => (b.olivatorScore ?? 0) - (a.olivatorScore ?? 0))
    .slice(0, 2)
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // 1. Zkus DB
  const recipe = await getRecipeBySlug(slug)

  // 2. Fallback na static (před migrací nebo legacy slug)
  if (!recipe) {
    const article = getArticleBySlug(slug)
    if (!article || article.category !== 'recept') notFound()
    return renderLegacyArticle(article)
  }

  if (recipe.status !== 'active') notFound()

  const allProducts = await getProductsWithOffers()
  const paired = pickPairedProducts(recipe, allProducts)

  // ── Schema.org Recipe (s ingredients + instructions = rich snippet eligible) ──
  const recipeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.excerpt,
    image: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
    author: { '@type': 'Organization', name: 'Olivátor' },
    publisher: {
      '@type': 'Organization',
      name: 'Olivátor',
      url: 'https://olivator.cz',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://olivator.cz/recept/${recipe.slug}`,
    },
    datePublished: recipe.publishedAt,
    recipeCategory: 'Hlavní jídlo',
    recipeCuisine: recipe.cuisine
      ? CUISINE_SCHEMA[recipe.cuisine] ?? 'Mediterranean'
      : 'Mediterranean',
    prepTime: recipe.prepTimeMin ? `PT${recipe.prepTimeMin}M` : undefined,
    cookTime:
      recipe.cookTimeMin && recipe.cookTimeMin > 0 ? `PT${recipe.cookTimeMin}M` : undefined,
    totalTime:
      recipe.prepTimeMin
        ? `PT${recipe.prepTimeMin + (recipe.cookTimeMin ?? 0)}M`
        : undefined,
    recipeYield: recipe.servings ? `${recipe.servings} porcí` : undefined,
    recipeIngredient: recipe.ingredients.map((i) =>
      i.amount != null
        ? `${i.amount} ${i.unit} ${i.name}`.trim()
        : `${i.unit ? i.unit + ' ' : ''}${i.name}`.trim()
    ),
    recipeInstructions: recipe.instructions.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      text: step.step,
    })),
  }

  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-10 py-8 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchema) }}
      />

      <div className="text-xs text-text3 mb-6">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <Link href="/recept" className="text-olive">Recepty</Link>
        {' › '}
        {recipe.title}
      </div>

      {/* Header */}
      <div className="text-[10px] font-semibold tracking-widest uppercase text-olive mb-3">
        Recept
        {recipe.cuisine && (
          <>
            <span className="mx-1.5 text-text3">·</span>
            <span className="text-text3">
              {CUISINE_LABEL[recipe.cuisine] ?? recipe.cuisine}
            </span>
          </>
        )}
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-3 leading-tight">
        {recipe.title}
      </h1>

      {recipe.excerpt && (
        <p className="text-[15px] text-text2 leading-relaxed mb-6 max-w-[640px]">
          {recipe.excerpt}
        </p>
      )}

      {/* Quick facts strip */}
      {(recipe.prepTimeMin || recipe.servings || recipe.difficulty) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-text2 mb-7 pb-5 border-b border-off2">
          {recipe.prepTimeMin && (
            <div>
              <span className="text-text3 text-[11px] uppercase tracking-wider mr-1">Příprava</span>
              <span className="font-medium text-text">{recipe.prepTimeMin} min</span>
            </div>
          )}
          {recipe.cookTimeMin != null && recipe.cookTimeMin > 0 && (
            <div>
              <span className="text-text3 text-[11px] uppercase tracking-wider mr-1">Vaření</span>
              <span className="font-medium text-text">{recipe.cookTimeMin} min</span>
            </div>
          )}
          {recipe.servings && (
            <div>
              <span className="text-text3 text-[11px] uppercase tracking-wider mr-1">Pro</span>
              <span className="font-medium text-text">{recipe.servings} porcí</span>
            </div>
          )}
          {recipe.difficulty && (
            <div>
              <span className="text-text3 text-[11px] uppercase tracking-wider mr-1">Náročnost</span>
              <span className="font-medium text-text">
                {DIFFICULTY_LABEL[recipe.difficulty] ?? recipe.difficulty}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hero */}
      <div className="bg-olive-bg/40 rounded-[var(--radius-card)] aspect-[4/3] md:aspect-[16/9] flex items-center justify-center text-6xl md:text-7xl mb-8 overflow-hidden">
        {recipe.heroImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={recipe.heroImageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          recipe.emoji
        )}
      </div>

      {/* Ingredients (structured) */}
      {recipe.ingredients.length > 0 && (
        <div className="mb-8 bg-white border border-off2 rounded-[var(--radius-card)] p-5 md:p-6">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-olive mb-3">
            Suroviny {recipe.servings ? `(pro ${recipe.servings} porcí)` : ''}
          </h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-3 text-[14px]">
                <span className="text-olive mt-1">•</span>
                <div className="flex-1">
                  <span className="text-text">
                    {ing.amount != null && (
                      <strong className="font-semibold tabular-nums">
                        {ing.amount} {ing.unit}{' '}
                      </strong>
                    )}
                    {ing.amount == null && ing.unit && (
                      <span className="text-text2 italic mr-1">{ing.unit} </span>
                    )}
                    {ing.name}
                  </span>
                  {ing.note && (
                    <span className="text-[12px] text-text3 italic ml-1">— {ing.note}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructions (structured) */}
      {recipe.instructions.length > 0 && (
        <div className="mb-10">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-olive mb-4">
            Postup
          </h2>
          <ol className="space-y-4">
            {recipe.instructions.map((inst, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-olive text-white text-[12px] font-bold flex items-center justify-center tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 pt-0.5">
                  <p className="text-[15px] text-text leading-relaxed">{inst.step}</p>
                  {inst.duration_min != null && (
                    <p className="text-[11px] text-text3 mt-0.5">⏱ {inst.duration_min} min</p>
                  )}
                  {inst.note && (
                    <p className="text-[12px] text-text2 mt-1 italic">{inst.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Editorial body (markdown — tipy, kontext, doporučení) */}
      {recipe.bodyMarkdown && (
        <div className="mb-10">
          <ArticleBody body={recipe.bodyMarkdown} />
        </div>
      )}

      {/* Paired oils */}
      {paired.length > 0 && (
        <div className="bg-olive-bg rounded-[var(--radius-card)] p-5 md:p-6 mb-8">
          <div className="text-[11px] font-bold tracking-widest uppercase text-olive mb-3">
            Doporučené oleje k tomuto receptu
          </div>
          {recipe.recommendedRegions.length > 0 || recipe.recommendedCultivars.length > 0 ? (
            <p className="text-[12px] text-olive-dark mb-4 leading-snug">
              Vybíráme oleje
              {recipe.recommendedCultivars.length > 0 && (
                <> z odrůd <strong>{recipe.recommendedCultivars.join(', ')}</strong></>
              )}
              {recipe.recommendedRegions.length > 0 && (
                <> z regionů <strong>{recipe.recommendedRegions.join(', ')}</strong></>
              )}
              .
            </p>
          ) : null}
          <div className="space-y-2">
            {paired.map((p) => {
              const offer = p.cheapestOffer
              return (
                <Link
                  key={p.id}
                  href={`/olej/${p.slug}`}
                  className="flex items-center justify-between gap-3 py-3 border-b border-olive-border/40 last:border-b-0 hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 bg-white rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-base italic text-olive leading-none shrink-0">
                      {p.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-text leading-tight truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-text2">
                        Score {p.olivatorScore}
                        {p.originRegion && <> · {p.originRegion}</>}
                      </div>
                    </div>
                  </div>
                  {offer && (
                    <div className="text-[13px] font-semibold text-olive whitespace-nowrap">
                      {formatPrice(offer.price)}
                      <div className="text-[10px] font-normal text-text3">
                        u {offer.retailer.name}
                      </div>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-off">
        <Link href="/recept" className="text-sm text-olive">
          ← Zpět na recepty
        </Link>
      </div>
    </div>
  )
}

// ── Legacy fallback (před DB migrací nebo pro static-only recept) ──────────

function renderLegacyArticle(
  article: NonNullable<ReturnType<typeof getArticleBySlug>>
) {
  return (
    <div className="max-w-[720px] mx-auto px-6 md:px-10 py-10">
      <div className="text-xs text-text3 mb-7">
        <Link href="/" className="text-olive">Olivátor</Link>
        {' › '}
        <Link href="/recept" className="text-olive">Recepty</Link>
        {' › '}
        {article.title}
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-normal text-text mb-3 leading-tight">
        {article.title}
      </h1>
      <div className="text-xs text-text3 mb-8">{article.readTime}</div>
      <div className="bg-off rounded-[var(--radius-card)] aspect-[4/3] flex items-center justify-center text-6xl mb-8">
        {article.emoji}
      </div>
      {article.body ? (
        <ArticleBody body={article.body} />
      ) : (
        <p className="text-base leading-relaxed text-text2">{article.excerpt}</p>
      )}
      <div className="pt-6 border-t border-off mt-8">
        <Link href="/recept" className="text-sm text-olive">
          ← Zpět na recepty
        </Link>
      </div>
    </div>
  )
}

// generateStaticParams: zajistí pre-render statických receptů (legacy fallback).
// DB recepty se renderují dynamicky podle revalidate.
export function generateStaticParams() {
  return getArticles()
    .filter((a) => a.category === 'recept')
    .map((a) => ({ slug: a.slug }))
}
