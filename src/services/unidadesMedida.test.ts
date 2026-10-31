import { describe, it, expect } from 'vitest'
import {
  identificarTipoFormula,
  calcularQuantidadePorDimensoes,
  avaliarFormulaSegura,
  formulaUsaVariavelC,
} from '@/services/unidadesMedida'

describe('unidadesMedida - avaliador de fórmulas e dimensões', () => {
  it('identifica corretamente fórmulas padrão e customizadas', () => {
    expect(identificarTipoFormula('AxB')).toBe('axb')
    expect(identificarTipoFormula('A*B')).toBe('axb')
    expect(identificarTipoFormula('(A+B)x2')).toBe('perimetro')
    expect(identificarTipoFormula('(A+B)*2')).toBe('perimetro')
    expect(identificarTipoFormula('(A+B)*C')).toBe('custom')
    expect(identificarTipoFormula('(A+B)xC')).toBe('custom')
    expect(identificarTipoFormula('A*B*C')).toBe('custom')
    expect(identificarTipoFormula('')).toBe('livre')
    expect(identificarTipoFormula(null)).toBe('livre')
  })

  it('detecta se a fórmula usa a variável C', () => {
    expect(formulaUsaVariavelC('(A+B)*C')).toBe(true)
    expect(formulaUsaVariavelC('A*B*C')).toBe(true)
    expect(formulaUsaVariavelC('AxB')).toBe(false)
    expect(formulaUsaVariavelC('(A+B)x2')).toBe(false)
  })

  it('calcula corretamente (A+B)*C com A=2, B=2, C=3 retornando 12 (ou (2+2)*3 = 12, ou A=2,B=2,C=6 etc)', () => {
    // Caso exato reproduzido: A=2, B=2, C=3 => (2+2)*3 = 12
    const res1 = calcularQuantidadePorDimensoes(2, 2, '(A+B)*C', 3)
    expect(res1).toBe(12)

    // E A=2, B=2, C=6 => (2+2)*6 = 24
    const res2 = calcularQuantidadePorDimensoes(2, 2, '(A+B)*C', 6)
    expect(res2).toBe(24)

    // Se C não for informado (0), (2+2)*0 = 0
    const resZero = calcularQuantidadePorDimensoes(2, 2, '(A+B)*C', 0)
    expect(resZero).toBe(0)
  })

  it('calcula (A+B)*2 fixo apenas quando é perímetro', () => {
    const perim = calcularQuantidadePorDimensoes(2, 2, '(A+B)*2')
    expect(perim).toBe(8)
  })

  it('avaliarFormulaSegura lida com parênteses, precedência de operadores e divisão por zero', () => {
    expect(avaliarFormulaSegura('2 + 3 * 4', { a: 0, b: 0, c: 0 })).toBe(14)
    expect(avaliarFormulaSegura('(2 + 3) * 4', { a: 0, b: 0, c: 0 })).toBe(20)
    expect(avaliarFormulaSegura('(a + b) / 2', { a: 10, b: 6, c: 0 })).toBe(8)
    expect(avaliarFormulaSegura('a / 0', { a: 10, b: 0, c: 0 })).toBe(0)
    expect(avaliarFormulaSegura('a + b + c', { a: 1, b: 2, c: 3 })).toBe(6)
  })
})
