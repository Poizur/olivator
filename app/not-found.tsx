import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-10 text-center">
      <span className="font-[family-name:var(--font-display)] text-7xl italic text-olive/30 mb-4 leading-none">404</span>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-text mb-3">
        Stránka nenalezena
      </h1>
      <p className="text-[15px] text-text2 font-light mb-8 max-w-md">
        Tato stránka neexistuje nebo byla přesunuta. Zkuste hledat v našem katalogu.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="bg-olive text-white rounded-full px-6 py-2.5 text-sm font-medium hover:bg-olive-dark transition-colors"
        >
          Domů
        </Link>
        <Link
          href="/srovnavac"
          className="bg-off text-text rounded-full px-6 py-2.5 text-sm font-medium hover:bg-off2 transition-colors"
        >
          Katalog
        </Link>
      </div>
    </div>
  )
}
