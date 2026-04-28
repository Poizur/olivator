// Lehký markdown renderer — parsuje H2/H3, paragraphy, seznamy, tabulky.
// Bez external dependencies. Žádné inline links zatím, jen čistý text.
// Pro plný markdown později přidat react-markdown / mdx.

import Link from 'next/link'

interface Props {
  body: string
}

export function ArticleBody({ body }: Props) {
  const blocks = parseBlocks(body)
  return (
    <div className="space-y-5 text-[15px] leading-relaxed text-text2">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  )
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'blockquote'; text: string }

function parseBlocks(body: string): Block[] {
  const lines = body.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty
    if (!line.trim()) {
      i++
      continue
    }

    // Heading H2
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      i++
      continue
    }
    // Heading H3
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() })
      i++
      continue
    }
    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2).trim())
        i++
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') })
      continue
    }
    // Bullet list
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim())
        i++
      }
      blocks.push({ type: 'bullet-list', items })
      continue
    }
    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, '').trim())
        i++
      }
      blocks.push({ type: 'ordered-list', items })
      continue
    }
    // Table — line starts with `|`
    if (line.trim().startsWith('|')) {
      const headers = line.split('|').map((s) => s.trim()).filter(Boolean)
      i++
      // Skip separator row `| --- | --- |`
      if (i < lines.length && lines[i].includes('---')) i++
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').map((s) => s.trim()).filter(Boolean)
        rows.push(cells)
        i++
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }
    // Paragraph
    blocks.push({ type: 'paragraph', text: line.trim() })
    i++
  }
  return blocks
}

function renderInline(text: string, key: string | number) {
  // Replace internal links (markdown style [text](url)) with Next Link
  const parts: React.ReactNode[] = []
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    const linkText = m[1]
    const href = m[2]
    if (href.startsWith('/')) {
      parts.push(
        <Link key={`${key}-l${i++}`} href={href} className="text-olive hover:text-olive-dark underline decoration-dotted">
          {linkText}
        </Link>
      )
    } else {
      parts.push(
        <a key={`${key}-l${i++}`} href={href} target="_blank" rel="noopener" className="text-olive hover:text-olive-dark underline decoration-dotted">
          {linkText}
        </a>
      )
    }
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))

  // Bold/em — naive: **bold**
  const finalParts: React.ReactNode[] = []
  for (const part of parts) {
    if (typeof part !== 'string') {
      finalParts.push(part)
      continue
    }
    const segments = part.split(/(\*\*[^*]+\*\*)/g)
    segments.forEach((seg, idx) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        finalParts.push(
          <strong key={`${key}-b${idx}`} className="text-text font-semibold">
            {seg.slice(2, -2)}
          </strong>
        )
      } else if (seg) {
        finalParts.push(seg)
      }
    })
  }
  return finalParts
}

function renderBlock(b: Block, key: number) {
  switch (b.type) {
    case 'h2':
      return (
        <h2 key={key} className="font-[family-name:var(--font-display)] text-2xl font-normal text-text mt-8 mb-3 leading-tight">
          {b.text}
        </h2>
      )
    case 'h3':
      return (
        <h3 key={key} className="text-lg font-semibold text-text mt-5 mb-2">
          {b.text}
        </h3>
      )
    case 'paragraph':
      return (
        <p key={key} className="leading-relaxed">
          {renderInline(b.text, key)}
        </p>
      )
    case 'bullet-list':
      return (
        <ul key={key} className="list-disc list-outside pl-5 space-y-1.5">
          {b.items.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ul>
      )
    case 'ordered-list':
      return (
        <ol key={key} className="list-decimal list-outside pl-5 space-y-1.5">
          {b.items.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ol>
      )
    case 'table':
      return (
        <div key={key} className="overflow-x-auto my-4">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="border-b-2 border-off2">
                {b.headers.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 font-semibold text-text">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-off">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2">{renderInline(cell, `${key}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-4 border-olive bg-olive-bg/50 px-5 py-3 italic text-text">
          {renderInline(b.text, key)}
        </blockquote>
      )
  }
}
