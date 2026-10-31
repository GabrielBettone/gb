import pb from '@/lib/pocketbase/client'
import { dataAdapter } from '@/lib/dataAdapter'
import type {
  ClienteGrupo,
  Cliente,
  OrcamentoServicoItem,
  MetodoPagamento,
  OrcamentoConfiguracao,
  PagamentoParcela,
  ParcelaRecebimento,
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
    expand: 'grupo,unidade_padrao',
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
  unidade_padrao_id?: string
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
    unidade_padrao_id: servico.unidade_padrao_id,
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
      linha_descritiva: rec.linha_descritiva || '',
      nosso_compromisso: parseCompromisso(rec.nosso_compromisso),
    }
  } catch {
    // Retorna fallback se ainda não houver
    return {
      id: '',
      chave: 'padrao',
      razao_social: 'Gesso Bettone Comércio e Instalações Eireli',
      nome_fantasia: 'Gesso Bettone',
      linha_descritiva: 'Comércio & Instalações de Gesso, Drywall e Acabamentos Finos',
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
        const anyRec = await dataAdapter.getList<OrcamentoConfiguracao>(
          'orcamento_configuracoes',
          1,
          1,
        )
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

/**
 * Lista todos os recebimentos registrados para uma parcela ou orçamento
 */
export async function listarRecebimentosParcela(parcelaId: string): Promise<ParcelaRecebimento[]> {
  try {
    return await dataAdapter.getFullList<ParcelaRecebimento>('parcela_recebimentos', {
      filter: `parcela = '${parcelaId}'`,
      sort: 'data_pagamento',
    })
  } catch (err) {
    console.warn('Erro ao listar recebimentos da parcela:', err)
    return []
  }
}

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

  const parcelas = await dataAdapter.getFullList<PagamentoParcela>('pagamentos_parcelas', {
    filter: parts.length > 0 ? parts.join(' && ') : undefined,
    sort: 'data_vencimento',
    expand: 'orcamento,recebimentos',
  })

  // Se o backend for PocketBase ou não tiver preenchido os recebimentos pela expansão:
  const idsSemRecebimentos = parcelas
    .filter((p) => !p.recebimentos && !p.expand?.recebimentos)
    .map((p) => p.id)

  if (idsSemRecebimentos.length > 0) {
    try {
      const todosRecs = await dataAdapter.getFullList<ParcelaRecebimento>('parcela_recebimentos', {
        sort: 'data_pagamento',
      })
      parcelas.forEach((p) => {
        if (!p.recebimentos && !p.expand?.recebimentos) {
          const recsDaParcela = todosRecs.filter(
            (r: any) => r.parcela === p.id || r.parcela_id === p.id,
          )
          p.recebimentos = recsDaParcela
          p.expand = {
            ...(p.expand || {}),
            recebimentos: recsDaParcela,
          }
        } else if (!p.recebimentos && p.expand?.recebimentos) {
          p.recebimentos = p.expand.recebimentos
        }
      })
    } catch {
      /* ignora se tabela ainda não tiver registros */
    }
  } else {
    parcelas.forEach((p) => {
      if (!p.recebimentos && p.expand?.recebimentos) {
        p.recebimentos = p.expand.recebimentos
      }
    })
  }

  return parcelas
}

/**
 * Registra um recebimento (total ou parcial) em uma parcela.
 * Atualiza o histórico em parcela_recebimentos e recalcula o status e total da parcela:
 * - Se soma(recebimentos) >= valor_previsto: status vira 'paga'
 * - Se soma(recebimentos) > 0 e < valor_previsto: status vira 'parcial'
 */
export async function registrarRecebimentoParcela(
  parcelaId: string,
  dados: {
    valor: number
    data_pagamento?: string
    forma_pagamento?: string
    observacao?: string
    orcamentoId?: string
  },
): Promise<{ parcela: PagamentoParcela; recebimento: ParcelaRecebimento }> {
  const parcela = await dataAdapter.getOne<PagamentoParcela>('pagamentos_parcelas', parcelaId)
  const orcId = dados.orcamentoId || parcela.orcamento || parcela.orcamento_id || ''

  const dataPgtoIso = dados.data_pagamento
    ? `${dados.data_pagamento.substring(0, 10)} 12:00:00.000Z`
    : new Date().toISOString()

  // 1. Cria o recebimento persistido na tabela parcela_recebimentos
  const novoRec = await dataAdapter.create<ParcelaRecebimento>('parcela_recebimentos', {
    parcela: parcelaId,
    parcela_id: parcelaId,
    orcamento: orcId,
    orcamento_id: orcId,
    valor: dados.valor,
    data_pagamento: dataPgtoIso,
    forma_pagamento: dados.forma_pagamento || 'PIX',
    observacao: dados.observacao || '',
  })

  // 2. Busca todos os recebimentos desta parcela para somar com precisão
  const recs = await listarRecebimentosParcela(parcelaId)
  const somaRecebida = recs.reduce((acc, r) => acc + (Number(r.valor) || 0), 0)
  const valorPrevisto = Number(parcela.valor_previsto) || 0

  // Se somatório cobre o valor previsto (com tolerância de 5 centavos para arredondamento)
  const quitada = somaRecebida >= valorPrevisto - 0.05
  const novoStatus = quitada ? 'paga' : 'parcial'

  const ultDataPgto = recs.length > 0 ? recs[recs.length - 1].data_pagamento : dataPgtoIso
  const ultFormaPgto =
    recs.length > 0 ? recs[recs.length - 1].forma_pagamento : dados.forma_pagamento || 'PIX'

  const parcelaAtualizada = await dataAdapter.update<PagamentoParcela>(
    'pagamentos_parcelas',
    parcelaId,
    {
      status: novoStatus,
      valor_pago: Math.round(somaRecebida * 100) / 100,
      data_pagamento: ultDataPgto,
      forma_pagamento: ultFormaPgto,
      observacoes_baixa: quitada
        ? `Quitada integralmente (${recs.length} recebimento(s))`
        : `Baixa parcial registrada: ${recs.length} recebimento(s)`,
    },
  )

  parcelaAtualizada.recebimentos = recs
  return { parcela: parcelaAtualizada, recebimento: novoRec }
}

/**
 * Remove um recebimento do histórico da parcela e recalcula o status da parcela:
 * - Se restarem recebimentos > 0 e < valor_previsto: status 'parcial'
 * - Se restarem recebimentos cobrindo o valor: status 'paga'
 * - Se não restar nenhum recebimento: volta para 'a_pagar'
 */
export async function excluirRecebimento(
  recebimentoId: string,
  parcelaId: string,
): Promise<PagamentoParcela> {
  await dataAdapter.delete('parcela_recebimentos', recebimentoId)

  const recsRestantes = await listarRecebimentosParcela(parcelaId)
  const parcela = await dataAdapter.getOne<PagamentoParcela>('pagamentos_parcelas', parcelaId)
  const valorPrevisto = Number(parcela.valor_previsto) || 0
  const somaRecebida = recsRestantes.reduce((acc, r) => acc + (Number(r.valor) || 0), 0)

  let novoStatus: 'a_pagar' | 'parcial' | 'paga' = 'a_pagar'
  if (recsRestantes.length > 0) {
    novoStatus = somaRecebida >= valorPrevisto - 0.05 ? 'paga' : 'parcial'
  }

  const ultData =
    recsRestantes.length > 0 ? recsRestantes[recsRestantes.length - 1].data_pagamento : null
  const ultForma =
    recsRestantes.length > 0 ? recsRestantes[recsRestantes.length - 1].forma_pagamento : null

  const updated = await dataAdapter.update<PagamentoParcela>('pagamentos_parcelas', parcelaId, {
    status: novoStatus,
    valor_pago: recsRestantes.length > 0 ? Math.round(somaRecebida * 100) / 100 : null,
    data_pagamento: ultData,
    forma_pagamento: ultForma,
    observacoes_baixa:
      recsRestantes.length > 0
        ? `Recebimento estornado. Saldo restante: ${novoStatus}`
        : 'Todos os recebimentos foram estornados.',
  })

  updated.recebimentos = recsRestantes
  return updated
}

/**
 * Baixa rápida retrocompatível (cria recebimento e quita a parcela)
 */
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
  const result = await registrarRecebimentoParcela(id, {
    valor: dados.valor_pago,
    data_pagamento: dados.data_pagamento,
    forma_pagamento: dados.forma_pagamento,
    observacao: dados.observacoes_baixa,
  })

  if (dados.ajuste) {
    await dataAdapter.update('pagamentos_parcelas', id, {
      ajuste: dados.ajuste,
    })
  }

  return result.parcela
}

/**
 * Estorna a parcela:
 * - Se houver múltiplos recebimentos e o usuário solicitar estorno geral,
 *   remove todos os recebimentos e devolve a parcela para 'a_pagar'.
 * - Se a parcela tiver recebimentos parciais residuais (ou estorno do último recebimento),
 *   devolve ao status 'parcial' quando ainda houver saldo pago registrado (> 0).
 */
export async function estornarBaixaParcela(
  id: string,
  apenasUltimoRecebimento = false,
): Promise<PagamentoParcela> {
  const recs = await listarRecebimentosParcela(id)

  if (recs.length > 0) {
    if (apenasUltimoRecebimento) {
      // Estorna apenas o último recebimento registrado
      const ultimo = recs[recs.length - 1]
      return await excluirRecebimento(ultimo.id, id)
    } else {
      // Estorna TODOS os recebimentos desta parcela
      for (const r of recs) {
        await dataAdapter.delete('parcela_recebimentos', r.id)
      }
    }
  }

  return dataAdapter.update<PagamentoParcela>('pagamentos_parcelas', id, {
    status: 'a_pagar',
    valor_pago: null,
    ajuste: 0,
    data_pagamento: null,
    observacoes_baixa: 'Baixa estornada em ' + new Date().toLocaleDateString('pt-BR'),
  })
}

export async function excluirParcela(id: string): Promise<void> {
  // Limpa recebimentos vinculados primeiro
  const recs = await listarRecebimentosParcela(id)
  for (const r of recs) {
    try {
      await dataAdapter.delete('parcela_recebimentos', r.id)
    } catch {
      /* ignore */
    }
  }
  await dataAdapter.delete('pagamentos_parcelas', id)
}

export interface ItemReajusteParcela {
  id?: string
  numero_parcela: number
  total_parcelas: number
  descricao?: string
  valor_previsto: number
  data_vencimento: string
  status?: 'a_pagar' | 'parcial' | 'paga' | 'cancelada'
}

/**
 * Reajusta integralmente o parcelamento de um orçamento:
 * - Preserva parcelas que já possuem recebimentos ou status 'paga' / 'parcial'
 * - Remove ou atualiza parcelas sem pagamentos
 * - Insere novas parcelas com datas de vencimento e valores definidos pelo usuário
 */
export async function reajustarParcelamentoOrcamento(
  orcamentoId: string,
  novasParcelas: ItemReajusteParcela[],
): Promise<PagamentoParcela[]> {
  // 1. Busca parcelas existentes
  const existentes = await listarParcelasPagamento({ orcamentoId })

  // 2. Protege parcelas que já receberam algum pagamento
  const parcelasComRecebimento = existentes.filter(
    (p) =>
      p.status === 'paga' ||
      p.status === 'parcial' ||
      (p.recebimentos && p.recebimentos.length > 0),
  )
  const idsProtegidos = new Set(parcelasComRecebimento.map((p) => p.id))

  // 3. Remove parcelas em aberto ('a_pagar' ou 'cancelada') que não constam nas protegidas
  const parcelasParaRemover = existentes.filter((p) => !idsProtegidos.has(p.id))
  for (const p of parcelasParaRemover) {
    await dataAdapter.delete('pagamentos_parcelas', p.id)
  }

  // 4. Cria as novas parcelas ajustadas
  const criadas: PagamentoParcela[] = []
  const total = novasParcelas.length

  for (let i = 0; i < total; i++) {
    const item = novasParcelas[i]
    const num = i + 1

    const vencimentoIso =
      item.data_vencimento.includes('T') || item.data_vencimento.includes('Z')
        ? item.data_vencimento
        : `${item.data_vencimento.substring(0, 10)} 12:00:00.000Z`

    const nova = await dataAdapter.create<PagamentoParcela>('pagamentos_parcelas', {
      orcamento: orcamentoId,
      orcamento_id: orcamentoId,
      numero_parcela: num,
      total_parcelas: total,
      descricao: item.descricao || `Parcela ${num}/${total}`,
      valor_previsto: Number(item.valor_previsto) || 0,
      data_vencimento: vencimentoIso,
      status: 'a_pagar',
    })
    criadas.push(nova)
  }

  return [...parcelasComRecebimento, ...criadas]
}
