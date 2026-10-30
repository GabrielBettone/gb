import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { WHATSAPP_LINK } from '@/data/landingData'
import { Button } from '@/components/ui/button'
import {
  MessageCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { obterConfiguracoes, listarServicos, SiteSettings, SiteServico } from '@/services/site'
import { resolverUrlMidia } from '@/lib/watermark'
import WatermarkedImage from '@/components/landing/WatermarkedImage'

interface HeroSlide {
  image: string
  title: string
  subtitle: string
  tag: string
  serviceSlug: string
}

const HERO_SLIDES_FALLBACK: HeroSlide[] = [
  {
    image:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
    title: 'Forros de Gesso Tabicado',
    subtitle: 'Iluminação moderna e integração perfeita aos ambientes',
    tag: 'Residencial de Alto Padrão',
    serviceSlug: 'forros-de-gesso',
  },
  {
    image:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffb8242ba9f1a3f2fb921ef3ab2f15f7f.jpg',
    title: 'Paredes e Divisórias Drywall',
    subtitle: 'Construção a seco rápida, limpa e com isolamento acústico',
    tag: 'Residencial & Comercial',
    serviceSlug: 'parede-drywall',
  },
  {
    image:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F3bc3144d74503e38bdf9978bb5672b82.jpg',
    title: 'Áreas Gourmet e Nichos',
    subtitle: 'Forros estruturados e acabamentos finos sob medida',
    tag: 'Residencial',
    serviceSlug: 'moveis',
  },
  {
    image:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Fb944ac447f9051305d85665a99fc9f25.jpg',
    title: 'Molduras Externas para Fachadas',
    subtitle: 'Cimento celular resistente a sol e chuva para portas e janelas',
    tag: 'Fachadas & Externas',
    serviceSlug: 'molduras-externas-em-cimento-celular',
  },
  {
    image:
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2Ffde6f4628a63c77f3487f5e69f29fd3c.jpg',
    title: 'Boiserie e Faixas Decorativas',
    subtitle: 'Elegância clássica com simetria milimétrica nas paredes',
    tag: 'Decoração Fina',
    serviceSlug: 'molduras-e-boiseries',
  },
]

export const LandingHero: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [slides, setSlides] = useState<HeroSlide[]>(HERO_SLIDES_FALLBACK)

  useEffect(() => {
    let ativo = true
    obterConfiguracoes().then((st) => {
      if (ativo) setSettings(st)
    })

    // Busca serviços cadastrados para montar os slides dinâmicos
    listarServicos(true)
      .then((servicos: SiteServico[]) => {
        if (!ativo) return

        // 1. Prioriza serviços ativos marcados com destaque do serviço
        const servicosDestaque = servicos.filter((s) => s.ativo !== false && !!s.destaque)
        const servicosCandidatos =
          servicosDestaque.length > 0 ? servicosDestaque : servicos.filter((s) => s.ativo !== false)

        const novosSlides: HeroSlide[] = []

        servicosCandidatos.forEach((serv) => {
          const categoriaTag =
            (serv.categorias && serv.categorias[0]) || serv.categoria || 'Gesso & Drywall'
          const tagTexto = serv.destaque ? `★ Destaque • ${categoriaTag}` : categoriaTag
          const subtituloTexto =
            serv.descricao_curta || 'Acabamento refinado e alto padrão sob medida'

          // Foto de capa com fallback em cascata:
          // capa (arquivo_principal ou imagem_principal)
          // -> primeira de destaques_fotos
          // -> primeira de arquivos_galeria
          // -> primeira de galeria
          const capaRaw =
            serv.arquivo_principal ||
            serv.imagem_principal ||
            (serv.destaques_fotos && serv.destaques_fotos[0]) ||
            (serv.arquivos_galeria && serv.arquivos_galeria[0]) ||
            (serv.galeria && serv.galeria[0]) ||
            ''

          // Monta a lista de fotos a exibir nos slides deste serviço:
          // A capa vem como a principal de apresentação do card do serviço,
          // seguida pelas fotos adicionais listadas em destaques_fotos (sem duplicar a capa)
          const fotosRawDoServico: string[] = []
          if (capaRaw) {
            fotosRawDoServico.push(capaRaw)
          }

          if (serv.destaques_fotos && serv.destaques_fotos.length > 0) {
            serv.destaques_fotos.forEach((fotoDest) => {
              if (fotoDest && fotoDest !== capaRaw && !fotosRawDoServico.includes(fotoDest)) {
                fotosRawDoServico.push(fotoDest)
              }
            })
          }

          fotosRawDoServico.forEach((fotoItem) => {
            const resolvedUrl = resolverUrlMidia('site_services', serv.id, fotoItem)
            if (resolvedUrl) {
              novosSlides.push({
                image: resolvedUrl,
                title: serv.nome,
                subtitle: subtituloTexto,
                tag: tagTexto,
                serviceSlug: serv.slug,
              })
            }
          })
        })

        if (novosSlides.length > 0) {
          setSlides(novosSlides)
        } else {
          setSlides(HERO_SLIDES_FALLBACK)
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar serviços para o carrossel do Hero:', err)
      })

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [slides.length])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <section className="relative bg-[#2C3E50] text-white overflow-hidden">
      {/* Background decorativo com Azul Ardósia #2C3E50 */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1B2631] via-[#2C3E50] to-[#2C3E50]/90 z-0" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Lado Esquerdo: Textos & CTAs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#ffffff] text-xs font-semibold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            GESSO • DRYWALL • ACABAMENTOS
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Ambientes que transformam espaços.
          </h1>

          {/* Selo / Frase de assinatura refinada em Petit Formal Script */}
          <p className="font-script text-2xl sm:text-3xl text-[#D4AF37] leading-relaxed -mt-2">
            "A arte e a precisão do gesso sob medida"
          </p>

          <p className="text-base sm:text-lg text-white/90 max-w-2xl leading-relaxed">
            Projetos em gesso e drywall com solidez técnica, sofisticação arquitetônica e atenção
            rigorosa aos detalhes. Mais de 30 anos criando soluções sob medida para residências,
            comércios e fachadas em São Pedro, Piracicaba e região.
          </p>

          {/* Destaques rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm text-white/95">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span>30+ Anos de Tradição</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span>Acabamento Milimétrico</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span>Atendimento Consultivo</span>
            </div>
          </div>

          {/* CTAs: Dourado #D4AF37 com texto escuro para contraste impecável */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-base h-12 px-6 rounded-xl shadow-lg shadow-black/25 transition-all hover:scale-[1.02]"
            >
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5 mr-2 text-[#2C3E50]" />
                Quero um orçamento
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 text-white bg-white/5 hover:bg-white/10 hover:text-white font-medium text-base h-12 px-6 rounded-xl transition-all"
            >
              <Link to="/portfolio">
                Ver portfólio
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>

            {settings?.simulador_ativo !== false && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#D4AF37]/50 text-[#D4AF37] bg-white/5 hover:bg-[#D4AF37]/20 hover:text-white font-medium text-base h-12 px-5 rounded-xl transition-all"
              >
                <Link to="/simulador">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Simulador IA
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Lado Direito: Carrossel de Destaque Ampliado com fotos reais e marca d'água */}
        <div className="lg:col-span-5 relative w-full flex items-center justify-center">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-[#1C252B] aspect-[4/3] sm:aspect-[16/11] lg:min-h-[460px] group">
            {slides.map((slide, idx) => (
              <div
                key={slide.image + idx}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <Link
                  to={`/servicos/${slide.serviceSlug}`}
                  className="relative block w-full h-full overflow-hidden flex items-center justify-center"
                >
                  {/* Fundo desfocado da própria foto para preencher as laterais de imagens verticais ou horizontais sem corte brusco */}
                  <img
                    src={slide.image}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-45 scale-110 pointer-events-none select-none transition-transform duration-700 group-hover:scale-125"
                  />

                  {/* Foto em primeiro plano com proporção preservada (object-contain), marca d'água protegida e foco nítido */}
                  <WatermarkedImage
                    src={slide.image}
                    alt={slide.title}
                    enableWatermark={true}
                    className="relative z-10 w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.02]"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />

                  {/* Gradiente sutil inferior para garantir legibilidade dos textos e selos */}
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                  {/* Selo e Legenda inferior sobre a foto */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 p-5 sm:p-6 text-white pointer-events-none">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#D4AF37] text-[#2C3E50] text-[11px] font-bold tracking-wider uppercase mb-2 shadow-sm">
                      {slide.tag}
                    </span>
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-white drop-shadow-md leading-snug">
                      {slide.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/90 line-clamp-1 mt-1 drop-shadow-sm">
                      {slide.subtitle}
                    </p>
                  </div>
                </Link>
              </div>
            ))}

            {/* Controles de Navegação */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    prevSlide()
                  }}
                  aria-label="Foto anterior"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    nextSlide()
                  }}
                  aria-label="Próxima foto"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Pontos de paginação / Indicadores */}
                <div className="absolute top-3.5 right-3.5 z-30 flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setCurrentSlide(idx)
                      }}
                      aria-label={`Ir para foto ${idx + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentSlide
                          ? 'w-6 bg-[#D4AF37]'
                          : 'w-2 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
