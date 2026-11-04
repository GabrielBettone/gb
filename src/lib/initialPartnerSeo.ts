/**
 * SEO inicial sincrônico para páginas de parceiros e categorias.
 *
 * Roda ANTES da primeira renderização do React (chamado em src/main.tsx), lendo apenas
 * a URL atual — sem rede, sem estado assíncrono — para que o crawler encontre no HTML
 * inicial (ou na injeção síncrona pré-render) meta título, description, canonical e
 * JSON-LD de cada parceiro/categoria. Quando o SEO component (assíncrono) carregar os
 * dados reais do banco, ele sobrescreve estas tags com os valores definitivos.
 */
import { buildAreaServedCities } from '@/lib/geoStructuredData'

const SITE_NAME = 'Gesso Bettone'

/** "edvaldo-pintura-residencial-e-comercial" → "Edvaldo Pintura Residencial E Comercial" */
function nomeFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function definirMetaTag(attr: 'name' | 'property', nome: string, conteudo: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${nome}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, nome)
    document.head.appendChild(el)
  }
  el.setAttribute('content', conteudo)
}

function definirCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

function definirJsonLd(id: string, dados: Record<string, unknown>) {
  const existente = document.getElementById(id)
  if (existente) existente.remove()
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = id
  script.textContent = JSON.stringify(dados)
  document.head.appendChild(script)
}

function aplicar(
  titulo: string,
  descricao: string,
  jsonLd: Record<string, unknown>,
  jsonLdId: string,
) {
  const url = window.location.origin + window.location.pathname
  document.title = titulo
  definirMetaTag('name', 'description', descricao)
  definirMetaTag('property', 'og:title', titulo)
  definirMetaTag('property', 'og:description', descricao)
  definirMetaTag('property', 'og:type', 'website')
  definirMetaTag('property', 'og:url', url)
  definirCanonical(url)
  definirJsonLd(jsonLdId, jsonLd)
}

/**
 * Página de parceiro individual: /parceiros/:slug
 * Injeta JSON-LD LocalBusiness com areaServed alimentado pelas cidades das Configurações.
 */
function aplicarSeoParceiro(slug: string) {
  const nome = nomeFromSlug(slug)
  const descricao = `${nome}, parceiro da Gesso Bettone em construção, gesso, drywall e acabamentos. Confira o trabalho e solicite um orçamento em São Pedro/SP e região.`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: nome,
    description: descricao,
    url: window.location.href,
    areaServed: buildAreaServedCities(),
  }

  aplicar(`${nome} | Parceiros ${SITE_NAME}`, descricao, jsonLd, 'structured-data-jsonld')
}

/** Página de categoria: /parceiros/categoria/:slug */
function aplicarSeoCategoria(slug: string) {
  const categoria = nomeFromSlug(slug)
  const descricao = `Conheça os parceiros da Gesso Bettone em ${categoria}: profissionais e empresas confiáveis para sua obra. Solicite um orçamento em São Pedro/SP e região.`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Parceiros de ${categoria}`,
    description: descricao,
    url: window.location.href,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME },
  }

  aplicar(`Parceiros de ${categoria} | ${SITE_NAME}`, descricao, jsonLd, 'structured-data-jsonld')
}

/** Avalia a URL atual e aplica o SEO inicial quando for página de parceiros/categoria. */
export function aplicarSeoInicialParceiros() {
  if (typeof window === 'undefined') return
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/' || path === '') return

  const matchCategoria = path.match(/^\/parceiros\/categoria\/([^/]+)$/)
  if (matchCategoria) {
    aplicarSeoCategoria(decodeURIComponent(matchCategoria[1]))
    return
  }

  const matchParceiro = path.match(/^\/parceiros\/([^/]+)$/)
  if (matchParceiro) {
    aplicarSeoParceiro(decodeURIComponent(matchParceiro[1]))
  }
}
