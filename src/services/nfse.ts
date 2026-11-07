/**
 * Serviços NFS-e (Gesso Bettone) — dados de referência e cálculo de impostos.
 * Padrão NFS-e Nacional (LC 116/2003) — usado pelo módulo /painel/nfse.
 */

export interface NFSeImpostos {
  /** Retenções federais dispensadas por limite legal (valor < R$ 215,00). */
  retencoesDispensadas?: boolean
  /** Retenção de IRRF dispensada (retenção < R$ 10,00). */
  irrfDispensado?: boolean
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

/** Serviços pré-cadastrados: atividades reais do usuário (Cartão CNPJ + lista
 * ditada pelo dono) mapeadas à tabela da LC 116/2003. Códigos confirmados na
 * tabela oficial da lei (Anexo da LC 116) — editáveis na tela Serviços. */
export const SERVICOS_PRE_CADASTRADOS = [
  {
    nome: 'Marcenaria (móveis e artigos de carpintaria sob medida)',
    codigo_lc116: '14.13',
    descricao:
      'Fabricação e instalação de móveis e artigos de carpintaria sob medida (bancadas, armários, closets, painéis) — CNAE 16.22-6-99 / 31.01-2-00.',
    aliquota_iss_padrao: 3,
    reter_irrf: true,
    reter_csll: true,
    reter_cofins: true,
    reter_pis: true,
  },
  {
    nome: 'Serralheria (esquadrias e artigos de metal)',
    codigo_lc116: '14.13',
    descricao:
      'Execução de serviços de serralheria: esquadrias de metal, portas, janelas, grades e estruturas metálicas — CNAE 25.12-8-00 / 25.42-0-00.',
    aliquota_iss_padrao: 3,
    reter_irrf: true,
    reter_csll: true,
    reter_cofins: true,
    reter_pis: true,
  },
  {
    nome: 'Montagem de móveis de qualquer material',
    codigo_lc116: '7.16',
    descricao:
      'Serviços de montagem e instalação de móveis de qualquer material no local do cliente — CNAE 33.29-5-01.',
    aliquota_iss_padrao: 3,
    reter_irrf: true,
    reter_csll: true,
    reter_cofins: true,
    reter_pis: true,
  },
  {
    nome: 'Obras de acabamento em gesso e estuque (forros, sancas, molduras)',
    codigo_lc116: '14.01',
    descricao:
      'Aplicação de forro de gesso, sancas, molduras e trabalhos em estuque em obras de acabamento — CNAE 43.30-4-03.',
    aliquota_iss_padrao: 3,
    reter_irrf: true,
    reter_csll: true,
    reter_cofins: true,
    reter_pis: true,
  },
  {
    nome: 'Instalação de drywall — portas, janelas, tetos, divisórias e armários embutidos (forro e paredes)',
    codigo_lc116: '14.01',
    descricao:
      'Instalação de drywall (forro e paredes), divisórias, tetos, portas, janelas e armários embutidos de qualquer material — CNAE 43.30-4-02.',
    aliquota_iss_padrao: 3,
    reter_irrf: true,
    reter_csll: true,
    reter_cofins: true,
    reter_pis: true,
  },
  {
    nome: 'Obras de alvenaria',
    codigo_lc116: '14.01',
    descricao:
      'Execução de obras de alvenaria e acabamento em construções novas, reformas e ampliações — CNAE 43.99-1-03.',
    aliquota_iss_padrao: 3,
    reter_irrf: true,
    reter_csll: true,
    reter_cofins: true,
    reter_pis: true,
  },
  {
    nome: 'Instalações hidráulicas, sanitárias e de gás',
    codigo_lc116: '14.01',
    descricao:
      'Instalações hidráulicas, sanitárias e de gás em obras de construção civil — CNAE 43.22-3-01.',
    aliquota_iss_padrao: 3,
    reter_irrf: true,
    reter_csll: true,
    reter_cofins: true,
    reter_pis: true,
  },
]

/** Empresa emitente pré-cadastrada (dados do Cartão CNPJ — regra do dono). */
export const EMITENTE_PRE_CADASTRADO = {
  razao_social: 'GB SOLUCOES LTDA',
  nome_fantasia: 'GGB INFOTECH LTDA',
  cnpj: '53.242.055/0001-74',
  logradouro: 'R Heitor Mariotti',
  numero: '185',
  bairro: 'Mariluz',
  codigo_municipio_ibge: '3550407',
  municipio: 'São Pedro',
  uf: 'SP',
  cep: '13.522-340',
  telefone: '(19) 8109-3379',
  email: 'JAFASSESSORIACONTABIL@HOTMAIL.COM',
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

/** Limites legais de dispensa de retenção federal (Lei 10.833/2003 e RIR/99):
 * - PIS/COFINS/CSLL só são retidos quando o serviço individual (por nota)
 *   ultrapassa R$ 215,00 (pagamento a PJ);
 * - IRRF só é retido quando o valor da retenção atinge R$ 10,00 (dispensa
 *   abaixo disso — art. 724 RIR/99). */
export const LIMITES_RETENCAO_FEDERAL = {
  valorMinimoPisCofinsCsll: 215.0,
  valorMinimoIrrf: 10.0,
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

  const aliquotaIss = opts.aliquotaIss ?? 3
  const valorIss = Math.round(base * (aliquotaIss / 100) * 100) / 100

  const aliquotaIrrf = pj ? (opts.aliquotaIrrf ?? ALIQUOTAS_FEDERAIS_PADRAO.irrf) : 0
  const aliquotaCsll = pj ? (opts.aliquotaCsll ?? ALIQUOTAS_FEDERAIS_PADRAO.csll) : 0
  const aliquotaCofins = pj ? (opts.aliquotaCofins ?? ALIQUOTAS_FEDERAIS_PADRAO.cofins) : 0
  const aliquotaPis = pj ? (opts.aliquotaPis ?? ALIQUOTAS_FEDERAIS_PADRAO.pis) : 0

  // Retenção bruta antes dos limites de dispensa
  const brutoIrrf = Math.round(base * (aliquotaIrrf / 100) * 100) / 100
  const brutoCsll = Math.round(base * (aliquotaCsll / 100) * 100) / 100
  const brutoCofins = Math.round(base * (aliquotaCofins / 100) * 100) / 100
  const brutoPis = Math.round(base * (aliquotaPis / 100) * 100) / 100

  // Limites legais de dispensa: PIS/COFINS/CSLL só retidos acima de R$ 215,00
  // por serviço (Lei 10.833/2003); IRRF só quando a retenção atinge R$ 10,00
  // (art. 724 do RIR/99). Abaixo disso, desconta (não retém) e informa.
  const dispensaPisCofinsCsll = !pj || base < LIMITES_RETENCAO_FEDERAL.valorMinimoPisCofinsCsll
  const dispensaIrrf = !pj || brutoIrrf < LIMITES_RETENCAO_FEDERAL.valorMinimoIrrf

  const valorIrrf = dispensaIrrf ? 0 : brutoIrrf
  const valorCsll = dispensaPisCofinsCsll ? 0 : brutoCsll
  const valorCofins = dispensaPisCofinsCsll ? 0 : brutoCofins
  const valorPis = dispensaPisCofinsCsll ? 0 : brutoPis

  const totalRetencoesFederais = valorIrrf + valorCsll + valorCofins + valorPis

  return {
    baseCalculo: base,
    aliquotaIss,
    valorIss,
    issRetido: Boolean(opts.issRetido),
    retencoesDispensadas: dispensaPisCofinsCsll,
    irrfDispensado: dispensaIrrf,
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
