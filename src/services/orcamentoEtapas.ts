import { dataAdapter } from '@/lib/dataAdapter'
import type { Orcamento } from '@/types'

export { getEtapaConfig, ETAPAS_CONFIG } from '@/services/orcamentos'

export interface OrcamentoEtapa {
  id: string
  nome: string
  cor: string
  cor_badge?: string
  cor_header?: string
  ordem: number
  padrao: boolean
}

export const ETAPAS_PADRAO: OrcamentoEtapa[] = [
  {
    id: 'etp_realizar',
    nome: 'Orçamentos a realizar',
    cor: '#F59E0B',
    cor_badge: 'bg-amber-100 text-amber-800 border-amber-300',
    cor_header: 'bg-amber-50 text-amber-900 border-amber-200',
    ordem: 1,
    padrao: true,
  },
  {
    id: 'etp_aguardando',
    nome: 'Aguardando aprovação',
    cor: '#3B82F6',
    cor_badge: 'bg-blue-100 text-blue-800 border-blue-300',
    cor_header: 'bg-blue-50 text-blue-900 border-blue-200',
    ordem: 2,
    padrao: true,
  },
  {
    id: 'etp_aprovados',
    nome: 'Aprovados aguardando início',
    cor: '#8B5CF6',
    cor_badge: 'bg-purple-100 text-purple-800 border-purple-300',
    cor_header: 'bg-purple-50 text-purple-900 border-purple-200',
    ordem: 3,
    padrao: true,
  },
  {
    id: 'etp_iniciados',
    nome: 'Trabalhos iniciados',
    cor: '#10B981',
    cor_badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cor_header: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    ordem: 4,
    padrao: true,
  },
  {
    id: 'etp_concluidos',
    nome: 'Concluídos',
    cor: '#2C3E50',
    cor_badge: 'bg-[#2C3E50] text-[#D4AF37] border-[#2C3E50]',
    cor_header: 'bg-[#2C3E50]/10 text-[#2C3E50] border-[#2C3E50]/30',
    ordem: 5,
    padrao: true,
  },
]

const LOCAL_STORAGE_KEY = 'bettone_orcamento_etapas_custom'

function gerarCoresParaEtapa(corHex: string) {
  return {
    cor_badge: 'bg-slate-100 text-slate-800 border-slate-300',
    cor_header: 'bg-slate-50 text-slate-900 border-slate-200',
  }
}

/**
 * Lista todas as etapas do funil (padrão + customizadas), ordenadas por 'ordem'
 */
export async function listarEtapas(): Promise<OrcamentoEtapa[]> {
  try {
    const records = await dataAdapter.getFullList<OrcamentoEtapa>('orcamento_etapas', {
      sort: 'ordem',
    })

    if (records && records.length > 0) {
      // Garante que as 5 etapas padrão existam na lista
      const nomesExistentes = new Set(records.map((r) => r.nome.toLowerCase().trim()))
      const padroesFaltando = ETAPAS_PADRAO.filter(
        (p) => !nomesExistentes.has(p.nome.toLowerCase().trim()),
      )

      const merged = [...records, ...padroesFaltando].sort((a, b) => a.ordem - b.ordem)
      return merged
    }
  } catch (err) {
    console.warn('Tabela orcamento_etapas indisponível no backend, usando fallback local:', err)
  }

  // Fallback em localStorage para persistência imediata caso a tabela ainda não tenha sido criada
  try {
    const salvo = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (salvo) {
      const customizadas = JSON.parse(salvo) as OrcamentoEtapa[]
      const nomesCustom = new Set(customizadas.map((c) => c.nome.toLowerCase().trim()))
      const padroesNaoRepetidos = ETAPAS_PADRAO.filter(
        (p) => !nomesCustom.has(p.nome.toLowerCase().trim()),
      )
      return [...padroesNaoRepetidos, ...customizadas].sort((a, b) => a.ordem - b.ordem)
    }
  } catch {
    // ignore
  }

  return [...ETAPAS_PADRAO]
}

/**
 * Cria uma nova etapa personalizada no funil
 */
export async function criarEtapa(dados: { nome: string; cor: string }): Promise<OrcamentoEtapa> {
  const etapasAtuais = await listarEtapas()
  const nomeLimpo = dados.nome.trim()

  const jaExiste = etapasAtuais.some((e) => e.nome.toLowerCase().trim() === nomeLimpo.toLowerCase())
  if (jaExiste) {
    throw new Error(`Já existe uma etapa com o nome "${nomeLimpo}".`)
  }

  const maiorOrdem = etapasAtuais.reduce((max, e) => Math.max(max, e.ordem || 0), 0)
  const novaOrdem = maiorOrdem + 1
  const cores = gerarCoresParaEtapa(dados.cor)

  const novaEtapa: OrcamentoEtapa = {
    id: `etp_${Date.now()}`,
    nome: nomeLimpo,
    cor: dados.cor || '#2C3E50',
    cor_badge: cores.cor_badge,
    cor_header: cores.cor_header,
    ordem: novaOrdem,
    padrao: false,
  }

  try {
    const criada = await dataAdapter.create<OrcamentoEtapa>('orcamento_etapas', {
      nome: novaEtapa.nome,
      cor: novaEtapa.cor,
      cor_badge: novaEtapa.cor_badge,
      cor_header: novaEtapa.cor_header,
      ordem: novaEtapa.ordem,
      padrao: false,
    })
    return criada
  } catch (err) {
    console.warn('Persistindo etapa no localStorage fallback:', err)
    // Salva fallback local
    try {
      const salvo = localStorage.getItem(LOCAL_STORAGE_KEY)
      const lista: OrcamentoEtapa[] = salvo ? JSON.parse(salvo) : []
      lista.push(novaEtapa)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lista))
    } catch {
      // ignore
    }
    return novaEtapa
  }
}

/**
 * Atualiza o nome ou cor de uma etapa
 */
export async function atualizarEtapa(
  id: string,
  dados: Partial<Pick<OrcamentoEtapa, 'nome' | 'cor' | 'ordem'>>,
): Promise<OrcamentoEtapa> {
  const payload: Partial<OrcamentoEtapa> = {}
  if (dados.nome !== undefined) payload.nome = dados.nome.trim()
  if (dados.cor !== undefined) payload.cor = dados.cor
  if (dados.ordem !== undefined) payload.ordem = dados.ordem

  try {
    return await dataAdapter.update<OrcamentoEtapa>('orcamento_etapas', id, payload)
  } catch (err) {
    console.warn('Atualizando etapa no localStorage fallback:', err)
    try {
      const salvo = localStorage.getItem(LOCAL_STORAGE_KEY)
      const lista: OrcamentoEtapa[] = salvo ? JSON.parse(salvo) : []
      const idx = lista.findIndex((e) => e.id === id)
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], ...payload }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lista))
        return lista[idx]
      }
    } catch {
      // ignore
    }
    return {
      id,
      nome: dados.nome || '',
      cor: dados.cor || '#2C3E50',
      ordem: dados.ordem || 1,
      padrao: false,
    }
  }
}

/**
 * Exclui etapa customizada e migra automaticamente os orçamentos nela para a etapa anterior disponível
 */
export async function excluirEtapa(
  etapaId: string,
  todasEtapas: OrcamentoEtapa[],
  orcamentos: Orcamento[],
  onMigrarOrcamento?: (orcamentoId: string, novoStatus: string) => Promise<void>,
): Promise<void> {
  const etapa = todasEtapas.find((e) => e.id === etapaId)
  if (!etapa) return

  if (etapa.padrao) {
    throw new Error('As 5 etapas padrão do sistema não podem ser excluídas.')
  }

  // Descobre a etapa anterior disponível
  const ordenadas = [...todasEtapas].sort((a, b) => a.ordem - b.ordem)
  const idx = ordenadas.findIndex((e) => e.id === etapaId)
  const etapaDestino = idx > 0 ? ordenadas[idx - 1] : ordenadas.find((e) => e.id !== etapaId)

  if (etapaDestino && onMigrarOrcamento) {
    const afetados = orcamentos.filter((o) => o.status === etapa.nome)
    for (const orc of afetados) {
      try {
        await onMigrarOrcamento(orc.id, etapaDestino.nome)
      } catch (err) {
        console.error(`Falha ao migrar orçamento ${orc.numero} para ${etapaDestino.nome}:`, err)
      }
    }
  }

  try {
    await dataAdapter.delete('orcamento_etapas', etapaId)
  } catch (err) {
    console.warn('Removendo etapa do localStorage fallback:', err)
  }

  try {
    const salvo = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (salvo) {
      const lista: OrcamentoEtapa[] = JSON.parse(salvo)
      const filtrada = lista.filter((e) => e.id !== etapaId && e.nome !== etapa.nome)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtrada))
    }
  } catch {
    // ignore
  }
}
