/**
 * Serviços NFS-e (Gesso Bettone) — dados de referência e cálculo de impostos.
 * Padrão NFS-e Nacional (LC 116/2003) — usado pelo módulo /painel/nfse.
 */

export interface NFSeImpostos {
  baseCalculo: number
  aliquotaIss: number
  valorIss: number
  issRetido: boolean
  aliquotaIrrf: number
  valorIrrf: number
  aliquotaCsll: number
  valorCsll: number
  aliquotaCofins: number
  valorCofins: number
  aliquotaPis: number
  valorPis: number
  totalRetencoesFederais: number
  valorLiquido: number
}

/** Serviços pré-cadastrados: atividades econômicas do CNPJ (gesso/drywall/obras) mapeadas à LC 116. */
export const SERVICOS_PRE_CADASTRADOS = [
  {
    nome: 'Aplicação de forro de gesso',
    codigo_lc116: '7.04',
    descricao:
      'Serviços de instalação e montagem de forros de gesso (placas e gesso liso), inclusive sancas e iluminação embutida.',
    aliquota_iss_padrao: 2,
    reter_irrf: false,
    reter_csll: false,
    reter_cofins: false,
    reter_pis: false,
  },
  {
    nome: 'Instalação e montagem de drywall / paredes de gesso acartonado',
    codigo_lc116: '7.04',
    descricao:
      'Montagem de paredes e divisórias em drywall (gesso acartonado), plumas, steel frame e acabamentos.',
    aliquota_iss_padrao: 2,
    reter_irrf: false,
    reter_csll: false,
    reter_cofins: false,
    reter_pis: false,
  },
  {
    nome: 'Execução de alvenaria e revestimento de paredes',
    codigo_lc116: '7.01',
    descricao:
      'Execução de alvenaria, emboço, reboco e revestimento de paredes em obras de construção civil.',
    aliquota_iss_padrao: 2,
    reter_irrf: false,
    reter_csll: false,
    reter_cofins: false,
    reter_pis: false,
  },
  {
    nome: 'Obras de concreto e acabamento em edificações',
    codigo_lc116: '7.02',
    descricao:
      'Serviços e obras de concreto em geral e acabamentos em edificações (novo, reforma ou ampliação).',
    aliquota_iss_padrao: 2,
    reter_irrf: false,
    reter_csll: false,
    reter_cofins: false,
    reter_pis: false,
  },
  {
    nome: 'Instalação e montagem de estruturas metálicas / drywall industrial',
    codigo_lc116: '7.05',
    descricao: 'Instalação e montagem de estruturas metálicas e divisórias industriais.',
    aliquota_iss_padrao: 2,
    reter_irrf: false,
    reter_csll: false,
    reter_cofins: false,
    reter_pis: false,
  },
  {
    nome: 'Reformas e acabamentos em interiores (gesso, pintura e molduras)',
    codigo_lc116: '7.07',
    descricao: 'Reformas em geral: gesso, pintura, molduras, sancas e acabamentos internos.',
    aliquota_iss_padrao: 2,
    reter_irrf: false,
    reter_csll: false,
    reter_pis: false,
    reter_cofins: false,
  },
]

/** Empresa emitente pré-cadastrada (regra do dono). */
export const EMITENTE_PRE_CADASTRADO = {
  razao_social: 'GB SOLUCOES LTDA',
  nome_fantasia: 'Gesso Bettone',
  cnpj: '53.242.055/0001-74',
  logradouro: '',
  numero: 'S/N',
  bairro: 'Centro',
  codigo_municipio_ibge: '3550407',
  municipio: 'São Pedro',
  uf: 'SP',
  cep: '',
  telefone: '',
  email: '',
  inscricao_municipal: '',
}

export const MUNICIPIO_ISS_PADRAO = 'São Pedro/SP'
export const CODIGO_IBGE_SAO_PEDRO_SP = '3550407'

/** Alíquotas federais padrão (Lucro Presumido, retenção sobre serviços para tomador PJ). */
export const ALIQUOTAS_FEDERAIS_PADRAO = {
  irrf: 1.5,
  csll: 1.0,
  cofins: 3.0,
  pis: 0.65,
}

export function formatMoedaNFSe(val: number | null | undefined): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Calcula ISS + retenções federais (IRRF, CSLL, COFINS, PIS) sobre o valor do serviço.
 * As retenções federais só são retidas quando o tomador é Pessoa Jurídica
 * (regra do imposto de renda na fonte sobre serviços).
 */
export function calcularImpostos(
  valorServicos: number,
  opts: {
    aliquotaIss?: number
    issRetido?: boolean
    aliquotaIrrf?: number
    aliquotaCsll?: number
    aliquotaCofins?: number
    aliquotaPis?: number
    tomadorPessoaJuridica?: boolean
  } = {},
): NFSeImpostos {
  const base = Math.max(0, valorServicos || 0)
  const pj = opts.tomadorPessoaJuridica !== false

  const aliquotaIss = opts.aliquotaIss ?? 2
  const valorIss = Math.round(base * (aliquotaIss / 100) * 100) / 100

  const aliquotaIrrf = pj ? (opts.aliquotaIrrf ?? ALIQUOTAS_FEDERAIS_PADRAO.irrf) : 0
  const aliquotaCsll = pj ? (opts.aliquotaCsll ?? ALIQUOTAS_FEDERAIS_PADRAO.csll) : 0
  const aliquotaCofins = pj ? (opts.aliquotaCofins ?? ALIQUOTAS_FEDERAIS_PADRAO.cofins) : 0
  const aliquotaPis = pj ? (opts.aliquotaPis ?? ALIQUOTAS_FEDERAIS_PADRAO.pis) : 0

  const valorIrrf = Math.round(base * (aliquotaIrrf / 100) * 100) / 100
  const valorCsll = Math.round(base * (aliquotaCsll / 100) * 100) / 100
  const valorCofins = Math.round(base * (aliquotaCofins / 100) * 100) / 100
  const valorPis = Math.round(base * (aliquotaPis / 100) * 100) / 100

  const totalRetencoesFederais = valorIrrf + valorCsll + valorCofins + valorPis

  return {
    baseCalculo: base,
    aliquotaIss,
    valorIss,
    issRetido: Boolean(opts.issRetido),
    aliquotaIrrf,
    valorIrrf,
    aliquotaCsll,
    valorCsll,
    aliquotaCofins,
    valorCofins,
    aliquotaPis,
    valorPis,
    totalRetencoesFederais,
    valorLiquido: Math.max(0, base - valorIss - totalRetencoesFederais),
  }
}

/** Valida CPF (11 dígitos) e CNPJ (14 dígitos) pelos dígitos verificadores. */
export function validarDocumento(doc: string): boolean {
  const d = (doc || '').replace(/\D/g, '')
  if (d.length === 11) return validarCpf(d)
  if (d.length === 14) return validarCnpj(d)
  return false
}

export function validarCpf(cpf: string): boolean {
  const d = (cpf || '').replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  let soma = 0
  for (let i = 0; i < 9; i++) soma += Number(d[i]) * (10 - i)
  let dv1 = (soma * 10) % 11
  if (dv1 === 10) dv1 = 0
  if (dv1 !== Number(d[9])) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * (11 - i)
  let dv2 = (soma * 10) % 11
  if (dv2 === 10) dv2 = 0
  return dv2 === Number(d[10])
}

export function validarCnpj(cnpj: string): boolean {
  const d = (cnpj || '').replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const calc = (len: number) => {
    let pos = len - 7
    let soma = 0
    for (let i = 0; i < len; i++) {
      soma += Number(d[i]) * pos--
      if (pos < 2) pos = 9
    }
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

export function formatarDocumento(doc: string): string {
  const d = (doc || '').replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return doc || ''
}
