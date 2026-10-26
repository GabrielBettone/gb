import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { PROJETOS, getWhatsAppUrlForProject } from '@/data/landingData'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingParceiros from '@/components/landing/LandingParceiros'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import WatermarkedImage from '@/components/landing/WatermarkedImage'
import { resolverUrlMidia } from '@/lib/watermark'
import {
  MessageCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Layers,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export const ProjetoDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [projetoDb, setProjetoDb] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [carregamentoConcluido, setCarregamentoConcluido] = useState(false)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const projetoLocal = PROJETOS.find((p) => p.slug === slug)

  useEffect(() => {
    let ativo = true
    if (slug) {
      setLoading(true)
      setErroCarregamento(null)

      import('@/services/site')
        .then(({ obterProjetoPorSlug, registrarEventoAnalytics }) => {
          return obterProjetoPorSlug(slug).then((p) => {
            if (!ativo) return
            if (p) {
              setProjetoDb(p)
              registrarEventoAnalytics({
                tipo: 'view_categoria',
                categoria_nome: p.categoria,
                metadata: { projeto: p.titulo, slug: p.slug },
              })
            }
            setCarregamentoConcluido(true)
            setLoading(false)
          })
        })
        .catch((err) => {
          if (!ativo) return
          console.error('Erro ao carregar projeto:', err)
          setErroCarregamento('Não foi possível carregar os detalhes deste projeto no momento.')
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

  // Processamento e normalização das listas de fotos e vídeos com guardas totais
  const projeto = projetoDb
    ? {
        slug: projetoDb.slug || slug || '',
        titulo: projetoDb.titulo || (slug ? slug.replace(/-/g, ' ') : 'Projeto'),
        categoria: projetoDb.categoria || 'Portfólio',
        subtitulo: projetoDb.subtitulo || '',
        cidade: projetoDb.cidade || '',
        descricao:
          projetoDb.descricao ||
          'Projeto e execução sob medida em gesso e drywall pela Gesso Bettone.',
        detalhesTecnicos: Array.isArray(projetoDb.detalhes_tecnicos)
          ? projetoDb.detalhes_tecnicos
          : [],
        fotosCount:
          projetoDb.fotos_count ||
          (Array.isArray(projetoDb.galeria) ? projetoDb.galeria.length : 0),
        imagemCapa: projetoDb.imagem_capa || '',
        arquivoCapa: projetoDb.arquivo_capa || '',
        galeria: Array.isArray(projetoDb.galeria) ? projetoDb.galeria : [],
        arquivosGaleria: Array.isArray(projetoDb.arquivos_galeria)
          ? projetoDb.arquivos_galeria
          : [],
        videos: Array.isArray(projetoDb.videos) ? projetoDb.videos : [],
        arquivosVideos: Array.isArray(projetoDb.arquivos_videos) ? projetoDb.arquivos_videos : [],
        videosCount:
          projetoDb.videos_count || (Array.isArray(projetoDb.videos) ? projetoDb.videos.length : 0),
        metaTitle: projetoDb.meta_title || projetoDb.titulo || 'Projeto | Gesso Bettone',
        metaDescription:
          projetoDb.meta_description ||
          projetoDb.descricao ||
          'Projetos e acabamentos de alto padrão da Gesso Bettone.',
      }
    : projetoLocal
      ? {
          ...projetoLocal,
          detalhesTecnicos: Array.isArray(projetoLocal.detalhesTecnicos)
            ? projetoLocal.detalhesTecnicos
            : [],
          galeria: Array.isArray(projetoLocal.galeria) ? projetoLocal.galeria : [],
          videos: Array.isArray(projetoLocal.videos) ? projetoLocal.videos : [],
        }
      : null

  // Compilar lista unificada de fotos para o visualizador e miniaturas
  const fotos: string[] = React.useMemo(() => {
    if (!projeto) return []
    const list: string[] = []

    if (projetoDb) {
      try {
        if (projetoDb.arquivo_capa) {
          list.push(resolverUrlMidia('site_portfolio', projetoDb.id || '', projetoDb.arquivo_capa))
        } else if (projetoDb.imagem_capa) {
          list.push(resolverUrlMidia('site_portfolio', projetoDb.id || '', projetoDb.imagem_capa))
        }

        if (Array.isArray(projetoDb.arquivos_galeria) && projetoDb.arquivos_galeria.length > 0) {
          projetoDb.arquivos_galeria.forEach((arq: string) => {
            if (arq && arq !== projetoDb.arquivo_capa) {
              list.push(resolverUrlMidia('site_portfolio', projetoDb.id || '', arq))
            }
          })
        }

        if (Array.isArray(projetoDb.galeria) && projetoDb.galeria.length > 0) {
          projetoDb.galeria.forEach((gUrl: string) => {
            if (gUrl && gUrl !== projetoDb.imagem_capa) {
              const resolvida = resolverUrlMidia('site_portfolio', projetoDb.id || '', gUrl)
              if (!list.includes(resolvida)) {
                list.push(resolvida)
              }
            }
          })
        }
      } catch (fotoErr) {
        console.warn('Erro ao montar lista de fotos do projeto:', fotoErr)
      }
    } else if (projetoLocal) {
      if (projetoLocal.imagemCapa) list.push(projetoLocal.imagemCapa)
      if (Array.isArray(projetoLocal.galeria)) {
        projetoLocal.galeria.forEach((g) => {
          if (g && !list.includes(g)) list.push(g)
        })
      }
    }

    // Filtra strings vazias
    const validas = list.filter((f) => typeof f === 'string' && f.trim().length > 0)
    return validas
  }, [projetoDb, projetoLocal])

  // Compilar lista unificada de vídeos
  const videos: string[] = React.useMemo(() => {
    if (!projeto) return []
    const vList: string[] = []

    try {
      if (projetoDb) {
        if (Array.isArray(projetoDb.arquivos_videos) && projetoDb.arquivos_videos.length > 0) {
          projetoDb.arquivos_videos.forEach((v: string) => {
            if (v) vList.push(resolverUrlMidia('site_portfolio', projetoDb.id || '', v))
          })
        }
        if (Array.isArray(projetoDb.videos) && projetoDb.videos.length > 0) {
          projetoDb.videos.forEach((vu: string) => {
            if (vu && !vList.includes(vu)) vList.push(vu)
          })
        }
      } else if (projetoLocal && Array.isArray(projetoLocal.videos)) {
        projetoLocal.videos.forEach((vu) => {
          if (vu && !vList.includes(vu)) vList.push(vu)
        })
      }
    } catch (vErr) {
      console.warn('Erro ao montar lista de vídeos do projeto:', vErr)
    }

    return vList.filter((v) => typeof v === 'string' && v.trim().length > 0)
  }, [projetoDb, projetoLocal])

  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  // Paginação das miniaturas do card FOTOS (4 miniaturas por página como no print 2x2)
  const [fotosCardPage, setFotosCardPage] = useState(0)
  const fotosPerPage = 4
  const totalFotosCardPages = Math.max(1, Math.ceil(fotos.length / fotosPerPage))

  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const activeVideoIndex = selectedVideoIndex < videos.length ? selectedVideoIndex : 0

  if (loading && !projeto) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-[#f4f4f4]">
        <div className="w-12 h-12 border-4 border-[#2C3E50]/20 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#2C3E50]">Carregando detalhes do projeto...</p>
      </div>
    )
  }

  if (carregamentoConcluido && !projeto) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-[#f4f4f4]">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#DEE4EA] text-center shadow-xs">
          <div className="w-14 h-14 bg-[#2C3E50]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#2C3E50]">
            <Layers className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#2C3E50] mb-2">
            Projeto não encontrado
          </h1>
          <p className="text-sm text-[#616F7D] mb-6">
            {erroCarregamento ||
              `O projeto "${slug || ''}" não foi localizado ou pode ter sido alterado.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs uppercase tracking-wider"
            >
              <Link to="/portfolio">Ver portfólio completo</Link>
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

  if (!projeto) {
    return null
  }

  const whatsappUrl = getWhatsAppUrlForProject(projeto.titulo || 'Projeto')

  const nextPhoto = () => {
    if (fotos.length === 0) return
    setActivePhotoIndex((prev) => (prev + 1) % fotos.length)
  }

  const prevPhoto = () => {
    if (fotos.length === 0) return
    setActivePhotoIndex((prev) => (prev - 1 + fotos.length) % fotos.length)
  }

  const breadcrumbsJsonLd = {
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
        name: 'Portfólio',
        item: 'https://gessobettone.com.br/portfolio',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: projeto.titulo,
        item: `https://gessobettone.com.br/portfolio/${projeto.slug}`,
      },
    ],
  }

  const creativeWorkJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: projeto.titulo,
    description: projeto.descricao,
    image: fotos[0] || projeto.imagemCapa,
    creator: {
      '@type': 'LocalBusiness',
      name: 'Gesso Bettone',
    },
  }

  const fotosVisiveisCard = fotos.slice(
    fotosCardPage * fotosPerPage,
    (fotosCardPage + 1) * fotosPerPage,
  )

  return (
    <>
      <SEO
        title={projeto.metaTitle || `${projeto.titulo} | Gesso Bettone`}
        description={projeto.metaDescription || projeto.descricao}
        canonical={`/portfolio/${projeto.slug}`}
        ogImage={fotos[0] || projeto.imagemCapa}
        keywords={[
          (projeto.titulo || '').toLowerCase(),
          'projeto gesso bettone',
          'gesso são pedro',
          'drywall são pedro piracicaba',
        ].filter(Boolean)}
        jsonLd={[breadcrumbsJsonLd, creativeWorkJsonLd]}
      />

      <div className="bg-[#f4f4f4] min-h-screen pb-16">
        {/* Breadcrumb em texto pequeno no topo cinza claro conforme print */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <nav aria-label="Navegação estrutural">
            <ol className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8B98A5] uppercase tracking-wider">
              <li>
                <Link to="/" className="hover:text-[#2C3E50] transition-colors">
                  GESSO BETTONE
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  to="/portfolio"
                  className="hover:text-[#2C3E50] text-[#D4AF37] transition-colors"
                >
                  PORTFÓLIO
                </Link>
              </li>
              <li>/</li>
              <li className="text-[#8B98A5] truncate max-w-[260px] sm:max-w-md">
                {projeto.titulo}
              </li>
            </ol>
          </nav>
        </div>

        {/* Layout Principal idêntico ao print da referência */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna 1 (Esquerda): Informações do projeto + CTAs (3 colunas lg) */}
            <div className="lg:col-span-3 space-y-5">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D4AF37] block mb-2">
                  {projeto.categoria}
                </span>
                <h1 className="font-heading text-3xl sm:text-4xl lg:text-4xl font-bold leading-tight text-[#2C3E50]">
                  {projeto.titulo}
                </h1>
                {projeto.subtitulo && (
                  <p className="text-sm font-semibold text-[#616F7D] mt-3">{projeto.subtitulo}</p>
                )}
                <p className="text-xs text-[#8B98A5] mt-3 leading-relaxed">
                  {projeto.cidade
                    ? `Atendimento em ${projeto.cidade}, Charqueada, Santa Maria da Serra, Rio Claro, Brotas e região.`
                    : 'Atendimento em São Pedro, Águas de São Pedro, Piracicaba, Charqueada, Santa Maria, Rio Claro, Brotas e região.'}
                </p>
              </div>

              {/* Botões do print: Quero um orçamento (dourado) e Voltar ao Portfólio */}
              <div className="space-y-2.5 pt-2">
                <Button
                  asChild
                  className="w-full bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-11 uppercase tracking-wider rounded-md shadow-sm"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    QUERO UM ORÇAMENTO
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-[#DEE4EA] hover:bg-white text-[#2C3E50] font-bold text-xs h-10 uppercase tracking-wider rounded-md"
                >
                  <Link to="/portfolio">VOLTAR AO PORTFÓLIO</Link>
                </Button>
              </div>

              <p className="text-[11px] text-[#616F7D] leading-relaxed pt-2">
                Gostou do resultado? Conte como podemos fazer parte do seu próximo projeto.
              </p>
            </div>

            {/* Coluna 2 (Centro): Galeria Principal Grande com setas e contagem 1/7 (6 colunas lg) */}
            <div className="lg:col-span-5 space-y-2">
              <div className="relative rounded-2xl overflow-hidden shadow-md bg-[#1B2631] border border-[#DEE4EA] aspect-[4/5] flex items-center justify-center group">
                {fotos.length > 0 ? (
                  <>
                    {/* Fundo desfocado para preenchimento de laterais sem corte brusco */}
                    <img
                      src={fotos[activePhotoIndex]}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110 pointer-events-none select-none"
                    />

                    <WatermarkedImage
                      src={fotos[activePhotoIndex]}
                      alt={`${projeto.titulo} — foto ${activePhotoIndex + 1}`}
                      className="relative z-10 w-full h-full object-contain object-center cursor-pointer"
                      onClick={() => setFullscreenOpen(true)}
                    />

                    {/* Seta Esquerda */}
                    {fotos.length > 1 && (
                      <button
                        type="button"
                        onClick={prevPhoto}
                        aria-label="Foto anterior"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-14 rounded bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors shadow-md"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                    )}

                    {/* Seta Direita */}
                    {fotos.length > 1 && (
                      <button
                        type="button"
                        onClick={nextPhoto}
                        aria-label="Próxima foto"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-14 rounded bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors shadow-md"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    )}

                    {/* Botão Ampliar discreto no canto */}
                    <button
                      type="button"
                      onClick={() => setFullscreenOpen(true)}
                      className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Ampliar foto"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2C3E50] via-[#1B2631] to-[#0f171e] text-white p-6 text-center">
                    <Layers className="w-16 h-16 text-[#D4AF37] mb-3 opacity-80" />
                    <p className="font-heading text-lg font-bold">{projeto.titulo}</p>
                    <p className="text-xs text-white/60 mt-1 max-w-xs">
                      Fotos e especificações completas disponíveis com nossa equipe técnica via
                      WhatsApp.
                    </p>
                  </div>
                )}
              </div>

              {/* Contagem no rodapé esquerdo do slide (ex: 1/7) conforme print */}
              {fotos.length > 0 && (
                <div className="text-xs font-semibold text-[#616F7D] px-1 pt-1">
                  {activePhotoIndex + 1}/{fotos.length}
                </div>
              )}
            </div>

            {/* Coluna 3 (Direita): Cards FOTOS, VÍDEOS e DETALHES (4 colunas lg) */}
            <div className="lg:col-span-4 space-y-5">
              {/* Card 1: FOTOS (Miniaturas com paginação < 1/2 >) */}
              <div className="bg-white rounded-2xl border border-[#DEE4EA] p-5 shadow-xs space-y-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37] block">
                    FOTOS
                  </span>
                  <h3 className="font-heading text-xl font-bold text-[#2C3E50]">
                    {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
                  </h3>
                  <p className="text-xs text-[#616F7D] mt-0.5">
                    {fotos.length > 0
                      ? 'Use as setas ou as miniaturas para navegar por todas as imagens.'
                      : 'Solicite fotos e vídeos desta obra em alta resolução pelo WhatsApp.'}
                  </p>
                </div>

                {/* Grid 2x2 de Miniaturas */}
                {fotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {fotosVisiveisCard.map((imgUrl, localIdx) => {
                      const globalIdx = fotosCardPage * fotosPerPage + localIdx
                      const isSelected = activePhotoIndex === globalIdx

                      return (
                        <button
                          key={globalIdx}
                          type="button"
                          onClick={() => setActivePhotoIndex(globalIdx)}
                          className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-[#D4AF37] shadow-sm'
                              : 'border-transparent hover:border-[#2C3E50]/40'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Miniatura ${globalIdx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#f4f4f4] text-xs text-[#616F7D]">
                    Nenhuma foto adicional cadastrada no momento.
                  </div>
                )}

                {/* Navegação entre páginas de miniaturas (< 1/2 >) conforme print */}
                {totalFotosCardPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={fotosCardPage === 0}
                      onClick={() => setFotosCardPage((p) => Math.max(0, p - 1))}
                      className="w-8 h-8 rounded bg-[#2C3E50] disabled:opacity-40 text-white flex items-center justify-center hover:bg-[#1B2631] transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-semibold text-[#616F7D]">
                      {fotosCardPage + 1}/{totalFotosCardPages}
                    </span>

                    <button
                      type="button"
                      disabled={fotosCardPage >= totalFotosCardPages - 1}
                      onClick={() =>
                        setFotosCardPage((p) => Math.min(totalFotosCardPages - 1, p + 1))
                      }
                      className="w-8 h-8 rounded bg-[#2C3E50] disabled:opacity-40 text-white flex items-center justify-center hover:bg-[#1B2631] transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Card 2: VÍDEOS (Player nativo embutido com overlay de logotipo) */}
              {videos.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#DEE4EA] p-5 shadow-xs space-y-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37] block">
                      VÍDEOS
                    </span>
                    <h3 className="font-heading text-xl font-bold text-[#2C3E50]">
                      {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
                    </h3>
                    <p className="text-xs text-[#616F7D] mt-0.5">Veja os vídeos deste projeto.</p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Player de vídeo embutido com marca d'água discreta sobreposta */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-inner border border-[#DEE4EA]">
                      <video
                        src={videos[activeVideoIndex]}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />

                      {/* Selo/Overlay discreto da marca d'água Gesso Bettone no canto superior direito do vídeo */}
                      <div className="absolute top-2 right-2 pointer-events-none bg-[#2C3E50]/80 backdrop-blur-xs text-white px-2 py-0.5 rounded flex items-center gap-1.5 border border-[#D4AF37]/40 shadow-xs">
                        <div className="w-4 h-4 rounded bg-[#D4AF37] text-[#2C3E50] font-bold text-[9px] flex items-center justify-center font-heading">
                          GB
                        </div>
                        <span className="text-[10px] font-semibold text-white tracking-wide">
                          Gesso Bettone
                        </span>
                      </div>
                    </div>

                    {videos.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {videos.map((vUrl, vIdx) => {
                          const isSel = selectedVideoIndex === vIdx
                          return (
                            <button
                              key={vIdx}
                              type="button"
                              onClick={() => setSelectedVideoIndex(vIdx)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 flex-shrink-0 transition-colors ${
                                isSel
                                  ? 'bg-[#2C3E50] text-white'
                                  : 'bg-[#f4f4f4] hover:bg-[#DEE4EA] text-[#2C3E50]'
                              }`}
                            >
                              <Film
                                className={`w-3 h-3 ${isSel ? 'text-[#D4AF37]' : 'text-[#2C3E50]'}`}
                              />
                              Vídeo #{vIdx + 1}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Card 3: DETALHES (Soluções aplicadas com barra lateral dourada conforme print) */}
              <div className="bg-white rounded-2xl border border-[#DEE4EA] p-5 shadow-xs space-y-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37] block">
                    DETALHES
                  </span>
                  <h3 className="font-heading text-xl font-bold text-[#2C3E50]">
                    Soluções aplicadas
                  </h3>
                  <p className="text-xs text-[#616F7D] mt-0.5">
                    Veja os principais materiais, técnicas e soluções utilizadas neste projeto.
                  </p>
                </div>

                {/* Bloco com borda lateral dourada conforme a referência */}
                <div className="border-l-4 border-[#D4AF37] bg-[#fbfbfb] p-3.5 rounded-r-lg space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2C3E50] block">
                    {projeto.categoria === 'Comercial'
                      ? 'PAREDE DRYWALL'
                      : 'ESTRUTURAÇÃO & ACABAMENTO'}
                  </span>

                  <div className="space-y-1.5 text-xs text-[#616F7D] leading-relaxed">
                    {projeto.detalhesTecnicos && projeto.detalhesTecnicos.length > 0 ? (
                      projeto.detalhesTecnicos.map((det: string, i: number) => (
                        <p key={i} className="flex items-start gap-1.5">
                          <span className="text-[#D4AF37] font-bold">•</span>
                          <span>{det}</span>
                        </p>
                      ))
                    ) : (
                      <>
                        <p className="flex items-start gap-1.5">
                          <span className="text-[#D4AF37] font-bold">•</span>
                          <span>Paredes de fechamento e divisão da sala em drywall</span>
                        </p>
                        <p className="flex items-start gap-1.5">
                          <span className="text-[#D4AF37] font-bold">•</span>
                          <span>Uso de elemento isolante termoacústico lã de pet</span>
                        </p>
                        <p className="flex items-start gap-1.5">
                          <span className="text-[#D4AF37] font-bold">•</span>
                          <span>Uso de elemento banda acústica nas extremidades da parede</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Foto em Tela Cheia */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-5xl p-2 bg-black/95 border-none text-white flex flex-col items-center">
          <div className="relative w-full aspect-[16/10] max-h-[80vh] flex items-center justify-center overflow-hidden bg-black/60 rounded-xl">
            {/* Fundo sutil desfocado no lightbox */}
            {fotos[activePhotoIndex] && (
              <img
                src={fotos[activePhotoIndex]}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-120 pointer-events-none select-none"
              />
            )}
            <WatermarkedImage
              src={fotos[activePhotoIndex]}
              alt={`${projeto.titulo} em tela cheia`}
              className="relative z-10 max-w-full max-h-[75vh] w-auto h-auto object-contain object-center mx-auto"
            />
            {fotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  aria-label="Próxima foto"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
          <div className="py-2 text-center text-xs text-white/70">
            Foto {activePhotoIndex + 1} de {fotos.length} — {projeto.titulo}
          </div>
        </DialogContent>
      </Dialog>

      <LandingParceiros />

      <LandingCTA
        titulo="Quer um resultado desse nível na sua obra?"
        subtitulo="Envie suas referências ou solicite a visita de nossa equipe para começarmos o planejamento do seu espaço."
        botaoTexto="Iniciar meu projeto no WhatsApp"
      />
    </>
  )
}

export default ProjetoDetailPage
