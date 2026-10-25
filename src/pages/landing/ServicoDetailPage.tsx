import React, { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { SERVICOS, getWhatsAppUrlForService, CIDADES_ATENDIDAS } from '@/data/landingData'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingParceiros from '@/components/landing/LandingParceiros'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import WatermarkedImage from '@/components/landing/WatermarkedImage'
import {
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  Images,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
} from 'lucide-react'

export const ServicoDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [servicoDb, setServicoDb] = React.useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [carregamentoConcluido, setCarregamentoConcluido] = useState(false)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const servicoLocal = SERVICOS.find((s) => s.slug === slug)

  React.useEffect(() => {
    let ativo = true
    if (slug) {
      setLoading(true)
      setErroCarregamento(null)

      import('@/services/site')
        .then(({ obterServicoPorSlug, registrarEventoAnalytics }) => {
          return obterServicoPorSlug(slug).then((s) => {
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
        })
        .catch((err) => {
          if (!ativo) return
          console.error('Erro ao carregar serviço:', err)
          setErroCarregamento('Não foi possível carregar os detalhes deste serviço no momento.')
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

  const servico = servicoDb
    ? {
        slug: servicoDb.slug || slug || '',
        titulo: servicoDb.nome || (slug ? slug.replace(/-/g, ' ') : 'Serviço'),
        categoria: servicoDb.categoria || 'Serviços',
        destaque: !!servicoDb.destaque,
        descricaoCurta: servicoDb.descricao_curta || '',
        descricaoCompleta:
          servicoDb.descricao_longa ||
          servicoDb.descricao_curta ||
          'Atendimento especializado em gesso, drywall e acabamentos de alto padrão.',
        beneficios: Array.isArray(servicoDb.beneficios) ? servicoDb.beneficios : [],
        imagemPrincipal: servicoDb.imagem_principal || '',
        galeria: Array.isArray(servicoDb.galeria) ? servicoDb.galeria : [],
        metaTitle: servicoDb.meta_title || servicoDb.nome || 'Serviço | Gesso Bettone',
        metaDescription:
          servicoDb.meta_description ||
          servicoDb.descricao_curta ||
          servicoDb.descricao_longa ||
          'Serviços em gesso e drywall da Gesso Bettone.',
        keywords: Array.isArray(servicoDb.keywords) ? servicoDb.keywords : [],
      }
    : servicoLocal
      ? {
          ...servicoLocal,
          beneficios: Array.isArray(servicoLocal.beneficios) ? servicoLocal.beneficios : [],
          galeria: Array.isArray(servicoLocal.galeria) ? servicoLocal.galeria : [],
          keywords: Array.isArray(servicoLocal.keywords) ? servicoLocal.keywords : [],
        }
      : null
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

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

  const whatsappUrl = getWhatsAppUrlForService(servico.titulo || 'Serviço')

  // Outros serviços para recomendação
  const outrosServicos = SERVICOS.filter((s) => s.slug !== servico.slug).slice(0, 3)

  // Lista unificada e segura de fotos da galeria
  const listaFotos: string[] = [
    ...(servico.galeria || []),
    ...(servico.imagemPrincipal ? [servico.imagemPrincipal] : []),
  ].filter((f) => typeof f === 'string' && f.trim().length > 0)

  // Garante que o índice selecionado é válido
  const fotoAtualUrl = listaFotos[activePhotoIndex] || listaFotos[0] || ''

  // JSON-LD Service + Breadcrumbs protegido contra undefined/null
  const serviceJsonLd = [
    {
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
          name: servico.titulo || 'Serviço',
          item: `https://gessobettone.com.br/servicos/${servico.slug}`,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: servico.titulo || 'Serviço',
      serviceType: servico.titulo || 'Serviço',
      category: servico.categoria || 'Serviços',
      description: servico.descricaoCompleta || servico.descricaoCurta || 'Serviço Gesso Bettone',
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
      areaServed: CIDADES_ATENDIDAS.map((c) => ({
        '@type': 'AdministrativeArea',
        name: c,
      })),
      ...(servico.imagemPrincipal ? { image: servico.imagemPrincipal } : {}),
    },
  ]

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
        title={servico.metaTitle}
        description={servico.metaDescription}
        canonical={`/servicos/${servico.slug}`}
        ogImage={servico.imagemPrincipal}
        keywords={servico.keywords}
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
                {servico.titulo}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#D4AF37] text-[#2C3E50] font-bold text-xs border-none">
                  {servico.categoria}
                </Badge>
                {servico.destaque && (
                  <Badge variant="outline" className="border-white/30 text-white text-xs">
                    ★ Destaque
                  </Badge>
                )}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                {servico.titulo}
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
            <div className="relative rounded-2xl overflow-hidden shadow-md border border-[#E3E6EA] bg-[#2C3E50]/5 aspect-[16/10]">
              {fotoAtualUrl ? (
                <>
                  <WatermarkedImage
                    src={fotoAtualUrl}
                    alt={`${servico.titulo} — foto ${activePhotoIndex + 1}`}
                    className="w-full h-full object-cover transition-all duration-300"
                  />

                  {listaFotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevPhoto}
                        aria-label="Foto anterior"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextPhoto}
                        aria-label="Próxima foto"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur font-medium">
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
                  <h4 className="font-heading text-lg font-bold text-[#2C3E50]">
                    {servico.titulo}
                  </h4>
                  <p className="text-xs text-[#616F7D] mt-1 max-w-sm">
                    Gesso &amp; Drywall com padrão superior. Solicite fotos e registros desta
                    solução pelo WhatsApp.
                  </p>
                </div>
              )}
            </div>

            {/* Miniaturas da galeria */}
            {listaFotos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {listaFotos.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                      activePhotoIndex === idx
                        ? 'border-[#2C3E50] scale-105 shadow-sm'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Miniatura ${idx + 1}`}
                      className="w-full h-full object-cover"
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
                {servico.beneficios && servico.beneficios.length > 0 ? (
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
              <p className="text-sm text-[#616F7D] leading-relaxed">{servico.descricaoCompleta}</p>

              <div className="pt-4 border-t border-[#DEE4EA] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2C3E50]">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span>Atendimento com visita técnica em:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CIDADES_ATENDIDAS.map((cidade) => (
                    <span
                      key={cidade}
                      className="px-2.5 py-1 rounded-md bg-[#f4f4f4] border border-[#DEE4EA] text-[11px] text-[#2C3E50]"
                    >
                      {cidade}
                    </span>
                  ))}
                </div>
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

      <LandingParceiros />

      <LandingCTA
        titulo={`Gostaria de aplicar ${(servico.titulo || 'este serviço').toLowerCase()} no seu espaço?`}
        subtitulo="Envie suas medidas, fotos do local ou planta pelo WhatsApp para receber um orçamento transparente e personalizado."
        botaoTexto="Falar com especialista agora"
      />
    </>
  )
}

export default ServicoDetailPage
