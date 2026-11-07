/**
 * Camada de acesso a dados do módulo NFS-e (frontend -> PocketBase via dataAdapter).
 * O cliente NUNCA lê a senha do certificado; o upload vai para /api/nfse/certificado.
 */
import { dataAdapter } from '../lib/dataAdapter'
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
  numero_rps: number
  serie_rps: string
  status: string
  protocolo: string
  numero_nfse: string
  valor_servicos: number
  aliquota_iss: number
  valor_iss: number
  iss_retido: boolean
  valor_irrf: number
  valor_csll: number
  valor_cofins: number
  valor_pis: number
  data_competencia: string
  tomador_nome: string
  tomador_documento: string
  descricao_servico: string
  mensagem_erro: string
  orcamento: string
  created: string
  updated: string
  expand?: {
    servico?: Partial<NFSeServico>
    orcamento?: Partial<Orcamento>
  }
}

export interface NFSeConfig {
  id: string
  ambiente: 'homologacao' | 'producao'
  municipio_incidencia: string
  municipio_incidencia_ibge: string
  aliquota_iss_padrao: number
  reter_federais_padrao: boolean
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
}

export interface NFSeCertStatus {
  existe: boolean
  nome_arquivo?: string
  valido_ate?: string
  atualizado_em?: string
}

const nfseAdapter = {
  list: (c: string, o: any) => dataAdapter.getFullList<any>(c, o),
  create: (c: string, d: any) => dataAdapter.create<any>(c, d),
  update: (c: string, id: string, d: any) => dataAdapter.update<any>(c, id, d),
  delete: (c: string, id: string) => dataAdapter.delete(c, id),
}

function mapearNota(r: any): NFSeNota {
  return {
    id: r.id,
    numero_rps: r.numero_rps || 0,
    serie_rps: r.serie_rps || '1',
    status: r.status || 'rps',
    protocolo: r.protocolo || '',
    numero_nfse: r.numero_nfse || '',
    valor_servicos: r.valor_servicos || 0,
    aliquota_iss: r.aliquota_iss || 0,
    valor_iss: r.valor_iss || 0,
    iss_retido: Boolean(r.iss_retido),
    valor_irrf: r.valor_irrf || 0,
    valor_csll: r.valor_csll || 0,
    valor_cofins: r.valor_cofins || 0,
    valor_pis: r.valor_pis || 0,
    data_competencia: r.data_competencia || '',
    tomador_nome: r.tomador_nome || '',
    tomador_documento: r.tomador_documento || '',
    descricao_servico: r.descricao_servico || '',
    mensagem_erro: r.mensagem_erro || '',
    orcamento: r.orcamento || '',
    created: r.created || '',
    updated: r.updated || '',
    expand: r.expand,
  }
}

export const nfseApi = {
  // ---------- Serviços ----------
  async listarServicos(): Promise<NFSeServico[]> {
    const rows = await nfseAdapter.list('nfse_servicos', {
      filter: 'ativo = true',
      sort: 'nome',
    })
    return rows as NFSeServico[]
  },

  async criarServico(dados: Partial<NFSeServico>): Promise<NFSeServico> {
    return await nfseAdapter.create('nfse_servicos', {
      ativo: true,
      aliquota_iss: 2,
      ...dados,
    })
  },

  async atualizarServico(id: string, dados: Partial<NFSeServico>): Promise<void> {
    await nfseAdapter.update('nfse_servicos', id, dados)
  },

  async excluirServico(id: string): Promise<void> {
    await nfseAdapter.update('nfse_servicos', id, { ativo: false })
  },

  // ---------- Emitente ----------
  async obterEmitente(): Promise<NFSeEmitente | null> {
    const rows = await nfseAdapter.list('nfse_emitente', { limit: 1 })
    return (rows[0] as NFSeEmitente) || null
  },

  async salvarEmitente(id: string, dados: Partial<NFSeEmitente>): Promise<void> {
    await nfseAdapter.update('nfse_emitente', id, dados)
  },

  // ---------- Configurações ----------
  async obterConfig(): Promise<NFSeConfig | null> {
    const rows = await nfseAdapter.list('nfse_config', { limit: 1 })
    return (rows[0] as NFSeConfig) || null
  },

  async salvarConfig(id: string, dados: Partial<NFSeConfig>): Promise<void> {
    await nfseAdapter.update('nfse_config', id, dados)
  },

  // ---------- Certificado ----------
  async statusCertificado(): Promise<NFSeCertStatus> {
    try {
      const res = await fetch('/backend/v1/nfse/certificado/status', {
        credentials: 'include',
      })
      if (!res.ok) return { existe: false }
      return await res.json()
    } catch (_) {
      return { existe: false }
    }
  },

  async enviarCertificado(arquivo: File, senha: string, validoAte: string): Promise<void> {
    // O .pfx vai em base64 direto ao backend; a senha nunca é persistida em texto plano.
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
    const res = await fetch('/backend/v1/nfse/certificado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        arquivo_base64: base64,
        nome_arquivo: arquivo.name,
        senha,
        valido_ate: validoAte,
      }),
    })
    if (!res.ok) {
      let msg = 'Falha ao enviar o certificado.'
      try {
        const j = await res.json()
        if (j.error) msg = j.error
      } catch (_) {
        /* resposta sem JSON */
      }
      throw new Error(msg)
    }
    await res.json()
  },

  // ---------- Notas ----------
  async listarNotas(): Promise<NFSeNota[]> {
    const rows = await nfseAdapter.list('nfse_notas', {
      sort: '-created',
      expand: 'servico,orcamento',
    })
    return (rows as any[]).map(mapearNota)
  },

  async obterNota(id: string): Promise<NFSeNota | null> {
    const rows = await nfseAdapter.list('nfse_notas', {
      filter: `id = "${id}"`,
      expand: 'servico,orcamento',
      limit: 1,
    })
    return rows[0] ? mapearNota(rows[0]) : null
  },

  async criarNotaDeOrcamento(orcamento: Orcamento, servicoId: string): Promise<NFSeNota> {
    const config = await this.obterConfig()
    const emitente = await this.obterEmitente()
    if (!config) throw new Error('Configurações do NFS-e Nacional não encontradas.')

    const docTomador = (orcamento as any).cliente_documento || ''
    const docDigitos = (docTomador || '').replace(/\D/g, '')
    const isPJ = docDigitos.length === 14

    const impostos = calcularImpostos(orcamento.valor_total || 0, {
      aliquotaIss: config.aliquota_iss_padrao || 2,
      issRetido: false,
      tomadorPessoaJuridica: isPJ,
    })

    const agora = new Date()
    const payload: Record<string, unknown> = {
      status: 'rps',
      serie_rps: '1',
      orcamento: orcamento.id,
      servico: servicoId,
      descricao_servico:
        (orcamento as any).observacoes ||
        'Serviços de gesso e acabamentos conforme orçamento ' + (orcamento.numero || orcamento.id),
      valor_servicos: orcamento.valor_total || 0,
      aliquota_iss: impostos.aliquotaIss,
      valor_iss: impostos.valorIss,
      iss_retido: false,
      valor_irrf: impostos.valorIrrf,
      valor_csll: impostos.valorCsll,
      valor_cofins: impostos.valorCofins,
      valor_pis: impostos.valorPis,
      data_competencia: agora.toISOString().slice(0, 10),
      data_emissao_dps: new Date(agora.getTime() - 3 * 3600 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '),
      tomador_nome: orcamento.cliente || '',
      tomador_documento: docTomador,
      codigo_lc116: '',
      codigo_tributario_municipio: '',
    }

    const criada = await nfseAdapter.create('nfse_notas', payload)
    return mapearNota(criada)
  },

  async criarNotaAvulsa(payload: Record<string, unknown>): Promise<NFSeNota> {
    const doc = String(payload.tomador_documento || '').replace(/\D/g, '')
    const isPJ = doc.length === 14
    const config = await this.obterConfig()
    const valor = Number(payload.valor_servicos || 0)
    const impostos = calcularImpostos(valor, {
      aliquotaIss: Number(payload.aliquota_iss || (config ? config.aliquota_iss_padrao : 2) || 2),
      issRetido: Boolean(payload.iss_retido),
      tomadorPessoaJuridica: isPJ,
    })
    const agora = new Date()
    const criada = await nfseAdapter.create('nfse_notas', {
      status: 'rps',
      serie_rps: '1',
      data_competencia: agora.toISOString().slice(0, 10),
      data_emissao_dps: new Date(agora.getTime() - 3 * 3600 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '),
      aliquota_iss: impostos.aliquotaIss,
      valor_iss: impostos.valorIss,
      valor_irrf: impostos.valorIrrf,
      valor_csll: impostos.valorCsll,
      valor_cofins: impostos.valorCofins,
      valor_pis: impostos.valorPis,
      ...payload,
    })
    return mapearNota(criada)
  },

  async atualizarNota(id: string, dados: Partial<NFSeNota>): Promise<void> {
    await nfseAdapter.update('nfse_notas', id, dados as any)
  },

  async excluirNota(id: string): Promise<void> {
    await nfseAdapter.delete('nfse_notas', id)
  },

  // ---------- Envio / consulta (server-side) ----------
  async enviarNota(id: string): Promise<{ ok: boolean; erro?: string }> {
    try {
      const res = await fetch(`/backend/v1/nfse/enviar/${id}`, {
        method: 'POST',
        credentials: 'include',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, erro: j.error || `Falha no envio (${res.status}).` }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, erro: err.message || 'Falha de rede no envio.' }
    }
  },

  async consultarNota(id: string): Promise<{ ok: boolean; erro?: string }> {
    try {
      const res = await fetch(`/backend/v1/nfse/consultar/${id}`, {
        method: 'POST',
        credentials: 'include',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, erro: j.error || `Falha na consulta (${res.status}).` }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, erro: err.message || 'Falha de rede na consulta.' }
    }
  },

  async baixarXml(id: string): Promise<string> {
    const res = await fetch(`/backend/v1/nfse/xml/${id}`, { credentials: 'include' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error || 'XML ainda não disponível para esta nota.')
    }
    const j = await res.json()
    return j.xml || ''
  },
}
