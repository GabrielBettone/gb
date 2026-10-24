import pb from '@/lib/pocketbase/client'
import type { Orcamento, StatusOrcamento, ItemOrcamento, CanalVenda, Venda } from '@/types'

export const ETAPAS_ORCAMENTO: StatusOrcamento[] = [
  'Orçamentos a realizar',
  'Aguardando aprovação',
  'Aprovados aguardando início',
  'Trabalhos iniciados',
  'Concluídos',
]

export const ETAPAS_CONFIG: Record<
  StatusOrcamento,
  { label: string; corBadge: string; corBorda: string; corHeader: string }
> = {
  'Orçamentos a realizar': {
    label: 'A Realizar',
    corBadge: 'bg-amber-100 text-amber-800 border-amber-300',
    corBorda: 'border-l-amber-500',
    corHeader: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  'Aguardando aprovação': {
    label: 'Aguard. Aprovação',
    corBadge: 'bg-blue-100 text-blue-800 border-blue-300',
    corBorda: 'border-l-blue-500',
    corHeader: 'bg-blue-50 text-blue-900 border-blue-200',
  },
  'Aprovados aguardando início': {
    label: 'Aprovados (Ag. Início)',
    corBadge: 'bg-purple-100 text-purple-800 border-purple-300',
    corBorda: 'border-l-purple-500',
    corHeader: 'bg-purple-50 text-purple-900 border-purple-200',
  },
  'Trabalhos iniciados': {
    label: 'Em Andamento',
    corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    corBorda: 'border-l-emerald-500',
    corHeader: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
  Concluídos: {
    label: 'Concluídos',
    corBadge: 'bg-[#1C4E3D]/10 text-[#1C4E3D] border-[#1C4E3D]/30',
    corBorda: 'border-l-[#1C4E3D]',
    corHeader: 'bg-[#EEF4F0] text-[#1C4E3D] border-[#1C4E3D]/20',
  },
}

/**
 * Normaliza os itens do orçamento (caso venham como string JSON do PocketBase)
 */
export function parseItens(itens: ItemOrcamento[] | string | undefined): ItemOrcamento[] {
  if (!itens) return []
  if (Array.isArray(itens)) return itens
  try {
    const parsed = JSON.parse(itens)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Gera o próximo número sequencial de orçamento no formato ORC-YYYY-XXXX
 */
export async function gerarProximoNumeroOrcamento(): Promise<string> {
  const anoAtual = new Date().getFullYear()
  const prefixo = `ORC-${anoAtual}-`

  try {
    const ultimos = await pb.collection<Orcamento>('orcamentos').getList(1, 1, {
      filter: `numero ~ '${prefixo}'`,
      sort: '-numero',
    })

    if (ultimos.items.length > 0) {
      const ultimoNumStr = ultimos.items[0].numero
      const partes = ultimoNumStr.split('-')
      if (partes.length >= 3) {
        const seq = parseInt(partes[2], 10)
        if (!isNaN(seq)) {
          const prox = (seq + 1).toString().padStart(4, '0')
          return `${prefixo}${prox}`
        }
      }
    }

    // Se nenhum achado com o ano atual, conta registros totais para garantir consistência
    const total = await pb.collection('orcamentos').getList(1, 1)
    const prox = (total.totalItems + 1).toString().padStart(4, '0')
    return `${prefixo}${prox}`
  } catch (e) {
    console.error('Erro ao gerar número de orçamento:', e)
    return `${prefixo}0001`
  }
}

/**
 * Busca a lista completa de orçamentos expandindo produto_principal
 */
export async function listarOrcamentos(): Promise<Orcamento[]> {
  const records = await pb.collection<Orcamento>('orcamentos').getFullList({
    sort: '-created',
    expand: 'produto_principal,cliente_cadastrado,grupo,metodo_pagamento',
  })

  // Normaliza campo itens
  return records.map((r) => ({
    ...r,
    itens: parseItens(r.itens),
  }))
}

/**
 * Criação de um novo orçamento
 */
export interface CriarOrcamentoDTO {
  cliente: string
  contato?: string
  cidade?: string
  canal_origem: CanalVenda
  status?: StatusOrcamento
  produto_principal?: string
  cliente_cadastrado?: string
  grupo?: string
  metodo_pagamento?: string
  valor_a_vista?: number
  valor_a_prazo?: number
  exibir_cnpj?: boolean
  itens: ItemOrcamento[]
  subtotal: number
  desconto: number
  valor_total: number
  data_inicio_prevista?: string
  data_fim_prevista?: string
  validade?: string
  observacoes?: string
}

export async function criarOrcamento(dados: CriarOrcamentoDTO): Promise<Orcamento> {
  const numero = await gerarProximoNumeroOrcamento()
  const status = dados.status || 'Orçamentos a realizar'

  const record = await pb.collection<Orcamento>('orcamentos').create({
    numero,
    cliente: dados.cliente.trim(),
    contato: dados.contato?.trim() || '',
    cidade: dados.cidade?.trim() || 'São Pedro',
    canal_origem: dados.canal_origem,
    status,
    produto_principal: dados.produto_principal || null,
    cliente_cadastrado: dados.cliente_cadastrado || null,
    grupo: dados.grupo || null,
    metodo_pagamento: dados.metodo_pagamento || null,
    valor_a_vista: dados.valor_a_vista ?? null,
    valor_a_prazo: dados.valor_a_prazo ?? null,
    exibir_cnpj: dados.exibir_cnpj ?? true,
    itens: dados.itens,
    subtotal: dados.subtotal,
    desconto: dados.desconto,
    valor_total: dados.valor_total,
    data_inicio_prevista: dados.data_inicio_prevista
      ? `${dados.data_inicio_prevista} 12:00:00.000Z`
      : null,
    data_fim_prevista: dados.data_fim_prevista ? `${dados.data_fim_prevista} 12:00:00.000Z` : null,
    validade: dados.validade ? `${dados.validade} 12:00:00.000Z` : null,
    observacoes: dados.observacoes?.trim() || '',
  })

  // Se já for criado em etapa avançada, gera a agenda
  if (
    status === 'Aprovados aguardando início' ||
    status === 'Trabalhos iniciados' ||
    status === 'Concluídos'
  ) {
    await gerarAgendaPagamentoSeNaoExistir(record)
  }

  // Se já for criado como Concluído (caso raro), dispara sincronização de venda
  if (status === 'Concluídos') {
    await sincronizarVendaAoConcluir(record)
  }

  return record
}

/**
 * Atualiza um orçamento existente
 */
export async function atualizarOrcamento(
  id: string,
  dados: Partial<CriarOrcamentoDTO> & { status?: StatusOrcamento; data_conclusao?: string },
): Promise<Orcamento> {
  const payload: Record<string, any> = {}

  if (dados.cliente !== undefined) payload.cliente = dados.cliente.trim()
  if (dados.contato !== undefined) payload.contato = dados.contato.trim()
  if (dados.cidade !== undefined) payload.cidade = dados.cidade.trim()
  if (dados.canal_origem !== undefined) payload.canal_origem = dados.canal_origem
  if (dados.status !== undefined) payload.status = dados.status
  if (dados.produto_principal !== undefined)
    payload.produto_principal = dados.produto_principal || null
  if (dados.cliente_cadastrado !== undefined)
    payload.cliente_cadastrado = dados.cliente_cadastrado || null
  if (dados.grupo !== undefined) payload.grupo = dados.grupo || null
  if (dados.metodo_pagamento !== undefined)
    payload.metodo_pagamento = dados.metodo_pagamento || null
  if (dados.valor_a_vista !== undefined) payload.valor_a_vista = dados.valor_a_vista
  if (dados.valor_a_prazo !== undefined) payload.valor_a_prazo = dados.valor_a_prazo
  if (dados.exibir_cnpj !== undefined) payload.exibir_cnpj = dados.exibir_cnpj
  if (dados.itens !== undefined) payload.itens = dados.itens
  if (dados.subtotal !== undefined) payload.subtotal = dados.subtotal
  if (dados.desconto !== undefined) payload.desconto = dados.desconto
  if (dados.valor_total !== undefined) payload.valor_total = dados.valor_total
  if (dados.data_inicio_prevista !== undefined) {
    payload.data_inicio_prevista = dados.data_inicio_prevista
      ? dados.data_inicio_prevista.includes('Z')
        ? dados.data_inicio_prevista
        : `${dados.data_inicio_prevista} 12:00:00.000Z`
      : null
  }
  if (dados.data_fim_prevista !== undefined) {
    payload.data_fim_prevista = dados.data_fim_prevista
      ? dados.data_fim_prevista.includes('Z')
        ? dados.data_fim_prevista
        : `${dados.data_fim_prevista} 12:00:00.000Z`
      : null
  }
  if (dados.data_conclusao !== undefined) {
    payload.data_conclusao = dados.data_conclusao
      ? dados.data_conclusao.includes('Z')
        ? dados.data_conclusao
        : `${dados.data_conclusao} 12:00:00.000Z`
      : null
  }
  if (dados.validade !== undefined) {
    payload.validade = dados.validade
      ? dados.validade.includes('Z')
        ? dados.validade
        : `${dados.validade} 12:00:00.000Z`
      : null
  }
  if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes.trim()

  const updated = await pb.collection<Orcamento>('orcamentos').update(id, payload, {
    expand: 'produto_principal,cliente_cadastrado,grupo,metodo_pagamento',
  })

  // Se passou para 'Aprovados aguardando início', 'Trabalhos iniciados' ou 'Concluídos', gera a agenda de pagamentos
  if (
    dados.status === 'Aprovados aguardando início' ||
    dados.status === 'Trabalhos iniciados' ||
    dados.status === 'Concluídos'
  ) {
    await gerarAgendaPagamentoSeNaoExistir(updated)
  }

  // Se passou para 'Concluídos', sincronizar venda de forma idempotente
  if (dados.status === 'Concluídos') {
    await sincronizarVendaAoConcluir(updated)
  }

  return {
    ...updated,
    itens: parseItens(updated.itens),
  }
}

/**
 * Atualiza apenas o status de um orçamento (usado no Drag-and-Drop do Kanban)
 */
export async function atualizarStatusOrcamento(
  id: string,
  novoStatus: StatusOrcamento,
): Promise<Orcamento> {
  const agoraIso = new Date().toISOString()
  const payload: Record<string, any> = {
    status: novoStatus,
  }

  if (novoStatus === 'Concluídos') {
    payload.data_conclusao = agoraIso
  }

  const updated = await pb.collection<Orcamento>('orcamentos').update(id, payload, {
    expand: 'produto_principal,cliente_cadastrado,grupo,metodo_pagamento',
  })

  if (
    novoStatus === 'Aprovados aguardando início' ||
    novoStatus === 'Trabalhos iniciados' ||
    novoStatus === 'Concluídos'
  ) {
    await gerarAgendaPagamentoSeNaoExistir(updated)
  }

  if (novoStatus === 'Concluídos') {
    await sincronizarVendaAoConcluir(updated)
  }

  return {
    ...updated,
    itens: parseItens(updated.itens),
  }
}

/**
 * Atualiza datas de cronograma (usado no Drag-and-Drop / Redimensionamento do Gantt)
 */
export async function atualizarDatasGantt(
  id: string,
  dataInicioPrevista: string,
  dataFimPrevista: string,
): Promise<Orcamento> {
  const dInicioStr = dataInicioPrevista.includes('Z')
    ? dataInicioPrevista
    : `${dataInicioPrevista.substring(0, 10)} 12:00:00.000Z`
  const dFimStr = dataFimPrevista.includes('Z')
    ? dataFimPrevista
    : `${dataFimPrevista.substring(0, 10)} 12:00:00.000Z`

  const updated = await pb.collection<Orcamento>('orcamentos').update(
    id,
    {
      data_inicio_prevista: dInicioStr,
      data_fim_prevista: dFimStr,
    },
    {
      expand: 'produto_principal',
    },
  )

  return {
    ...updated,
    itens: parseItens(updated.itens),
  }
}

/**
 * Exclui um orçamento
 */
export async function excluirOrcamento(id: string): Promise<void> {
  await pb.collection('orcamentos').delete(id)
}

/**
 * Sincroniza uma venda correspondente ao concluir um trabalho/orçamento (REQUISITO 7)
 * Evita duplicidade através do campo 'orcamento' na coleção vendas.
 */
/**
 * Gera a agenda de pagamentos (parcelas em pagamentos_parcelas) conforme o método de pagamento selecionado
 * - À vista = 1 parcela (com valor à vista com desconto)
 * - Entrada + saldo = 2 parcelas (entrada na aprovação/início, saldo na entrega)
 * - Parcelado = N parcelas mensais iguais a partir da data base
 */
export async function gerarAgendaPagamentoSeNaoExistir(orcamento: Orcamento): Promise<void> {
  try {
    // 1. Verifica se já existem parcelas para este orçamento
    const existentes = await pb.collection('pagamentos_parcelas').getList(1, 1, {
      filter: `orcamento = '${orcamento.id}'`,
    })
    if (existentes.totalItems > 0) {
      return // Já possui parcelas cadastradas, não recria
    }

    // 2. Busca método de pagamento do orçamento
    let metodo: any = null
    if (orcamento.metodo_pagamento) {
      try {
        metodo = await pb.collection('metodos_pagamento').getOne(orcamento.metodo_pagamento)
      } catch {
        /* intentionally ignored */
      }
    }

    const hoje = new Date()
    const addDays = (d: Date, days: number) => {
      const res = new Date(d.getTime())
      res.setDate(res.getDate() + days)
      return `${res.getFullYear()}-${String(res.getMonth() + 1).padStart(2, '0')}-${String(
        res.getDate(),
      ).padStart(2, '0')} 12:00:00.000Z`
    }

    const addMonths = (d: Date, months: number) => {
      const res = new Date(d.getTime())
      res.setMonth(res.getMonth() + months)
      return `${res.getFullYear()}-${String(res.getMonth() + 1).padStart(2, '0')}-${String(
        res.getDate(),
      ).padStart(2, '0')} 12:00:00.000Z`
    }

    const valorTotal = orcamento.valor_total || 0
    const valorAVista = orcamento.valor_a_vista || valorTotal
    const nomeMetodo = (metodo?.nome || '').toLowerCase()
    const numParcelasMetodo = metodo?.numero_parcelas || 1

    if (numParcelasMetodo === 1 || nomeMetodo.includes('vista')) {
      // 1 Parcela: Valor com desconto à vista
      await pb.collection('pagamentos_parcelas').create({
        orcamento: orcamento.id,
        numero_parcela: 1,
        total_parcelas: 1,
        descricao: 'Pagamento à vista com desconto',
        valor_previsto: valorAVista,
        data_vencimento: addDays(hoje, 5),
        status: 'a_pagar',
      })
    } else if (numParcelasMetodo === 2 || nomeMetodo.includes('entrada')) {
      // 2 Parcelas: Entrada (50%) + Saldo na entrega (50%)
      const valEntrada = Math.round((valorTotal / 2) * 100) / 100
      const valSaldo = Math.round((valorTotal - valEntrada) * 100) / 100

      await pb.collection('pagamentos_parcelas').create({
        orcamento: orcamento.id,
        numero_parcela: 1,
        total_parcelas: 2,
        descricao: 'Entrada na assinatura/início da obra',
        valor_previsto: valEntrada,
        data_vencimento: addDays(hoje, 3),
        status: 'a_pagar',
      })

      // Vencimento do saldo: data_fim_prevista ou em 20 dias
      const vencimentoSaldo = orcamento.data_fim_prevista
        ? orcamento.data_fim_prevista
        : addDays(hoje, 20)

      await pb.collection('pagamentos_parcelas').create({
        orcamento: orcamento.id,
        numero_parcela: 2,
        total_parcelas: 2,
        descricao: 'Saldo final na entrega e vistoria da obra',
        valor_previsto: valSaldo,
        data_vencimento: vencimentoSaldo,
        status: 'a_pagar',
      })
    } else {
      // N Parcelas mensais iguais
      const n = Math.max(2, numParcelasMetodo)
      const valorParcela = Math.round((valorTotal / n) * 100) / 100

      for (let i = 1; i <= n; i++) {
        const val =
          i === n ? Math.round((valorTotal - valorParcela * (n - 1)) * 100) / 100 : valorParcela
        await pb.collection('pagamentos_parcelas').create({
          orcamento: orcamento.id,
          numero_parcela: i,
          total_parcelas: n,
          descricao: `Parcela ${i}/${n} - Cartão / Boleto`,
          valor_previsto: val,
          data_vencimento: addMonths(hoje, i - 1),
          status: 'a_pagar',
        })
      }
    }
  } catch (e) {
    console.error('Erro ao gerar agenda de pagamentos para o orçamento:', e)
  }
}

/**
 * Sincroniza uma venda correspondente ao concluir um trabalho/orçamento
 * Evita duplicidade através do campo 'orcamento' na coleção vendas.
 */
export async function sincronizarVendaAoConcluir(orcamento: Orcamento): Promise<Venda | null> {
  try {
    // 1. Verifica se já existe venda com este orcamento vinculado
    try {
      const existing = await pb
        .collection<Venda>('vendas')
        .getFirstListItem(`orcamento = '${orcamento.id}'`)
      if (existing) {
        return existing
      }
    } catch {
      // Nenhum registro encontrado, prossiga com a criação
    }

    // 2. Se não tem produto_principal definido, tenta pegar do primeiro item ou produto padrão
    let produtoId = orcamento.produto_principal
    if (!produtoId) {
      const itens = parseItens(orcamento.itens)
      if (itens.length > 0 && itens[0].produto_id) {
        produtoId = itens[0].produto_id
      } else {
        const primeiroProd = await pb
          .collection('produtos')
          .getList(1, 1, { filter: 'ativo = true' })
        if (primeiroProd.items.length > 0) {
          produtoId = primeiroProd.items[0].id
        }
      }
    }

    if (!produtoId) {
      console.warn(
        'Não foi possível identificar o produto para gerar a venda do orçamento:',
        orcamento.id,
      )
      return null
    }

    // 3. Data da venda = data de conclusão do orçamento (ou hoje)
    const dataVenda = orcamento.data_conclusao ? orcamento.data_conclusao : new Date().toISOString()

    const novaVenda = await pb.collection<Venda>('vendas').create({
      data: dataVenda,
      cliente: orcamento.cliente,
      produto: produtoId,
      canal: orcamento.canal_origem,
      cidade: orcamento.cidade || 'São Pedro',
      valor: orcamento.valor_total,
      orcamento: orcamento.id,
    })

    return novaVenda
  } catch (e) {
    console.error('Erro ao sincronizar venda para o orçamento concluído:', e)
    return null
  }
}
