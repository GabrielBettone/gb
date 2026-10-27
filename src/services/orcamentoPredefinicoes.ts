import { dataAdapter } from '@/lib/dataAdapter'

export interface PredefinicaoFiltroEtapas {
  id: string
  nome: string
  etapas: string[]
  created?: string
  updated?: string
}

const LOCAL_STORAGE_KEY = 'bettone_orcamento_filtros_predefinidos'

// Predefinições sugeridas/padrão iniciais que exemplificam o fluxo do usuário
export const PREDEFINICOES_EXEMPLO: PredefinicaoFiltroEtapas[] = [
  {
    id: 'pred_compromissos',
    nome: 'Compromissos',
    etapas: ['Orçamentos a realizar', 'Aprovados aguardando início', 'Trabalhos iniciados'],
  },
  {
    id: 'pred_trabalhos',
    nome: 'Trabalhos',
    etapas: ['Aprovados aguardando início', 'Trabalhos iniciados'],
  },
  {
    id: 'pred_em_andamento',
    nome: 'Obras em Andamento',
    etapas: ['Trabalhos iniciados'],
  },
]

function getLocalPredefinicoes(): PredefinicaoFiltroEtapas[] {
  try {
    const salvo = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (salvo) {
      const parsed = JSON.parse(salvo)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return [...PREDEFINICOES_EXEMPLO]
}

function saveLocalPredefinicoes(lista: PredefinicaoFiltroEtapas[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lista))
  } catch {
    // ignore
  }
}

/**
 * Lista as predefinições de filtros salvas (banco de dados com fallback em localStorage)
 */
export async function listarPredefinicoes(): Promise<PredefinicaoFiltroEtapas[]> {
  try {
    const records = await dataAdapter.getFullList<any>('orcamento_filtros_predefinidos', {
      sort: 'nome',
    })

    if (records && records.length > 0) {
      const normalizados: PredefinicaoFiltroEtapas[] = records.map((r) => {
        let etapasArray: string[] = []
        if (Array.isArray(r.etapas)) {
          etapasArray = r.etapas
        } else if (typeof r.etapas === 'string') {
          try {
            const parsed = JSON.parse(r.etapas)
            etapasArray = Array.isArray(parsed) ? parsed : [r.etapas]
          } catch {
            etapasArray = r.etapas
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          }
        }
        return {
          id: r.id,
          nome: r.nome,
          etapas: etapasArray,
          created: r.created || r.created_at,
          updated: r.updated || r.updated_at,
        }
      })
      // Sincroniza localmente para offline rápido
      saveLocalPredefinicoes(normalizados)
      return normalizados
    }
  } catch (err) {
    console.debug(
      'Tabela orcamento_filtros_predefinidos ainda não consultável remotamente, usando localStorage:',
      err,
    )
  }

  // Fallback em localStorage
  return getLocalPredefinicoes()
}

/**
 * Salva uma nova predefinição de etapas com nome customizado
 */
export async function criarPredefinicao(
  nome: string,
  etapas: string[],
): Promise<PredefinicaoFiltroEtapas> {
  const nomeLimpo = nome.trim()
  if (!nomeLimpo) {
    throw new Error('Informe um nome para a predefinição.')
  }
  if (!etapas || etapas.length === 0) {
    throw new Error('Selecione pelo menos uma etapa para salvar a predefinição.')
  }

  const nova: PredefinicaoFiltroEtapas = {
    id: `pred_${Date.now()}`,
    nome: nomeLimpo,
    etapas: [...etapas],
  }

  try {
    const criada = await dataAdapter.create<any>('orcamento_filtros_predefinidos', {
      nome: nova.nome,
      etapas: nova.etapas,
    })
    const normalizada: PredefinicaoFiltroEtapas = {
      id: criada.id,
      nome: criada.nome,
      etapas: Array.isArray(criada.etapas)
        ? criada.etapas
        : typeof criada.etapas === 'string'
          ? JSON.parse(criada.etapas)
          : nova.etapas,
    }
    const locais = getLocalPredefinicoes().filter(
      (p) => p.id !== normalizada.id && p.nome !== normalizada.nome,
    )
    locais.push(normalizada)
    saveLocalPredefinicoes(locais)
    return normalizada
  } catch (err) {
    console.warn('Erro ao salvar no banco, persistindo localmente:', err)
    const locais = getLocalPredefinicoes().filter(
      (p) => p.nome.toLowerCase() !== nomeLimpo.toLowerCase(),
    )
    locais.push(nova)
    saveLocalPredefinicoes(locais)
    return nova
  }
}

/**
 * Remove uma predefinição salva
 */
export async function excluirPredefinicao(id: string): Promise<void> {
  try {
    await dataAdapter.delete('orcamento_filtros_predefinidos', id)
  } catch (err) {
    console.warn('Erro ao excluir no banco remoto, removendo localmente:', err)
  }

  const locais = getLocalPredefinicoes().filter((p) => p.id !== id)
  saveLocalPredefinicoes(locais)
}
