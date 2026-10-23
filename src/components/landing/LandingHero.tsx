import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { WHATSAPP_LINK } from '@/data/landingData'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

interface HeroSlide {
  image: string
  title: string
  subtitle: string
  tag: string
  serviceSlug: string
}

const HERO_SLIDES: HeroSlide[] = [
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
      'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fproject_photos%2F88bcc881958d712356569279.jpg',
    title: 'Áreas Gourmet Sofisticadas',
    subtitle: 'Forro tabicado e acabamentos resistentes de primeira linha',
    tag: 'Projeto Concluído',
    serviceSlug: 'area-gourmet',
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)

  return (
    <section className="relative bg-[#1C4E3D] text-white overflow-hidden">
      {/* Background decorativo sutil */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F2F24] via-[#1C4E3D] to-[#1C4E3D]/90 z-0" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#C2A24B]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Lado Esquerdo: Textos & CTAs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C2A24B]/20 border border-[#C2A24B]/40 text-[#E7EFEA] text-xs font-semibold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#C2A24B]" />
            GESSO • DRYWALL • ACABAMENTOS
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Ambientes que <span className="italic font-serif text-[#C2A24B]">transformam</span>{' '}
            espaços.
          </h1>

          <p className="text-base sm:text-lg text-[#E7EFEA]/90 max-w-2xl leading-relaxed">
            Projetos em gesso e drywall com acabamento, personalidade e atenção aos detalhes. Mais
            de 30 anos criando soluções sob medida para residências, comércios e fachadas em São
            Pedro, Piracicaba e região.
          </p>

          {/* Destaques rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm text-[#E7EFEA]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
              <span>30+ Anos de Tradição</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
              <span>Acabamento Milimétrico</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
              <span>Atendimento Consultivo</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="bg-[#C2A24B] hover:bg-[#b0913e] text-[#1C4E3D] font-bold text-base h-12 px-6 rounded-xl shadow-lg shadow-black/20 transition-all hover:scale-[1.02]"
            >
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5 mr-2" />
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
          </div>
        </div>

        {/* Lado Direito: Carrossel com fotos reais */}
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black aspect-[4/3] sm:aspect-[16/11]">
            {HERO_SLIDES.map((slide, idx) => (
              <div
                key={slide.image + idx}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
                {/* Gradiente de sombra sobre a foto para legibilidade */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* Legenda inferior */}
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#C2A24B] text-[#1C4E3D] text-[10px] font-bold tracking-wider uppercase mb-1.5">
                    {slide.tag}
                  </span>
                  <h3 className="text-lg font-bold text-white drop-shadow-sm leading-snug">
                    {slide.title}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{slide.subtitle}</p>
                </div>
              </div>
            ))}

            {/* Controles de Navegação */}
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pontos de paginação */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Ir para foto ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentSlide ? 'w-5 bg-[#C2A24B]' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
