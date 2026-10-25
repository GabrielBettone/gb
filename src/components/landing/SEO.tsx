import React, { useEffect, useState } from 'react'
import { obterConfiguracoes } from '@/services/site'

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

// Cache em memória para evitar chamadas duplicadas de site_settings entre páginas
let cachedGoogleSiteVerification: string | null = null

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  keywords,
  jsonLd,
}) => {
  const [googleVerification, setGoogleVerification] = useState<string>(
    cachedGoogleSiteVerification || '',
  )

  useEffect(() => {
    if (cachedGoogleSiteVerification === null) {
      obterConfiguracoes()
        .then((cfg) => {
          const raw = cfg.google_site_verification || ''
          // Se o usuário colou a tag inteira <meta name="..." content="...">, extrai só o content
          let token = raw.trim()
          const match = token.match(/content=["']([^"']+)["']/i)
          if (match && match[1]) {
            token = match[1]
          }
          cachedGoogleSiteVerification = token
          setGoogleVerification(token)
        })
        .catch(() => {
          cachedGoogleSiteVerification = ''
        })
    }
  }, [])

  useEffect(() => {
    try {
      const safeTitle = typeof title === 'string' && title.trim() ? title : DEFAULT_TITLE
      const safeDesc =
        typeof description === 'string' && description.trim() ? description : DEFAULT_DESC
      const safeOgImage = typeof ogImage === 'string' && ogImage.trim() ? ogImage : DEFAULT_IMAGE

      // 1. Title
      const fullTitle = safeTitle.includes('Gesso Bettone')
        ? safeTitle
        : `${safeTitle} | Gesso Bettone`
      document.title = fullTitle

      // Helper para atualizar ou criar meta tag
      const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
        try {
          let element = document.head.querySelector(
            `meta[${attr}="${key}"]`,
          ) as HTMLMetaElement | null
          if (!element) {
            element = document.createElement('meta')
            element.setAttribute(attr, key)
            document.head.appendChild(element)
          }
          element.setAttribute('content', content || '')
        } catch {
          // ignora falha em elemento meta
        }
      }

      // 2. Metas básicas
      setMeta('name', 'description', safeDesc)
      if (Array.isArray(keywords) && keywords.length > 0) {
        const safeKeywords = keywords.filter((k) => typeof k === 'string' && k.trim()).join(', ')
        if (safeKeywords) {
          setMeta('name', 'keywords', safeKeywords)
        }
      }
      setMeta('name', 'robots', 'index, follow, max-image-preview:large')

      // Google Site Verification (Search Console)
      const verificationMeta = document.head.querySelector(
        'meta[name="google-site-verification"]',
      ) as HTMLMetaElement | null
      if (googleVerification) {
        if (!verificationMeta) {
          const el = document.createElement('meta')
          el.setAttribute('name', 'google-site-verification')
          el.setAttribute('content', googleVerification)
          document.head.appendChild(el)
        } else {
          verificationMeta.setAttribute('content', googleVerification)
        }
      } else if (verificationMeta) {
        verificationMeta.remove()
      }

      // 3. OpenGraph
      setMeta('property', 'og:title', fullTitle)
      setMeta('property', 'og:description', safeDesc)
      setMeta('property', 'og:type', ogType || 'website')
      setMeta('property', 'og:locale', 'pt_BR')
      setMeta('property', 'og:site_name', 'Gesso Bettone')
      if (safeOgImage) {
        setMeta('property', 'og:image', safeOgImage)
      }

      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
      const fullCanonical = canonical
        ? canonical.startsWith('http')
          ? canonical
          : `${BASE_URL}${canonical.startsWith('/') ? canonical : `/${canonical}`}`
        : `${BASE_URL}${pathname}`

      setMeta('property', 'og:url', fullCanonical)

      // 4. Twitter Cards
      setMeta('name', 'twitter:card', 'summary_large_image')
      setMeta('name', 'twitter:title', fullTitle)
      setMeta('name', 'twitter:description', safeDesc)
      if (safeOgImage) {
        setMeta('name', 'twitter:image', safeOgImage)
      }

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

      // 5.1 Link para o Sitemap XML
      let sitemapLink = document.head.querySelector('link[rel="sitemap"]') as HTMLLinkElement | null
      if (!sitemapLink) {
        sitemapLink = document.createElement('link')
        sitemapLink.setAttribute('rel', 'sitemap')
        sitemapLink.setAttribute('type', 'application/xml')
        sitemapLink.setAttribute('title', 'Sitemap')
        document.head.appendChild(sitemapLink)
      }
      sitemapLink.setAttribute('href', `${BASE_URL}/sitemap.xml`)

      // 6. JSON-LD protegido contra parsing/serialização
      const jsonLdId = 'structured-data-jsonld'
      let scriptTag = document.getElementById(jsonLdId) as HTMLScriptElement | null

      if (jsonLd) {
        try {
          const stringified = JSON.stringify(jsonLd)
          if (stringified) {
            if (!scriptTag) {
              scriptTag = document.createElement('script')
              scriptTag.id = jsonLdId
              scriptTag.type = 'application/ld+json'
              document.head.appendChild(scriptTag)
            }
            scriptTag.textContent = stringified
          }
        } catch (jsonErr) {
          console.warn('Erro ao serializar JSON-LD de SEO:', jsonErr)
        }
      } else if (scriptTag) {
        scriptTag.remove()
      }

      // Scroll to top on route change
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      console.warn('Erro não-fatal ao aplicar metadados de SEO:', err)
    }
  }, [title, description, canonical, ogType, ogImage, keywords, jsonLd, googleVerification])

  return null
}

export default SEO
