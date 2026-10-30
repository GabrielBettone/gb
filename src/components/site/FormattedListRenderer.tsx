import React from 'react'

export interface FormattedBlockItem {
  tipo: 'titulo' | 'item' | 'paragrafo'
  texto: string
}

export function parseLinhasFormatadas(linhas: string[]): FormattedBlockItem[] {
  const itens: FormattedBlockItem[] = []

  linhas.forEach((linhaOriginal) => {
    const raw = (linhaOriginal || '').trim()
    if (!raw) return

    // Linhas que começam com "*", "•", "-"
    const matchMarcador = raw.match(/^([*•\-–—])\s*(.*)$/)

    if (matchMarcador) {
      const conteudo = matchMarcador[2].trim()
      if (conteudo) {
        itens.push({
          tipo: 'item',
          texto: conteudo,
        })
      }
      return
    }

    // Linhas que terminam com ":" e não começam com marcador: título de bloco
    if (raw.endsWith(':')) {
      itens.push({
        tipo: 'titulo',
        texto: raw,
      })
      return
    }

    // Outras linhas normais
    itens.push({
      tipo: 'paragrafo',
      texto: raw,
    })
  })

  return itens
}

interface FormattedListRendererProps {
  linhas: string[]
  bulletColor?: string
  bulletIcon?: React.ReactNode
  textColor?: string
  className?: string
  tituloClassName?: string
}

export const FormattedListRenderer: React.FC<FormattedListRendererProps> = ({
  linhas,
  bulletColor = '#D4AF37',
  bulletIcon,
  textColor = '#616F7D',
  className = '',
  tituloClassName = '',
}) => {
  const blocos = parseLinhasFormatadas(linhas)

  if (blocos.length === 0) return null

  return (
    <div className={`space-y-1.5 text-xs ${className}`}>
      {blocos.map((bloco, idx) => {
        if (bloco.tipo === 'titulo') {
          return (
            <div
              key={idx}
              className={`${idx > 0 ? 'pt-2.5 mt-1' : ''} font-bold uppercase tracking-wider text-[#2C3E50] text-[11px] sm:text-xs block ${tituloClassName}`}
            >
              {bloco.texto}
            </div>
          )
        }

        if (bloco.tipo === 'item') {
          return (
            <div
              key={idx}
              className="flex items-start gap-2 leading-relaxed"
              style={{ color: textColor }}
            >
              {bulletIcon ? (
                <span className="flex-shrink-0 mt-0.5">{bulletIcon}</span>
              ) : (
                <span
                  className="font-bold flex-shrink-0 select-none text-sm leading-none mt-0.5"
                  style={{ color: bulletColor }}
                  aria-hidden="true"
                >
                  •
                </span>
              )}
              <span className="flex-1">{bloco.texto}</span>
            </div>
          )
        }

        return (
          <p key={idx} className="leading-relaxed" style={{ color: textColor }}>
            {bloco.texto}
          </p>
        )
      })}
    </div>
  )
}

export default FormattedListRenderer
