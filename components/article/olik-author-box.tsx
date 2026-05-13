import Image from 'next/image'
import Link from 'next/link'

export function OlikAuthorBox() {
  return (
    <div className="bg-off border border-off2 rounded-[var(--radius-card)] p-5 mt-10">
      <div className="flex items-start gap-4">
        <Link href="/autor/olik" className="shrink-0">
          <Image
            src="/olik.png"
            alt="Olík"
            width={52}
            height={52}
            className="rounded-full"
          />
        </Link>
        <div className="min-w-0">
          <h4 className="text-[13px] font-semibold text-text mb-1.5">
            Tenhle článek napsal Olík
          </h4>
          <p className="text-[13px] text-text2 leading-relaxed">
            Olík nesnáší dvě věci: marketingové bláboly a olej s kyselostí nad 0,5 %. Píše
            o olivovém oleji ze 18 prodejců v ČR. Olivator Score je jeho dílo.
          </p>
          <div className="mt-3 flex gap-4">
            <Link
              href="/autor/olik"
              className="text-[12px] text-olive font-medium hover:text-olive-dark"
            >
              Další články od Olíka →
            </Link>
            <Link
              href="/pruvodce"
              className="text-[12px] text-text3 hover:text-text2"
            >
              Všechny průvodce
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
