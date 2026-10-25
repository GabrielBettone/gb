import type { MetodoPagamento } from '@/types'
import { parseCondicoes } from '@/services/orcamentoModulo'

export function formatMoeda(val?: number): string {
  return (val || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Remove qualquer menção de desconto de nomes de métodos de pagamento
 * para evitar rótulos errados no card de valor a prazo.
 */
export function limparNomeMetodo(nome?: string): string {
  if (!nome) return 'Condição padrão'
  const limpo = nome
    .replace(/\s*\(\s*\d+%\s*desc(?:onto)?\s*\)/gi, '')
    .replace(/^\s*\d+%\s*desc(?:onto)?\s*$/gi, '')
    .trim()
  return limpo || 'Condição padrão'
}

/**
 * Formata as condições reais cadastradas no método para exibição no card VALOR A PRAZO
 * e no PDF, calculando as parcelas reais e removendo qualquer menção a desconto.
 */
export function formatarCondicoesPrazo(
  metodo: MetodoPagamento | null | undefined,
  valorAPrazo: number,
): string[] {
  const condicoesRaw = metodo ? parseCondicoes(metodo.condicoes) : []

  // Sem condições cadastradas
  if (condicoesRaw.length === 0) {
    if (metodo?.numero_parcelas && metodo.numero_parcelas > 1) {
      const vParc = formatMoeda(valorAPrazo / metodo.numero_parcelas)
      return [`${metodo.numero_parcelas}x de ${vParc} sem juros`]
    }
    return ['Pagamento integral conforme condições comerciais.']
  }

  // Filtrar condições:
  // NENHUMA linha que mencione desconto ou condição à vista deve aparecer no card a prazo,
  // pois o desconto à vista já está tratado exclusivamente no card de valor à vista.
  const condicoesPrazoCandidatas = condicoesRaw.filter((c) => {
    const texto = c.trim()
    // Se for menção a desconto (ex.: "5% desconto", "10% de desconto", "À vista com 5% de desconto...")
    const ehMencaoDesconto =
      /desconto|desc\./i.test(texto) && !/(?:cartão|\d+x|parcela|entrada|saldo)/i.test(texto)
    const ehAVistaPuro =
      /^(?:à\s*vista|quitação\s*no\s*ato)/i.test(texto) &&
      !/(?:cartão|\d+x|parcela|entrada|saldo)/i.test(texto)
    return !ehMencaoDesconto && !ehAVistaPuro
  })

  // Se todas foram filtradas (ou é método de pagamento puramente à vista sem parcelas adicionais)
  if (condicoesPrazoCandidatas.length === 0) {
    if (metodo?.numero_parcelas && metodo.numero_parcelas > 1) {
      const vParc = formatMoeda(valorAPrazo / metodo.numero_parcelas)
      return [`${metodo.numero_parcelas}x de ${vParc} sem juros`]
    }
    // Caso padrão genérico, sem injetar nome do método
    return ['Pagamento integral conforme condições comerciais.']
  }

  const resultado: string[] = []

  for (const cond of condicoesPrazoCandidatas) {
    let linha = cond.trim()

    // Ignorar qualquer linha que seja menção a desconto ou contenha a palavra desconto/desc.
    if (/desc(?:onto)?/i.test(linha) && !/(?:cartão|\d+x|parcela|entrada|saldo)/i.test(linha)) {
      continue
    }

    // 1. Entrada / Sinal com porcentagem (ex: "50% de entrada no fechamento do contrato")
    const matchEntrada = linha.match(/(\d{1,2})%\s*(?:de\s*)?(entrada|sinal)/i)
    if (matchEntrada) {
      const pct = parseFloat(matchEntrada[1])
      const valEntrada = (valorAPrazo * pct) / 100
      linha = linha.replace(matchEntrada[0], `Entrada de ${formatMoeda(valEntrada)} (${pct}%)`)
      resultado.push(linha)
      continue
    }

    // 2. Saldo restante com porcentagem (ex: "50% restante após vistoria final...")
    const matchSaldo = linha.match(/(\d{1,2})%\s*(?:restante|saldo)/i)
    if (matchSaldo) {
      const pct = parseFloat(matchSaldo[1])
      const valSaldo = (valorAPrazo * pct) / 100
      linha = linha.replace(matchSaldo[0], `Saldo de ${formatMoeda(valSaldo)} (${pct}%)`)
      resultado.push(linha)
      continue
    }

    // 3. Ignorar menção a desconto mesmo que esteja no meio de outra frase
    if (/desconto/i.test(linha) && !/(?:cartão|\d+x|parcela|entrada|saldo)/i.test(linha)) {
      continue
    }

    // 4. Parcelamento em Nx (ex: "Em até 8x sem juros no cartão de crédito", "Em até 18x com juros da operadora")
    const matchParcelas = linha.match(
      /(?:em\s+até\s+)?(\d{1,2})\s*(?:x|parcelas?(?:\s+iguais)?(?:\s+mensais)?)/i,
    )

    if (matchParcelas) {
      const numParc = parseInt(matchParcelas[1], 10)
      if (numParc > 1) {
        const valParc = formatMoeda(valorAPrazo / numParc)
        const ehSemJuros = /sem\s*juros/i.test(linha)
        const ehComJuros = /com\s*juros|taxa\s*da\s*maquininha|juros\s*da\s*operadora/i.test(linha)

        if (ehSemJuros) {
          const temCartao = /cartão/i.test(linha)
          resultado.push(
            `${numParc}x de ${valParc} sem juros${temCartao ? ' no cartão de crédito' : ''}`,
          )
          continue
        } else if (ehComJuros) {
          let tipoJuros = 'com juros'
          if (/juros\s*da\s*operadora/i.test(linha)) {
            tipoJuros = 'com juros da operadora'
          } else if (/taxa\s*da\s*maquininha/i.test(linha)) {
            tipoJuros = 'com taxa da maquininha'
          }
          resultado.push(`${numParc}x de ${valParc} ${tipoJuros}`)
          continue
        } else {
          resultado.push(`${numParc}x de ${valParc}`)
          continue
        }
      }
    }

    // Outros textos informativos da condição (ex: "Primeira parcela na aprovação do orçamento")
    // Se o texto for igual ao nome do método ou tiver menção a desconto, não adicionar
    if (metodo?.nome && linha.toLowerCase() === metodo.nome.trim().toLowerCase()) {
      continue
    }
    resultado.push(linha)
  }

  // Se por acaso nada foi adicionado mas metodo.numero_parcelas > 1
  if (resultado.length === 0) {
    if (metodo?.numero_parcelas && metodo.numero_parcelas > 1) {
      const v = formatMoeda(valorAPrazo / metodo.numero_parcelas)
      return [`${metodo.numero_parcelas}x de ${v} sem juros`]
    }
    return ['Pagamento integral conforme condições comerciais.']
  }

  return resultado
}
