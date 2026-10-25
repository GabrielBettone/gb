import pb from '@/lib/pocketbase/client'
import { dataAdapter } from '@/lib/dataAdapter'

export interface SimuladorConfig {
  simulador_ativo: boolean
  simulador_exigir_login: boolean
  simulador_cota_padrao: number
}

export interface SimuladorCliente {
  id: string
  telefone: string
  nome: string
  bloqueado: boolean
  cota_mensal: number
  geracoes_mes_atual: number
  mes_referencia?: string
  confirmado: boolean
  created?: string
}

export interface GerarSimulacaoParams {
  telefone?: string
  servico_nome: string
  servico_slug?: string
  imagem_base64?: string
  descricao_adicional?: string
}

export interface GerarSimulacaoResult {
  sucesso: boolean
  servico_nome: string
  url_resultado: string
  prompt: string
  modo: string
  cota_restante?: number | null
  error?: string
}

export interface SimuladorHistoricoItem {
  id: string
  telefone: string
  servico_nome: string
  servico_slug?: string
  url_original?: string
  url_resultado: string
  prompt_usado?: string
  status: string
  created: string
}

/**
 * Solicita código de confirmação por SMS/WhatsApp (ou código de demonstração)
 */
export async function solicitarCodigoSimulador(
  telefone: string,
  nome?: string,
): Promise<{
  sucesso: boolean
  mensagem: string
  codigo_demo?: string
  telefone: string
}> {
  const pbBase = pb.baseUrl || ''
  const res = await fetch(`${pbBase.replace(/\/+$/, '')}/backend/v1/simulador/solicitar-codigo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone, nome }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao solicitar código de verificação.')
  }
  return data
}

/**
 * Confirma o código enviado e autentica o cliente do simulador
 */
export async function confirmarCodigoSimulador(
  telefone: string,
  codigo: string,
): Promise<{
  sucesso: boolean
  cliente: SimuladorCliente
}> {
  const pbBase = pb.baseUrl || ''
  const res = await fetch(`${pbBase.replace(/\/+$/, '')}/backend/v1/simulador/confirmar-codigo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone, codigo }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Código incorreto ou inválido.')
  }
  return data
}

/**
 * Dispara geração de simulação com IA
 */
export async function gerarSimulacaoComIa(
  params: GerarSimulacaoParams,
): Promise<GerarSimulacaoResult> {
  const pbBase = pb.baseUrl || ''
  const res = await fetch(`${pbBase.replace(/\/+$/, '')}/backend/v1/simulador/gerar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Falha na geração da simulação.')
  }
  return data
}

/**
 * ADMIN: Lista clientes do simulador
 */
export async function listarClientesSimulador(): Promise<SimuladorCliente[]> {
  try {
    const records = await dataAdapter.getFullList<any>('simulador_clientes', {
      sort: '-created',
    })
    return records.map((r) => ({
      id: r.id,
      telefone: r.telefone,
      nome: r.nome || 'Cliente',
      bloqueado: !!r.bloqueado,
      cota_mensal: r.cota_mensal ?? 5,
      geracoes_mes_atual: r.geracoes_mes_atual ?? 0,
      mes_referencia: r.mes_referencia || '',
      confirmado: !!r.confirmado,
      created: r.created,
    }))
  } catch (err) {
    console.error('Erro ao listar clientes do simulador:', err)
    return []
  }
}

/**
 * ADMIN: Atualiza status ou cota de um cliente
 */
export async function atualizarClienteSimulador(
  id: string,
  dados: Partial<SimuladorCliente>,
): Promise<SimuladorCliente> {
  const record = await dataAdapter.update<any>('simulador_clientes', id, dados)
  return {
    id: record.id,
    telefone: record.telefone,
    nome: record.nome,
    bloqueado: !!record.bloqueado,
    cota_mensal: record.cota_mensal,
    geracoes_mes_atual: record.geracoes_mes_atual,
    confirmado: !!record.confirmado,
  }
}

/**
 * ADMIN: Lista histórico de gerações
 */
export async function listarHistoricoSimulacoes(): Promise<SimuladorHistoricoItem[]> {
  try {
    const records = await dataAdapter.getFullList<any>('simulador_historico', {
      sort: '-created',
    })
    return records.map((r) => ({
      id: r.id,
      telefone: r.telefone || '',
      servico_nome: r.servico_nome,
      servico_slug: r.servico_slug,
      url_original: r.url_original || '',
      url_resultado: r.url_resultado || '',
      prompt_usado: r.prompt_usado,
      status: r.status || 'concluido',
      created: r.created,
    }))
  } catch {
    return []
  }
}
