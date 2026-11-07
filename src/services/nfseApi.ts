/**
 * Camada de acesso a dados do módulo NFS-e (frontend -> Supabase via supabase/client).
 * O cliente NUNCA vê a senha do certificado: o .pfx + senha vão para a Edge
 * Function nfse-emissao, que cifra a senha no servidor (AES-256-GCM).
 */
import {
  supabaseSelect,
  supabaseInsert,
  supabaseUpdate,
  supabaseDelete,
  supabaseUpload,
  getSupabaseConfig,
} from '../lib/supabase/client'
import type { Orcamento } from '../types'
import { calcularImpostos } from './nfse'

export interface NFSeServico {
  id: string
  nome: string
  codigo_lc116: string
  descricao: string
  aliquota_iss: number
  reter_irrf: boolean
  reter_csll: boolean
  reter_cofins: boolean
  reter_pis: boolean
  ativo: boolean
}

export interface NFSeNota {
  id: string
  status: 'rps' | 'enviando' | 'autorizada' | 'rejeitada' | 'cancelada' | 'erro' | string
  ambiente: string
  orcamento: string | null
  orcamento_numero: string | null
  servico: string | null
  numero_rps: number
  serie_rps: string
  protocolo: string
  numero_nfse: string
  data_autorizacao: string | null
  data_competencia: string
  data_emissao_dps: string | null
  codigo_lc116: string
  codigo_tributario_municipio: string
  exigibilidade_iss: number
  valor_servicos: number
  aliquota_iss: number
  valor_iss: number
  iss_retido: boolean
  valor_irrf: number
  valor_csll: number
  valor_cofins: number
  valor_pis: number
  tomador_nome: string
  tomador_documento: string
  tomador_email: string
  tomador_endereco: string
  tomador_municipio: string
  tomador_uf: string
  descricao_servico: string
  observacoes: string
  xml_dps: string
  xml_nfse: string
  mensagem_erro: string
  created_at: string
  updated_at: string
}

export interface NFSeConfig {
  id: string
  ambiente: 'homologacao' | 'producao'
  municipio_incidencia: string
  municipio_incidencia_ibge: string
  uf_municipio_incidencia: string
  municipio_iss: string
  aliquota_iss_padrao: number
  reter_federais_padrao: boolean
  observacoes: string
}

export interface NFSeEmitente {
  id: string
  razao_social: string
  nome_fantasia: string
  cnpj: string
  logradouro: string
  numero: string
  bairro: string
  codigo_municipio_ibge: string
  municipio: string
  uf: string
  cep: string
  telefone: string
  email: string
  inscricao_municipal: string
  endereco_logradouro: string
  endereco_numero: string
  endereco_complemento: string
  endereco_bairro: string
  endereco_cep: string
}

export interface NFSeCertStatus {
  existe?: boolean
  instalado?: boolean
  nome_arquivo?: string
  valido_ate?: string
  vencido?: boolean
  titular?: string
  cnpj_certificado?: string
  ok?: boolean
  erro?: string
  created_at?: string
}

// ---------------------------------------------------------------------------
// Edge Function nfse-emissao (upload .pfx, envio, consulta, XML)
// ---------------------------------------------------------------------------
function edgeUrl(rota: string): string {
  const { url } = getSupabaseConfig()
  return `${url.replace(/\/+$/, '')}/functions/v1/nfse-emissao${rota}`
}

async function edgeFetch(rota: string, init: RequestInit = {}): Promise<Response> {
  const { publicKey } = getSupabaseConfig()
  const headers = new Headers(init.headers || {})
  headers.set('apikey', publicKey)
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${publicKey}`)
  return fetch(edgeUrl(rota), { ...init, headers })
}

async function edgeJson<T>(rota: string, init: RequestInit = {}): Promise<T> {
  const res = await edgeFetch(rota, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok)
    throw new Error((body as any).error || `Falha na Edge Function (HTTP ${res.status}).`)
  return body as T
}

// ---------------------------------------------------------------------------
// Helpers REST
// ---------------------------------------------------------------------------
function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapearNota(r: any): NFSeNota {
  return {
    id: r.id,
    status: r.status || 'rps',
    ambiente: r.ambiente || 'homologacao',
    orcamento: r.orcamento || null,
    orcamento_numero: r.orcamento_numero || null,
    servico: r.servico || null,
    numero_rps: num(r.numero_rps),
    serie_rps: r.serie_rps || '1',
    protocolo: r.protocolo || '',
    numero_nfse: r.numero_nfse || '',
    data_autorizacao: r.data_autorizacao || null,
    data_competencia: r.data_competencia || '',
    data_emissao_dps: r.data_emissao_dps || null,
    codigo_lc116: r.codigo_lc116 || '',
    codigo_tributario_municipio: r.codigo_tributario_municipio || '',
    exigibilidade_iss: num(r.exigibilidade_iss) || 1,
    valor_servicos: num(r.valor_servicos),
    aliquota_iss: num(r.aliquota_iss),
    valor_iss: num(r.valor_iss),
    iss_retido: Boolean(r.iss_retido),
    valor_irrf: num(r.valor_irrf),
    valor_csll: num(r.valor_csll),
    valor_cofins: num(r.valor_cofins),
    valor_pis: num(r.valor_pis),
    tomador_nome: r.tomador_nome || '',
    tomador_documento: r.tomador_documento || '',
    tomador_email: r.tomador_email || '',
    tomador_endereco: r.tomador_endereco || '',
    tomador_municipio: r.tomador_municipio || '',
    tomador_uf: r.tomador_uf || '',
    descricao_servico: r.descricao_servico || '',
    observacoes: r.observacoes || '',
    xml_dps: r.xml_dps || '',
    xml_nfse: r.xml_nfse || '',
    mensagem_erro: r.mensagem_erro || '',
    created_at: r.created_at || '',
    updated_at: r.updated_at || '',
  }
}

// ---------------------------------------------------------------------------
// API do módulo
// ---------------------------------------------------------------------------
export const nfseApi = {
  // ---------- Serviços ----------
  async listarServicos(somenteAtivos = true): Promise<NFSeServico[]> {
    const rows = await supabaseSelect<NFSeServico>('nfse_servicos', {
      filters: somenteAtivos ? [{ column: 'ativo', operator: 'eq', value: true }] : [],
      order: [{ column: 'nome', ascending: true }],
    })
    return rows
  },

  async criarServico(dados: Partial<NFSeServico>): Promise<NFSeServico> {
    const rows = await supabaseInsert<NFSeServico>('nfse_servicos', {
      ativo: true,
      aliquota_iss: 2,
      ...dados,
    })
    return rows[0]
  },

  async atualizarServico(id: string, dados: Partial<NFSeServico>): Promise<void> {
    await supabaseUpdate('nfse_servicos', [{ column: 'id', operator: 'eq', value: id }], dados)
  },

  async excluirServico(id: string): Promise<void> {
    await supabaseUpdate('nfse_servicos', [{ column: 'id', operator: 'eq', value: id }], {
      ativo: false,
    })
  },

  // ---------- Emitente ----------
  async obterEmitente(): Promise<NFSeEmitente | null> {
    const rows = await supabaseSelect<NFSeEmitente>('nfse_emitente', { limit: 1 })
    return rows[0] || null
  },

  async salvarEmitente(id: string, dados: Partial<NFSeEmitente>): Promise<void> {
    await supabaseUpdate('nfse_emitente', [{ column: 'id', operator: 'eq', value: id }], dados)
  },

  // ---------- Configurações ----------
  async obterConfig(): Promise<NFSeConfig | null> {
    const rows = await supabaseSelect<NFSeConfig>('nfse_config', { limit: 1 })
    return rows[0] || null
  },

  async salvarConfig(id: string, dados: Partial<NFSeConfig>): Promise<void> {
    await supabaseUpdate('nfse_config', [{ column: 'id', operator: 'eq', value: id }], dados)
  },

  /** Atualiza a config única (linha 1) sem exigir o id na chamada. */
  async atualizarConfig(dados: Partial<NFSeConfig>): Promise<NFSeConfig> {
    const atual = await this.obterConfig()
    if (!atual) throw new Error('Configurações do NFS-e não encontradas — rode o SQL de schema.')
    await supabaseUpdate('nfse_config', [{ column: 'id', operator: 'eq', value: atual.id }], dados)
    return { ...atual, ...dados } as NFSeConfig
  },

  /** Atualiza o emitente único (linha 1) sem exigir o id na chamada. */
  async atualizarEmitente(dados: Partial<NFSeEmitente>): Promise<NFSeEmitente> {
    const atual = await this.obterEmitente()
    if (!atual) throw new Error('Emitente não encontrado — rode o SQL de seed.')
    await supabaseUpdate(
      'nfse_emitente',
      [{ column: 'id', operator: 'eq', value: atual.id }],
      dados,
    )
    return { ...atual, ...dados } as NFSeEmitente
  },

  // ---------- Certificado (Edge Function — senha só no servidor) ----------
  async statusCertificado(): Promise<NFSeCertStatus> {
    try {
      return await edgeJson<NFSeCertStatus>('/certificado/status')
    } catch (_) {
      return { existe: false }
    }
  },

  async enviarCertificado(
    arquivo: File,
    senha: string,
  ): Promise<{
    ok: boolean
    erro?: string
    valido_ate?: string
    vencido?: boolean
    titular?: string
  }> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || '')
        const idx = result.indexOf('base64,')
        resolve(idx >= 0 ? result.substring(idx + 7) : result)
      }
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo do certificado.'))
      reader.readAsDataURL(arquivo)
    })
    return edgeJson<{
      ok: boolean
      erro?: string
      valido_ate?: string
      vencido?: boolean
      titular?: string
    }>('/certificado', {
      method: 'POST',
      body: JSON.stringify({ pfx_base64: base64, nome_arquivo: arquivo.name, senha }),
    })
  },

  // ---------- Notas ----------
  async listarNotas(): Promise<NFSeNota[]> {
    const rows = await supabaseSelect<any>('nfse_notas', {
      order: [{ column: 'created_at', ascending: false }],
      limit: 500,
    })
    return (rows as any[]).map(mapearNota)
  },

  async obterNota(id: string): Promise<NFSeNota | null> {
    const rows = await supabaseSelect<any>('nfse_notas', {
      filters: [{ column: 'id', operator: 'eq', value: id }],
      limit: 1,
    })
    return rows[0] ? mapearNota(rows[0]) : null
  },

  /**
   * Pré-preenche uma nota (status rps) a partir de um orçamento —
   * usado pelo botão "Emitir NFS-e" do orçamento. NUNCA cria financeiro.
   */
  async criarNotaDeOrcamento(orcamento: Orcamento, servicoId: string): Promise<NFSeNota> {
    const config = await this.obterConfig()
    const servicos = await this.listarServicos()
    const servico = servicos.find((s) => s.id === servicoId)
    if (!config)
      throw new Error(
        'Configurações do NFS-e Nacional não encontradas. Rode o SQL supabase/nfse_schema.sql.',
      )

    const docTomador = ((orcamento as any).cliente_documento || '').toString()
    const docDigitos = docTomador.replace(/\D/g, '')
    if (!docDigitos)
      throw new Error(
        'O orçamento não tem CPF/CNPJ do tomador. Preencha o documento do cliente antes de emitir.',
      )

    const impostos = calcularImpostos(orcamento.valor_total || 0, {
      aliquotaIss: servico ? Number(servico.aliquota_iss) : config.aliquota_iss_padrao || 2,
      issRetido: false,
      tomadorPessoaJuridica: docDigitos.length === 14,
    })

    const agora = new Date()
    const proximoRps = await this.proximoNumeroRps()
    const rows = await supabaseInsert<any>('nfse_notas', {
      status: 'rps',
      ambiente: config.ambiente || 'homologacao',
      serie_rps: '1',
      orcamento: orcamento.id,
      orcamento_numero: orcamento.numero || '',
      servico: servicoId,
      numero_rps: proximoRps,
      descricao_servico:
        servico?.nome ||
        'Serviços de gesso e acabamentos conforme orçamento ' + (orcamento.numero || orcamento.id),
      observacoes: (orcamento as any).observacoes || '',
      valor_servicos: orcamento.valor_total || 0,
      aliquota_iss: impostos.aliquotaIss,
      valor_iss: impostos.valorIss,
      iss_retido: false,
      valor_irrf: impostos.valorIrrf,
      valor_csll: impostos.valorCsll,
      valor_cofins: impostos.valorCofins,
      valor_pis: impostos.valorPis,
      data_competencia: agora.toISOString().slice(0, 10),
      data_emissao_dps: new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 19),
      tomador_nome: orcamento.cliente || '',
      tomador_documento: docTomador,
      codigo_lc116: servico?.codigo_lc116 || '',
      exigibilidade_iss: 1,
    })
    return mapearNota(rows[0])
  },

  async criarNotaAvulsa(payload: Record<string, unknown>): Promise<NFSeNota> {
    const doc = String(payload.tomador_documento || '').replace(/\D/g, '')
    const config = await this.obterConfig()
    const valor = Number(payload.valor_servicos || 0)
    const impostos = calcularImpostos(valor, {
      aliquotaIss: Number(payload.aliquota_iss || (config ? config.aliquota_iss_padrao : 2) || 2),
      issRetido: Boolean(payload.iss_retido),
      tomadorPessoaJuridica: doc.length === 14,
    })
    const agora = new Date()
    const proximoRps = await this.proximoNumeroRps()
    const rows = await supabaseInsert<any>('nfse_notas', {
      status: 'rps',
      ambiente: config?.ambiente || 'homologacao',
      serie_rps: '1',
      numero_rps: proximoRps,
      data_competencia: agora.toISOString().slice(0, 10),
      data_emissao_dps: new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 19),
      aliquota_iss: impostos.aliquotaIss,
      valor_iss: impostos.valorIss,
      valor_irrf: impostos.valorIrrf,
      valor_csll: impostos.valorCsll,
      valor_cofins: impostos.valorCofins,
      valor_pis: impostos.valorPis,
      exigibilidade_iss: 1,
      ...payload,
    })
    return mapearNota(rows[0])
  },

  async atualizarNota(id: string, dados: Partial<NFSeNota>): Promise<void> {
    await supabaseUpdate('nfse_notas', [{ column: 'id', operator: 'eq', value: id }], dados as any)
  },

  async excluirNota(id: string): Promise<void> {
    await supabaseDelete('nfse_notas', [{ column: 'id', operator: 'eq', value: id }])
  },

  /** Próximo número de RPS = maior numero_rps já usado + 1 (por série). */
  async proximoNumeroRps(): Promise<number> {
    const rows = await supabaseSelect<{ numero_rps: number }>('nfse_notas', {
      columns: 'numero_rps',
      order: [{ column: 'numero_rps', ascending: false }],
      limit: 1,
    })
    return (Number(rows[0]?.numero_rps) || 0) + 1
  },

  // ---------- Envio / consulta / XML (Edge Function com mTLS) ----------
  async enviarNota(id: string): Promise<{ ok: boolean; erro?: string; retorno?: any }> {
    try {
      const r = await edgeJson<any>('/enviar', {
        method: 'POST',
        body: JSON.stringify({ nota_id: id }),
      })
      return { ok: Boolean(r.ok), retorno: r.retorno }
    } catch (err: any) {
      return { ok: false, erro: err.message || 'Falha no envio.' }
    }
  },

  async consultarNota(id: string): Promise<{ ok: boolean; erro?: string; retorno?: any }> {
    try {
      const r = await edgeJson<any>('/consultar', {
        method: 'POST',
        body: JSON.stringify({ nota_id: id }),
      })
      return { ok: Boolean(r.ok), retorno: r.retorno }
    } catch (err: any) {
      return { ok: false, erro: err.message || 'Falha na consulta.' }
    }
  },

  async baixarXml(id: string): Promise<{ xml_dps: string; xml_nfse: string }> {
    return edgeJson<{ xml_dps: string; xml_nfse: string }>(`/xml/${id}`)
  },
}

// Reexport para quem já usava supabaseUpload direto (não usado pelo fluxo NFS-e,
// mas mantém a superfície da API estável).
export { supabaseUpload }
