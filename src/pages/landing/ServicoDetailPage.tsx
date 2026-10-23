import React, { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { SERVICOS, getWhatsAppUrlForService, CIDADES_ATENDIDAS } from '@/data/landingData'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingParceiros from '@/components/landing/LandingParceiros'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  const servico = SERVICOS.find((s) => s.slug === slug)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  if (!servico) {
    return <Navigate to="/servicos" replace />
  }

  const whatsappUrl = getWhatsAppUrlForService(servico.titulo)

  // Outros serviços para recomendação
  const outrosServicos = SERVICOS.filter((s) => s.slug !== servico.slug).slice(0, 3)

  // JSON-LD Service + Breadcrumbs
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
          name: servico.titulo,
          item: `https://gessobettone.com.br/servicos/${servico.slug}`,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: servico.titulo,
      serviceType: servico.titulo,
      category: servico.categoria,
      description: servico.descricaoCompleta,
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
      image: servico.imagemPrincipal,
    },
  ]

  const nextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % servico.galeria.length)
  }

  const prevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + servico.galeria.length) % servico.galeria.length)
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
            <div className="relative rounded-2xl overflow-hidden shadow-md border border-[#E3E6EA] bg-black aspect-[16/10]">
              <img
                src={servico.galeria[activePhotoIndex] || servico.imagemPrincipal}
                alt={`${servico.titulo} — foto ${activePhotoIndex + 1}`}
                className="w-full h-full object-cover transition-all duration-300"
              />

              {servico.galeria.length > 1 && (
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
                    {activePhotoIndex + 1} / {servico.galeria.length}
                  </div>
                </>
              )}
            </div>

            {/* Miniaturas da galeria */}
            {servico.galeria.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {servico.galeria.map((img, idx) => (
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

            {/* Benefícios e Vantagens */}
            <div className="mt-8 p-6 rounded-2xl bg-[#f4f4f4] border border-[#DEE4EA]">
              <h3 className="font-heading font-bold text-lg text-[#2C3E50] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2C3E50]" />
                Por que escolher a Gesso Bettone para este serviço:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {servico.beneficios.map((ben, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-[#2C3E50] leading-snug">{ben}</span>
                  </div>
                ))}
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
        titulo={`Gostaria de aplicar ${servico.titulo.toLowerCase()} no seu espaço?`}
        subtitulo="Envie suas medidas, fotos do local ou planta pelo WhatsApp para receber um orçamento transparente e personalizado."
        botaoTexto="Falar com especialista agora"
      />
    </>
  )
}

export default ServicoDetailPage
