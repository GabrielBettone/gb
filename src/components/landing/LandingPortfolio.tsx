import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PROJETOS as FALLBACK_PROJETOS } from '@/data/landingData'
import { ArrowRight, Images, Sparkles, Film } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import WatermarkedImage from '@/components/landing/WatermarkedImage'
import {
  listarPortfolio,
  listarCategorias,
  registrarEventoAnalytics,
  SitePortfolioItem,
  SiteCategoria,
} from '@/services/site'
import { resolverUrlMidia } from '@/lib/watermark'
interface Props {
  limit?: number
  showFilter?: boolean
}

export const LandingPortfolio: React.FC<Props> = ({ limit, showFilter = true }) => {
  const [filter, setFilter] = useState<string>('Todos')
  const [projetos, setProjetos] = useState<SitePortfolioItem[]>([])
  const [categorias, setCategorias] = useState<string[]>([
    'Todos',
    'Residencial',
    'Comercial',
    'Fachadas',
  ])

  useEffect(() => {
    let isMounted = true
    async function carregar() {
      try {
        const [ports, cats] = await Promise.all([listarPortfolio(true), listarCategorias(true)])
        if (!isMounted) return
        if (ports.length > 0) {
          setProjetos(ports)
        } else {
          setProjetos(
            FALLBACK_PROJETOS.map((p, idx) => ({
              id: `fallback-${idx}`,
              titulo: p.titulo,
              slug: p.slug,
              categoria: p.categoria,
              subtitulo: p.subtitulo,
              cidade: 'São Pedro/SP',
              descricao: p.descricao,
              detalhes_tecnicos: p.detalhesTecnicos,
              imagem_capa: p.imagemCapa,
              galeria: p.galeria,
              fotos_count: p.fotosCount,
              videos_count: p.videos?.length || 0,
              videos: p.videos || [],
              destaque: true,
              ativo: true,
            })),
          )
        }
        if (cats.length > 0) {
          setCategorias(['Todos', ...cats.map((c) => c.nome)])
        }
      } catch (err) {
        console.error('Erro ao carregar portfolio:', err)
      }
    }
    carregar()
    return () => {
      isMounted = false
    }
  }, [])

  const filtered = projetos.filter((p) => {
    if (filter === 'Todos') return true
    const lista = p.categorias && p.categorias.length > 0 ? p.categorias : [p.categoria]
    return lista.includes(filter)
  })

  const displayed = limit ? filtered.slice(0, limit) : filtered

  const handleFilterClick = (cat: string) => {
    setFilter(cat)
    if (cat !== 'Todos') {
      registrarEventoAnalytics({
        tipo: 'view_categoria',
        categoria_nome: cat,
      })
    }
  }

  return (
    <section className="py-16 bg-white" id="portfolio">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2C3E50] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              TRABALHOS REALIZADOS
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2C3E50] tracking-tight">
              Portfólio de Projetos
            </h2>
            <p className="text-sm sm:text-base text-[#616F7D] mt-1.5 max-w-2xl">
              Confira projetos reais executados pela nossa equipe. Fotos reais de obras concluídas
              com alto nível de acabamento.
            </p>
          </div>

          {/* Filtros por Categoria */}
          {showFilter && (
            <div className="flex flex-wrap items-center gap-1.5 bg-[#f4f4f4] p-1.5 rounded-xl border border-[#DEE4EA]">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleFilterClick(cat)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    filter === cat
                      ? 'bg-[#2C3E50] text-white shadow-xs font-semibold'
                      : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grade de Projetos ou Estado Vazio */}
        {displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DEE4EA] bg-[#F8FAFC] p-10 sm:p-14 text-center max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#2C3E50]/10 text-[#2C3E50] flex items-center justify-center mx-auto mb-4">
              <Images className="w-7 h-7 text-[#2C3E50]" />
            </div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-[#2C3E50] mb-2">
              Novos projetos em preparação
            </h3>
            <p className="text-sm text-[#616F7D] leading-relaxed mb-6">
              Estamos atualizando nosso portfólio fotográfico com as obras mais recentes em São
              Pedro, Piracicaba e região. Se desejar referências de trabalhos específicos, entre em
              contato com nossa equipe.
            </p>
            <Link
              to="/servicos"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#2C3E50] text-white text-xs sm:text-sm font-semibold hover:bg-[#1B2631] transition-all shadow-xs"
            >
              Conhecer nossos serviços
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((proj) => (
              <article
                key={proj.slug}
                className="group bg-white rounded-xl border border-[#DEE4EA] overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col hover:border-[#2C3E50]/40"
              >
                {/* Imagem de Capa com Hover Effect e Marca d'água */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {(() => {
                    const fotoCapaDireta = proj.arquivo_capa
                      ? resolverUrlMidia('site_portfolio', proj.id, proj.arquivo_capa)
                      : proj.imagem_capa
                        ? resolverUrlMidia('site_portfolio', proj.id, proj.imagem_capa)
                        : ''

                    const primeiraFotoGaleria =
                      proj.arquivos_galeria && proj.arquivos_galeria.length > 0
                        ? resolverUrlMidia('site_portfolio', proj.id, proj.arquivos_galeria[0])
                        : proj.galeria && proj.galeria.length > 0
                          ? resolverUrlMidia('site_portfolio', proj.id, proj.galeria[0])
                          : ''

                    const fotoFinal = fotoCapaDireta || primeiraFotoGaleria

                    return (
                      <WatermarkedImage
                        src={fotoFinal}
                        alt={proj.titulo}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                  {/* Tag Categoria */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                    {(proj.categorias && proj.categorias.length > 0
                      ? proj.categorias
                      : [proj.categoria]
                    ).map((cNome, idx) => (
                      <Badge
                        key={idx}
                        className="bg-[#2C3E50] text-white text-[11px] font-semibold border-none shadow-xs"
                      >
                        {cNome}
                      </Badge>
                    ))}
                  </div>

                  {/* Quantidade de Fotos e Vídeos */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {(proj.videos_count || proj.videos?.length || 0) > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-[11px] backdrop-blur font-medium">
                        <Film className="w-3 h-3 text-[#D4AF37]" />
                        <span>{proj.videos_count || proj.videos?.length}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs backdrop-blur font-medium">
                      <Images className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{proj.fotos_count || proj.galeria?.length || 0} fotos</span>
                    </div>
                  </div>
                </div>

                {/* Informações */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {proj.subtitulo && (
                      <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider block mb-1">
                        {proj.subtitulo}
                      </span>
                    )}
                    <h3 className="font-heading text-lg font-bold text-[#2C3E50] group-hover:text-[#2C3E50] transition-colors mb-2">
                      <Link to={`/portfolio/${proj.slug}`}>{proj.titulo}</Link>
                    </h3>
                    <p className="text-xs sm:text-sm text-[#616F7D] line-clamp-3 leading-relaxed">
                      {proj.descricao}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#DEE4EA] flex items-center justify-between">
                    <Link
                      to={`/portfolio/${proj.slug}`}
                      className="inline-flex items-center text-xs font-semibold text-[#2C3E50] group-hover:text-[#D4AF37] transition-colors"
                    >
                      Ver galeria do projeto
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Botão Ver Todos quando limitado */}
        {limit && projetos.length > limit && (
          <div className="mt-10 text-center">
            <Link
              to="/portfolio"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#f4f4f4] border border-[#DEE4EA] text-sm font-semibold text-[#2C3E50] hover:bg-[#E8EDF2] hover:border-[#2C3E50]/30 transition-all shadow-xs"
            >
              Ver todos os {projetos.length} projetos do portfólio
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export default LandingPortfolio
