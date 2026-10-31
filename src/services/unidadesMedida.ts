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

export type TipoFormulaUnidade = 'axb' | 'perimetro' | 'custom' | 'livre'

/**
 * Normaliza o método de cálculo de texto livre para identificar a fórmula.
 * - 'AxB', 'a*b', 'A x B' -> 'axb'
 * - '(A+B)x2', '(a+b)*2', '2x(A+B)', '(A+B)*2' -> 'perimetro'
 * - Se contiver variáveis A, B ou C ou operadores matemáticos customizados -> 'custom'
 * - Vazio ou sem variáveis de cálculo -> 'livre'
 */
export function identificarTipoFormula(metodoCalculo?: string | null): TipoFormulaUnidade {
  if (!metodoCalculo) return 'livre'
  const normalizado = metodoCalculo.toLowerCase().replace(/\s+/g, '')
  if (!normalizado) return 'livre'

  // Caso 1: Área simples (AxB / A*B)
  if (normalizado === 'axb' || normalizado === 'a*b') {
    return 'axb'
  }

  // Caso 2: Perímetro estrito (A+B)*2 ou 2*(A+B)
  if (
    normalizado === '(a+b)x2' ||
    normalizado === '(a+b)*2' ||
    normalizado === '2x(a+b)' ||
    normalizado === '2*(a+b)' ||
    normalizado === '((a+b)*2)' ||
    normalizado === '((a+b)x2)'
  ) {
    return 'perimetro'
  }

  // Caso 3: Fórmula personalizada que contenha as variáveis a, b ou c
  if (/[abc]/.test(normalizado)) {
    return 'custom'
  }

  return 'livre'
}

/**
 * Verifica se a fórmula de cálculo utiliza a variável C (dimensao_c).
 */
export function formulaUsaVariavelC(metodoCalculo?: string | null): boolean {
  if (!metodoCalculo) return false
  const normalizado = metodoCalculo.toLowerCase().replace(/\s+/g, '')
  // Procura pela letra 'c' que não seja precedida nem sucedida por outros caracteres alfanuméricos
  return (
    /\bc\b|[^a-z0-9]c[^a-z0-9]|^c[^a-z0-9]|[^a-z0-9]c$|^c$/.test(normalizado) ||
    normalizado.includes('c')
  )
}

// Token types para o parser de expressões matemáticas
type TokenType = 'NUMBER' | 'VAR' | 'PLUS' | 'MINUS' | 'MUL' | 'DIV' | 'LPAREN' | 'RPAREN'

interface Token {
  type: TokenType
  value?: number | string
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const s = expr.toLowerCase().replace(/\s+/g, '').replace(/x/g, '*')

  while (i < s.length) {
    const ch = s[i]

    if (ch === '+') {
      tokens.push({ type: 'PLUS' })
      i++
    } else if (ch === '-') {
      tokens.push({ type: 'MINUS' })
      i++
    } else if (ch === '*') {
      tokens.push({ type: 'MUL' })
      i++
    } else if (ch === '/') {
      tokens.push({ type: 'DIV' })
      i++
    } else if (ch === '(') {
      tokens.push({ type: 'LPAREN' })
      i++
    } else if (ch === ')') {
      tokens.push({ type: 'RPAREN' })
      i++
    } else if (ch === 'a' || ch === 'b' || ch === 'c') {
      tokens.push({ type: 'VAR', value: ch })
      i++
    } else if (/[0-9.]/.test(ch)) {
      let numStr = ''
      while (i < s.length && /[0-9.]/.test(s[i])) {
        numStr += s[i]
        i++
      }
      const val = parseFloat(numStr)
      if (isNaN(val)) return []
      tokens.push({ type: 'NUMBER', value: val })
    } else {
      // Caractere inválido ou não suportado
      return []
    }
  }

  return tokens
}

/**
 * Avaliador seguro de expressões matemáticas com variáveis A, B e C.
 * Implementa descida recursiva (sem eval nem Function) para:
 *   expression = term (('+' | '-') term)*
 *   term       = factor (('*' | '/') factor)*
 *   factor     = ('+' | '-')? (NUMBER | VAR | '(' expression ')')
 */
export function avaliarFormulaSegura(
  formula: string,
  vars: { a: number; b: number; c: number },
): number | null {
  const tokens = tokenize(formula)
  if (tokens.length === 0) return null

  let pos = 0

  function peek(): Token | undefined {
    return tokens[pos]
  }

  function consume(expected?: TokenType): Token | null {
    const token = tokens[pos]
    if (!token) return null
    if (expected && token.type !== expected) return null
    pos++
    return token
  }

  function parseExpression(): number | null {
    let result = parseTerm()
    if (result === null) return null

    while (pos < tokens.length) {
      const next = peek()
      if (next && (next.type === 'PLUS' || next.type === 'MINUS')) {
        consume()
        const rhs = parseTerm()
        if (rhs === null) return null
        if (next.type === 'PLUS') {
          result = result + rhs
        } else {
          result = result - rhs
        }
      } else {
        break
      }
    }

    return result
  }

  function parseTerm(): number | null {
    let result = parseFactor()
    if (result === null) return null

    while (pos < tokens.length) {
      const next = peek()
      if (next && (next.type === 'MUL' || next.type === 'DIV')) {
        consume()
        const rhs = parseFactor()
        if (rhs === null) return null
        if (next.type === 'MUL') {
          result = result * rhs
        } else {
          if (rhs === 0) return 0 // Proteção contra divisão por zero
          result = result / rhs
        }
      } else {
        break
      }
    }

    return result
  }

  function parseFactor(): number | null {
    const token = peek()
    if (!token) return null

    // Operadores unários + ou -
    if (token.type === 'PLUS') {
      consume()
      return parseFactor()
    }
    if (token.type === 'MINUS') {
      consume()
      const val = parseFactor()
      return val === null ? null : -val
    }

    if (token.type === 'NUMBER') {
      consume()
      return Number(token.value)
    }

    if (token.type === 'VAR') {
      consume()
      const vName = String(token.value)
      if (vName === 'a') return vars.a
      if (vName === 'b') return vars.b
      if (vName === 'c') return vars.c
      return null
    }

    if (token.type === 'LPAREN') {
      consume('LPAREN')
      const sub = parseExpression()
      if (sub === null) return null
      if (!consume('RPAREN')) return null
      return sub
    }

    return null
  }

  const valorFinal = parseExpression()
  if (pos !== tokens.length || valorFinal === null || !isFinite(valorFinal)) {
    return null
  }

  return valorFinal
}

/**
 * Calcula a quantidade com base nas dimensões A, B e C e no método de cálculo.
 * Retorna null quando o método for livre ou dimensões não forem informadas.
 */
export function calcularQuantidadePorDimensoes(
  dimA?: number | null,
  dimB?: number | null,
  metodoCalculo?: string | null,
  dimC?: number | null,
): number | null {
  const tipo = identificarTipoFormula(metodoCalculo)
  const a = Number(dimA) || 0
  const b = Number(dimB) || 0
  const c = Number(dimC) || 0

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

  if (tipo === 'custom' && metodoCalculo) {
    const usaC = formulaUsaVariavelC(metodoCalculo)
    // Se a fórmula usa C e todas as dimensões são zero, retorna null
    if (a === 0 && b === 0 && (!usaC || c === 0)) return null

    const resultado = avaliarFormulaSegura(metodoCalculo, { a, b, c })
    if (resultado === null || isNaN(resultado)) return null
    return Number(resultado.toFixed(4))
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
