import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  SERVICOS,
  getWhatsAppUrlForService,
  CIDADES_ATENDIDAS,
  WHATSAPP_LINK,
} from '@/data/landingData'
import { resolverUrlMidia } from '@/lib/watermark'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingParceiros from '@/components/landing/LandingParceiros'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import WatermarkedImage from '@/components/landing/WatermarkedImage'
import {
  MessageCircle,
  CheckCircle2,
  Images,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ShieldCheck,
} from 'lucide-react'

// Error Boundary LOCAL exclusivo para a página de detalhes de serviço
interface ServicoBoundaryProps {
  children: ReactNode
  slug?: string
}

interface ServicoBoundaryState {
  hasError: boolean
  error: Error | null
}

class ServicoLocalErrorBoundary extends Component<ServicoBoundaryProps, ServicoBoundaryState> {
  public state: ServicoBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): ServicoBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ServicoDetailPage local error boundary caught:', error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-[#f4f4f4]">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#DEE4EA] text-center shadow-xs">
            <div className="w-14 h-14 bg-[#2C3E50]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#2C3E50]">
              <ShieldCheck className="w-7 h-7 text-[#D4AF37]" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-[#2C3E50] mb-2">
              Detalhes do Serviço
            </h1>
            <p className="text-sm text-[#616F7D] mb-6 leading-relaxed">
              Ocorreu uma instabilidade pontual ao carregar as informações deste serviço. Nossos
              especialistas estão à disposição pelo WhatsApp com fotos, orientações e orçamentos
              rápidos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs uppercase tracking-wider"
              >
                <Link to="/servicos">Ver todos os serviços</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-[#DEE4EA] text-[#2C3E50] font-bold text-xs uppercase tracking-wider"
              >
                <a
                  href={getWhatsAppUrlForService(this.props.slug || 'Serviço Gesso Bettone')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1 text-[#2C3E50]" />
                  WhatsApp Bettone
                </a>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Helper seguro para converter qualquer valor de campo de lista (array, string JSON, string avulsa) em array de strings
function normalizarListaStrings(valor: any): string[] {
  if (!valor) return []
  if (Array.isArray(valor)) {
    return valor
      .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
      .filter(Boolean)
  }
  if (typeof valor === 'string') {
    const trimmed = valor.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
          .filter(Boolean)
      }
    } catch {
      // Se não for JSON, trata como string simples se não começar com colchetes
    }
    return [trimmed]
  }
  return []
}

const ServicoDetailPageInner: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [servicoDb, setServicoDb] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [carregamentoConcluido, setCarregamentoConcluido] = useState(false)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const servicoLocal = useMemo(() => {
    try {
      if (!slug || typeof slug !== 'string') return null
      const clean = slug.toLowerCase().trim()
      if (!clean) return null
      const lista = Array.isArray(SERVICOS) ? SERVICOS : []
      return (
        lista.find((s) => s && typeof s.slug === 'string' && s.slug.toLowerCase() === clean) ||
        lista.find(
          (s) =>
            s &&
            typeof s.slug === 'string' &&
            s.slug.toLowerCase().replace(/-/g, '') === clean.replace(/-/g, ''),
        ) ||
        null
      )
    } catch {
      return null
    }
  }, [slug])

  useEffect(() => {
    let ativo = true
    if (slug) {
      setLoading(true)
      setErroCarregamento(null)

      import('@/services/site')
        .then(({ obterServicoPorSlug, registrarEventoAnalytics }) => {
          return obterServicoPorSlug(slug)
            .then((s) => {
              if (!ativo) return
              if (s) {
                setServicoDb(s)
                try {
                  registrarEventoAnalytics({
                    tipo: 'click_servico',
                    servico_slug: s.slug || slug,
                    servico_nome: s.nome || '',
                    categoria_nome: s.categoria || '',
                  })
                } catch (analyticsErr) {
                  console.debug('Analytics não registrado:', analyticsErr)
                }
              }
              setCarregamentoConcluido(true)
              setLoading(false)
            })
            .catch((innerErr) => {
              if (!ativo) return
              console.warn(
                'Falha na busca remota do serviço, degradando para fallback local:',
                innerErr,
              )
              setCarregamentoConcluido(true)
              setLoading(false)
            })
        })
        .catch((err) => {
          if (!ativo) return
          console.error('Erro ao carregar módulo de serviços:', err)
          setCarregamentoConcluido(true)
          setLoading(false)
        })
    } else {
      setLoading(false)
      setCarregamentoConcluido(true)
    }

    return () => {
      ativo = false
    }
  }, [slug])

  const servico = useMemo(() => {
    try {
      if (servicoDb) {
        const nomeLimpo =
          typeof servicoDb.nome === 'string' && servicoDb.nome.trim().length > 0
            ? servicoDb.nome.trim()
            : slug
              ? slug.replace(/-/g, ' ')
              : 'Serviço'

        const beneficiosNormalizados = normalizarListaStrings(servicoDb.beneficios)
        const keywordsNormalizadas = normalizarListaStrings(servicoDb.keywords)

        return {
          slug: String(servicoDb.slug || slug || ''),
          titulo: nomeLimpo,
          categoria: String(servicoDb.categoria || 'Serviços'),
          destaque: Boolean(servicoDb.destaque),
          descricaoCurta: String(servicoDb.descricao_curta || ''),
          descricaoCompleta: String(
            servicoDb.descricao_longa ||
              servicoDb.descricao_curta ||
              'Atendimento especializado em gesso, drywall e acabamentos de alto padrão.',
          ),
          beneficios: beneficiosNormalizados,
          metaTitle: String(servicoDb.meta_title || nomeLimpo || 'Serviço | Gesso Bettone'),
          metaDescription: String(
            servicoDb.meta_description ||
              servicoDb.descricao_curta ||
              servicoDb.descricao_longa ||
              'Serviços em gesso e drywall da Gesso Bettone.',
          ),
          keywords: keywordsNormalizadas,
        }
      }

      if (servicoLocal) {
        return {
          slug: String(servicoLocal.slug || slug || ''),
          titulo: String(servicoLocal.titulo || 'Serviço'),
          categoria: String(servicoLocal.categoria || 'Serviços'),
          destaque: Boolean(servicoLocal.destaque),
          descricaoCurta: String(servicoLocal.descricaoCurta || ''),
          descricaoCompleta: String(
            servicoLocal.descricaoCompleta ||
              servicoLocal.descricaoCurta ||
              'Atendimento especializado em gesso, drywall e acabamentos de alto padrão.',
          ),
          beneficios: normalizarListaStrings(servicoLocal.beneficios),
          galeria: normalizarListaStrings(servicoLocal.galeria),
          keywords: normalizarListaStrings(servicoLocal.keywords),
          metaTitle: String(
            servicoLocal.metaTitle || servicoLocal.titulo || 'Serviço | Gesso Bettone',
          ),
          metaDescription: String(
            servicoLocal.metaDescription ||
              servicoLocal.descricaoCurta ||
              'Serviços em gesso e drywall da Gesso Bettone.',
          ),
        }
      }
    } catch (calcErr) {
      console.warn('Erro ao normalizar dados do serviço:', calcErr)
    }

    return null
  }, [servicoDb, servicoLocal, slug])

  // Montagem robusta da lista de fotos unificada:
  // Lê arquivo_principal + arquivos_galeria + imagem_principal + galeria legada sem duplicar
  const listaFotos: string[] = useMemo(() => {
    const list: string[] = []
    const rawKeysSet = new Set<string>()

    const addPhoto = (val: any) => {
      if (!val) return
      if (Array.isArray(val)) {
        val.forEach((item) => addPhoto(item))
        return
      }
      if (typeof val !== 'string') return
      const trimmed = val.trim()
      if (!trimmed) return

      let resolved = trimmed
      try {
        if (servicoDb?.id) {
          resolved = resolverUrlMidia('site_services', servicoDb.id, trimmed)
        }
      } catch (resErr) {
        console.warn('Erro ao resolver URL de mídia:', resErr)
      }

      const key = trimmed.toLowerCase()
      const resolvedKey = (resolved || '').toLowerCase()
      if (
        resolved &&
        !rawKeysSet.has(key) &&
        !rawKeysSet.has(resolvedKey) &&
        !list.includes(resolved)
      ) {
        rawKeysSet.add(key)
        rawKeysSet.add(resolvedKey)
        list.push(resolved)
      }
    }

    try {
      if (servicoDb) {
        if (servicoDb.arquivo_principal) addPhoto(servicoDb.arquivo_principal)
        if (servicoDb.imagem_principal) addPhoto(servicoDb.imagem_principal)

        normalizarListaStrings(servicoDb.arquivos_galeria).forEach(addPhoto)
        normalizarListaStrings(servicoDb.galeria).forEach(addPhoto)
      } else if (servicoLocal) {
        if (servicoLocal.imagemPrincipal) addPhoto(servicoLocal.imagemPrincipal)
        normalizarListaStrings(servicoLocal.galeria).forEach(addPhoto)
      }
    } catch (fotoErr) {
      console.warn('Erro ao montar lista de fotos do serviço:', fotoErr)
    }

    return list.filter((f) => typeof f === 'string' && f.trim().length > 0)
  }, [servicoDb, servicoLocal])

  // Ajusta índice ativo caso a lista mude
  useEffect(() => {
    if (activePhotoIndex >= listaFotos.length) {
      setActivePhotoIndex(0)
    }
  }, [listaFotos.length, activePhotoIndex])

  const tituloSeguro =
    servico && typeof servico.titulo === 'string' && servico.titulo.trim()
      ? servico.titulo.trim()
      : 'Serviço'

  const fotoAtualUrl = listaFotos[activePhotoIndex] || listaFotos[0] || ''
  const precoMinimo = servicoDb?.preco_minimo || undefined

  // JSON-LD Service + Breadcrumbs protegido contra undefined/null (chamado incondicionalmente no topo)
  const serviceJsonLd = useMemo((): any => {
    if (!servico) return undefined
    try {
      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Início',
            item: 'https://gessobettone.com.br/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Serviços',
            item: 'https://gessobettone.com.br/servicos',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tituloSeguro,
            item: `https://gessobettone.com.br/servicos/${servico?.slug || ''}`,
          },
        ],
      }

      const serviceObj: any = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: tituloSeguro,
        serviceType: tituloSeguro,
        category: servico?.categoria || 'Serviços',
        description:
          servico?.descricaoCompleta || servico?.descricaoCurta || 'Serviço Gesso Bettone',
        provider: {
          '@type': 'LocalBusiness',
          name: 'Gesso Bettone',
          telephone: '+55-19-98109-3379',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'São Pedro',
            addressRegion: 'SP',
            addressCountry: 'BR',
          },
        },
        areaServed: Array.isArray(CIDADES_ATENDIDAS)
          ? CIDADES_ATENDIDAS.map((c) => ({
              '@type': 'AdministrativeArea',
              name: String(c || ''),
            }))
          : [],
      }

      if (precoMinimo) {
        serviceObj.offers = {
          '@type': 'Offer',
          priceCurrency: 'BRL',
          price: String(precoMinimo),
          availability: 'https://schema.org/InStock',
        }
      }

      if (fotoAtualUrl) {
        serviceObj.image = fotoAtualUrl
      }

      return [breadcrumb, serviceObj]
    } catch {
      return undefined
    }
  }, [servico, tituloSeguro, precoMinimo, fotoAtualUrl])

  // Enquanto carrega e não temos nem local nem DB, exibe skeleton/loading elegante
  if (loading && !servico) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-[#f4f4f4]">
        <div className="w-12 h-12 border-4 border-[#2C3E50]/20 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#2C3E50]">Carregando detalhes do serviço...</p>
      </div>
    )
  }

  // Se houve erro ou não foi encontrado, exibe tela explicativa com botão de retorno (nunca redirect silencioso)
  if (carregamentoConcluido && !servico) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-[#f4f4f4]">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#DEE4EA] text-center shadow-xs">
          <div className="w-14 h-14 bg-[#2C3E50]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#2C3E50]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#2C3E50] mb-2">
            Serviço não encontrado
          </h1>
          <p className="text-sm text-[#616F7D] mb-6">
            {erroCarregamento ||
              `O serviço "${slug || ''}" não foi localizado ou pode ter sido alterado.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs uppercase tracking-wider"
            >
              <Link to="/servicos">Ver todos os serviços</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#DEE4EA] text-[#2C3E50] font-bold text-xs uppercase tracking-wider"
            >
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!servico) {
    return null
  }

  const whatsappUrl = getWhatsAppUrlForService(tituloSeguro)

  // Outros serviços para recomendação
  const outrosServicos = (SERVICOS || [])
    .filter((s) => s && s.slug && s.slug !== servico.slug)
    .slice(0, 3)

  const nextPhoto = () => {
    if (listaFotos.length === 0) return
    setActivePhotoIndex((prev) => (prev + 1) % listaFotos.length)
  }

  const prevPhoto = () => {
    if (listaFotos.length === 0) return
    setActivePhotoIndex((prev) => (prev - 1 + listaFotos.length) % listaFotos.length)
  }

  return (
    <>
      <SEO
        title={servico?.metaTitle || 'Serviço | Gesso Bettone'}
        description={servico?.metaDescription || 'Serviço de Gesso e Drywall em São Pedro e região'}
        canonical={`/servicos/${servico?.slug || slug || ''}`}
        ogImage={fotoAtualUrl || undefined}
        keywords={servico?.keywords || []}
        jsonLd={serviceJsonLd}
      />

      {/* Header do Serviço / Breadcrumb */}
      <div className="bg-[#2C3E50] text-white py-10 border-b border-[#1B2631]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav aria-label="Navegação estrutural" className="mb-4">
            <ol className="flex items-center gap-2 text-xs text-white/80">
              <li>
                <Link to="/" className="hover:text-[#D4AF37] transition-colors">
                  Início
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link to="/servicos" className="hover:text-[#D4AF37] transition-colors">
                  Serviços
                </Link>
              </li>
              <li>/</li>
              <li className="text-[#D4AF37] font-semibold truncate max-w-[200px]">
                {tituloSeguro}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#D4AF37] text-[#2C3E50] font-bold text-xs border-none">
                  {servico?.categoria || 'Serviços'}
                </Badge>
                {servico?.destaque && (
                  <Badge variant="outline" className="border-white/30 text-white text-xs">
                    ★ Destaque
                  </Badge>
                )}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                {tituloSeguro}
              </h1>
            </div>

            <Button
              asChild
              size="lg"
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm h-11 px-6 rounded-xl shadow-md transition-all self-start md:self-auto"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2 text-[#2C3E50]" />
                Orçamento para este serviço
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal com Galeria */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Lado Esquerdo: Galeria de Fotos */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative rounded-2xl overflow-hidden shadow-md border border-[#E3E6EA] bg-[#1C252B] aspect-[4/3] sm:aspect-[16/11] flex items-center justify-center group">
              {fotoAtualUrl ? (
                <>
                  {/* Fundo desfocado sutil para preencher bordas de fotos verticais e horizontais sem corte brusco */}
                  <img
                    src={fotoAtualUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none select-none"
                  />

                  <WatermarkedImage
                    src={fotoAtualUrl}
                    alt={`${tituloSeguro} — foto ${activePhotoIndex + 1}`}
                    className="relative z-10 w-full h-full object-contain object-center transition-all duration-300 cursor-pointer"
                    onClick={() => setLightboxOpen(true)}
                  />

                  {/* Botão Ampliar discreto no canto */}
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="absolute top-3 right-3 z-20 bg-black/60 hover:bg-black/85 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Ampliar foto em tela cheia"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {listaFotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevPhoto}
                        aria-label="Foto anterior"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-12 rounded bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors shadow-md"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        type="button"
                        onClick={nextPhoto}
                        aria-label="Próxima foto"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-12 rounded bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors shadow-md"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-3 right-3 z-20 bg-black/70 text-white px-3 py-1 rounded-full text-xs backdrop-blur font-semibold">
                        {activePhotoIndex + 1} / {listaFotos.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2C3E50]/15 via-[#2C3E50]/5 to-[#D4AF37]/15 p-6 text-center select-none">
                  <div className="w-16 h-16 rounded-2xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center mb-3 shadow-md">
                    <Images className="w-8 h-8 text-[#D4AF37]" />
                  </div>
                  <h4 className="font-heading text-lg font-bold text-[#2C3E50]">{tituloSeguro}</h4>
                  <p className="text-xs text-[#616F7D] mt-1 max-w-sm">
                    Gesso &amp; Drywall com padrão superior. Solicite fotos e registros desta
                    solução pelo WhatsApp.
                  </p>
                </div>
              )}
            </div>

            {/* Miniaturas da galeria (com fundo blur translúcido e object-contain, sem distorcer) */}
            {listaFotos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                {listaFotos.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all bg-[#1C252B] flex items-center justify-center ${
                      activePhotoIndex === idx
                        ? 'border-[#D4AF37] scale-105 shadow-sm'
                        : 'border-[#DEE4EA] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 pointer-events-none select-none"
                    />
                    <img
                      src={img}
                      alt={`Miniatura ${idx + 1}`}
                      className="relative z-1 max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Aviso quando sem fotos cadastradas */}
            {listaFotos.length === 0 && (
              <div className="p-4 rounded-xl bg-white border border-[#DEE4EA] text-xs text-[#616F7D] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2C3E50] shrink-0" />
                <span>
                  Fotos e registros deste serviço podem ser consultados diretamente com nossos
                  especialistas via WhatsApp.
                </span>
              </div>
            )}

            {/* Benefícios e Vantagens */}
            <div className="mt-8 p-6 rounded-2xl bg-[#f4f4f4] border border-[#DEE4EA]">
              <h3 className="font-heading font-bold text-lg text-[#2C3E50] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2C3E50]" />
                Por que escolher a Gesso Bettone para este serviço:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {servico?.beneficios && servico.beneficios.length > 0 ? (
                  servico.beneficios.map((ben, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-[#2C3E50] leading-snug">{ben}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-[#2C3E50] leading-snug">
                        Mais de 30 anos de precisão e alto padrão em acabamentos
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-[#2C3E50] leading-snug">
                        Materiais certificados e isolamento termoacústico superior
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-[#2C3E50] leading-snug">
                        Execução limpa, rápida e alinhamento milimétrico
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-[#2C3E50] leading-snug">
                        Atendimento com visita técnica e orçamento transparente
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: Descrição, Cidades e Solicitação */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#DEE4EA] shadow-xs space-y-4">
              <h2 className="font-heading text-xl font-bold text-[#2C3E50]">Sobre o Serviço</h2>
              <p className="text-sm text-[#616F7D] leading-relaxed">
                {servico?.descricaoCompleta ||
                  servico?.descricaoCurta ||
                  'Atendimento especializado em gesso, drywall e acabamentos de alto padrão.'}
              </p>

              <div className="pt-4 border-t border-[#DEE4EA] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2C3E50]">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span>Atendimento com visita técnica em:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(CIDADES_ATENDIDAS) &&
                    CIDADES_ATENDIDAS.map((cidade) => (
                      <span
                        key={String(cidade)}
                        className="px-2.5 py-1 rounded-md bg-[#f4f4f4] border border-[#DEE4EA] text-[11px] text-[#2C3E50]"
                      >
                        {String(cidade)}
                      </span>
                    ))}
                </div>{' '}
              </div>

              <div className="pt-4">
                <Button
                  asChild
                  className="w-full bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm h-12 rounded-xl shadow-md transition-all"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2 text-[#2C3E50]" />
                    Solicitar Orçamento no WhatsApp
                  </a>
                </Button>
                <p className="text-[11px] text-center text-[#616F7D] mt-2">
                  Resposta rápida de segunda a sábado
                </p>
              </div>
            </div>

            {/* Outros Serviços Relacionados */}
            <div className="p-6 rounded-2xl bg-white border border-[#DEE4EA] shadow-xs">
              <h3 className="font-heading font-bold text-sm text-[#2C3E50] mb-3">
                Outras soluções que você pode precisar:
              </h3>
              <div className="space-y-2">
                {outrosServicos.map((outro) => (
                  <Link
                    key={outro.slug}
                    to={`/servicos/${outro.slug}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#E8EDF2] text-xs font-medium text-[#2C3E50] transition-colors border border-transparent hover:border-[#DEE4EA]"
                  >
                    <span>{outro.titulo}</span>
                    <span className="text-[#2C3E50] font-bold">Ver &rarr;</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox em Tela Cheia (Dialog) para Serviço */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-2 bg-black/95 border-none text-white flex flex-col items-center">
          <DialogTitle className="sr-only">Visualização ampliada: {tituloSeguro}</DialogTitle>
          <div className="relative w-full aspect-[16/10] max-h-[80vh] flex items-center justify-center overflow-hidden bg-black/70 rounded-xl">
            {fotoAtualUrl && (
              <img
                src={fotoAtualUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-120 pointer-events-none select-none"
              />
            )}
            <WatermarkedImage
              src={fotoAtualUrl}
              alt={`${tituloSeguro} em tela cheia`}
              className="relative z-10 max-w-full max-h-[75vh] w-auto h-auto object-contain object-center mx-auto"
            />
            {listaFotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors shadow-md"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  aria-label="Próxima foto"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors shadow-md"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
          {listaFotos.length > 0 && (
            <div className="py-2 text-center text-xs text-white/70">
              Foto {activePhotoIndex + 1} de {listaFotos.length} — {tituloSeguro}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LandingParceiros />

      <LandingCTA
        titulo={`Gostaria de aplicar ${tituloSeguro.toLowerCase()} no seu espaço?`}
        subtitulo="Envie suas medidas, fotos do local ou planta pelo WhatsApp para receber um orçamento transparente e personalizado."
        botaoTexto="Falar com especialista agora"
      />
    </>
  )
}

export const ServicoDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  return (
    <ServicoLocalErrorBoundary slug={slug}>
      <ServicoDetailPageInner />
    </ServicoLocalErrorBoundary>
  )
}

export default ServicoDetailPage
