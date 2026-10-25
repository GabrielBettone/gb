import React, { useEffect } from 'react'

export interface SEOProps {
  title: string
  description: string
  canonical?: string
  ogType?: 'website' | 'article'
  ogImage?: string
  keywords?: string[]
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>
}

const DEFAULT_TITLE = 'Gesso Bettone | Gesso, Drywall e Acabamentos em São Pedro/SP'
const DEFAULT_DESC =
  'Projetos em gesso, drywall e acabamentos de alto padrão em São Pedro/SP e região. Mais de 30 anos de experiência, precisão e atenção aos detalhes.'
const DEFAULT_IMAGE =
  'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg'
const BASE_URL = 'https://gessobettone.com.br'

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  keywords,
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Title
    const fullTitle = title.includes('Gesso Bettone') ? title : `${title} | Gesso Bettone`
    document.title = fullTitle

    // Helper para atualizar ou criar meta tag
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attr, key)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // 2. Metas básicas
    setMeta('name', 'description', description)
    if (keywords && keywords.length > 0) {
      setMeta('name', 'keywords', keywords.join(', '))
    }
    setMeta('name', 'robots', 'index, follow, max-image-preview:large')

    // 3. OpenGraph
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', ogType)
    setMeta('property', 'og:locale', 'pt_BR')
    setMeta('property', 'og:site_name', 'Gesso Bettone')
    setMeta('property', 'og:image', ogImage)

    const fullCanonical = canonical
      ? canonical.startsWith('http')
        ? canonical
        : `${BASE_URL}${canonical.startsWith('/') ? canonical : `/${canonical}`}`
      : `${BASE_URL}${window.location.pathname}`

    setMeta('property', 'og:url', fullCanonical)

    // 4. Twitter Cards
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', ogImage)

    // 5. Canonical
    let canonicalLink = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.setAttribute('href', fullCanonical)
    // 6. JSON-LD
    const jsonLdId = 'structured-data-jsonld'
    let scriptTag = document.getElementById(jsonLdId) as HTMLScriptElement | null

    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script')
        scriptTag.id = jsonLdId
        scriptTag.type = 'application/ld+json'
        document.head.appendChild(scriptTag)
      }
      scriptTag.textContent = JSON.stringify(jsonLd)
    } else if (scriptTag) {
      scriptTag.remove()
    }

    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [title, description, canonical, ogType, ogImage, keywords, jsonLd])

  // Cleanup canonical / tags if necessary
  return null
}

export default SEO
