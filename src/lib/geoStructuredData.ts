import { CIDADES_ATENDIDAS as FALLBACK_CIDADES } from '@/data/landingData'

export interface ParsedCity {
  /** Nome limpo da cidade (com acentuação preservada), ex.: "São Pedro" */
  name: string
  /** Sigla do estado (UF em maiúsculas, 2 letras) quando identificada, ex.: "SP" */
  addressRegion?: string
}

export interface CityStructuredData {
  '@type': 'City'
  name: string
  address?: {
    '@type': 'PostalAddress'
    addressRegion: string
    addressCountry: string
  }
}

/**
 * Converte uma entrada de texto como "São Pedro/SP", "Piracicaba - SP", "Rio Claro (SP)" ou "Brotas"
 * em objeto estruturado com nome limpo e sigla UF padronizada.
 */
export function parseCidadeEstado(raw: string | null | undefined): ParsedCity {
  if (!raw || typeof raw !== 'string') {
    return { name: '' }
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return { name: '' }
  }

  // Padrão mais comum: "São Pedro/SP", "Águas de São Pedro / SP"
  const slashMatch = trimmed.match(/^(.+?)\s*\/\s*([A-Za-z]{2})$/)
  if (slashMatch) {
    return {
      name: slashMatch[1].trim(),
      addressRegion: slashMatch[2].toUpperCase(),
    }
  }

  // Padrão hífen: "São Pedro - SP"
  const dashMatch = trimmed.match(/^(.+?)\s*-\s*([A-Za-z]{2})$/)
  if (dashMatch) {
    return {
      name: dashMatch[1].trim(),
      addressRegion: dashMatch[2].toUpperCase(),
    }
  }

  // Padrão parênteses: "São Pedro (SP)"
  const parenMatch = trimmed.match(/^(.+?)\s*\(([A-Za-z]{2})\)$/)
  if (parenMatch) {
    return {
      name: parenMatch[1].trim(),
      addressRegion: parenMatch[2].toUpperCase(),
    }
  }

  // Padrão vírgula: "São Pedro, SP"
  const commaMatch = trimmed.match(/^(.+?)\s*,\s*([A-Za-z]{2})$/)
  if (commaMatch) {
    return {
      name: commaMatch[1].trim(),
      addressRegion: commaMatch[2].toUpperCase(),
    }
  }

  return { name: trimmed }
}

/**
 * Normaliza uma lista mista de cidades (strings ou já parsed) para formato estruturado Schema.org City.
 * Cada cidade gera um nó `@type: 'City'` com `name` limpo e `address: { @type: 'PostalAddress', addressRegion, addressCountry: 'BR' }`
 * quando a UF for informada, cumprindo a especificação Google Search Structured Data para City e PostalAddress.
 */
export function formatAreaServedCity(cidadeRaw: string): CityStructuredData {
  const parsed = parseCidadeEstado(cidadeRaw)
  const cityObj: CityStructuredData = {
    '@type': 'City',
    name: parsed.name || cidadeRaw,
  }

  if (parsed.addressRegion) {
    cityObj.address = {
      '@type': 'PostalAddress',
      addressRegion: parsed.addressRegion,
      addressCountry: 'BR',
    }
  }

  return cityObj
}

/**
 * Converte uma lista de strings de cidades em array de Schema.org City estruturado.
 */
export function buildAreaServedCities(cidades?: string[] | null): CityStructuredData[] {
  const list = Array.isArray(cidades) && cidades.length > 0 ? cidades : FALLBACK_CIDADES
  return list
    .filter((c) => typeof c === 'string' && c.trim().length > 0)
    .map((c) => formatAreaServedCity(c))
}
