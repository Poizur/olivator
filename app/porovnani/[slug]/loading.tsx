// Loading skeleton pro /porovnani/[slug] — okamžitá vizuální zpětná vazba
// po kliku z homepage teaseru / katalogu. Bez tohoto se 2-3s render
// zdá uživateli rozbitý a klikají několikrát.

export default function Loading() {
  return (
    <div className="px-6 md:px-10 py-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-xs text-text3 mb-7 animate-pulse">
          <span className="inline-block bg-off2 rounded h-3 w-12 align-middle" />
          {' › '}
          <span className="inline-block bg-off2 rounded h-3 w-20 align-middle" />
          {' › '}
          <span className="inline-block bg-off2 rounded h-3 w-32 align-middle" />
        </div>
        <div className="mb-6">
          <div className="h-9 md:h-10 bg-off2 rounded-md w-2/3 mb-3 animate-pulse" />
          <div className="h-4 bg-off2/60 rounded w-1/2 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-off2 rounded-[var(--radius-card)] overflow-hidden animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="aspect-[4/5] bg-off2/40" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-off2 rounded w-1/3" />
                <div className="h-4 bg-off2/80 rounded w-3/4" />
                <div className="h-3 bg-off2/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-[13px] text-text3">
          Načítám porovnání…
        </div>
      </div>
    </div>
  )
}
