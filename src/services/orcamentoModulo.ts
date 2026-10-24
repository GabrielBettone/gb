import pb from '@/lib/pocketbase/client'
import type {
  ClienteGrupo,
  Cliente,
  OrcamentoServicoItem,
  MetodoPagamento,
  OrcamentoConfiguracao,
  PagamentoParcela,
  Orcamento,
} from '@/types'

// ==================== 1. GRUPOS DE CLIENTES ====================
export async function listarGrupos(): Promise<ClienteGrupo[]> {
  return pb.collection<ClienteGrupo>('clientes_grupos').getFullList({
    sort: 'nome',
  })
}

export async function criarGrupo(dados: {
  nome: string
  descricao?: string
  ativo: boolean
  padrao?: boolean
}): Promise<ClienteGrupo> {
  return pb.collection<ClienteGrupo>('clientes_grupos').create(dados)
}

export async function atualizarGrupo(
  id: string,
  dados: Partial<ClienteGrupo>,
): Promise<ClienteGrupo> {
  return pb.collection<ClienteGrupo>('clientes_grupos').update(id, dados)
}

export async function excluirGrupo(id: string): Promise<void> {
  await pb.collection('clientes_grupos').delete(id)
}

// ==================== 2. CLIENTES ====================
export async function listarClientes(): Promise<Cliente[]> {
  return pb.collection<Cliente>('clientes').getFullList({
    sort: 'nome',
    expand: 'grupo',
  })
}

export async function criarCliente(dados: {
  nome: string
  grupo: string
  documento?: string
  whatsapp?: string
  email?: string
  cidade?: string
  endereco?: string
  observacoes?: string
}): Promise<Cliente> {
  return pb.collection<Cliente>('clientes').create(dados, { expand: 'grupo' })
}

export async function atualizarCliente(id: string, dados: Partial<Cliente>): Promise<Cliente> {
  return pb.collection<Cliente>('clientes').update(id, dados, { expand: 'grupo' })
}

export async function excluirCliente(id: string): Promise<void> {
  await pb.collection('clientes').delete(id)
}

// ==================== 3. SERVIÇOS E PREÇOS DO ORÇAMENTO ====================
export async function listarOrcamentoServicos(grupoId?: string): Promise<OrcamentoServicoItem[]> {
  const options: Record<string, any> = {
    sort: 'nome',
    expand: 'grupo',
  }
  if (grupoId && grupoId !== 'todos') {
    options.filter = `grupo = '${grupoId}'`
  }
  return pb.collection<OrcamentoServicoItem>('orcamento_servicos').getFullList(options)
}

export async function criarOrcamentoServico(dados: {
  nome: string
  grupo: string
  modo_calculo: 'area' | 'dimensoes'
  unidade: string
  preco_unitario: number
  descricao_pdf?: string
  ativo: boolean
  site_service?: string
}): Promise<OrcamentoServicoItem> {
  return pb
    .collection<OrcamentoServicoItem>('orcamento_servicos')
    .create(dados, { expand: 'grupo' })
}

export async function atualizarOrcamentoServico(
  id: string,
  dados: Partial<OrcamentoServicoItem>,
): Promise<OrcamentoServicoItem> {
  return pb
    .collection<OrcamentoServicoItem>('orcamento_servicos')
    .update(id, dados, { expand: 'grupo' })
}

export async function excluirOrcamentoServico(id: string): Promise<void> {
  await pb.collection('orcamento_servicos').delete(id)
}

export async function duplicarOrcamentoServico(
  servico: OrcamentoServicoItem,
  novoGrupoId?: string,
): Promise<OrcamentoServicoItem> {
  return pb.collection<OrcamentoServicoItem>('orcamento_servicos').create({
    nome: `${servico.nome} (Cópia)`,
    grupo: novoGrupoId || servico.grupo,
    modo_calculo: servico.modo_calculo,
    unidade: servico.unidade,
    preco_unitario: servico.preco_unitario,
    descricao_pdf: servico.descricao_pdf,
    ativo: servico.ativo,
    site_service: servico.site_service,
  })
}

// ==================== 4. MÉTODOS DE PAGAMENTO ====================
export function parseCondicoes(condicoes: string[] | string | undefined): string[] {
  if (!condicoes) return []
  if (Array.isArray(condicoes)) return condicoes
  try {
    const p = JSON.parse(condicoes)
    return Array.isArray(p) ? p : []
  } catch {
    return [condicoes]
  }
}

export async function listarMetodosPagamento(): Promise<MetodoPagamento[]> {
  const records = await pb.collection<MetodoPagamento>('metodos_pagamento').getFullList({
    sort: '-padrao,nome',
  })
  return records.map((m) => ({
    ...m,
    condicoes: parseCondicoes(m.condicoes),
  }))
}

export async function criarMetodoPagamento(dados: {
  nome: string
  desconto_a_vista?: number
  condicoes?: string[]
  numero_parcelas?: number
  padrao?: boolean
  ativo: boolean
}): Promise<MetodoPagamento> {
  const record = await pb.collection<MetodoPagamento>('metodos_pagamento').create(dados)
  return {
    ...record,
    condicoes: parseCondicoes(record.condicoes),
  }
}

export async function atualizarMetodoPagamento(
  id: string,
  dados: Partial<MetodoPagamento>,
): Promise<MetodoPagamento> {
  const record = await pb.collection<MetodoPagamento>('metodos_pagamento').update(id, dados)
  return {
    ...record,
    condicoes: parseCondicoes(record.condicoes),
  }
}

export async function excluirMetodoPagamento(id: string): Promise<void> {
  await pb.collection('metodos_pagamento').delete(id)
}

// ==================== 5. CONFIGURAÇÕES DO ORÇAMENTO ====================
export function parseCompromisso(compromisso: string[] | string | undefined): string[] {
  if (!compromisso) return []
  if (Array.isArray(compromisso)) return compromisso
  try {
    const p = JSON.parse(compromisso)
    return Array.isArray(p) ? p : []
  } catch {
    return [compromisso]
  }
}

export async function obterConfiguracoesOrcamento(): Promise<OrcamentoConfiguracao> {
  try {
    const rec = await pb
      .collection<OrcamentoConfiguracao>('orcamento_configuracoes')
      .getFirstListItem("chave = 'padrao'")
    return {
      ...rec,
      nosso_compromisso: parseCompromisso(rec.nosso_compromisso),
    }
  } catch {
    // Retorna fallback se ainda não houver
    return {
      id: '',
      chave: 'padrao',
      razao_social: 'Gesso Bettone Comércio e Instalações Eireli',
      nome_fantasia: 'Gesso Bettone',
      cnpj: '32.185.940/0001-72',
      exibir_cnpj_padrao: true,
      nosso_compromisso: [
        'Utilização de matérias-primas e gesso de alta pureza certificados pelas normas ABNT',
        'Mão de obra altamente qualificada com experiência de mais de 15 anos no mercado',
        'Cumprimento rigoroso do cronograma de início e entrega acordado',
        'Garantia estrutural de 5 anos sobre os serviços executados',
      ],
      telefone: '(19) 99767-1189',
      email: 'contato@gessobettone.com.br',
      cidade: 'São Pedro/SP',
    } as OrcamentoConfiguracao
  }
}

export async function salvarConfiguracoesOrcamento(
  dados: Partial<OrcamentoConfiguracao>,
): Promise<OrcamentoConfiguracao> {
  let existingId = dados.id
  if (!existingId) {
    try {
      const rec = await pb
        .collection<OrcamentoConfiguracao>('orcamento_configuracoes')
        .getFirstListItem("chave = 'padrao'")
      existingId = rec.id
    } catch {
      /* intentionally ignored */
    }
  }

  if (existingId) {
    const updated = await pb
      .collection<OrcamentoConfiguracao>('orcamento_configuracoes')
      .update(existingId, dados)
    return {
      ...updated,
      nosso_compromisso: parseCompromisso(updated.nosso_compromisso),
    }
  } else {
    const created = await pb
      .collection<OrcamentoConfiguracao>('orcamento_configuracoes')
      .create({ ...dados, chave: 'padrao' })
    return {
      ...created,
      nosso_compromisso: parseCompromisso(created.nosso_compromisso),
    }
  }
}

// ==================== 6. PARCELAS DE PAGAMENTO / CONTAS A RECEBER ====================
export async function listarParcelasPagamento(filtros?: {
  status?: string
  orcamentoId?: string
  dataInicio?: string
  dataFim?: string
}): Promise<PagamentoParcela[]> {
  const parts: string[] = []

  if (filtros?.status && filtros.status !== 'todos') {
    parts.push(`status = '${filtros.status}'`)
  }
  if (filtros?.orcamentoId) {
    parts.push(`orcamento = '${filtros.orcamentoId}'`)
  }
  if (filtros?.dataInicio) {
    parts.push(`data_vencimento >= '${filtros.dataInicio} 00:00:00.000Z'`)
  }
  if (filtros?.dataFim) {
    parts.push(`data_vencimento <= '${filtros.dataFim} 23:59:59.999Z'`)
  }

  return pb.collection<PagamentoParcela>('pagamentos_parcelas').getFullList({
    filter: parts.length > 0 ? parts.join(' && ') : undefined,
    sort: 'data_vencimento',
    expand: 'orcamento',
  })
}

export async function darBaixaParcela(
  id: string,
  dados: {
    valor_pago: number
    ajuste?: number
    data_pagamento?: string
    forma_pagamento?: string
    observacoes_baixa?: string
  },
): Promise<PagamentoParcela> {
  const dataPgto = dados.data_pagamento
    ? `${dados.data_pagamento.substring(0, 10)} 12:00:00.000Z`
    : new Date().toISOString()

  return pb.collection<PagamentoParcela>('pagamentos_parcelas').update(
    id,
    {
      status: 'paga',
      valor_pago: dados.valor_pago,
      ajuste: dados.ajuste || 0,
      data_pagamento: dataPgto,
      forma_pagamento: dados.forma_pagamento || 'PIX',
      observacoes_baixa: dados.observacoes_baixa || '',
    },
    { expand: 'orcamento' },
  )
}

export async function estornarBaixaParcela(id: string): Promise<PagamentoParcela> {
  return pb.collection<PagamentoParcela>('pagamentos_parcelas').update(
    id,
    {
      status: 'a_pagar',
      valor_pago: null,
      ajuste: 0,
      data_pagamento: null,
      observacoes_baixa: 'Baixa estornada em ' + new Date().toLocaleDateString('pt-BR'),
    },
    { expand: 'orcamento' },
  )
}

export async function excluirParcela(id: string): Promise<void> {
  await pb.collection('pagamentos_parcelas').delete(id)
}
