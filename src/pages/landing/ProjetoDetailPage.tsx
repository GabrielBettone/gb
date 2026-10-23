import React, { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { PROJETOS, getWhatsAppUrlForProject } from '@/data/landingData'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingParceiros from '@/components/landing/LandingParceiros'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageCircle,
  ArrowLeft,
  Images,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export const ProjetoDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [projetoDb, setProjetoDb] = React.useState<any>(null)
  const projetoLocal = PROJETOS.find((p) => p.slug === slug)

  React.useEffect(() => {
    if (slug) {
      import('@/services/site').then(({ obterProjetoPorSlug, registrarEventoAnalytics }) => {
        obterProjetoPorSlug(slug).then((p) => {
          if (p) {
            setProjetoDb(p)
            registrarEventoAnalytics({
              tipo: 'view_categoria',
              categoria_nome: p.categoria,
              metadata: { projeto: p.titulo, slug: p.slug },
            })
          }
        })
      })
    }
  }, [slug])

  const projeto = projetoDb
    ? {
        slug: projetoDb.slug,
        titulo: projetoDb.titulo,
        categoria: projetoDb.categoria,
        subtitulo: projetoDb.subtitulo,
        descricao: projetoDb.descricao,
        detalhesTecnicos: projetoDb.detalhes_tecnicos,
        fotosCount: projetoDb.fotos_count || projetoDb.galeria?.length || 0,
        imagemCapa: projetoDb.imagem_capa,
        galeria: projetoDb.galeria,
        metaTitle: projetoDb.meta_title,
        metaDescription: projetoDb.meta_description,
      }
    : projetoLocal
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  if (!projeto) {
    return <Navigate to="/portfolio" replace />
  }

  const whatsappUrl = getWhatsAppUrlForProject(projeto.titulo)

  // Outros projetos para navegação
  const outrosProjetos = PROJETOS.filter((p) => p.slug !== projeto.slug).slice(0, 3)

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
    image: projeto.imagemCapa,
    creator: {
      '@type': 'LocalBusiness',
      name: 'Gesso Bettone',
    },
  }

  const nextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % projeto.galeria.length)
  }

  const prevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + projeto.galeria.length) % projeto.galeria.length)
  }

  return (
    <>
      <SEO
        title={projeto.metaTitle}
        description={projeto.metaDescription}
        canonical={`/portfolio/${projeto.slug}`}
        ogImage={projeto.imagemCapa}
        keywords={[
          projeto.titulo.toLowerCase(),
          'projeto gesso bettone',
          'gesso são pedro',
          'obra acabada gesso drywall',
        ]}
        jsonLd={[breadcrumbsJsonLd, creativeWorkJsonLd]}
      />

      {/* Header do Projeto */}
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
                <Link to="/portfolio" className="hover:text-[#D4AF37] transition-colors">
                  Portfólio
                </Link>
              </li>
              <li>/</li>
              <li className="text-[#D4AF37] font-semibold truncate max-w-[200px]">
                {projeto.titulo}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#D4AF37] text-[#2C3E50] font-bold text-xs border-none">
                  {projeto.categoria}
                </Badge>
                {projeto.subtitulo && (
                  <span className="text-xs text-white/80 font-medium">{projeto.subtitulo}</span>
                )}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                {projeto.titulo}
              </h1>
            </div>

            <Button
              asChild
              size="lg"
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm h-11 px-6 rounded-xl shadow-md transition-all self-start md:self-auto"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2 text-[#2C3E50]" />
                Quero um projeto parecido
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Lado Esquerdo: Galeria e Visualizador de Fotos */}
          <div className="lg:col-span-8 space-y-4">
            {/* Foto Ativa com controles */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-[#E3E6EA] bg-black aspect-[16/10] group">
              <img
                src={projeto.galeria[activePhotoIndex] || projeto.imagemCapa}
                alt={`${projeto.titulo} — foto ${activePhotoIndex + 1}`}
                className="w-full h-full object-cover transition-all duration-300 cursor-pointer"
                onClick={() => setFullscreenOpen(true)}
              />

              {projeto.galeria.length > 1 && (
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
                </>
              )}

              {/* Contador & Zoom */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(true)}
                  className="bg-black/60 hover:bg-black/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Ampliar foto
                </button>
              </div>

              <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur font-medium">
                {activePhotoIndex + 1} de {projeto.galeria.length} fotos
              </div>
            </div>

            {/* Grid de Miniaturas */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
              {projeto.galeria.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                    activePhotoIndex === idx
                      ? 'border-[#2C3E50] scale-105 shadow-sm'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Miniatura ${idx + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Modal de Foto em Tela Cheia */}
            <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
              <DialogContent className="max-w-4xl p-2 bg-black/95 border-none text-white flex flex-col items-center">
                <div className="relative w-full aspect-[16/10] max-h-[80vh] flex items-center justify-center overflow-hidden">
                  <img
                    src={projeto.galeria[activePhotoIndex]}
                    alt={`${projeto.titulo} em tela cheia`}
                    className="max-w-full max-h-full object-contain"
                  />
                  {projeto.galeria.length > 1 && (
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
                  Foto {activePhotoIndex + 1} de {projeto.galeria.length} — {projeto.titulo}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lado Direito: Detalhes do Projeto */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl bg-[#f4f4f4] border border-[#DEE4EA] space-y-4">
              <h2 className="font-heading text-xl font-bold text-[#2C3E50]">Detalhes da Obra</h2>
              <p className="text-sm text-[#616F7D] leading-relaxed">{projeto.descricao}</p>

              {projeto.detalhesTecnicos && projeto.detalhesTecnicos.length > 0 && (
                <div className="pt-3 border-t border-[#DEE4EA]">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] mb-2.5">
                    Soluções Aplicadas:
                  </h3>
                  <div className="space-y-2">
                    {projeto.detalhesTecnicos.map((det, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-[#2C3E50] leading-snug">{det}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button
                  asChild
                  className="w-full bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm h-12 rounded-xl shadow-md transition-all"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2 text-[#2C3E50]" />
                    Solicitar Orçamento Deste Projeto
                  </a>
                </Button>
                <p className="text-[11px] text-center text-[#616F7D] mt-2">
                  Atendimento direto com o especialista
                </p>
              </div>
            </div>

            {/* Outros Projetos */}
            <div className="p-6 rounded-2xl bg-white border border-[#DEE4EA] space-y-3">
              <h3 className="font-heading font-bold text-sm text-[#2C3E50]">
                Outras obras no portfólio:
              </h3>
              <div className="space-y-3">
                {outrosProjetos.map((outro) => (
                  <Link
                    key={outro.slug}
                    to={`/portfolio/${outro.slug}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#E8EDF2] transition-colors border border-transparent hover:border-[#DEE4EA] group"
                  >
                    <img
                      src={outro.imagemCapa}
                      alt={outro.titulo}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="truncate">
                      <span className="text-xs font-bold text-[#2C3E50] group-hover:text-[#2C3E50] block truncate">
                        {outro.titulo}
                      </span>
                      <span className="text-[11px] text-[#616F7D]">
                        {outro.fotosCount} fotos • {outro.categoria}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
