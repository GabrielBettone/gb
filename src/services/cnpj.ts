/**
 * Serviço de consulta a dados cadastrais de CNPJ via APIs públicas e gratuitas
 * Provedor primário: BrasilAPI (https://brasilapi.com.br/api/cnpj/v1/{cnpj})
 * Provedor de contingência: Minha Receita (https://minhareceita.org/{cnpj})
 *
 * Características:
 * - Cache em memória para evitar chamadas redundantes
 * - Timeout de 6 segundos por provedor
 * - Tratamento gracioso de erros (404, indisponibilidade, timeout) sem travar o app
 * - Normalização de logradouro, endereço completo, CEP, município e código IBGE (7 dígitos)
 */

export interface CnpjConsultaResult {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cep: string
  municipio: string
  uf: string
  codigo_municipio_ibge: string
  email: string
  telefone: string
  situacao_cadastral: string
  opcao_pelo_simples: boolean | null
  opcao_pelo_mei: boolean | null
  cnae_principal_codigo: string
  cnae_principal_descricao: string
  endereco_completo: string
  provedor: 'brasilapi' | 'minhareceita' | 'cache'
}

const cnpjCache = new Map<string, CnpjConsultaResult>()

function apenasDigitos(val: string | null | undefined): string {
  return (val || '').replace(/\D/g, '')
}

function formatarTelefone(ddd: string | undefined, numero: string | undefined): string {
  const d = apenasDigitos(ddd)
  const num = apenasDigitos(numero)
  if (!d && !num) return ''
  if (!d && num) return num
  if (num.length >= 8) {
    const parte1 = num.slice(0, num.length === 9 ? 5 : 4)
    const parte2 = num.slice(num.length === 9 ? 5 : 4)
    return `(${d}) ${parte1}-${parte2}`
  }
  return `(${d}) ${num}`
}

function montarEnderecoCompleto(dados: {
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
}): string {
  const partes: string[] = []
  const rua = dados.logradouro
    ? `${dados.logradouro}${dados.numero ? `, ${dados.numero}` : ''}`
    : ''
  if (rua) partes.push(rua)
  if (dados.complemento) partes.push(dados.complemento)
  if (dados.bairro) partes.push(`Bairro ${dados.bairro}`)
  if (dados.municipio) partes.push(`${dados.municipio}/${dados.uf || 'SP'}`)
  if (dados.cep) partes.push(`CEP ${dados.cep}`)
  return partes.join(' - ')
}

/**
 * Consulta informações de um CNPJ com fallback automático entre BrasilAPI e Minha Receita.
 * Retorna null se não for CNPJ (ex.: CPF com 11 dígitos), se não encontrado ou se as APIs estiverem fora.
 */
export async function consultarCnpj(
  cnpjInput: string,
  opts: { timeoutMs?: number; forcarRecarregar?: boolean } = {},
): Promise<CnpjConsultaResult | null> {
  const cnpj = apenasDigitos(cnpjInput)
  if (cnpj.length !== 14) {
    return null
  }

  const { timeoutMs = 6500, forcarRecarregar = false } = opts

  if (!forcarRecarregar && cnpjCache.has(cnpj)) {
    return cnpjCache.get(cnpj)!
  }

  // 1. Tenta BrasilAPI
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)

    if (resp.ok) {
      const data = await resp.json()
      const logradouro =
        [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' ').trim() ||
        String(data.logradouro || '')

      const tel = data.ddd_telefone_1
        ? formatarTelefone(data.ddd_telefone_1.slice(0, 2), data.ddd_telefone_1.slice(2))
        : ''

      const cepRaw = apenasDigitos(data.cep)
      const cepFormatado =
        cepRaw.length === 8 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : data.cep || ''

      const resultado: CnpjConsultaResult = {
        cnpj,
        razao_social: (data.razao_social || '').trim(),
        nome_fantasia: (data.nome_fantasia || '').trim(),
        logradouro,
        numero: String(data.numero || '').trim() || 'S/N',
        complemento: String(data.complemento || '').trim(),
        bairro: String(data.bairro || '').trim(),
        cep: cepFormatado,
        municipio: String(data.municipio || '').trim(),
        uf: String(data.uf || 'SP')
          .trim()
          .toUpperCase(),
        codigo_municipio_ibge: String(data.codigo_municipio_ibge || '').trim(),
        email: String(data.email || '')
          .trim()
          .toLowerCase(),
        telefone: tel,
        situacao_cadastral: String(
          data.descricao_situacao_cadastral || data.situacao_cadastral || '',
        ),
        opcao_pelo_simples:
          typeof data.opcao_pelo_simples === 'boolean' ? data.opcao_pelo_simples : null,
        opcao_pelo_mei: typeof data.opcao_pelo_mei === 'boolean' ? data.opcao_pelo_mei : null,
        cnae_principal_codigo: String(data.cnae_fiscal || ''),
        cnae_principal_descricao: String(data.cnae_fiscal_descricao || ''),
        endereco_completo: montarEnderecoCompleto({
          logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,
          cep: cepFormatado,
        }),
        provedor: 'brasilapi',
      }

      cnpjCache.set(cnpj, resultado)
      return resultado
    }
  } catch (err) {
    // Falha ou timeout na BrasilAPI: segue para contingência
  }

  // 2. Provedor de contingência: Minha Receita
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const resp = await fetch(`https://minhareceita.org/${cnpj}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)

    if (resp.ok) {
      const data = await resp.json()
      const logradouro =
        [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' ').trim() ||
        String(data.logradouro || '')

      const tel = data.ddd_telefone_1
        ? formatarTelefone(data.ddd_telefone_1.slice(0, 2), data.ddd_telefone_1.slice(2))
        : ''

      const cepRaw = apenasDigitos(data.cep)
      const cepFormatado =
        cepRaw.length === 8 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : data.cep || ''

      const resultado: CnpjConsultaResult = {
        cnpj,
        razao_social: (data.razao_social || '').trim(),
        nome_fantasia: (data.nome_fantasia || '').trim(),
        logradouro,
        numero: String(data.numero || '').trim() || 'S/N',
        complemento: String(data.complemento || '').trim(),
        bairro: String(data.bairro || '').trim(),
        cep: cepFormatado,
        municipio: String(data.municipio || '').trim(),
        uf: String(data.uf || 'SP')
          .trim()
          .toUpperCase(),
        codigo_municipio_ibge: String(data.codigo_municipio_ibge || '').trim(),
        email: String(data.email || '')
          .trim()
          .toLowerCase(),
        telefone: tel,
        situacao_cadastral: String(
          data.descricao_situacao_cadastral || data.situacao_cadastral || '',
        ),
        opcao_pelo_simples:
          typeof data.opcao_pelo_simples === 'boolean' ? data.opcao_pelo_simples : null,
        opcao_pelo_mei: typeof data.opcao_pelo_mei === 'boolean' ? data.opcao_pelo_mei : null,
        cnae_principal_codigo: String(data.cnae_fiscal || ''),
        cnae_principal_descricao: String(data.cnae_fiscal_descricao || ''),
        endereco_completo: montarEnderecoCompleto({
          logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,
          cep: cepFormatado,
        }),
        provedor: 'minhareceita',
      }

      cnpjCache.set(cnpj, resultado)
      return resultado
    }
  } catch (err) {
    // Provedor de contingência também falhou
  }

  return null
}
