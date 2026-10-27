import pb from '@/lib/pocketbase/client'
import { dataAdapter } from '@/lib/dataAdapter'
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
  return dataAdapter.getFullList<ClienteGrupo>('clientes_grupos', {
    sort: 'nome',
  })
}

export async function criarGrupo(dados: {
  nome: string
  descricao?: string
  ativo: boolean
  padrao?: boolean
}): Promise<ClienteGrupo> {
  return dataAdapter.create<ClienteGrupo>('clientes_grupos', dados)
}

export async function atualizarGrupo(
  id: string,
  dados: Partial<ClienteGrupo>,
): Promise<ClienteGrupo> {
  return dataAdapter.update<ClienteGrupo>('clientes_grupos', id, dados)
}

export async function excluirGrupo(id: string): Promise<void> {
  await dataAdapter.delete('clientes_grupos', id)
}

// ==================== 2. CLIENTES ====================
export async function listarClientes(): Promise<Cliente[]> {
  return dataAdapter.getFullList<Cliente>('clientes', {
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
  return dataAdapter.create<Cliente>('clientes', dados)
}

export async function atualizarCliente(id: string, dados: Partial<Cliente>): Promise<Cliente> {
  return dataAdapter.update<Cliente>('clientes', id, dados)
}

export async function excluirCliente(id: string): Promise<void> {
  await dataAdapter.delete('clientes', id)
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
  return dataAdapter.getFullList<OrcamentoServicoItem>('orcamento_servicos', options)
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
  return dataAdapter.create<OrcamentoServicoItem>('orcamento_servicos', dados)
}

export async function atualizarOrcamentoServico(
  id: string,
  dados: Partial<OrcamentoServicoItem>,
): Promise<OrcamentoServicoItem> {
  return dataAdapter.update<OrcamentoServicoItem>('orcamento_servicos', id, dados)
}

export async function excluirOrcamentoServico(id: string): Promise<void> {
  await dataAdapter.delete('orcamento_servicos', id)
}

export async function duplicarOrcamentoServico(
  servico: OrcamentoServicoItem,
  novoGrupoId?: string,
): Promise<OrcamentoServicoItem> {
  return dataAdapter.create<OrcamentoServicoItem>('orcamento_servicos', {
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
  const records = await dataAdapter.getFullList<MetodoPagamento>('metodos_pagamento', {
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
  const record = await dataAdapter.create<MetodoPagamento>('metodos_pagamento', dados)
  return {
    ...record,
    condicoes: parseCondicoes(record.condicoes),
  }
}

export async function atualizarMetodoPagamento(
  id: string,
  dados: Partial<MetodoPagamento>,
): Promise<MetodoPagamento> {
  const record = await dataAdapter.update<MetodoPagamento>('metodos_pagamento', id, dados)
  return {
    ...record,
    condicoes: parseCondicoes(record.condicoes),
  }
}

export async function excluirMetodoPagamento(id: string): Promise<void> {
  await dataAdapter.delete('metodos_pagamento', id)
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
    const rec = await dataAdapter.getFirstListItem<OrcamentoConfiguracao>(
      'orcamento_configuracoes',
      "chave = 'padrao'",
    )

    const pbBase = (pb.baseUrl || '').replace(/\/+$/, '')
    const logoUrl = rec.arquivo_logo
      ? `${pbBase}/api/files/${rec.collectionId || 'orcamento_configuracoes'}/${rec.id}/${rec.arquivo_logo}`
      : rec.logo_url || ''

    return {
      ...rec,
      logo_url: logoUrl,
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
  // Procura sempre se já existe um registro (por id fornecido ou pela chave 'padrao' ou primeiro registro)
  let existingId = dados.id
  if (!existingId) {
    try {
      const rec = await dataAdapter.getFirstListItem<OrcamentoConfiguracao>(
        'orcamento_configuracoes',
        "chave = 'padrao'",
      )
      existingId = rec.id
    } catch {
      try {
        const anyRec = await dataAdapter.getList<OrcamentoConfiguracao>('orcamento_configuracoes', {
          page: 1,
          perPage: 1,
        })
        if (anyRec.items && anyRec.items.length > 0) {
          existingId = anyRec.items[0].id
        }
      } catch {
        /* intentionally ignored */
      }
    }
  }

  const payload: any = {
    ...dados,
    chave: dados.chave || 'padrao',
  }
  // Remove id vazio para evitar tentar inserir string vazia ou chave inválida
  if (!existingId) {
    delete payload.id
  }

  if (existingId) {
    try {
      const updated = await dataAdapter.update<OrcamentoConfiguracao>(
        'orcamento_configuracoes',
        existingId,
        payload,
      )
      return {
        ...updated,
        nosso_compromisso: parseCompromisso(updated.nosso_compromisso),
      }
    } catch (updateErr: any) {
      console.warn('Falha no update direto de orcamento_configuracoes, tentando upsert:', updateErr)
      const upserted = await dataAdapter.upsert<OrcamentoConfiguracao>(
        'orcamento_configuracoes',
        { ...payload, id: existingId },
        { onConflict: 'id' },
      )
      return {
        ...upserted,
        nosso_compromisso: parseCompromisso(upserted.nosso_compromisso),
      }
    }
  } else {
    // Se não encontrou ID prévio, utiliza upsert por id/chave para evitar duplicate key
    try {
      const created = await dataAdapter.upsert<OrcamentoConfiguracao>(
        'orcamento_configuracoes',
        payload,
        { onConflict: 'id' },
      )
      return {
        ...created,
        nosso_compromisso: parseCompromisso(created.nosso_compromisso),
      }
    } catch {
      // Fallback final: se falhou por duplicate key, busca novamente e atualiza
      const existing = await dataAdapter.getFirstListItem<OrcamentoConfiguracao>(
        'orcamento_configuracoes',
        "chave = 'padrao'",
      )
      const updated = await dataAdapter.update<OrcamentoConfiguracao>(
        'orcamento_configuracoes',
        existing.id,
        payload,
      )
      return {
        ...updated,
        nosso_compromisso: parseCompromisso(updated.nosso_compromisso),
      }
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

  return dataAdapter.getFullList<PagamentoParcela>('pagamentos_parcelas', {
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

  return dataAdapter.update<PagamentoParcela>('pagamentos_parcelas', id, {
    status: 'paga',
    valor_pago: dados.valor_pago,
    ajuste: dados.ajuste || 0,
    data_pagamento: dataPgto,
    forma_pagamento: dados.forma_pagamento || 'PIX',
    observacoes_baixa: dados.observacoes_baixa || '',
  })
}

export async function estornarBaixaParcela(id: string): Promise<PagamentoParcela> {
  return dataAdapter.update<PagamentoParcela>('pagamentos_parcelas', id, {
    status: 'a_pagar',
    valor_pago: null,
    ajuste: 0,
    data_pagamento: null,
    observacoes_baixa: 'Baixa estornada em ' + new Date().toLocaleDateString('pt-BR'),
  })
}

export async function excluirParcela(id: string): Promise<void> {
  await dataAdapter.delete('pagamentos_parcelas', id)
}
