import { dataAdapter } from '@/lib/dataAdapter'
import type { UnidadeMedida } from '@/types'

export const UNIDADES_MEDIDA_PADRAO: Array<
  Omit<UnidadeMedida, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>
> = [
  {
    nome: 'Metros quadrados',
    sigla: 'm²',
    metodo_calculo: 'AxB',
    ordem: 1,
    ativo: true,
    padrao: true,
  },
  {
    nome: 'Metros lineares',
    sigla: 'm',
    metodo_calculo: '(A+B)x2',
    ordem: 2,
    ativo: true,
    padrao: false,
  },
  {
    nome: 'Serviço',
    sigla: 'svç',
    metodo_calculo: '',
    ordem: 3,
    ativo: true,
    padrao: false,
  },
]

export type TipoFormulaUnidade = 'axb' | 'perimetro' | 'livre'

/**
 * Normaliza o método de cálculo de texto livre para identificar a fórmula
 * Ex: 'AxB', 'a*b', 'A x B' -> 'axb'
 * Ex: '(A+B)x2', '(a+b)*2', '2x(A+B)' -> 'perimetro'
 * Vazio ou outros -> 'livre'
 */
export function identificarTipoFormula(metodoCalculo?: string | null): TipoFormulaUnidade {
  if (!metodoCalculo) return 'livre'
  const normalizado = metodoCalculo.toLowerCase().replace(/\s+/g, '')
  if (
    normalizado === 'axb' ||
    normalizado === 'a*b' ||
    normalizado.includes('axb') ||
    normalizado.includes('a*b')
  ) {
    return 'axb'
  }
  if (
    normalizado === '(a+b)x2' ||
    normalizado === '(a+b)*2' ||
    normalizado === '2x(a+b)' ||
    normalizado === '2*(a+b)' ||
    normalizado.includes('(a+b)')
  ) {
    return 'perimetro'
  }
  return 'livre'
}

/**
 * Calcula a quantidade com base nas dimensões A e B e no método de cálculo.
 * Retorna null quando o método for livre ou dimensões não forem informadas.
 */
export function calcularQuantidadePorDimensoes(
  dimA?: number | null,
  dimB?: number | null,
  metodoCalculo?: string | null,
): number | null {
  const tipo = identificarTipoFormula(metodoCalculo)
  const a = Number(dimA) || 0
  const b = Number(dimB) || 0

  if (tipo === 'axb') {
    if (a <= 0 && b <= 0) return null
    if (a <= 0) return b > 0 ? Number(b.toFixed(4)) : null
    if (b <= 0) return a > 0 ? Number(a.toFixed(4)) : null
    return Number((a * b).toFixed(4))
  }

  if (tipo === 'perimetro') {
    if (a <= 0 && b <= 0) return null
    return Number(((a + b) * 2).toFixed(4))
  }

  return null
}

export async function listarUnidadesMedida(apenasAtivas = false): Promise<UnidadeMedida[]> {
  try {
    const filter = apenasAtivas ? 'ativo = true' : undefined
    const items = await dataAdapter.getFullList<UnidadeMedida>('unidades_medida', {
      filter,
      sort: 'ordem,nome',
    })

    if (items && items.length > 0) {
      return items
    }
  } catch (err) {
    console.warn('Falha ao listar unidades_medida do backend, usando predefinições:', err)
  }

  // Fallback seguro caso a collection ainda não esteja populada no ambiente
  return UNIDADES_MEDIDA_PADRAO.map(
    (u, index): UnidadeMedida => ({
      id: `unid_local_${index + 1}`,
      collectionId: 'unidades_medida',
      collectionName: 'unidades_medida',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      nome: u.nome,
      sigla: u.sigla,
      metodo_calculo: u.metodo_calculo,
      ordem: u.ordem,
      ativo: u.ativo,
      padrao: u.padrao,
    }),
  )
}

export async function obterUnidadePorId(id: string): Promise<UnidadeMedida | null> {
  try {
    return await dataAdapter.getOne<UnidadeMedida>('unidades_medida', id)
  } catch (err) {
    console.warn('Unidade não encontrada por ID:', id, err)
    return null
  }
}

export async function criarUnidadeMedida(
  dados: Omit<UnidadeMedida, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>,
): Promise<UnidadeMedida> {
  return await dataAdapter.create<UnidadeMedida>('unidades_medida', {
    ...dados,
    ativo: dados.ativo ?? true,
    ordem: dados.ordem ?? 0,
    metodo_calculo: dados.metodo_calculo ?? '',
  })
}

export async function atualizarUnidadeMedida(
  id: string,
  dados: Partial<
    Omit<UnidadeMedida, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>
  >,
): Promise<UnidadeMedida> {
  return await dataAdapter.update<UnidadeMedida>('unidades_medida', id, dados)
}

export async function excluirUnidadeMedida(id: string): Promise<boolean> {
  return await dataAdapter.delete('unidades_medida', id)
}
